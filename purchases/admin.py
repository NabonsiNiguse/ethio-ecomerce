"""
purchases/admin.py — Full admin control for Carts, Orders, OrderItems.
"""
from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.db.models import Sum, Count

from .models import Cart, CartItem, Order, OrderItem


# ── Inlines ───────────────────────────────────────────────────────────────────

class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    fields = ("product", "quantity", "added_at")
    readonly_fields = ("added_at",)
    show_change_link = True


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ("product", "quantity", "unit_price", "line_total")
    readonly_fields = ("unit_price", "line_total")
    show_change_link = True


# ── Cart Admin ────────────────────────────────────────────────────────────────

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_active", "item_count", "created_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("user__username", "user__email")
    inlines = [CartItemInline]
    list_per_page = 40

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_item_count=Count("items"))

    def item_count(self, obj):
        return obj._item_count
    item_count.short_description = "Items"
    item_count.admin_order_field = "_item_count"


# ── Order Admin ───────────────────────────────────────────────────────────────

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id", "user_link", "status_badge", "total_price_display",
        "shipping_city", "shipping_country", "payment_status", "created_at",
    )
    list_display_links = ("id",)
    list_filter = ("status", "shipping_country", "created_at")
    search_fields = ("user__username", "user__email", "shipping_full_name", "shipping_phone")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)
    list_per_page = 30
    readonly_fields = ("created_at", "updated_at", "total_price")

    fieldsets = (
        ("Order Info", {
            "fields": ("user", "status", "total_price", "created_at", "updated_at"),
        }),
        ("Shipping Address", {
            "fields": (
                "shipping_full_name", "shipping_phone",
                "shipping_address_line1", "shipping_address_line2",
                "shipping_city", "shipping_state",
                "shipping_postal_code", "shipping_country",
            ),
        }),
    )

    actions = ["mark_shipped", "mark_delivered", "mark_cancelled"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("payment")

    def user_link(self, obj):
        return format_html('<a href="/admin/accounts/user/{}/change/">{}</a>', obj.user_id, obj.user.username)
    user_link.short_description = "Customer"

    def status_badge(self, obj):
        colors = {
            "pending":   "#6b7280",
            "paid":      "#0f766e",
            "shipped":   "#2563eb",
            "delivered": "#16a34a",
            "cancelled": "#dc2626",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def total_price_display(self, obj):
        return format_html('<strong>{} ETB</strong>', obj.total_price)
    total_price_display.short_description = "Total"
    total_price_display.admin_order_field = "total_price"

    def payment_status(self, obj):
        try:
            p = obj.payment
            colors = {"pending": "#d97706", "paid": "#16a34a", "failed": "#dc2626"}
            color = colors.get(p.status, "#6b7280")
            return format_html(
                '<span style="color:{};font-weight:700;">{}</span>', color, p.status.upper()
            )
        except Exception:
            return mark_safe('<span style="color:#9ca3af;">—</span>')
    payment_status.short_description = "Payment"

    @admin.action(description="🚚 Mark selected orders as Shipped")
    def mark_shipped(self, request, queryset):
        updated = queryset.filter(status="paid").update(status="shipped")
        self.message_user(request, f"{updated} order(s) marked as shipped.")

    @admin.action(description="✅ Mark selected orders as Delivered")
    def mark_delivered(self, request, queryset):
        updated = queryset.filter(status__in=["paid", "shipped"]).update(status="delivered")
        self.message_user(request, f"{updated} order(s) marked as delivered.")

    @admin.action(description="❌ Cancel selected orders")
    def mark_cancelled(self, request, queryset):
        updated = queryset.exclude(status__in=["delivered", "cancelled"]).update(status="cancelled")
        self.message_user(request, f"{updated} order(s) cancelled.")


# ── OrderItem Admin ───────────────────────────────────────────────────────────

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "quantity", "unit_price", "line_total")
    search_fields = ("order__id", "product__name")
    list_filter = ("order__status",)
    readonly_fields = ("line_total",)
    list_per_page = 50
