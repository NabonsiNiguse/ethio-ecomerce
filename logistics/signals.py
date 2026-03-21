from django.db.models.signals import post_save
from django.dispatch import receiver

from purchases.models import Order

from .models import Delivery


@receiver(post_save, sender=Delivery)
def sync_order_status_from_delivery(sender, instance: Delivery, **kwargs) -> None:
    """
    Keep Order.status in sync when a Delivery status changes.

    Delivery.delivered  → Order.delivered
    Delivery.picked     → Order.shipped
    """
    delivery_to_order = {
        Delivery.Status.delivered: Order.Status.delivered,
        Delivery.Status.picked: Order.Status.shipped,
    }

    new_order_status = delivery_to_order.get(instance.status)
    if new_order_status is None:
        return

    order = instance.order
    if order.status != new_order_status:
        Order.objects.filter(pk=order.pk).update(status=new_order_status)
