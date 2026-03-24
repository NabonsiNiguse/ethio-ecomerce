from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from purchases.models import Order

from .models import Delivery, DeliveryAgent
from .permissions import IsAdminOnly
from .serializers import (
    AgentLocationSerializer,
    AssignDeliverySerializer,
    DeliveryFeeEstimateSerializer,
    DeliverySerializer,
    UpdateDeliveryStatusSerializer,
    VerifyDeliveryOTPSerializer,
)

STATUS_TRANSITIONS = {
    Delivery.Status.pending:  Delivery.Status.assigned,
    Delivery.Status.assigned: Delivery.Status.picked,
    Delivery.Status.picked:   Delivery.Status.delivered,
    Delivery.Status.delivered: None,
}


def _broadcast_new_delivery(delivery: Delivery) -> None:
    """Push a new-order event to all connected riders via WebSocket."""
    try:
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            "riders",
            {
                "type": "dispatch.new_order",
                "delivery_id": delivery.id,
                "order_id": delivery.order_id,
                "address": delivery.shipping_address,
                "distance_km": delivery.distance_km,
                "delivery_fee": delivery.delivery_fee,
            },
        )
    except Exception:
        pass  # channel layer not available (e.g. tests) — fail silently


# ── Feature 1.1: Delivery fee estimate ───────────────────────────────────────
class DeliveryFeeEstimateAPIView(APIView):
    """
    POST /api/delivery/estimate-fee
    Body: { seller_lat, seller_lon, buyer_lat, buyer_lon }
    Returns: { distance_km, delivery_fee (ETB), tiers }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        s = DeliveryFeeEstimateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response({
            "distance_km":  s.validated_data["distance_km"],
            "delivery_fee": s.validated_data["delivery_fee"],
            "currency": "ETB",
            "tiers": [
                {"max_km": 5,   "fee": 50},
                {"max_km": 10,  "fee": 80},
                {"max_km": 20,  "fee": 120},
                {"max_km": 50,  "fee": 200},
                {"max_km": 100, "fee": 350},
                {"max_km": None, "fee": 500},
            ],
        })


# ── Feature 1.2: Assign delivery + broadcast to riders ───────────────────────
class AssignDeliveryAPIView(APIView):
    """
    POST /api/delivery/assign
    Admin assigns an agent to an order. Geo coords are optional — if provided,
    distance and fee are auto-calculated.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def post(self, request, *args, **kwargs):
        serializer = AssignDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        with transaction.atomic():
            order = get_object_or_404(Order, pk=d["order_id"])
            if order.status != Order.Status.paid:
                return Response(
                    {"detail": "Order must be paid before assignment."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            agent = get_object_or_404(DeliveryAgent, pk=d["agent_id"], is_active=True)
            delivery, created = Delivery.objects.select_for_update().get_or_create(order=order)

            if delivery.status in (Delivery.Status.picked, Delivery.Status.delivered):
                return Response(
                    {"detail": "Delivery already started and cannot be reassigned."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Snapshot shipping address
            if not delivery.shipping_address:
                profile = getattr(order.user, "profile", None)
                delivery.shipping_address = (profile.address or "") if profile else ""

            # Geo pricing (Feature 1.1)
            delivery.seller_lat = d.get("seller_lat")
            delivery.seller_lon = d.get("seller_lon")
            delivery.buyer_lat  = d.get("buyer_lat")
            delivery.buyer_lon  = d.get("buyer_lon")
            delivery.compute_fee()

            # Generate delivery OTP (Feature 1.3)
            otp_plain = Delivery.generate_otp()
            delivery.set_otp(otp_plain)
            delivery.otp_verified = False

            delivery.delivery_agent = agent
            delivery.status = Delivery.Status.assigned
            delivery.assigned_at = timezone.now()
            delivery.save()

        # Broadcast to riders (Feature 1.2)
        _broadcast_new_delivery(delivery)

        return Response(
            {
                "message": "Delivery assigned",
                "delivery": DeliverySerializer(delivery).data,
                # Return OTP in dev — in production send via SMS to buyer
                "otp_code": otp_plain,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


# ── Feature 1.2: Status update (assigned → picked only; delivered via OTP) ───
class DeliveryStatusUpdateAPIView(APIView):
    """
    PUT /api/delivery/status
    Rider updates status. Transition to 'delivered' is blocked here —
    use /api/delivery/confirm-otp instead.
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, *args, **kwargs):
        serializer = UpdateDeliveryStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        delivery_id = serializer.validated_data["delivery_id"]
        new_status  = serializer.validated_data["status"]

        agent = get_object_or_404(DeliveryAgent, user=request.user, is_active=True)

        with transaction.atomic():
            delivery = get_object_or_404(
                Delivery.objects.select_for_update().select_related("delivery_agent", "order"),
                pk=delivery_id,
            )

            if delivery.delivery_agent_id != agent.id:
                return Response(
                    {"detail": "You are not assigned to this delivery."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Block direct transition to 'delivered' — must use OTP endpoint
            if new_status == Delivery.Status.delivered:
                return Response(
                    {"detail": "Use POST /api/delivery/confirm-otp to mark as delivered."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if delivery.status == new_status:
                return Response(
                    {"message": "Status unchanged", "delivery": DeliverySerializer(delivery).data}
                )

            allowed_next = STATUS_TRANSITIONS.get(delivery.status)
            if allowed_next is None or new_status != allowed_next:
                return Response(
                    {"detail": "Invalid status transition.", "current": delivery.status, "requested": new_status},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            now = timezone.now()
            delivery.status = new_status
            if new_status == Delivery.Status.picked:
                delivery.picked_at = now
            delivery.save(update_fields=["status", "picked_at", "updated_at"])

        return Response({"message": "Status updated", "delivery": DeliverySerializer(delivery).data})


# ── Feature 1.3: Confirm delivery via OTP ────────────────────────────────────
class ConfirmDeliveryOTPAPIView(APIView):
    """
    POST /api/delivery/confirm-otp
    Rider submits the buyer's 6-digit OTP.
    Only on correct OTP does the delivery move to 'delivered'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = VerifyDeliveryOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        delivery_id = serializer.validated_data["delivery_id"]
        otp_code    = serializer.validated_data["otp_code"]

        agent = get_object_or_404(DeliveryAgent, user=request.user, is_active=True)

        with transaction.atomic():
            delivery = get_object_or_404(
                Delivery.objects.select_for_update().select_related("order"),
                pk=delivery_id,
            )

            if delivery.delivery_agent_id != agent.id:
                return Response(
                    {"detail": "You are not assigned to this delivery."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if delivery.status != Delivery.Status.picked:
                return Response(
                    {"detail": "Delivery must be in 'picked' status before confirming."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if delivery.otp_verified:
                return Response(
                    {"detail": "OTP already verified."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not delivery.verify_otp(otp_code):
                return Response(
                    {"detail": "Invalid OTP. Please ask the buyer for the correct code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            delivery.otp_verified = True
            delivery.status = Delivery.Status.delivered
            delivery.delivered_at = timezone.now()
            delivery.save(update_fields=["otp_verified", "status", "delivered_at", "updated_at"])

        return Response({
            "message": "Delivery confirmed. Order marked as delivered.",
            "delivery": DeliverySerializer(delivery).data,
        })


# ── Agent location update (Feature 1.2 support) ──────────────────────────────
class AgentLocationUpdateAPIView(APIView):
    """
    PUT /api/delivery/location
    Rider updates their current GPS position.
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, *args, **kwargs):
        s = AgentLocationSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        agent = get_object_or_404(DeliveryAgent, user=request.user, is_active=True)
        agent.current_lat = s.validated_data["current_lat"]
        agent.current_lon = s.validated_data["current_lon"]
        agent.location_updated_at = timezone.now()
        agent.save(update_fields=["current_lat", "current_lon", "location_updated_at"])

        # Broadcast location to the riders group
        try:
            layer = get_channel_layer()
            async_to_sync(layer.group_send)(
                "riders",
                {
                    "type": "rider.location",
                    "rider_id": agent.id,
                    "lat": agent.current_lat,
                    "lon": agent.current_lon,
                },
            )
        except Exception:
            pass

        return Response({"message": "Location updated"})


# ── Buyer: get delivery info for a specific order ────────────────────────────
class DeliveryByOrderAPIView(APIView):
    """
    GET /api/delivery/order/<order_id>
    Returns delivery info for the authenticated buyer's order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id, *args, **kwargs):
        order = get_object_or_404(Order, pk=order_id, user=request.user)
        delivery = get_object_or_404(Delivery, order=order)
        return Response(DeliverySerializer(delivery).data)


# ── Rider: list their assigned deliveries ────────────────────────────────────
class MyDeliveriesAPIView(APIView):
    """
    GET /api/delivery/my-deliveries
    Returns all deliveries assigned to the authenticated rider.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        agent = get_object_or_404(DeliveryAgent, user=request.user, is_active=True)
        deliveries = Delivery.objects.filter(
            delivery_agent=agent
        ).exclude(status=Delivery.Status.delivered).select_related("order").order_by("-created_at")
        return Response(DeliverySerializer(deliveries, many=True).data)
