from django.contrib import admin
from .models import Cart, CartItem, Order, OrderItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    fields = ("product", "quantity", "added_at")
    readonly_fields = ("added_at",)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ("product", "quantity", "unit_price", "line_total")
    readonly_fields = ("line_total",)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_active", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("user__username",)
    inlines = [CartItemInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_price", "shipping_city", "shipping_country", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username", "shipping_full_name", "shipping_phone")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)
