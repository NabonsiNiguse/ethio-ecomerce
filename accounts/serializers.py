from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OTPVerification, normalize_phone_number, Profile

User = get_user_model()


def issue_jwt_tokens_for_user(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    # Embed key claims so the frontend can read role/username without an extra API call
    access = refresh.access_token
    access["username"]   = user.username
    access["email"]      = user.email
    access["role"]       = user.role
    access["is_verified"] = user.is_verified
    try:
        sp = user.seller_profile
        access["seller_approved"]  = sp.is_approved
        access["onboarding_step"]  = sp.onboarding_step
        access["store_name"]       = sp.store_name
    except Exception:
        access["seller_approved"] = False
        access["onboarding_step"] = 1
        access["store_name"]      = ""
    return {
        "access": str(access),
        "refresh": str(refresh),
    }


class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "phone_number", "role", "is_verified")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    role = serializers.ChoiceField(choices=User.Roles.choices)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_phone_number(self, value: str) -> str:
        normalized = normalize_phone_number(value)
        if not normalized:
            raise serializers.ValidationError("Invalid phone number.")
        if len(normalized) < 8:
            raise serializers.ValidationError("Phone number looks too short.")
        return normalized

    def validate(self, attrs):
        username = attrs.get("username")
        email = attrs.get("email")
        phone_number = attrs.get("phone_number")

        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError({"username": "Username already exists."})

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "Email already exists."})

        if User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({"phone_number": "Phone number already exists."})

        validate_password(attrs.get("password"), user=User(**{"username": username}))
        return attrs

    def create(self, validated_data):
        # Auto-verify on registration — no OTP step required.
        user = User(
            username=validated_data["username"],
            email=validated_data["email"],
            phone_number=validated_data["phone_number"],
            role=validated_data["role"],
            is_verified=True,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=6)

    def validate_phone_number(self, value: str) -> str:
        normalized = normalize_phone_number(value)
        if not normalized:
            raise serializers.ValidationError("Invalid phone number.")
        return normalized

    def validate_otp_code(self, value: str) -> str:
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("OTP code must be a 6-digit number.")
        return value

    def validate(self, attrs):
        phone_number = attrs["phone_number"]
        otp_code = attrs["otp_code"]

        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            raise serializers.ValidationError({"phone_number": "Phone number not found."})

        latest_otp = (
            OTPVerification.objects.filter(user=user, phone_number=phone_number)
            .order_by("-created_at")
            .first()
        )

        if not latest_otp or latest_otp.is_expired():
            raise serializers.ValidationError({"otp_code": "OTP is invalid or expired."})

        if not latest_otp.verify(otp_code=otp_code):
            latest_otp.attempts += 1
            if latest_otp.attempts >= OTPVerification.MAX_ATTEMPTS:
                latest_otp.expires_at = timezone.now()  # invalidate OTP after too many attempts
            latest_otp.save(update_fields=["attempts", "expires_at"])
            raise serializers.ValidationError({"otp_code": "OTP is incorrect."})

        attrs["user"] = user
        attrs["latest_otp"] = latest_otp
        return attrs

    def create(self, validated_data):
        user = validated_data["user"]
        # If already verified, just return tokens (idempotent verify).
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified"])

        # Delete OTP(s) for this phone to prevent reuse.
        OTPVerification.objects.filter(user=user, phone_number=user.phone_number).delete()
        return user


class LoginSerializer(serializers.Serializer):
    # Accept phone_number OR email — whichever the user provides
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email        = serializers.EmailField(required=False, allow_blank=True)
    password     = serializers.CharField(write_only=True)

    def validate_phone_number(self, value: str) -> str:
        if not value:
            return value
        normalized = normalize_phone_number(value)
        if not normalized:
            raise serializers.ValidationError("Invalid phone number.")
        return normalized

    def validate(self, attrs):
        phone_number = attrs.get("phone_number", "").strip()
        email        = attrs.get("email", "").strip()
        password     = attrs["password"]

        if not phone_number and not email:
            raise serializers.ValidationError({"phone_number": "Phone number or email is required."})

        # Look up user by phone OR email
        user = None
        if phone_number:
            user = User.objects.filter(phone_number=phone_number).first()
        if not user and email:
            user = User.objects.filter(email__iexact=email).first()

        if not user:
            raise serializers.ValidationError({"phone_number": "Invalid credentials."})

        if not user.is_verified:
            raise serializers.ValidationError({"non_field_errors": "OTP verification required."})

        if not check_password(password, user.password):
            raise serializers.ValidationError({"password": "Invalid credentials."})

        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        return validated_data["user"]


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile management.
    """

    profile_image = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    city = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)
    region = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)

    class Meta:
        model = Profile
        fields = ("profile_image", "address", "city", "region")

