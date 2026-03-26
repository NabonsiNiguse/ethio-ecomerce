from django.urls import path
from .seller_views import (
    SellerAnalyticsAPIView,
    SellerOrdersAPIView,
    SellerOrderUpdateAPIView,
    SellerProductsAPIView,
    SellerProductDetailAPIView,
    CategoryListAPIView,
)

urlpatterns = [
    path("analytics", SellerAnalyticsAPIView.as_view(), name="seller-analytics"),
    path("orders", SellerOrdersAPIView.as_view(), name="seller-orders"),
    path("orders/<int:order_id>/status", SellerOrderUpdateAPIView.as_view(), name="seller-order-update"),
    path("products", SellerProductsAPIView.as_view(), name="seller-products"),
    path("products/<int:pk>", SellerProductDetailAPIView.as_view(), name="seller-product-detail"),
    path("categories", CategoryListAPIView.as_view(), name="seller-categories"),
]
