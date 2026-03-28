"""
Simple notification system — generates notifications from order/payment events.
No separate model needed; derives from existing data.
"""
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions


class NotificationListView(APIView):
    """GET /api/notifications/ — returns user notifications derived from orders/payments."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from purchases.models import Order
        from payments.models import Payment

        notifications = []
        user = request.user

        # Order notifications
        orders = Order.objects.filter(user=user).order_by("-created_at")[:10]
        for order in orders:
            status_messages = {
                "pending":   ("⏳", "Order Pending", f"Order #{order.id} is awaiting payment."),
                "paid":      ("✅", "Payment Confirmed", f"Order #{order.id} payment confirmed! Total: {order.total_price} ETB"),
                "shipped":   ("🚚", "Order Shipped", f"Order #{order.id} is on its way!"),
                "delivered": ("📦", "Order Delivered", f"Order #{order.id} has been delivered."),
                "cancelled": ("❌", "Order Cancelled", f"Order #{order.id} was cancelled."),
            }
            if order.status in status_messages:
                icon, title, msg = status_messages[order.status]
                notifications.append({
                    "id": order.id * 10,
                    "type": "order",
                    "title": title,
                    "message": msg,
                    "is_read": order.status in ("delivered", "cancelled"),
                    "created_at": order.created_at.isoformat(),
                    "link": "/dashboard",
                })

        # Payment notifications
        payments = Payment.objects.filter(user=user).order_by("-created_at")[:5]
        for payment in payments:
            if payment.status == "paid":
                notifications.append({
                    "id": payment.id * 100,
                    "type": "payment",
                    "title": "Payment Successful",
                    "message": f"Payment of {payment.amount} ETB confirmed. Tx: {payment.transaction_id[:12]}...",
                    "is_read": True,
                    "created_at": payment.created_at.isoformat(),
                    "link": "/dashboard",
                })
            elif payment.status == "failed":
                notifications.append({
                    "id": payment.id * 100 + 1,
                    "type": "payment",
                    "title": "Payment Failed",
                    "message": f"Payment of {payment.amount} ETB failed. Please try again.",
                    "is_read": False,
                    "created_at": payment.created_at.isoformat(),
                    "link": "/checkout",
                })

        # Sort by created_at descending
        notifications.sort(key=lambda n: n["created_at"], reverse=True)
        return Response(notifications[:20])


class NotificationMarkAllReadView(APIView):
    """POST /api/notifications/mark-all-read/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # In a real system, update a Notification model
        # Here we just return success since notifications are derived
        return Response({"status": "ok"})


class NotificationMarkReadView(APIView):
    """PATCH /api/notifications/{id}/"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        return Response({"status": "ok"})
