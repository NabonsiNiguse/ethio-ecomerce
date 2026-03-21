from decimal import Decimal

from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product

from .models import Cart, CartItem, Order, OrderItem
from .serializers import (
    AddToCartSerializer,
    CartSerializer,
    OrderSerializer,
    RemoveFromCartSerializer,
)


class AddToCartAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        payload = AddToCartSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        product_id = payload.validated_data["product_id"]
        quantity = payload.validated_data["quantity"]

        with transaction.atomic():
            cart, _ = Cart.objects.get_or_create(user=request.user, defaults={"is_active": True})

            product = get_object_or_404(Product, pk=product_id)

            # Lock product row so stock doesn't change mid-checkout.
            product = Product.objects.select_for_update().get(pk=product_id)

            if quantity > product.stock:
                return Response(
                    {"detail": "Not enough stock.", "available_stock": product.stock},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": 0})
            new_qty = item.quantity + quantity

            if new_qty > product.stock:
                return Response(
                    {"detail": "Not enough stock for requested quantity.", "available_stock": product.stock},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item.quantity = new_qty
            item.save(update_fields=["quantity"])

            # Prefetch products for the response.
            cart = (
                Cart.objects.select_related()
                .prefetch_related(Prefetch("items", queryset=CartItem.objects.select_related("product")))
                .get(pk=cart.pk)
            )

        return Response({"message": "Added to cart", "cart": CartSerializer(cart).data}, status=status.HTTP_200_OK)


class CartDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        cart = (
            Cart.objects.select_related()
            .prefetch_related(Prefetch("items", queryset=CartItem.objects.select_related("product")))
            .filter(user=request.user, is_active=True)
            .first()
        )
        if not cart:
            cart = Cart.objects.create(user=request.user, is_active=True)
            cart = (
                Cart.objects.select_related()
                .prefetch_related(Prefetch("items", queryset=CartItem.objects.select_related("product")))
                .get(pk=cart.pk)
            )

        return Response({"cart": CartSerializer(cart).data}, status=status.HTTP_200_OK)


class RemoveFromCartAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        payload = RemoveFromCartSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        product_id = payload.validated_data["product_id"]

        with transaction.atomic():
            cart = Cart.objects.filter(user=request.user, is_active=True).first()
            if not cart:
                return Response({"detail": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)

            CartItem.objects.filter(cart=cart, product_id=product_id).delete()

            cart = (
                Cart.objects.select_related()
                .prefetch_related(Prefetch("items", queryset=CartItem.objects.select_related("product")))
                .get(pk=cart.pk)
            )

        return Response({"message": "Removed from cart", "cart": CartSerializer(cart).data}, status=status.HTTP_200_OK)


class CheckoutAPIView(APIView):
    """
    POST /api/orders/checkout

    - Locks cart items + product rows
    - Creates Order + OrderItems with shipping address
    - Decrements product stock
    - Clears cart items
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Validate shipping address
        from .serializers import CheckoutSerializer
        checkout_data = CheckoutSerializer(data=request.data)
        checkout_data.is_valid(raise_exception=True)
        
        shipping = checkout_data.validated_data['shipping_address']
        
        with transaction.atomic():
            cart = Cart.objects.select_for_update().filter(user=request.user, is_active=True).first()
            if not cart:
                return Response({"detail": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)

            cart_items_qs = (
                CartItem.objects.select_related("product")
                .filter(cart=cart)
            )
            # Lock cart items for consistent checkout behavior under concurrency.
            cart_items_qs = cart_items_qs.select_for_update()
            cart_items = list(cart_items_qs)

            if not cart_items:
                return Response({"detail": "Cart is empty."}, status=status.HTTP_400_BAD_REQUEST)

            # Lock the involved products (stock decrement safety).
            product_ids = [ci.product_id for ci in cart_items]
            products = (
                Product.objects.select_for_update()
                .filter(id__in=product_ids)
            )
            product_map = {p.id: p for p in products}

            # Validate stock.
            for ci in cart_items:
                product = product_map.get(ci.product_id)
                if product is None:
                    return Response({"detail": "Product no longer exists.", "product_id": ci.product_id}, status=status.HTTP_400_BAD_REQUEST)
                if ci.quantity > product.stock:
                    return Response(
                        {"detail": "Not enough stock for checkout.", "available_stock": product.stock, "product_id": ci.product_id},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            order_total = Decimal("0.00")
            order = Order.objects.create(
                user=request.user, 
                status=Order.Status.pending, 
                total_price=Decimal("0.00"),
                shipping_full_name=shipping.get('full_name', ''),
                shipping_phone=shipping.get('phone', ''),
                shipping_address_line1=shipping.get('address_line1', ''),
                shipping_address_line2=shipping.get('address_line2', ''),
                shipping_city=shipping.get('city', ''),
                shipping_state=shipping.get('state', ''),
                shipping_postal_code=shipping.get('postal_code', ''),
                shipping_country=shipping.get('country', 'Ethiopia'),
            )

            order_items_to_create: list[OrderItem] = []
            for ci in cart_items:
                unit_price = product_map[ci.product_id].price
                line_total = (unit_price * ci.quantity).quantize(Decimal("0.01"))
                order_total += line_total

                order_items_to_create.append(
                    OrderItem(
                        order=order,
                        product_id=ci.product_id,
                        unit_price=unit_price,
                        quantity=ci.quantity,
                        line_total=line_total,
                    )
                )

            # Update stock in-memory first (then bulk update).
            for ci in cart_items:
                p = product_map[ci.product_id]
                p.stock = p.stock - ci.quantity
            Product.objects.bulk_update(list(product_map.values()), ["stock"])

            OrderItem.objects.bulk_create(order_items_to_create)
            order.total_price = order_total.quantize(Decimal("0.01"))
            order.save(update_fields=["total_price"])

            # Clear cart.
            cart_items_qs.delete()

            # Response with created order items
            order_refresh = (
                Order.objects.select_related()
                .prefetch_related("items__product")
                .get(pk=order.pk)
            )

        return Response({"message": "Checkout successful", "order": OrderSerializer(order_refresh).data}, status=status.HTTP_201_CREATED)


class OrderListAPIView(APIView):
    """
    GET /api/orders/
    Returns the authenticated user's order history, newest first.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        orders = (
            Order.objects.filter(user=request.user)
            .prefetch_related("items__product")
            .order_by("-created_at")
        )
        return Response(OrderSerializer(orders, many=True).data, status=status.HTTP_200_OK)
