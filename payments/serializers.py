from decimal import Decimal

from rest_framework import serializers

from purchases.models import Order

from .models import Payment


class InitiatePaymentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(min_value=1)

    def validate_order_id(self, value: int) -> int:
        return value


class VerifyPaymentSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(max_length=64)


class PaymentResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("transaction_id", "status", "amount", "order_id", "created_at")


class PaymentCreateContextSerializer(serializers.Serializer):
    """
    Helper serializer for internal validation.
    """

    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())

    def validate_amount(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("Amount must be non-negative.")
        return value

