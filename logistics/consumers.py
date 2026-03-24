"""
WebSocket consumer for real-time rider dispatch (Feature 1.2).

Riders connect to:  ws://host/ws/dispatch/

On connect they join the "riders" group.
When a new delivery is created, the server broadcasts a dispatch event
to all connected riders via the channel layer.
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer


class DispatchConsumer(AsyncWebsocketConsumer):
    GROUP = "riders"

    async def connect(self) -> None:
        # Only authenticated users with a delivery_agent profile should connect.
        # JWT auth is handled by the middleware stack (see routing.py).
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code: int) -> None:
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    # ── Receive message from rider (e.g. location update) ────────────────────
    async def receive(self, text_data: str = "", bytes_data: bytes = None) -> None:
        try:
            payload = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            return

        msg_type = payload.get("type")

        if msg_type == "location_update":
            # Broadcast rider location to the group (other riders / admin dashboard)
            await self.channel_layer.group_send(
                self.GROUP,
                {
                    "type": "rider.location",
                    "rider_id": payload.get("rider_id"),
                    "lat": payload.get("lat"),
                    "lon": payload.get("lon"),
                },
            )

    # ── Handlers for group messages ───────────────────────────────────────────
    async def dispatch_new_order(self, event: dict) -> None:
        """Sent by the server when a new delivery needs a rider."""
        await self.send(text_data=json.dumps({
            "type": "new_order",
            "delivery_id": event["delivery_id"],
            "order_id": event["order_id"],
            "address": event.get("address", ""),
            "distance_km": event.get("distance_km"),
            "delivery_fee": event.get("delivery_fee"),
        }))

    async def rider_location(self, event: dict) -> None:
        """Broadcast rider location to all group members."""
        await self.send(text_data=json.dumps({
            "type": "rider_location",
            "rider_id": event.get("rider_id"),
            "lat": event.get("lat"),
            "lon": event.get("lon"),
        }))
