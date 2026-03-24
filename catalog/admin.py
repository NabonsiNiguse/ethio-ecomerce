"""
catalog/admin.py — Full admin control for Categories, Products, Images.
"""
from django.contrib import admin
from django.db.models import Count, Sum, Avg
from django.utils.html import format_html, mark_safe

from .models import Category, Product, ProductImage


# ── Inlines ───────────────────────────────────────────────────────────────────

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image_preview", "image_url", "sort_order")
    readonly_fields = ("image_preview",)
    ordering = ("sort_order",)

    def image_preview(self, obj):
        if obj and obj.image_url:
            return format_html('<img src="{}" style="height:50px;border-radius:6px;object-fit:cover;" />', obj.image_url)
        return "—"
    image_preview.short_description = "Preview"


class ProductInline(admin.TabularInline):
    model = Product
    extra = 0
    fields = ("name", "price", "stock", "seller")
    readonly_fields = ("name", "price", "stock", "seller")
    show_change_link = True
    can_delete = False


# ── Category Admin ────────────────────────────────────────────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "parent", "product_count")
    search_fields = ("name",)
    list_filter = ("parent",)
    list_per_page = 50
    inlines = [ProductInline]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_product_count=Count("products"))

    def product_count(self, obj):
        return obj._product_count
    product_count.short_description = "Products"
    product_count.admin_order_field = "_product_count"


# ── Product Admin ─────────────────────────────────────────────────────────────

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id", "thumbnail", "name", "category", "seller_link",
        "price_display", "stock_badge", "order_count", "created_at",
    )
    list_display_links = ("id", "name")
    list_filter = ("category", "created_at")
    search_fields = ("name", "description", "seller__username")
    inlines = [ProductImageInline]
    ordering = ("-created_at",)
    list_per_page = 30
    list_editable = ("price",) if False else ()  # enable if needed
    readonly_fields = ("created_at", "thumbnail_large")

    fieldsets = (
        ("Product Info", {
            "fields": ("name", "description", "category", "seller"),
        }),
        ("Pricing & Stock", {
            "fields": ("price", "stock"),
        }),
        ("Meta", {
            "fields": ("created_at", "thumbnail_large"),
            "classes": ("collapse",),
        }),
    )

    actions = ["mark_out_of_stock", "restock_100"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _order_count=Count("order_items"),
        ).select_related("category", "seller").prefetch_related("images")

    def thumbnail(self, obj):
        img = obj.images.first()
        if img:
            return format_html('<img src="{}" style="height:40px;width:40px;border-radius:6px;object-fit:cover;" />', img.image_url)
        return "—"
    thumbnail.short_description = ""

    def thumbnail_large(self, obj):
        img = obj.images.first()
        if img:
            return format_html('<img src="{}" style="height:120px;border-radius:8px;object-fit:cover;" />', img.image_url)
        return "No image"
    thumbnail_large.short_description = "Preview"

    def seller_link(self, obj):
        return format_html('<a href="/admin/accounts/user/{}/change/">{}</a>', obj.seller_id, obj.seller.username)
    seller_link.short_description = "Seller"

    def price_display(self, obj):
        return format_html('<strong style="color:#0f766e;">{} ETB</strong>', obj.price)
    price_display.short_description = "Price"
    price_display.admin_order_field = "price"

    def stock_badge(self, obj):
        if obj.stock == 0:
            return mark_safe('<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">Out of Stock</span>')
        if obj.stock <= 10:
            return format_html('<span style="background:#d97706;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">Low: {}</span>', obj.stock)
        return format_html('<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">{} in stock</span>', obj.stock)
    stock_badge.short_description = "Stock"
    stock_badge.admin_order_field = "stock"

    def order_count(self, obj):
        return obj._order_count
    order_count.short_description = "Sold"
    order_count.admin_order_field = "_order_count"

    @admin.action(description="📦 Set stock to 0 (out of stock)")
    def mark_out_of_stock(self, request, queryset):
        updated = queryset.update(stock=0)
        self.message_user(request, f"{updated} product(s) marked out of stock.")

    @admin.action(description="🔄 Restock selected products to 100")
    def restock_100(self, request, queryset):
        updated = queryset.update(stock=100)
        self.message_user(request, f"{updated} product(s) restocked to 100.")


# ── ProductImage Admin ────────────────────────────────────────────────────────

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "image_preview", "sort_order", "created_at")
    search_fields = ("product__name",)
    ordering = ("product", "sort_order")
    list_per_page = 50

    def image_preview(self, obj):
        if obj.image_url:
            return format_html('<img src="{}" style="height:40px;border-radius:6px;object-fit:cover;" />', obj.image_url)
        return "—"
    image_preview.short_description = "Preview"
