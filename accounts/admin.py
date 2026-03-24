"""
accounts/admin.py — Full admin control for Users, OTP, Profiles.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html, mark_safe
from django.utils import timezone
from django.db.models import Count

from .models import User, OTPVerification, Profile


# ── Inline: Profile inside User ───────────────────────────────────────────────

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = "Profile"
    fields = ("profile_image_preview", "profile_image", "address", "city", "region")
    readonly_fields = ("profile_image_preview",)

    def profile_image_preview(self, obj):
        if obj and obj.profile_image:
            return format_html('<img src="{}" style="height:60px;border-radius:50%;" />', obj.profile_image)
        return "—"
    profile_image_preview.short_description = "Avatar"


# ── User Admin ────────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]

    list_display = (
        "id", "username", "email", "phone_number",
        "role_badge", "verified_badge", "is_active",
        "order_count", "date_joined",
    )
    list_display_links = ("id", "username")
    list_filter = ("role", "is_verified", "is_active", "date_joined")
    search_fields = ("username", "email", "phone_number")
    ordering = ("-date_joined",)
    list_per_page = 30

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Platform Fields", {
            "fields": ("phone_number", "role", "is_verified"),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("Platform Fields", {
            "fields": ("phone_number", "role", "is_verified"),
        }),
    )

    actions = ["verify_users", "unverify_users", "make_seller", "make_customer", "deactivate_users"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_order_count=Count("orders"))

    def order_count(self, obj):
        return obj._order_count
    order_count.short_description = "Orders"
    order_count.admin_order_field = "_order_count"

    def role_badge(self, obj):
        colors = {"admin": "#dc2626", "seller": "#d97706", "customer": "#0f766e"}
        color = colors.get(obj.role, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">{}</span>',
            color, obj.role.upper()
        )
    role_badge.short_description = "Role"

    def verified_badge(self, obj):
        if obj.is_verified:
            return mark_safe('<span style="color:#16a34a;font-weight:700;">✔ Verified</span>')
        return mark_safe('<span style="color:#dc2626;">✘ Unverified</span>')
    verified_badge.short_description = "Verified"

    @admin.action(description="✔ Mark selected users as verified")
    def verify_users(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} user(s) verified.")

    @admin.action(description="✘ Mark selected users as unverified")
    def unverify_users(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f"{updated} user(s) unverified.")

    @admin.action(description="🏪 Promote to Seller")
    def make_seller(self, request, queryset):
        updated = queryset.update(role="seller")
        self.message_user(request, f"{updated} user(s) promoted to seller.")

    @admin.action(description="👤 Set role to Customer")
    def make_customer(self, request, queryset):
        updated = queryset.update(role="customer")
        self.message_user(request, f"{updated} user(s) set to customer.")

    @admin.action(description="🚫 Deactivate selected users")
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} user(s) deactivated.")


# ── OTP Admin ─────────────────────────────────────────────────────────────────

@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "phone_number", "created_at", "expires_at", "attempts", "status_badge")
    list_filter = ("created_at",)
    search_fields = ("phone_number", "user__username")
    ordering = ("-created_at",)
    readonly_fields = ("user", "phone_number", "otp_hash", "created_at", "expires_at", "attempts")
    list_per_page = 40

    def status_badge(self, obj):
        if timezone.now() >= obj.expires_at:
            return mark_safe('<span style="color:#dc2626;font-weight:700;">Expired</span>')
        return mark_safe('<span style="color:#16a34a;font-weight:700;">Active</span>')
    status_badge.short_description = "Status"

    def has_add_permission(self, request):
        return False  # OTPs are system-generated only


# ── Profile Admin ─────────────────────────────────────────────────────────────

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "avatar_preview", "city", "region", "address")
    search_fields = ("user__username", "city", "region")
    list_per_page = 40

    def avatar_preview(self, obj):
        if obj.profile_image:
            return format_html('<img src="{}" style="height:36px;width:36px;border-radius:50%;object-fit:cover;" />', obj.profile_image)
        return "—"
    avatar_preview.short_description = "Avatar"
