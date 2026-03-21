from django.urls import path

from .views import AssignDeliveryAPIView, DeliveryStatusUpdateAPIView

urlpatterns = [
    path("delivery/assign", AssignDeliveryAPIView.as_view(), name="delivery-assign"),
    path("delivery/status", DeliveryStatusUpdateAPIView.as_view(), name="delivery-status"),
]

