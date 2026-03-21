from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from purchases.models import Order


class Payment(models.Model):
    class Status(models.TextChoices):
        pending = "pending", "pending"
        paid = "paid", "paid"
        failed = "failed", "failed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments")
    # Prevent duplicate payments per order by enforcing a 1:1 relationship.
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.pending)
    transaction_id = models.CharField(max_length=64, unique=True, db_index=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Payment(tx={self.transaction_id}, order_id={self.order_id}, status={self.status})"
