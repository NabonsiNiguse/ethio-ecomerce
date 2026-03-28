"""
Standalone script — run directly: python setup_accounts_standalone.py
Sets up buyer and seller accounts without needing daphne.
"""
import os
import sys
import django

# Temporarily remove daphne from INSTALLED_APPS to avoid import error
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Patch settings before setup to remove daphne if not installed
import importlib
import config.settings as _s

_original_apps = list(_s.INSTALLED_APPS)
_s.INSTALLED_APPS = [a for a in _s.INSTALLED_APPS if a != "daphne"]

django.setup()

from accounts.models import User, SellerProfile

# ── Buyer ─────────────────────────────────────────────────────────────────────
buyer_email = "pawloseniguse@gmail.com"
buyer_pass  = "@pawli5372"

buyer = User.objects.filter(email__iexact=buyer_email).first()
if buyer:
    print(f"Found existing buyer: {buyer.email} (username: {buyer.username})")
    buyer.role        = "customer"
    buyer.is_verified = True
    buyer.is_active   = True
else:
    # Generate unique username
    base = "pawlos"
    username = base
    i = 1
    while User.objects.filter(username__iexact=username).exists():
        username = f"{base}{i}"; i += 1

    buyer = User(
        username=username,
        email=buyer_email,
        phone_number="0911000001",
        role="customer",
        is_verified=True,
        is_active=True,
    )
    print(f"Creating buyer: {buyer_email} (username: {username})")

buyer.set_password(buyer_pass)
buyer.save()
print(f"✅ Buyer saved — email: {buyer.email} | username: {buyer.username}")

# ── Seller ────────────────────────────────────────────────────────────────────
seller_email = "bonsiniguse@gmail.com"
seller_pass  = "@bonsi5372"

seller = User.objects.filter(email__iexact=seller_email).first()
if seller:
    print(f"Found existing seller: {seller.email} (username: {seller.username})")
    seller.role        = "seller"
    seller.is_verified = True
    seller.is_active   = True
else:
    base = "bonsi"
    username = base
    i = 1
    while User.objects.filter(username__iexact=username).exists():
        username = f"{base}{i}"; i += 1

    seller = User(
        username=username,
        email=seller_email,
        phone_number="0911000002",
        role="seller",
        is_verified=True,
        is_active=True,
    )
    print(f"Creating seller: {seller_email} (username: {username})")

seller.set_password(seller_pass)
seller.save()
print(f"✅ Seller saved — email: {seller.email} | username: {seller.username}")

# ── Seller profile ────────────────────────────────────────────────────────────
sp, sp_created = SellerProfile.objects.get_or_create(
    user=seller,
    defaults={
        "full_name":        "Bonsi Niguse",
        "store_name":       "Bonsi Store",
        "business_city":    "Addis Ababa",
        "business_region":  "Addis Ababa",
        "business_country": "Ethiopia",
        "onboarding_step":  5,
        "is_approved":      True,
    }
)
if not sp_created:
    sp.is_approved     = True
    sp.onboarding_step = 5
    if not sp.store_name:
        sp.store_name = "Bonsi Store"
    sp.save()

print(f"✅ Seller profile — store: '{sp.store_name}' | approved: {sp.is_approved}")

print("\n" + "="*50)
print("CREDENTIALS SUMMARY")
print("="*50)
print(f"  Buyer  → {buyer_email}")
print(f"           password: {buyer_pass}")
print(f"           username: {buyer.username}")
print(f"  Seller → {seller_email}")
print(f"           password: {seller_pass}")
print(f"           username: {seller.username}")
print(f"           store:    {sp.store_name}")
print("="*50)
