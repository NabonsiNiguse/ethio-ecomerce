"""
Live tracking endpoint — returns rider location, destination, and ETA.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from purchases.models import Order
from .models import Delivery, DeliveryAgent


class DeliveryTrackingAPIView(APIView):
    """
    GET /api/delivery/order/<order_id>/tracking
    Returns real-time tracking data for a buyer's order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, pk=order_id, user=request.user)

        try:
            delivery = Delivery.objects.select_related("delivery_agent__user").get(order=order)
        except Delivery.DoesNotExist:
            return Response({"detail": "No delivery found for this order."}, status=404)

        rider_lat = None
        rider_lon = None
        rider_name = None
        rider_updated_at = None

        if delivery.delivery_agent:
            agent = delivery.delivery_agent
            rider_lat = agent.current_lat
            rider_lon = agent.current_lon
            rider_name = agent.user.username
            rider_updated_at = (
                agent.location_updated_at.isoformat()
                if agent.location_updated_at else None
            )

        # Estimate ETA based on distance and average speed (25 km/h in city)
        eta_minutes = None
        if delivery.distance_km and delivery.status in ("assigned", "picked"):
            speed_kmh = 25
            eta_minutes = round((delivery.distance_km / speed_kmh) * 60)

        return Response({
            "delivery_id": delivery.id,
            "order_id": order.id,
            "status": delivery.status,
            "otp_verified": delivery.otp_verified,

            # Rider location
            "rider_lat": rider_lat,
            "rider_lon": rider_lon,
            "rider_name": rider_name,
            "rider_updated_at": rider_updated_at,

            # Destination (buyer)
            "dest_lat": delivery.buyer_lat,
            "dest_lon": delivery.buyer_lon,
            "dest_address": delivery.shipping_address,

            # Origin (seller/pickup)
            "origin_lat": delivery.seller_lat,
            "origin_lon": delivery.seller_lon,

            # Metrics
            "distance_km": delivery.distance_km,
            "delivery_fee": delivery.delivery_fee,
            "eta_minutes": eta_minutes,

            # Timestamps
            "assigned_at": delivery.assigned_at.isoformat() if delivery.assigned_at else None,
            "picked_at": delivery.picked_at.isoformat() if delivery.picked_at else None,
            "delivered_at": delivery.delivered_at.isoformat() if delivery.delivered_at else None,
        })


class RiderTrackingAPIView(APIView):
    """
    GET /api/delivery/<delivery_id>/rider-location
    Returns current rider location for a specific delivery.
    Accessible by the buyer of that order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, delivery_id):
        delivery = get_object_or_404(
            Delivery.objects.select_related("delivery_agent", "order__user"),
            pk=delivery_id,
        )

        # Only the buyer of this order can see tracking
        if delivery.order.user_id != request.user.id and request.user.role != "admin":
            return Response({"detail": "Not authorized."}, status=403)

        agent = delivery.delivery_agent
        if not agent:
            return Response({"rider_lat": None, "rider_lon": None, "updated_at": None})

        return Response({
            "rider_lat": agent.current_lat,
            "rider_lon": agent.current_lon,
            "updated_at": agent.location_updated_at.isoformat() if agent.location_updated_at else None,
            "rider_name": agent.user.username,
        })
