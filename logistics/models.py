from django.conf import settings
from django.db import models
from django.utils import timezone

from purchases.models import Order


class DeliveryAgent(models.Model):
    """
    Delivery agent profile tied to the custom User.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="delivery_agent")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"DeliveryAgent(user_id={self.user_id})"


class Delivery(models.Model):
    """
    Delivery lifecycle for an Order.
    """

    class Status(models.TextChoices):
        assigned = "assigned", "assigned"
        picked = "picked", "picked"
        delivered = "delivered", "delivered"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="delivery")
    delivery_agent = models.ForeignKey(
        DeliveryAgent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.assigned)

    # Snapshot of the buyer's address at checkout time — immutable after creation.
    shipping_address = models.CharField(max_length=255, blank=True, default="")

    assigned_at = models.DateTimeField(null=True, blank=True)
    picked_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"Delivery(order_id={self.order_id}, status={self.status})"
