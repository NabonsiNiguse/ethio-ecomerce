from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Category, Product, ProductImage

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "parent")


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image_url", "sort_order")


class ProductSerializer(serializers.ModelSerializer):
    """
    Read:  category → {id, name}  (nested object — what the frontend expects)
    Write: category_id → integer  (accepted on POST/PUT)
    """

    seller = serializers.SerializerMethodField()
    # Read: full nested object
    category = CategorySerializer(read_only=True)
    # Write: accept an integer id
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
    )
    images = ProductImageSerializer(many=True, read_only=True)
    image_urls = serializers.ListField(
        child=serializers.URLField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "price",
            "stock",
            "seller",
            "category",
            "category_id",
            "images",
            "image_urls",
            "created_at",
        )
        read_only_fields = ("id", "seller", "images", "created_at")

    def get_seller(self, obj: Product) -> dict:
        return {"id": obj.seller_id, "username": obj.seller.username, "role": obj.seller.role}

    def validate_price(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value

    def validate_stock(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Stock must be non-negative.")
        return value

    def create(self, validated_data):
        request = self.context.get("request")
        seller = getattr(request, "user", None)
        if not seller or not seller.is_authenticated:
            raise serializers.ValidationError("Authentication required.")

        image_urls = validated_data.pop("image_urls", [])
        product = Product.objects.create(seller=seller, **validated_data)

        if image_urls:
            ProductImage.objects.bulk_create(
                [
                    ProductImage(product=product, image_url=url, sort_order=i)
                    for i, url in enumerate(image_urls)
                ]
            )
        return product

    def update(self, instance: Product, validated_data):
        image_urls = validated_data.pop("image_urls", None)
        validated_data.pop("seller", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if image_urls is not None:
            instance.images.all().delete()
            if image_urls:
                ProductImage.objects.bulk_create(
                    [
                        ProductImage(product=instance, image_url=url, sort_order=i)
                        for i, url in enumerate(image_urls)
                    ]
                )
        return instance
