from django.db.models.signals import post_save
from django.dispatch import receiver

from purchases.models import Order
from .models import Delivery


@receiver(post_save, sender=Delivery)
def sync_order_status_from_delivery(sender, instance: Delivery, **kwargs) -> None:
    """Keep Order.status in sync when Delivery status changes."""
    mapping = {
        Delivery.Status.delivered: Order.Status.delivered,
        Delivery.Status.picked:    Order.Status.shipped,
    }
    new_order_status = mapping.get(instance.status)
    if new_order_status and instance.order.status != new_order_status:
        Order.objects.filter(pk=instance.order_id).update(status=new_order_status)

    # Inject system message into any order-linked chat conversation
    status_messages = {
        Delivery.Status.assigned:  f'🚴 A delivery rider has been assigned to Order #{instance.order_id}.',
        Delivery.Status.picked:    f'📦 Order #{instance.order_id} has been picked up and is on the way.',
        Delivery.Status.delivered: f'✅ Order #{instance.order_id} has been delivered successfully.',
    }
    msg_text = status_messages.get(instance.status)
    if msg_text:
        try:
            from chat.views import inject_order_system_message
            inject_order_system_message(instance.order_id, msg_text)
        except Exception:
            pass
