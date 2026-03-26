"""
Seller-specific views — product CRUD, order management, analytics.
All endpoints require role='seller'.
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

from accounts.permissions import IsSellerRole
from catalog.models import Category, Product, ProductImage
from catalog.serializers import CategorySerializer, ProductSerializer
from purchases.models import Order, OrderItem
from purchases.serializers import OrderSerializer


class SellerPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "seller")


# ── Analytics ────────────────────────────────────────────────────────────────
class SellerAnalyticsAPIView(APIView):
    permission_classes = [SellerPermission]

    def get(self, request):
        seller = request.user
        product_ids = Product.objects.filter(seller=seller).values_list("id", flat=True)

        # Orders that contain at least one of this seller's products
        order_ids = OrderItem.objects.filter(
            product_id__in=product_ids
        ).values_list("order_id", flat=True).distinct()

        orders = Order.objects.filter(id__in=order_ids)

        total_orders = orders.count()
        paid_orders  = orders.filter(status__in=["paid", "shipped", "delivered"]).count()

        revenue = OrderItem.objects.filter(
            product_id__in=product_ids,
            order__status__in=["paid", "shipped", "delivered"],
        ).aggregate(
            total=Coalesce(Sum("line_total"), Decimal("0"), output_field=db_models.DecimalField())
        )["total"]

        total_products = Product.objects.filter(seller=seller).count()
        low_stock = Product.objects.filter(seller=seller, stock__lte=5).count()

        # Monthly revenue (last 6 months)
        monthly = (
            OrderItem.objects.filter(
                product_id__in=product_ids,
                order__status__in=["paid", "shipped", "delivered"],
                order__created_at__gte=timezone.now() - timezone.timedelta(days=180),
            )
            .annotate(month=TruncMonth("order__created_at"))
            .values("month")
            .annotate(revenue=Sum("line_total"), orders=Count("order_id", distinct=True))
            .order_by("month")
        )

        # Top products by revenue
        top_products = (
            OrderItem.objects.filter(
                product_id__in=product_ids,
                order__status__in=["paid", "shipped", "delivered"],
            )
            .values("product__id", "product__name")
            .annotate(revenue=Sum("line_total"), units=Sum("quantity"))
            .order_by("-revenue")[:5]
        )

        return Response({
            "total_orders":    total_orders,
            "paid_orders":     paid_orders,
            "total_revenue":   str(revenue),
            "total_products":  total_products,
            "low_stock_count": low_stock,
            "monthly_revenue": [
                {"month": m["month"].strftime("%b %Y"), "revenue": str(m["revenue"]), "orders": m["orders"]}
                for m in monthly
            ],
            "top_products": list(top_products),
        })


# ── Seller's orders ───────────────────────────────────────────────────────────
class SellerOrdersAPIView(APIView):
    permission_classes = [SellerPermission]

    def get(self, request):
        seller = request.user
        product_ids = Product.objects.filter(seller=seller).values_list("id", flat=True)
        order_ids = OrderItem.objects.filter(
            product_id__in=product_ids
        ).values_list("order_id", flat=True).distinct()

        status_filter = request.query_params.get("status")
        qs = Order.objects.filter(id__in=order_ids).prefetch_related(
            "items__product", "user"
        ).select_related("user").order_by("-created_at")

        if status_filter:
            qs = qs.filter(status=status_filter)

        data = []
        for order in qs:
            seller_items = [
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product_name": item.product.name,
                    "quantity": item.quantity,
                    "unit_price": str(item.unit_price),
                    "line_total": str(item.line_total),
                }
                for item in order.items.all()
                if item.product_id in product_ids
            ]
            data.append({
                "id": order.id,
                "status": order.status,
                "total_price": str(order.total_price),
                "buyer": order.user.username,
                "buyer_phone": getattr(order.user, "phone_number", ""),
                "shipping_city": order.shipping_city,
                "shipping_address": order.shipping_address_line1,
                "items": seller_items,
                "created_at": order.created_at.isoformat(),
            })

        return Response(data)


class SellerOrderUpdateAPIView(APIView):
    """PUT /api/seller/orders/<order_id>/status"""
    permission_classes = [SellerPermission]

    def put(self, request, order_id):
        new_status = request.data.get("status")
        allowed = ["shipped", "delivered", "cancelled"]
        if new_status not in allowed:
            return Response({"detail": f"Allowed transitions: {allowed}"}, status=400)

        seller = request.user
        product_ids = list(Product.objects.filter(seller=seller).values_list("id", flat=True))
        order_ids = list(OrderItem.objects.filter(product_id__in=product_ids).values_list("order_id", flat=True).distinct())

        if int(order_id) not in order_ids:
            from django.http import Http404
            raise Http404

        order = get_object_or_404(Order, id=order_id)
        if order.status == "pending":
            return Response({"detail": "Order must be paid before shipping."}, status=400)

        order.status = new_status
        order.save(update_fields=["status"])
        return Response({"message": "Order status updated", "status": order.status})


# ── Seller's products ─────────────────────────────────────────────────────────
class SellerProductsAPIView(APIView):
    permission_classes = [SellerPermission]

    def get(self, request):
        qs = Product.objects.filter(seller=request.user).select_related("category").prefetch_related("images").order_by("-created_at")
        return Response(ProductSerializer(qs, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = ProductSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductSerializer(product, context={"request": request}).data, status=201)


class SellerProductDetailAPIView(APIView):
    permission_classes = [SellerPermission]

    def _get_own(self, request, pk):
        return get_object_or_404(Product, pk=pk, seller=request.user)

    def get(self, request, pk):
        p = self._get_own(request, pk)
        return Response(ProductSerializer(p, context={"request": request}).data)

    def put(self, request, pk):
        p = self._get_own(request, pk)
        serializer = ProductSerializer(p, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProductSerializer(p, context={"request": request}).data)

    def delete(self, request, pk):
        p = self._get_own(request, pk)
        p.delete()
        return Response(status=204)


# ── Categories (read-only for sellers) ───────────────────────────────────────
class CategoryListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cats = Category.objects.all().order_by("name")
        return Response(CategorySerializer(cats, many=True).data)
