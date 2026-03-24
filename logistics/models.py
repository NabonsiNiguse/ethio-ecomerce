import math
import secrets

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone

from purchases.models import Order


# ── Tiered delivery pricing (ETB) ────────────────────────────────────────────
DELIVERY_TIERS = [
    (5,   50),   # 0–5 km   → 50 ETB
    (10,  80),   # 5–10 km  → 80 ETB
    (20,  120),  # 10–20 km → 120 ETB
    (50,  200),  # 20–50 km → 200 ETB
    (100, 350),  # 50–100 km→ 350 ETB
]
DELIVERY_FEE_BEYOND = 500  # > 100 km


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_delivery_fee(distance_km: float) -> int:
    """Return delivery fee in ETB for a given distance."""
    for max_km, fee in DELIVERY_TIERS:
        if distance_km <= max_km:
            return fee
    return DELIVERY_FEE_BEYOND


class DeliveryAgent(models.Model):
    """Delivery agent profile tied to the custom User."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="delivery_agent",
    )
    is_active = models.BooleanField(default=True)

    # Agent's current location (updated by the rider app / mobile)
    current_lat = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return f"DeliveryAgent(user_id={self.user_id})"


class Delivery(models.Model):
    """Delivery lifecycle for an Order."""

    class Status(models.TextChoices):
        pending  = "pending",   "pending"    # waiting for a rider to accept
        assigned = "assigned",  "assigned"   # rider accepted / admin assigned
        picked   = "picked",    "picked"     # rider picked up the parcel
        delivered = "delivered", "delivered" # buyer confirmed via OTP

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="delivery")
    delivery_agent = models.ForeignKey(
        DeliveryAgent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.pending
    )

    # Snapshot of the buyer's address at checkout time
    shipping_address = models.CharField(max_length=255, blank=True, default="")

    # ── Geo / pricing ────────────────────────────────────────────────────────
    seller_lat = models.FloatField(null=True, blank=True)
    seller_lon = models.FloatField(null=True, blank=True)
    buyer_lat  = models.FloatField(null=True, blank=True)
    buyer_lon  = models.FloatField(null=True, blank=True)
    distance_km = models.FloatField(null=True, blank=True)
    delivery_fee = models.PositiveIntegerField(default=0)  # ETB

    # ── Delivery OTP (Feature 1.3) ───────────────────────────────────────────
    otp_hash     = models.CharField(max_length=255, blank=True, default="")
    otp_verified = models.BooleanField(default=False)

    # ── Timestamps ───────────────────────────────────────────────────────────
    assigned_at  = models.DateTimeField(null=True, blank=True)
    picked_at    = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(default=timezone.now)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status"])]

    # ── OTP helpers ──────────────────────────────────────────────────────────
    @staticmethod
    def generate_otp() -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    def set_otp(self, plain: str) -> None:
        self.otp_hash = make_password(plain)

    def verify_otp(self, plain: str) -> bool:
        if not self.otp_hash:
            return False
        return check_password(plain, self.otp_hash)

    # ── Geo helpers ──────────────────────────────────────────────────────────
    def compute_fee(self) -> None:
        """Compute distance and delivery fee from stored lat/lon pairs."""
        if all(v is not None for v in [self.seller_lat, self.seller_lon, self.buyer_lat, self.buyer_lon]):
            self.distance_km = round(
                haversine_km(self.seller_lat, self.seller_lon, self.buyer_lat, self.buyer_lon), 2
            )
            self.delivery_fee = calculate_delivery_fee(self.distance_km)

    def __str__(self) -> str:
        return f"Delivery(order_id={self.order_id}, status={self.status})"
