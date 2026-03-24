from rest_framework import serializers

from .models import Delivery, DeliveryAgent, calculate_delivery_fee, haversine_km


class DeliveryAgentInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAgent
        fields = ("id", "user", "is_active", "current_lat", "current_lon")


class DeliverySerializer(serializers.ModelSerializer):
    order_id         = serializers.IntegerField(source="order.id", read_only=True)
    delivery_agent_id = serializers.IntegerField(source="delivery_agent.id", allow_null=True, read_only=True)

    class Meta:
        model = Delivery
        fields = (
            "id", "order_id", "delivery_agent_id", "status",
            "shipping_address",
            "seller_lat", "seller_lon", "buyer_lat", "buyer_lon",
            "distance_km", "delivery_fee",
            "otp_verified",
            "assigned_at", "picked_at", "delivered_at",
            "created_at", "updated_at",
        )


class AssignDeliverySerializer(serializers.Serializer):
    order_id   = serializers.IntegerField(min_value=1)
    agent_id   = serializers.IntegerField(min_value=1)
    seller_lat = serializers.FloatField(required=False, allow_null=True)
    seller_lon = serializers.FloatField(required=False, allow_null=True)
    buyer_lat  = serializers.FloatField(required=False, allow_null=True)
    buyer_lon  = serializers.FloatField(required=False, allow_null=True)


class UpdateDeliveryStatusSerializer(serializers.Serializer):
    delivery_id = serializers.IntegerField(min_value=1)
    status      = serializers.ChoiceField(choices=Delivery.Status.choices)


class VerifyDeliveryOTPSerializer(serializers.Serializer):
    delivery_id = serializers.IntegerField(min_value=1)
    otp_code    = serializers.CharField(min_length=6, max_length=6)


class DeliveryFeeEstimateSerializer(serializers.Serializer):
    seller_lat = serializers.FloatField()
    seller_lon = serializers.FloatField()
    buyer_lat  = serializers.FloatField()
    buyer_lon  = serializers.FloatField()

    def validate(self, attrs):
        dist = haversine_km(
            attrs["seller_lat"], attrs["seller_lon"],
            attrs["buyer_lat"],  attrs["buyer_lon"],
        )
        attrs["distance_km"]  = round(dist, 2)
        attrs["delivery_fee"] = calculate_delivery_fee(dist)
        return attrs


class AgentLocationSerializer(serializers.Serializer):
    current_lat = serializers.FloatField()
    current_lon = serializers.FloatField()
