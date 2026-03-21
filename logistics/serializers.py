from rest_framework import serializers

from purchases.models import Order

from .models import Delivery, DeliveryAgent


class DeliveryAgentInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAgent
        fields = ("id", "user", "is_active")


class DeliverySerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    delivery_agent_id = serializers.IntegerField(source="delivery_agent.id", allow_null=True, read_only=True)

    class Meta:
        model = Delivery
        fields = (
            "id",
            "order_id",
            "delivery_agent_id",
            "status",
            "assigned_at",
            "picked_at",
            "delivered_at",
            "created_at",
            "updated_at",
        )


class AssignDeliverySerializer(serializers.Serializer):
    order_id = serializers.IntegerField(min_value=1)
    agent_id = serializers.IntegerField(min_value=1)

    def validate_order_id(self, value: int) -> int:
        return value

    def validate_agent_id(self, value: int) -> int:
        return value


class UpdateDeliveryStatusSerializer(serializers.Serializer):
    delivery_id = serializers.IntegerField(min_value=1)
    status = serializers.ChoiceField(choices=Delivery.Status.choices)

    def validate(self, attrs):
        # status transitions are validated in the view where we have current delivery.
        return attrs

