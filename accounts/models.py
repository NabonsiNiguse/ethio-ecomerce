import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def normalize_phone_number(phone_number: str) -> str:
    """
    Basic normalization:
    - keep digits
    - drop leading '+' if present
    """
    digits = "".join(ch for ch in (phone_number or "") if ch.isdigit())
    return digits


class User(AbstractUser):
    class Roles(models.TextChoices):
        admin = "admin", _("admin")
        seller = "seller", _("seller")
        customer = "customer", _("customer")

    id = models.BigAutoField(primary_key=True)

    # Ensure email is globally unique.
    email = models.EmailField(_("email address"), unique=True)
    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.customer)
    is_verified = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # Normalize phone consistently for uniqueness lookups.
        if self.phone_number:
            self.phone_number = normalize_phone_number(self.phone_number)
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"


class OTPVerification(models.Model):
    """
    OTP verification for phone-based login.
    Stores only a hashed OTP (code), never the plain value.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="otp_verifications")
    phone_number = models.CharField(max_length=20, db_index=True)
    otp_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)

    OTP_TTL_MINUTES = 10
    MAX_ATTEMPTS = 5

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @staticmethod
    def generate_otp_code() -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    @classmethod
    def create_for_user(cls, *, user: settings.AUTH_USER_MODEL, phone_number: str) -> tuple["OTPVerification", str]:
        otp_code = cls.generate_otp_code()
        otp_obj = cls.objects.create(
            user=user,
            phone_number=normalize_phone_number(phone_number),
            otp_hash=make_password(otp_code),
            expires_at=timezone.now() + timedelta(minutes=cls.OTP_TTL_MINUTES),
        )
        return otp_obj, otp_code

    def verify(self, *, otp_code: str) -> bool:
        if self.is_expired():
            return False
        return check_password(otp_code, self.otp_hash)

    def __str__(self) -> str:
        return f"OTP for {self.phone_number} (expires {self.expires_at.isoformat()})"


class Profile(models.Model):
    """
    User profile information.

    Linked OneToOne with the custom User model.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")

    # Store an image URL (or data URL) to avoid requiring Pillow for ImageField.
    profile_image = models.URLField(null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=120, null=True, blank=True)
    region = models.CharField(max_length=120, null=True, blank=True)

    def __str__(self) -> str:
        return f"Profile({self.user_id})"
