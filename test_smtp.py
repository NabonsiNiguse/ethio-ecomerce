"""
Pure Python SMTP test — no Django needed.
Run: python test_smtp.py
"""
import smtplib
from email.mime.text import MIMEText

EMAIL_USER = "pawloseniguse@gmail.com"
EMAIL_PASS = "utmbbhsjqssjbhxs"   # 16-char App Password from .env
TO_EMAIL   = "pawloseniguse@gmail.com"  # send to yourself

print(f"Testing SMTP with: {EMAIL_USER}")
print(f"Password length  : {len(EMAIL_PASS)} chars")
print()

try:
    server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(EMAIL_USER, EMAIL_PASS)

    msg = MIMEText("Your OTP test is working! Gmail SMTP is configured correctly.")
    msg["Subject"] = "Ethio eCommerce — SMTP Test ✓"
    msg["From"]    = EMAIL_USER
    msg["To"]      = TO_EMAIL

    server.sendmail(EMAIL_USER, [TO_EMAIL], msg.as_string())
    server.quit()

    print("✅ SUCCESS — email sent to", TO_EMAIL)
    print("   Check your inbox (and Spam folder).")

except smtplib.SMTPAuthenticationError as e:
    print("❌ AUTH FAILED:", e)
    print()
    print("Fix:")
    print("  1. Go to https://myaccount.google.com/apppasswords")
    print("  2. Make sure 2-Step Verification is ON")
    print("  3. Create App Password → select 'Mail' + 'Windows Computer'")
    print("  4. Copy the 16 chars WITHOUT spaces into .env as EMAIL_HOST_PASSWORD")

except Exception as e:
    print("❌ ERROR:", e)
