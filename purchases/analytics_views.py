"""
Buyer analytics — spending summary, tax tracking, category breakdown.
"""
from decimal import Decimal
from collections import defaultdict

from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, OrderItem

TAX_RATE = Decimal("0.15")  # 15% VAT


class BuyerAnalyticsAPIView(APIView):
    """GET /api/orders/analytics — buyer spending analytics"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        orders = Order.objects.filter(user=user).prefetch_related("items__product__category")

        paid_statuses = ["paid", "shipped", "delivered"]

        total_spent = orders.filter(status__in=paid_statuses).aggregate(
            total=Sum("total_price")
        )["total"] or Decimal("0")

        total_orders = orders.count()
        paid_orders  = orders.filter(status__in=paid_statuses).count()
        pending      = orders.filter(status="pending").count()
        cancelled    = orders.filter(status="cancelled").count()

        # Tax calculation
        tax_paid = (total_spent * TAX_RATE).quantize(Decimal("0.01"))
        net_spent = (total_spent - tax_paid).quantize(Decimal("0.01"))

        # Monthly spending (last 6 months)
        monthly = (
            orders.filter(status__in=paid_statuses)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Sum("total_price"), count=Count("id"))
            .order_by("month")
        )
        monthly_data = [
            {
                "month": m["month"].strftime("%b %Y"),
                "total": float(m["total"]),
                "count": m["count"],
            }
            for m in monthly
        ][-6:]

        # Category breakdown
        cat_spend: dict = defaultdict(float)
        for order in orders.filter(status__in=paid_statuses):
            for item in order.items.all():
                cat = item.product.category.name if item.product.category else "Other"
                cat_spend[cat] += float(item.line_total)

        top_categories = sorted(
            [{"category": k, "amount": round(v, 2)} for k, v in cat_spend.items()],
            key=lambda x: x["amount"],
            reverse=True,
        )[:5]

        # Recent orders
        recent = orders.order_by("-created_at")[:5]
        recent_data = [
            {
                "id": o.id,
                "status": o.status,
                "total": float(o.total_price),
                "created_at": o.created_at.isoformat(),
                "item_count": o.items.count(),
            }
            for o in recent
        ]

        return Response({
            "total_spent":     float(total_spent),
            "total_orders":    total_orders,
            "paid_orders":     paid_orders,
            "pending_orders":  pending,
            "cancelled_orders": cancelled,
            "tax": {
                "rate":      float(TAX_RATE),
                "rate_pct":  "15%",
                "tax_paid":  float(tax_paid),
                "net_spent": float(net_spent),
                "gross":     float(total_spent),
            },
            "monthly_spending": monthly_data,
            "top_categories":   top_categories,
            "recent_orders":    recent_data,
        })
