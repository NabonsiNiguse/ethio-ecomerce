from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from catalog.models import Product


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Cart(user_id={self.user_id})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["cart", "product"], name="unique_cart_product"),
        ]
        indexes = [
            models.Index(fields=["cart", "product"]),
        ]

    def __str__(self) -> str:
        return f"CartItem(cart_id={self.cart_id}, product_id={self.product_id}, qty={self.quantity})"


class Order(models.Model):
    class Status(models.TextChoices):
        pending = "pending", "pending"
        paid = "paid", "paid"
        shipped = "shipped", "shipped"
        delivered = "delivered", "delivered"
        cancelled = "cancelled", "cancelled"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.pending)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    
    # Shipping address fields
    shipping_full_name = models.CharField(max_length=200, blank=True, default='')
    shipping_phone = models.CharField(max_length=20, blank=True, default='')
    shipping_address_line1 = models.CharField(max_length=255, blank=True, default='')
    shipping_address_line2 = models.CharField(max_length=255, blank=True, default='')
    shipping_city = models.CharField(max_length=100, blank=True, default='')
    shipping_state = models.CharField(max_length=100, blank=True, default='')
    shipping_postal_code = models.CharField(max_length=20, blank=True, default='')
    shipping_country = models.CharField(max_length=100, blank=True, default='Ethiopia')
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Order(id={self.id}, user_id={self.user_id}, status={self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")

    unit_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.00"))])
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        indexes = [
            models.Index(fields=["order", "product"]),
        ]

    def __str__(self) -> str:
        return f"OrderItem(order_id={self.order_id}, product_id={self.product_id}, qty={self.quantity})"
