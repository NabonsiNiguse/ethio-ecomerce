# Generated migration for adding shipping address to Order model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='shipping_full_name',
            field=models.CharField(max_length=200, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_phone',
            field=models.CharField(max_length=20, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_address_line1',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_address_line2',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_city',
            field=models.CharField(max_length=100, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_state',
            field=models.CharField(max_length=100, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_postal_code',
            field=models.CharField(max_length=20, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='order',
            name='shipping_country',
            field=models.CharField(max_length=100, blank=True, default='Ethiopia'),
        ),
    ]
