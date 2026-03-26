from django.urls import path
from .admin_views import (
    AdminAnalyticsAPIView,
    AdminUsersAPIView,
    AdminUserDetailAPIView,
    AdminProductsAPIView,
    AdminProductDeleteAPIView,
    AdminOrdersAPIView,
    AdminOrderUpdateAPIView,
    AdminPaymentsAPIView,
)

urlpatterns = [
    path("analytics",              AdminAnalyticsAPIView.as_view(),   name="admin-analytics"),
    path("users",                  AdminUsersAPIView.as_view(),        name="admin-users"),
    path("users/<int:user_id>",    AdminUserDetailAPIView.as_view(),   name="admin-user-detail"),
    path("products",               AdminProductsAPIView.as_view(),     name="admin-products"),
    path("products/<int:pk>",      AdminProductDeleteAPIView.as_view(),name="admin-product-delete"),
    path("orders",                 AdminOrdersAPIView.as_view(),       name="admin-orders"),
    path("orders/<int:order_id>",  AdminOrderUpdateAPIView.as_view(),  name="admin-order-update"),
    path("payments",               AdminPaymentsAPIView.as_view(),     name="admin-payments"),
]
