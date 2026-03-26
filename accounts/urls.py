from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginAPIView, RegisterAPIView, VerifyOTPAPIView
from .seller_registration_views import (
    SellerRegisterAPIView,
    SellerResendOTPAPIView,
    SellerVerifyOTPAPIView,
    SellerOnboardingAPIView,
    SellerDocumentUploadAPIView,
)

urlpatterns = [
    path("register", RegisterAPIView.as_view(), name="auth-register"),
    path("login", LoginAPIView.as_view(), name="auth-login"),
    path("verify-otp", VerifyOTPAPIView.as_view(), name="auth-verify-otp"),
    path("refresh", TokenRefreshView.as_view(), name="auth-refresh"),
    # Seller registration flow
    path("seller/register",         SellerRegisterAPIView.as_view(),      name="seller-register"),
    path("seller/send-otp",         SellerResendOTPAPIView.as_view(),      name="seller-send-otp"),
    path("seller/verify-otp",       SellerVerifyOTPAPIView.as_view(),      name="seller-verify-otp"),
    path("seller/onboarding",       SellerOnboardingAPIView.as_view(),     name="seller-onboarding"),
    path("seller/upload-document",  SellerDocumentUploadAPIView.as_view(), name="seller-upload-doc"),
]

