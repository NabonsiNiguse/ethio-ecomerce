from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_profile"),
    ]

    operations = [
        migrations.CreateModel(
            name="SellerProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("user", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="seller_profile",
                    to=settings.AUTH_USER_MODEL,
                )),
                # Step 1 — personal
                ("full_name", models.CharField(max_length=200, blank=True, default="")),
                # Step 2 — business
                ("store_name", models.CharField(max_length=200, blank=True, default="")),
                ("business_license_number", models.CharField(max_length=100, blank=True, default="")),
                ("business_city", models.CharField(max_length=120, blank=True, default="")),
                ("business_region", models.CharField(max_length=120, blank=True, default="")),
                ("business_country", models.CharField(max_length=100, blank=True, default="Ethiopia")),
                # Step 3 — documents (URLs from Cloudinary/S3)
                ("document_url", models.URLField(blank=True, default="")),
                ("document_type", models.CharField(
                    max_length=20,
                    choices=[("license", "Business License"), ("gov_id", "Government ID")],
                    blank=True, default="",
                )),
                # Step 4 — bank
                ("bank_name", models.CharField(max_length=100, blank=True, default="")),
                ("bank_account_holder", models.CharField(max_length=200, blank=True, default="")),
                ("bank_account_number", models.CharField(max_length=50, blank=True, default="")),
                ("mobile_money_number", models.CharField(max_length=20, blank=True, default="")),
                # Status
                ("onboarding_step", models.PositiveSmallIntegerField(default=1)),
                ("is_approved", models.BooleanField(default=False)),
                ("submitted_at", models.DateTimeField(null=True, blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        # OTP rate-limit tracking
        migrations.AddField(
            model_name="otpverification",
            name="is_used",
            field=models.BooleanField(default=False),
        ),
    ]
