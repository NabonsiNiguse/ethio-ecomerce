"""
logistics/admin.py — Full admin control for DeliveryAgents and Deliveries.
"""
from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.utils import timezone
from django.db.models import Count, Avg

from .models import DeliveryAgent, Delivery


# ── DeliveryAgent Admin ───────────────────────────────────────────────────────

@admin.register(DeliveryAgent)
class DeliveryAgentAdmin(admin.ModelAdmin):
    list_display = (
        "id", "user_link", "active_badge",
        "current_location", "delivery_count", "created_at",
    )
    list_filter = ("is_active",)
    search_fields = ("user__username", "user__email")
    readonly_fields = ("created_at", "location_updated_at")
    list_per_page = 40

    fieldsets = (
        ("Agent Info", {
            "fields": ("user", "is_active"),
        }),
        ("Current Location", {
            "fields": ("current_lat", "current_lon", "location_updated_at"),
        }),
        ("Meta", {
            "fields": ("created_at",),
            "classes": ("collapse",),
        }),
    )

    actions = ["activate_agents", "deactivate_agents"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").annotate(
            _delivery_count=Count("deliveries")
        )

    def user_link(self, obj):
        return format_html('<a href="/admin/accounts/user/{}/change/">{}</a>', obj.user_id, obj.user.username)
    user_link.short_description = "Rider"

    def active_badge(self, obj):
        if obj.is_active:
            return mark_safe('<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">Active</span>')
        return mark_safe('<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">Inactive</span>')
    active_badge.short_description = "Status"

    def current_location(self, obj):
        if obj.current_lat and obj.current_lon:
            url = f"https://maps.google.com/?q={obj.current_lat},{obj.current_lon}"
            return format_html('<a href="{}" target="_blank">📍 {:.4f}, {:.4f}</a>', url, obj.current_lat, obj.current_lon)
        return "—"
    current_location.short_description = "Location"

    def delivery_count(self, obj):
        return obj._delivery_count
    delivery_count.short_description = "Deliveries"
    delivery_count.admin_order_field = "_delivery_count"

    @admin.action(description="✅ Activate selected agents")
    def activate_agents(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} agent(s) activated.")

    @admin.action(description="🚫 Deactivate selected agents")
    def deactivate_agents(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} agent(s) deactivated.")


# ── Delivery Admin ────────────────────────────────────────────────────────────

@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = (
        "id", "order_link", "agent_link", "status_badge",
        "shipping_address", "distance_display", "fee_display",
        "otp_verified", "created_at",
    )
    list_display_links = ("id",)
    list_filter = ("status", "otp_verified", "created_at")
    search_fields = ("order__id", "shipping_address", "delivery_agent__user__username")
    ordering = ("-created_at",)
    list_per_page = 30
    readonly_fields = (
        "created_at", "updated_at",
        "assigned_at", "picked_at", "delivered_at",
        "distance_km", "delivery_fee", "otp_verified",
    )

    fieldsets = (
        ("Delivery Info", {
            "fields": ("order", "delivery_agent", "status", "shipping_address"),
        }),
        ("Geo & Pricing", {
            "fields": (
                "seller_lat", "seller_lon",
                "buyer_lat", "buyer_lon",
                "distance_km", "delivery_fee",
            ),
        }),
        ("OTP", {
            "fields": ("otp_hash", "otp_verified"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at", "assigned_at", "picked_at", "delivered_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ["assign_to_first_available", "mark_picked", "mark_delivered_admin"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "order__user", "delivery_agent__user"
        )

    def order_link(self, obj):
        return format_html('<a href="/admin/purchases/order/{}/change/">Order #{}</a>', obj.order_id, obj.order_id)
    order_link.short_description = "Order"

    def agent_link(self, obj):
        if obj.delivery_agent:
            return format_html(
                '<a href="/admin/logistics/deliveryagent/{}/change/">{}</a>',
                obj.delivery_agent_id, obj.delivery_agent.user.username
            )
        return mark_safe('<span style="color:#9ca3af;">Unassigned</span>')
    agent_link.short_description = "Rider"

    def status_badge(self, obj):
        colors = {
            "pending":   "#6b7280",
            "assigned":  "#2563eb",
            "picked":    "#d97706",
            "delivered": "#16a34a",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">{}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = "Status"
    status_badge.admin_order_field = "status"

    def distance_display(self, obj):
        if obj.distance_km is not None:
            return f"{obj.distance_km:.1f} km"
        return "—"
    distance_display.short_description = "Distance"

    def fee_display(self, obj):
        if obj.delivery_fee:
            return format_html('<strong>{} ETB</strong>', obj.delivery_fee)
        return "—"
    fee_display.short_description = "Fee"

    @admin.action(description="🚴 Assign to first available active agent")
    def assign_to_first_available(self, request, queryset):
        from .models import DeliveryAgent
        agent = DeliveryAgent.objects.filter(is_active=True).first()
        if not agent:
            self.message_user(request, "No active agents available.", level="error")
            return
        updated = queryset.filter(status="pending").update(
            delivery_agent=agent, status="assigned", assigned_at=timezone.now()
        )
        self.message_user(request, f"{updated} delivery(ies) assigned to {agent.user.username}.")

    @admin.action(description="📦 Mark selected deliveries as Picked")
    def mark_picked(self, request, queryset):
        updated = queryset.filter(status="assigned").update(status="picked", picked_at=timezone.now())
        self.message_user(request, f"{updated} delivery(ies) marked as picked.")

    @admin.action(description="✅ Mark selected deliveries as Delivered (admin override)")
    def mark_delivered_admin(self, request, queryset):
        updated = queryset.filter(status__in=["assigned", "picked"]).update(
            status="delivered", delivered_at=timezone.now(), otp_verified=True
        )
        self.message_user(request, f"{updated} delivery(ies) marked as delivered.")
