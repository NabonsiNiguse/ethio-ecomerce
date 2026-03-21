from django.db.models.signals import post_save
from django.dispatch import receiver

from purchases.models import Order

from .models import Payment


@receiver(post_save, sender=Payment)
def sync_order_status_from_payment(sender, instance: Payment, **kwargs) -> None:
    """
    Keep Order.status in sync when a Payment status changes.

    Payment.paid   → Order.paid
    Payment.failed → Order.cancelled
    """
    payment_to_order = {
        Payment.Status.paid: Order.Status.paid,
        Payment.Status.failed: Order.Status.cancelled,
    }

    new_order_status = payment_to_order.get(instance.status)
    if new_order_status is None:
        return

    order = instance.order
    if order.status != new_order_status:
        Order.objects.filter(pk=order.pk).update(status=new_order_status)
