from decimal import Decimal, InvalidOperation

from django.db.models import Prefetch
from rest_framework import filters, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import Product
from .permissions import IsSellerOwnerOrReadOnly
from .serializers import ProductSerializer


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):
    """
    /api/products
    - GET: public listing with pagination
    - POST: seller-only create
    - GET /{id}: public retrieve
    - PUT/PATCH/DELETE /{id}: seller-only for own products

    Search:
      ?search=<name>
    Filters:
      ?category=<category_id>
      ?price_min=<min_price>
      ?price_max=<max_price>
    """

    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly, IsSellerOwnerOrReadOnly]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        # Optimization: fetch FK relations and images in minimal queries.
        qs = (
            Product.objects.all()
            .select_related("seller", "category")
            .prefetch_related("images")
            .order_by("-created_at")
        )

        qp = self.request.query_params
        category_id = qp.get("category")
        if category_id is not None and str(category_id).strip() != "":
            try:
                qs = qs.filter(category_id=int(category_id))
            except ValueError:
                raise ValidationError({"category": "category must be an integer id."})

        # Filter by category name (used by nav links)
        category_name = qp.get("category_name")
        if category_name and category_name.strip():
            qs = qs.filter(category__name__iexact=category_name.strip())

        price_min = qp.get("price_min")
        price_max = qp.get("price_max")

        if price_min not in (None, ""):
            try:
                qs = qs.filter(price__gte=Decimal(str(price_min)))
            except InvalidOperation:
                raise ValidationError({"price_min": "price_min must be a valid decimal."})

        if price_max not in (None, ""):
            try:
                qs = qs.filter(price__lte=Decimal(str(price_max)))
            except InvalidOperation:
                raise ValidationError({"price_max": "price_max must be a valid decimal."})

        return qs

    def perform_create(self, serializer: ProductSerializer):
        # seller is taken from request.user in serializer.create()
        serializer.save()

    def create(self, request, *args, **kwargs):
        """
        Keep production-friendly responses (clean JSON).
        """
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

from django.shortcuts import render

# Create your views here.
