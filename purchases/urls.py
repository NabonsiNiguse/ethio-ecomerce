from django.urls import path

from .views import AddToCartAPIView, CartDetailAPIView, CheckoutAPIView, OrderListAPIView, RemoveFromCartAPIView
from .analytics_views import BuyerAnalyticsAPIView

urlpatterns = [
    path("cart/add", AddToCartAPIView.as_view(), name="cart-add"),
    path("cart", CartDetailAPIView.as_view(), name="cart-detail"),
    path("cart/remove", RemoveFromCartAPIView.as_view(), name="cart-remove"),
    path("orders/checkout", CheckoutAPIView.as_view(), name="orders-checkout"),
    path("orders/", OrderListAPIView.as_view(), name="orders-list"),
    path("orders/analytics", BuyerAnalyticsAPIView.as_view(), name="orders-analytics"),
]

