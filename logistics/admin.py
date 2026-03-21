from django.contrib import admin
from .models import DeliveryAgent, Delivery


@admin.register(DeliveryAgent)
class DeliveryAgentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("user__username",)


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "delivery_agent", "status", "shipping_address", "created_at")
    list_filter = ("status",)
    search_fields = ("order__id", "shipping_address")
    ordering = ("-created_at",)
