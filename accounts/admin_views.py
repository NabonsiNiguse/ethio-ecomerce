"""
Admin-only views — user management, platform analytics, product moderation.
"""
from decimal import Decimal

from django.db.models import Count, Sum, Q
from django.db.models.functions import Coalesce, TruncMonth
from django.db import models as db_models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .permissions import IsAdminRole
from catalog.models import Product
from payments.models import Payment
from purchases.models import Order, OrderItem


# ── Platform analytics ────────────────────────────────────────────────────────
class AdminAnalyticsAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        total_users    = User.objects.count()
        total_buyers   = User.objects.filter(role="customer").count()
        total_sellers  = User.objects.filter(role="seller").count()
        total_products = Product.objects.count()
        total_orders   = Order.objects.count()

        revenue = Payment.objects.filter(status="paid").aggregate(
            total=Coalesce(Sum("amount"), Decimal("0"), output_field=db_models.DecimalField())
        )["total"]

        order_by_status = dict(
            Order.objects.values_list("status").annotate(c=Count("id"))
        )

        monthly = (
            Order.objects.filter(status__in=["paid", "shipped", "delivered"])
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(orders=Count("id"), revenue=Sum("total_price"))
            .order_by("month")
        )

        recent_orders = (
            Order.objects.select_related("user")
            .prefetch_related("items__product")
            .order_by("-created_at")[:10]
        )

        return Response({
            "total_users":    total_users,
            "total_buyers":   total_buyers,
            "total_sellers":  total_sellers,
            "total_products": total_products,
            "total_orders":   total_orders,
            "total_revenue":  str(revenue),
            "orders_by_status": order_by_status,
            "monthly": [
                {"month": m["month"].strftime("%b %Y"), "orders": m["orders"], "revenue": str(m["revenue"] or 0)}
                for m in monthly
            ],
            "recent_orders": [
                {
                    "id": o.id,
                    "buyer": o.user.username,
                    "status": o.status,
                    "total": str(o.total_price),
                    "created_at": o.created_at.isoformat(),
                }
                for o in recent_orders
            ],
        })


# ── User management ───────────────────────────────────────────────────────────
class AdminUsersAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        role   = request.query_params.get("role")
        search = request.query_params.get("search", "").strip()
        qs = User.objects.all().order_by("-date_joined")
        if role:
            qs = qs.filter(role=role)
        if search:
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))
        data = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "phone_number": u.phone_number,
                "role": u.role,
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "date_joined": u.date_joined.isoformat(),
            }
            for u in qs
        ]
        return Response(data)


class AdminUserDetailAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, user_id):
        u = get_object_or_404(User, pk=user_id)
        orders = Order.objects.filter(user=u).count()
        revenue = Payment.objects.filter(user=u, status="paid").aggregate(
            total=Coalesce(Sum("amount"), Decimal("0"), output_field=db_models.DecimalField())
        )["total"]
        return Response({
            "id": u.id, "username": u.username, "email": u.email,
            "phone_number": u.phone_number, "role": u.role,
            "is_active": u.is_active, "is_verified": u.is_verified,
            "date_joined": u.date_joined.isoformat(),
            "total_orders": orders, "total_spent": str(revenue),
        })

    def patch(self, request, user_id):
        u = get_object_or_404(User, pk=user_id)
        if "is_active" in request.data:
            u.is_active = bool(request.data["is_active"])
        if "role" in request.data and request.data["role"] in ("customer", "seller", "admin"):
            u.role = request.data["role"]
        u.save(update_fields=["is_active", "role"])
        return Response({"message": "User updated", "is_active": u.is_active, "role": u.role})

    def delete(self, request, user_id):
        u = get_object_or_404(User, pk=user_id)
        u.delete()
        return Response(status=204)


# ── Product moderation ────────────────────────────────────────────────────────
class AdminProductsAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        qs = Product.objects.select_related("seller", "category").prefetch_related("images").order_by("-created_at")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(seller__username__icontains=search))
        data = [
            {
                "id": p.id, "name": p.name, "price": str(p.price),
                "stock": p.stock, "seller": p.seller.username,
                "category": p.category.name if p.category else "",
                "image": p.images.first().image_url if p.images.exists() else None,
                "created_at": p.created_at.isoformat(),
            }
            for p in qs
        ]
        return Response(data)


class AdminProductDeleteAPIView(APIView):
    permission_classes = [IsAdminRole]

    def delete(self, request, pk):
        p = get_object_or_404(Product, pk=pk)
        p.delete()
        return Response(status=204)


# ── Order management ──────────────────────────────────────────────────────────
class AdminOrdersAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        status_filter = request.query_params.get("status")
        qs = Order.objects.select_related("user").prefetch_related("items__product").order_by("-created_at")
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = [
            {
                "id": o.id, "buyer": o.user.username, "status": o.status,
                "total_price": str(o.total_price), "items_count": o.items.count(),
                "shipping_city": o.shipping_city, "created_at": o.created_at.isoformat(),
            }
            for o in qs[:100]
        ]
        return Response(data)


class AdminOrderUpdateAPIView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, order_id):
        order = get_object_or_404(Order, pk=order_id)
        new_status = request.data.get("status")
        if new_status and new_status in [s[0] for s in Order.Status.choices]:
            order.status = new_status
            order.save(update_fields=["status"])
        return Response({"message": "Updated", "status": order.status})


# ── Payments overview ─────────────────────────────────────────────────────────
class AdminPaymentsAPIView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Payment.objects.select_related("user", "order").order_by("-created_at")[:100]
        data = [
            {
                "id": p.id, "user": p.user.username, "order_id": p.order_id,
                "amount": str(p.amount), "status": p.status,
                "transaction_id": p.transaction_id, "created_at": p.created_at.isoformat(),
            }
            for p in qs
        ]
        return Response(data)
