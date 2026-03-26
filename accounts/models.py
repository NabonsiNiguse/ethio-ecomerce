import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


def normalize_phone_number(phone_number: str) -> str:
    digits = "".join(ch for ch in (phone_number or "") if ch.isdigit())
    return digits


class User(AbstractUser):
    class Roles(models.TextChoices):
        admin = "admin", _("admin")
        seller = "seller", _("seller")
        customer = "customer", _("customer")

    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(_("email address"), unique=True)
    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=Roles.choices, default=Roles.customer)
    is_verified = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.phone_number:
            self.phone_number = normalize_phone_number(self.phone_number)
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"


class OTPVerification(models.Model):
    """
    Hashed OTP — 3 min TTL, max 3 verify attempts, is_used flag prevents reuse.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="otp_verifications")
    phone_number = models.CharField(max_length=20, db_index=True)
    otp_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    is_used = models.BooleanField(default=False)

    OTP_TTL_MINUTES = 3      # expires in 3 minutes
    MAX_ATTEMPTS = 3         # max 3 wrong guesses

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at or self.is_used

    @staticmethod
    def generate_otp_code() -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    @classmethod
    def create_for_user(cls, *, user, phone_number: str) -> tuple["OTPVerification", str]:
        # Invalidate all previous OTPs for this phone
        cls.objects.filter(user=user, phone_number=normalize_phone_number(phone_number)).update(is_used=True)
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
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    profile_image = models.URLField(null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=120, null=True, blank=True)
    region = models.CharField(max_length=120, null=True, blank=True)

    def __str__(self) -> str:
        return f"Profile({self.user_id})"


class SellerProfile(models.Model):
    """
    Extended seller onboarding data — filled in 4 steps.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_profile"
    )
    # Step 1
    full_name = models.CharField(max_length=200, blank=True, default="")
    # Step 2
    store_name = models.CharField(max_length=200, blank=True, default="")
    business_license_number = models.CharField(max_length=100, blank=True, default="")
    business_city = models.CharField(max_length=120, blank=True, default="")
    business_region = models.CharField(max_length=120, blank=True, default="")
    business_country = models.CharField(max_length=100, blank=True, default="Ethiopia")
    # Step 3
    document_url = models.URLField(blank=True, default="")
    document_type = models.CharField(
        max_length=20,
        choices=[("license", "Business License"), ("gov_id", "Government ID")],
        blank=True, default="",
    )
    # Step 4
    bank_name = models.CharField(max_length=100, blank=True, default="")
    bank_account_holder = models.CharField(max_length=200, blank=True, default="")
    bank_account_number = models.CharField(max_length=50, blank=True, default="")
    mobile_money_number = models.CharField(max_length=20, blank=True, default="")
    # Status
    onboarding_step = models.PositiveSmallIntegerField(default=1)
    is_approved = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"SellerProfile({self.user_id}, step={self.onboarding_step})"
