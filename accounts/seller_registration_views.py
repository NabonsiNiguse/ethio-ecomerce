"""
Seller registration endpoints:
  POST /api/auth/seller/register          — Step 1: create unverified seller + send OTP
  POST /api/auth/seller/send-otp          — Resend OTP (rate-limited: 3/min per IP)
  POST /api/auth/seller/verify-otp        — Verify OTP → mark verified + issue JWT
  PUT  /api/auth/seller/onboarding        — Steps 2-4: save business/doc/bank info
  POST /api/auth/seller/upload-document   — Upload doc to Cloudinary (or base64 fallback)
  GET  /api/auth/seller/onboarding        — Get current onboarding state
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle

from .models import OTPVerification, SellerProfile, User, normalize_phone_number
from .serializers import UserPublicSerializer, issue_jwt_tokens_for_user


def _send_otp_email(email: str, otp_code: str) -> None:
    """Send a beautifully formatted HTML OTP email."""
    import logging
    logger = logging.getLogger(__name__)

    from_email = settings.EMAIL_HOST_USER
    logger.info(f"[OTP] Sending to {email} from {from_email}")

    if not from_email:
        raise ValueError("EMAIL_HOST_USER is not configured in .env")

    subject = "🔐 Your Ethio eCommerce Verification Code"

    plain = (
        f"Your verification code is: {otp_code}\n\n"
        f"This code expires in {OTPVerification.OTP_TTL_MINUTES} minutes.\n"
        f"Do not share it with anyone.\n\n"
        f"Powered by STEM Engineering"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#f97316 0%,#e11d48 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">🇪🇹</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
              Ethio eCommerce
            </h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">
              Seller Verification
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700;">
              Your Verification Code
            </h2>
            <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
              Use the code below to verify your email and complete your seller registration.
            </p>

            <!-- OTP Box -->
            <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 8px;color:#9a3412;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">
                One-Time Password
              </p>
              <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#ea580c;font-family:'Courier New',monospace;">
                {otp_code}
              </div>
              <p style="margin:12px 0 0;color:#c2410c;font-size:13px;">
                ⏱ Expires in <strong>{OTPVerification.OTP_TTL_MINUTES} minutes</strong>
              </p>
            </div>

            <!-- Warning -->
            <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:14px 16px;margin-bottom:28px;">
              <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.5;">
                🔒 <strong>Never share this code.</strong> Ethio eCommerce will never ask for your OTP via phone or chat.
              </p>
            </div>

            <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:600;">
              Ethio eCommerce
            </p>
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Powered by <strong style="color:#f97316;">STEM Engineering</strong>
            </p>
          </td>
        </tr>

      </table>

      <p style="margin:20px 0 0;color:#9ca3af;font-size:11px;">
        © 2026 Ethio eCommerce · STEM Engineering · All rights reserved
      </p>
    </td></tr>
  </table>
</body>
</html>"""

    from django.core.mail import EmailMultiAlternatives
    msg = EmailMultiAlternatives(subject, plain, from_email, [email])
    msg.attach_alternative(html, "text/html")
    msg.send(fail_silently=False)

    logger.info(f"[OTP] Email sent successfully to {email}")


class OTPRateThrottle(AnonRateThrottle):
    """3 OTP requests per minute per IP."""
    rate = "3/min"
    scope = "otp_send"


