from django.urls import path
from .views import InitiatePaymentAPIView, VerifyPaymentAPIView, ChapaWebhookAPIView

urlpatterns = [
    path("payments/initiate", InitiatePaymentAPIView.as_view(), name="payments-initiate"),
    path("payments/verify", VerifyPaymentAPIView.as_view(), name="payments-verify"),
    path("payments/webhook", ChapaWebhookAPIView.as_view(), name="payments-webhook"),
]

