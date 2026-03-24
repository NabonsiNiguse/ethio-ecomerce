from django.urls import path

from .views import (
    AgentLocationUpdateAPIView,
    AssignDeliveryAPIView,
    ConfirmDeliveryOTPAPIView,
    DeliveryByOrderAPIView,
    DeliveryFeeEstimateAPIView,
    DeliveryStatusUpdateAPIView,
    MyDeliveriesAPIView,
)

urlpatterns = [
    # Feature 1.1 — Geofence pricing
    path("delivery/estimate-fee", DeliveryFeeEstimateAPIView.as_view(), name="delivery-estimate-fee"),

    # Feature 1.2 — Dispatch
    path("delivery/assign",   AssignDeliveryAPIView.as_view(),        name="delivery-assign"),
    path("delivery/status",   DeliveryStatusUpdateAPIView.as_view(),  name="delivery-status"),
    path("delivery/location", AgentLocationUpdateAPIView.as_view(),   name="delivery-location"),

    # Feature 1.3 — OTP confirmation
    path("delivery/confirm-otp", ConfirmDeliveryOTPAPIView.as_view(), name="delivery-confirm-otp"),

    # Buyer: get delivery info for a specific order
    path("delivery/order/<int:order_id>", DeliveryByOrderAPIView.as_view(), name="delivery-by-order"),

    # Rider: get their assigned deliveries
    path("delivery/my-deliveries", MyDeliveriesAPIView.as_view(), name="my-deliveries"),
]
