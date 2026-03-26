"""
Run this to test Gmail SMTP directly:
  python test_email.py your@email.com
"""
import os, sys, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.core.mail import send_mail

print("=" * 50)
print(f"EMAIL_HOST_USER    : {repr(settings.EMAIL_HOST_USER)}")
print(f"EMAIL_HOST_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD)} (len={len(settings.EMAIL_HOST_PASSWORD)})")
print(f"DEFAULT_FROM_EMAIL : {repr(settings.DEFAULT_FROM_EMAIL)}")
print(f"EMAIL_BACKEND      : {settings.EMAIL_BACKEND}")
print("=" * 50)

if not settings.EMAIL_HOST_USER:
    print("ERROR: EMAIL_HOST_USER is empty — .env not loaded or variable missing")
    sys.exit(1)

if not settings.EMAIL_HOST_PASSWORD:
    print("ERROR: EMAIL_HOST_PASSWORD is empty — check your .env file")
    sys.exit(1)

to_email = sys.argv[1] if len(sys.argv) > 1 else settings.EMAIL_HOST_USER
print(f"Sending test email to: {to_email}")

try:
    send_mail(
        subject="Ethio eCommerce — SMTP Test",
        message="If you see this, Gmail SMTP is working correctly!",
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[to_email],
        fail_silently=False,
    )
    print("SUCCESS — email sent! Check your inbox (and spam folder).")
except Exception as e:
    print(f"FAILED: {e}")
    print()
    print("Common fixes:")
    print("  1. Go to https://myaccount.google.com/apppasswords")
    print("  2. Create a new App Password for 'Mail'")
    print("  3. Copy the 16-char password WITHOUT spaces into .env")
    print("  4. Make sure 2-Step Verification is ON on your Google account")
