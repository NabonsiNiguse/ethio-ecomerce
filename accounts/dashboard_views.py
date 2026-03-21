from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from django.db import models as db_models
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from payments.models import Payment
from purchases.models import Order

from .permissions import IsAdminRole


class AdminDashboardAPIView(APIView):
    """
    GET /api/admin/dashboard

    Returns high-level platform metrics for admin users.
    All three aggregations are resolved in a single DB round-trip each,
    using only indexed fields (status, pk counts).
    """

    permission_classes = [IsAdminRole]

    def get(self, request: Request) -> Response:
        # Single-query aggregation per concern — no N+1, no Python-side loops.
        total_users: int = User.objects.aggregate(
            total=Count("id")
        )["total"]

        order_stats: dict = Order.objects.aggregate(
            total=Count("id"),
        )

        # Sum only confirmed (paid) payments to reflect real revenue.
        # Coalesce guards against NULL when no paid payments exist yet.
        revenue_stats: dict = Payment.objects.filter(
            status=Payment.Status.paid
        ).aggregate(
            total_revenue=Coalesce(
                Sum("amount"), db_models.Value(0), output_field=db_models.DecimalField()
            )
        )

        return Response(
            {
                "total_users": total_users,
                "total_orders": order_stats["total"],
                "total_revenue": revenue_stats["total_revenue"],
            }
        )
