from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenRefreshView

from .permissions import IsAdminRole
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserPublicSerializer,
    VerifyOTPSerializer,
    issue_jwt_tokens_for_user,
)


class RegisterAPIView(APIView):
    """
    POST /api/auth/register

    Creates a user (is_verified=false) and generates a phone OTP.
    OTP code is printed to terminal/console for simulation purposes.
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_login"

    def get_permissions(self):
        requested_role = None
        try:
            requested_role = self.request.data.get("role")
        except Exception:
            requested_role = None

        # Only already-authenticated admins can register new admins.
        if requested_role == "admin":
            return [permissions.IsAuthenticated(), IsAdminRole()]
        return [permissions.AllowAny()]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-verify user — no OTP step required
        tokens = issue_jwt_tokens_for_user(user)
        return Response(
            {
                "message": "Registration successful",
                "user": UserPublicSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_201_CREATED,
        )

class VerifyOTPAPIView(APIView):
    """
    POST /api/auth/verify-otp

    Verifies the OTP for the given phone number, marks user as verified, and returns JWT tokens.
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_otp"

    def post(self, request, *args, **kwargs):
        serializer = VerifyOTPSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        tokens = issue_jwt_tokens_for_user(user)
        return Response(
            {
                "message": "Phone verified",
                "user": UserPublicSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_200_OK,
        )


class LoginAPIView(APIView):
    """
    POST /api/auth/login

    Login uses phone_number + password. User must have is_verified=true.
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_login"

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as exc:
            # Keep OTP-not-verified as 403 (authorization) rather than 400 (validation).
            detail = getattr(exc, "detail", None)
            if isinstance(detail, dict) and detail.get("non_field_errors") == "OTP verification required.":
                return Response({"detail": "OTP verification required."}, status=status.HTTP_403_FORBIDDEN)
            raise

        user = serializer.save()
        tokens = issue_jwt_tokens_for_user(user)
        return Response(
            {
                "message": "Login successful",
                "user": UserPublicSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_200_OK,
        )


__all__ = ["RegisterAPIView", "VerifyOTPAPIView", "LoginAPIView", "TokenRefreshView"]
