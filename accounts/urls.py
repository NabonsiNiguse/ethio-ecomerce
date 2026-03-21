from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginAPIView, RegisterAPIView, VerifyOTPAPIView

urlpatterns = [
    path("register", RegisterAPIView.as_view(), name="auth-register"),
    path("login", LoginAPIView.as_view(), name="auth-login"),
    path("verify-otp", VerifyOTPAPIView.as_view(), name="auth-verify-otp"),
    path("refresh", TokenRefreshView.as_view(), name="auth-refresh"),
]

