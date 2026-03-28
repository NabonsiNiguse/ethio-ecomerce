"""
Run with: python manage.py shell < setup_accounts.py
Creates/updates buyer and seller accounts.
"""
from accounts.models import User, SellerProfile

# ── 1. Buyer account ──────────────────────────────────────────────────────────
buyer_email = "pawloseniguse@gmail.com"
buyer_pass  = "@pawli5372"

buyer, created = User.objects.get_or_create(
    email__iexact=buyer_email,
    defaults={
        "username":    "pawlos",
        "email":       buyer_email,
        "phone_number": "0911000001",
        "role":        "customer",
        "is_verified": True,
        "is_active":   True,
    }
)
if not created:
    buyer.email       = buyer_email
    buyer.role        = "customer"
    buyer.is_verified = True
    buyer.is_active   = True
buyer.set_password(buyer_pass)
buyer.save()
print(f"{'Created' if created else 'Updated'} buyer: {buyer.email} | username: {buyer.username}")

# ── 2. Seller account ─────────────────────────────────────────────────────────
seller_email = "bonsiniguse@gmail.com"
seller_pass  = "@bonsi5372"

seller, created = User.objects.get_or_create(
    email__iexact=seller_email,
    defaults={
        "username":    "bonsi",
        "email":       seller_email,
        "phone_number": "0911000002",
        "role":        "seller",
        "is_verified": True,
        "is_active":   True,
    }
)
if not created:
    seller.email       = seller_email
    seller.role        = "seller"
    seller.is_verified = True
    seller.is_active   = True
seller.set_password(seller_pass)
seller.save()
print(f"{'Created' if created else 'Updated'} seller: {seller.email} | username: {seller.username}")

# Ensure seller has an approved SellerProfile
sp, sp_created = SellerProfile.objects.get_or_create(
    user=seller,
    defaults={
        "full_name":       "Bonsi Niguse",
        "store_name":      "Bonsi Store",
        "business_city":   "Addis Ababa",
        "business_region": "Addis Ababa",
        "business_country":"Ethiopia",
        "onboarding_step": 5,
        "is_approved":     True,
    }
)
if not sp_created:
    sp.is_approved     = True
    sp.onboarding_step = 5
    if not sp.store_name:
        sp.store_name = "Bonsi Store"
    sp.save()
print(f"{'Created' if sp_created else 'Updated'} seller profile: approved={sp.is_approved}, store={sp.store_name}")

print("\n✅ Done. Credentials:")
print(f"  Buyer  → email: {buyer_email}  | password: {buyer_pass}")
print(f"  Seller → email: {seller_email} | password: {seller_pass}")
