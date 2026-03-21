from decimal import Decimal

from catalog.models import Product
from rest_framework import serializers

from .models import Cart, CartItem, Order, OrderItem


class ProductInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("id", "name", "price")


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductInlineSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "line_total", "added_at")

    def get_line_total(self, obj: CartItem):
        return (obj.quantity * obj.product.price).quantize(Decimal("0.01"))


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "is_active", "items", "total_price", "updated_at")

    def get_total_price(self, obj: Cart):
        total = Decimal("0.00")
        # `items` is prefetched with products in the view for efficiency.
        for item in obj.items.all():
            total += item.quantity * item.product.price
        return total.quantize(Decimal("0.01"))


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, default=1)


class RemoveFromCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductInlineSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "unit_price", "quantity", "line_total")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "status", "total_price", "items", 
            "shipping_full_name", "shipping_phone", 
            "shipping_address_line1", "shipping_address_line2",
            "shipping_city", "shipping_state", "shipping_postal_code", "shipping_country",
            "created_at", "updated_at"
        )


class CheckoutSerializer(serializers.Serializer):
    """Serializer for checkout with shipping address"""
    shipping_address = serializers.DictField(required=True)
    
    def validate_shipping_address(self, value):
        required_fields = ['full_name', 'phone', 'address_line1', 'city', 'country']
        for field in required_fields:
            if not value.get(field):
                raise serializers.ValidationError(f"{field} is required")
        return value

