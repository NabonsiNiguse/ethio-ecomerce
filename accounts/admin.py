from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTPVerification, Profile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("id", "username", "email", "phone_number", "role", "is_verified", "is_active", "date_joined")
    list_filter = ("role", "is_verified", "is_active")
    search_fields = ("username", "email", "phone_number")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Custom Fields", {"fields": ("phone_number", "role", "is_verified")}),
    )
    ordering = ("-date_joined",)


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "phone_number", "created_at", "expires_at", "attempts")
    search_fields = ("phone_number",)
    ordering = ("-created_at",)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "city", "region")
    search_fields = ("user__username", "city")