# ── Step 1: Register seller (unverified) + send OTP ──────────────────────────
class SellerRegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    # No throttle on register — throttle is on resend only

    def post(self, request):
        data = request.data

        # Validate required fields (username is auto-derived)
        email    = (data.get("email") or "").strip().lower()
        phone_raw = data.get("phone_number") or ""
        password  = data.get("password") or ""
        full_name = (data.get("full_name") or "").strip()

        if not email:
            return Response({"detail": "Email is required."}, status=400)
        if not phone_raw:
            return Response({"detail": "Phone number is required."}, status=400)
        if not full_name:
            return Response({"detail": "Full name is required."}, status=400)
        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters."}, status=400)

        phone = normalize_phone_number(phone_raw)
        if not phone or len(phone) < 7:
            return Response({"detail": "Enter a valid phone number."}, status=400)

        # If account already exists and is unverified → just resend OTP
        existing = User.objects.filter(email__iexact=email, role="seller").first()
        if existing:
            if existing.is_verified:
                return Response({"detail": "Email already registered. Please sign in."}, status=400)
            # Resend OTP to existing unverified account
            _, otp_code = OTPVerification.create_for_user(user=existing, phone_number=existing.phone_number)
            try:
                _send_otp_email(existing.email, otp_code)
                email_sent = True
                email_error = None
            except Exception as exc:
                email_sent = False
                email_error = str(exc)
            return Response({
                "message": "OTP resent to your email.",
                "email": existing.email,
                "otp_expires_in_seconds": OTPVerification.OTP_TTL_MINUTES * 60,
                "dev_otp": otp_code,
                **({"email_error": email_error} if email_error else {}),
            }, status=200)

        # Check phone uniqueness
        if User.objects.filter(phone_number=phone).exists():
            return Response({"detail": "Phone number already registered."}, status=400)

        # Auto-derive a unique username from email
        base = email.split("@")[0].replace(".", "_").replace("-", "_")[:12]
        username = base
        counter = 1
        while User.objects.filter(username__iexact=username).exists():
            username = f"{base}{counter}"
            counter += 1

        # Create unverified seller
        user = User(username=username, email=email, phone_number=phone, role="seller", is_verified=False)
        user.set_password(password)
        user.save()

        SellerProfile.objects.create(user=user, full_name=full_name, onboarding_step=1)

        _, otp_code = OTPVerification.create_for_user(user=user, phone_number=phone)

        try:
            _send_otp_email(email, otp_code)
            email_sent = True
            email_error = None
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error(f"[OTP] Email failed: {exc}")
            email_sent = False
            email_error = str(exc)

        return Response({
            "message": "Account created. OTP sent to your email." if email_sent else "Account created. Email failed — use dev_otp.",
            "email": email,
            "otp_expires_in_seconds": OTPVerification.OTP_TTL_MINUTES * 60,
            "dev_otp": otp_code,
            **({"email_error": email_error} if email_error else {}),
        }, status=201)


# ── Resend OTP ────────────────────────────────────────────────────────────────
class SellerResendOTPAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        phone = normalize_phone_number(request.data.get("phone_number", ""))
        email = request.data.get("email", "").strip().lower()

        if not phone and not email:
            return Response({"detail": "phone_number or email is required."}, status=400)

        try:
            if phone:
                user = User.objects.get(phone_number=phone, role="seller")
            else:
                user = User.objects.get(email=email, role="seller")
        except User.DoesNotExist:
            return Response({"detail": "No seller account found."}, status=404)

        if user.is_verified:
            return Response({"detail": "Already verified. Please sign in."}, status=400)

        last_otp = OTPVerification.objects.filter(user=user).order_by("-created_at").first()
        if last_otp:
            elapsed = (timezone.now() - last_otp.created_at).total_seconds()
            if elapsed < 60:
                wait = int(60 - elapsed)
                return Response({"detail": f"Please wait {wait}s before resending.", "wait_seconds": wait}, status=429)

        _, otp_code = OTPVerification.create_for_user(user=user, phone_number=user.phone_number)

        try:
            _send_otp_email(user.email, otp_code)
            msg = "OTP resent to your email."
        except Exception as exc:
            import logging
            logging.getLogger(__name__).error(f"[OTP resend] Email failed: {exc}")
            msg = f"Email failed ({exc}) — use dev_otp."

        return Response({
            "message": msg,
            "otp_expires_in_seconds": OTPVerification.OTP_TTL_MINUTES * 60,
            "dev_otp": otp_code,
        })


# ── Verify OTP → issue JWT ────────────────────────────────────────────────────
class SellerVerifyOTPAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone    = normalize_phone_number(request.data.get("phone_number", ""))
        email    = request.data.get("email", "").strip().lower()
        otp_code = str(request.data.get("otp_code", "")).strip()

        if not otp_code:
            return Response({"detail": "otp_code is required."}, status=400)
        if not phone and not email:
            return Response({"detail": "phone_number or email is required."}, status=400)

        # Look up user by phone OR email
        try:
            if phone:
                user = User.objects.get(phone_number=phone, role="seller")
            else:
                user = User.objects.get(email=email, role="seller")
        except User.DoesNotExist:
            return Response({"detail": "Account not found."}, status=404)

        otp = OTPVerification.objects.filter(
            user=user, is_used=False
        ).order_by("-created_at").first()

        if not otp or otp.is_expired():
            return Response({"detail": "OTP expired or invalid. Please request a new one."}, status=400)

        if otp.attempts >= OTPVerification.MAX_ATTEMPTS:
            return Response({"detail": "Too many attempts. Request a new OTP."}, status=429)

        if not otp.verify(otp_code=otp_code):
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            remaining = OTPVerification.MAX_ATTEMPTS - otp.attempts
            return Response({"detail": f"Incorrect OTP. {remaining} attempt(s) remaining."}, status=400)

        # Mark OTP used + verify user
        otp.is_used = True
        otp.save(update_fields=["is_used"])
        user.is_verified = True
        user.save(update_fields=["is_verified"])

        tokens = issue_jwt_tokens_for_user(user)
        return Response({
            "message": "Email verified. Welcome!",
            "user": UserPublicSerializer(user).data,
            "onboarding_step": 2,
            **tokens,
        })


