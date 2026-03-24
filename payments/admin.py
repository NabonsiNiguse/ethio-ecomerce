"""
payments/admin.py — Full admin control for Payments.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id", "user_link", "order_link", "amount_display",
        "status_badge", "transaction_id", "created_at",
    )
    list_display_links = ("id", "transaction_id")
    list_filter = ("status", "created_at")
    search_fields = ("transaction_id", "user__username", "user__email", "order__id")
    ordering = ("-created_at",)
    list_per_page = 40
    readonly_fields = ("user", "order", "amount", "transaction_id", "created_at", "updated_at")

    fieldsets = (
        ("Payment Info", {
            "fields": ("user", "order", "amount", "status", "transaction_id"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ["mark_paid", "mark_failed"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "order")

    def user_link(self, obj):
        return format_html('<a href="/admin/accounts/user/{}/change/">{}</a>', obj.user_id, obj.user.username)
    user_link.short_description = "User"

    def order_link(self, obj):
        return format_html('<a href="/admin/purchases/order/{}/change/">Order #{}</a>', obj.order_id, obj.order_id)
    order_link.short_description = "Order"

    def amount_display(self, obj):
        return format_html('<strong style="color:#0f766e;">{} ETB</strong>', obj.amount)
    amount_display.short_description = "Amount"
    amount_display.admin_order_field = "amount"

    def status_badge(self, obj):
        colors = {"pending": "#d97706", "paid": "#16a34a", "failed": "#dc2626"}
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    @admin.action(description="✅ Mark selected payments as Paid")
    def mark_paid(self, request, queryset):
        updated = queryset.filter(status="pending").update(status="paid")
        self.message_user(request, f"{updated} payment(s) marked as paid.")

    @admin.action(description="❌ Mark selected payments as Failed")
    def mark_failed(self, request, queryset):
        updated = queryset.filter(status="pending").update(status="failed")
        self.message_user(request, f"{updated} payment(s) marked as failed.")

    def changelist_view(self, request, extra_context=None):
        """Inject revenue summary into the changelist page."""
        extra_context = extra_context or {}
        qs = self.get_queryset(request)
        total_paid = qs.filter(status="paid").aggregate(t=Sum("amount"))["t"] or 0
        total_pending = qs.filter(status="pending").aggregate(t=Sum("amount"))["t"] or 0
        extra_context["total_paid"] = total_paid
        extra_context["total_pending"] = total_pending
        return super().changelist_view(request, extra_context=extra_context)
