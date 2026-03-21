from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from purchases.models import Order

from .models import Delivery, DeliveryAgent
from .permissions import IsAdminOnly
from .serializers import AssignDeliverySerializer, DeliverySerializer, UpdateDeliveryStatusSerializer


STATUS_TRANSITIONS = {
    Delivery.Status.assigned: Delivery.Status.picked,
    Delivery.Status.picked: Delivery.Status.delivered,
    Delivery.Status.delivered: None,  # terminal
}


class AssignDeliveryAPIView(APIView):
    """
    POST /api/delivery/assign

    Only admin can assign an agent to an order.
    """

    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def post(self, request, *args, **kwargs):
        serializer = AssignDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data["order_id"]
        agent_id = serializer.validated_data["agent_id"]

        with transaction.atomic():
            order = get_object_or_404(Order, pk=order_id)

            # Only assign if order is paid (simple production rule).
            if order.status != Order.Status.paid:
                return Response(
                    {"detail": "Order must be paid before assignment."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            agent = get_object_or_404(DeliveryAgent, pk=agent_id, is_active=True)

            delivery, created = Delivery.objects.select_for_update().get_or_create(order=order)

            # Prevent reassignment after the pickup/delivery started.
            if delivery.status in (Delivery.Status.picked, Delivery.Status.delivered):
                return Response(
                    {"detail": "Delivery already started and cannot be reassigned."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Snapshot the buyer's shipping address at assignment time (immutable after this).
            if not delivery.shipping_address:
                profile = getattr(order.user, "profile", None)
                delivery.shipping_address = (profile.address or "") if profile else ""

            # Assign agent + set status to assigned.
            delivery.delivery_agent = agent
            delivery.status = Delivery.Status.assigned
            from django.utils import timezone
            delivery.assigned_at = timezone.now()
            delivery.save(update_fields=["delivery_agent", "status", "assigned_at", "shipping_address", "updated_at"])

        return Response(
            {"message": "Delivery assigned", "delivery": DeliverySerializer(delivery).data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeliveryStatusUpdateAPIView(APIView):
    """
    PUT /api/delivery/status

    Only the assigned delivery agent can update the delivery status.
    """

    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, *args, **kwargs):
        serializer = UpdateDeliveryStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        delivery_id = serializer.validated_data["delivery_id"]
        new_status = serializer.validated_data["status"]

        # Identify the requesting delivery agent profile.
        agent = get_object_or_404(DeliveryAgent, user=request.user, is_active=True)

        with transaction.atomic():
            delivery = get_object_or_404(Delivery.objects.select_for_update().select_related("delivery_agent", "order"), pk=delivery_id)

            if delivery.delivery_agent_id != agent.id:
                return Response(
                    {"detail": "You are not assigned to this delivery."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Validate transition.
            current_status = delivery.status
            if current_status == new_status:
                # Idempotent: allow same status update.
                return Response(
                    {"message": "Delivery status unchanged", "delivery": DeliverySerializer(delivery).data},
                    status=status.HTTP_200_OK,
                )

            allowed_next = STATUS_TRANSITIONS.get(current_status)
            if allowed_next is None or new_status != allowed_next:
                return Response(
                    {"detail": "Invalid status transition.", "current_status": current_status, "requested_status": new_status},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            from django.utils import timezone
            now = timezone.now()
            delivery.status = new_status
            if new_status == Delivery.Status.picked:
                delivery.picked_at = now
            elif new_status == Delivery.Status.delivered:
                delivery.delivered_at = now
            delivery.save(update_fields=["status", "picked_at", "delivered_at", "updated_at"])

        return Response(
            {"message": "Delivery status updated", "delivery": DeliverySerializer(delivery).data},
            status=status.HTTP_200_OK,
        )