# ── Steps 2-4: Save onboarding data ──────────────────────────────────────────
class SellerOnboardingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "seller":
            return Response({"detail": "Seller only."}, status=403)
        sp, _ = SellerProfile.objects.get_or_create(user=request.user)
        return Response(_serialize_profile(sp))

    def put(self, request):
        if request.user.role != "seller":
            return Response({"detail": "Seller only."}, status=403)

        sp, _ = SellerProfile.objects.get_or_create(user=request.user)
        step = int(request.data.get("step", sp.onboarding_step))
        data = request.data

        if step == 2:
            sp.store_name = data.get("store_name", sp.store_name)
            sp.business_license_number = data.get("business_license_number", sp.business_license_number)
            sp.business_city = data.get("business_city", sp.business_city)
            sp.business_region = data.get("business_region", sp.business_region)
            sp.business_country = data.get("business_country", sp.business_country)
            sp.onboarding_step = max(sp.onboarding_step, 3)

        elif step == 3:
            sp.document_url = data.get("document_url", sp.document_url)
            sp.document_type = data.get("document_type", sp.document_type)
            sp.onboarding_step = max(sp.onboarding_step, 4)

        elif step == 4:
            sp.bank_name = data.get("bank_name", sp.bank_name)
            sp.bank_account_holder = data.get("bank_account_holder", sp.bank_account_holder)
            sp.bank_account_number = data.get("bank_account_number", sp.bank_account_number)
            sp.mobile_money_number = data.get("mobile_money_number", sp.mobile_money_number)
            sp.onboarding_step = 5
            sp.submitted_at = timezone.now()

        sp.save()
        return Response({"message": f"Step {step} saved.", "profile": _serialize_profile(sp)})


# ── Document upload (base64 → Cloudinary or local URL) ───────────────────────
class SellerDocumentUploadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != "seller":
            return Response({"detail": "Seller only."}, status=403)

        import base64, os, uuid

        file_data = request.data.get("file_data")   # base64 string
        file_name = request.data.get("file_name", "document")
        file_type = request.data.get("file_type", "")  # image/jpeg, image/png, application/pdf

        ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"]
        if file_type not in ALLOWED_TYPES:
            return Response({"detail": "Only JPG, PNG, or PDF allowed."}, status=400)

        if not file_data:
            return Response({"detail": "file_data (base64) is required."}, status=400)

        # Estimate size: base64 is ~4/3 of binary
        estimated_bytes = len(file_data) * 3 / 4
        if estimated_bytes > 5 * 1024 * 1024:
            return Response({"detail": "File too large. Max 5MB."}, status=400)

        # Try Cloudinary upload
        cloudinary_url = os.getenv("CLOUDINARY_URL", "")
        if cloudinary_url:
            try:
                import cloudinary
                import cloudinary.uploader
                result = cloudinary.uploader.upload(
                    f"data:{file_type};base64,{file_data}",
                    folder="seller_docs",
                    public_id=f"{request.user.id}_{uuid.uuid4().hex[:8]}",
                    resource_type="auto",
                )
                url = result.get("secure_url", "")
                return Response({"url": url, "message": "Uploaded to Cloudinary."})
            except Exception as e:
                pass  # fall through to local

        # Fallback: return a placeholder URL (dev mode)
        placeholder = f"https://placeholder.ethio-ecommerce.dev/docs/{request.user.id}/{uuid.uuid4().hex[:12]}"
        return Response({"url": placeholder, "message": "Dev mode: placeholder URL returned."})


def _serialize_profile(sp: SellerProfile) -> dict:
    return {
        "full_name": sp.full_name,
        "store_name": sp.store_name,
        "business_license_number": sp.business_license_number,
        "business_city": sp.business_city,
        "business_region": sp.business_region,
        "business_country": sp.business_country,
        "document_url": sp.document_url,
        "document_type": sp.document_type,
        "bank_name": sp.bank_name,
        "bank_account_holder": sp.bank_account_holder,
        "bank_account_number": sp.bank_account_number,
        "mobile_money_number": sp.mobile_money_number,
        "onboarding_step": sp.onboarding_step,
        "is_approved": sp.is_approved,
        "submitted_at": sp.submitted_at.isoformat() if sp.submitted_at else None,
    }
