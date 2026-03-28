"""
AI Engine API Views
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from catalog.serializers import ProductSerializer
from .recommendations import get_recommendations
from .search import ai_search, get_autocomplete
from .chatbot import process_message
from .fraud_detection import get_fraud_alerts, get_ai_report
from .rag_shopper import personal_shopper
from .review_analysis import analyze_reviews
from .seller_ai import generate_product_listing, analyze_product_image, generate_sales_summary


class AIRecommendationsView(APIView):
    """GET /api/ai/recommendations?product_id=&category_id=&limit="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        product_id  = request.query_params.get("product_id")
        category_id = request.query_params.get("category_id")
        limit       = min(int(request.query_params.get("limit", 8)), 20)
        user_id     = request.user.id if request.user.is_authenticated else None

        products = get_recommendations(
            product_id=int(product_id) if product_id else None,
            user_id=user_id,
            category_id=int(category_id) if category_id else None,
            limit=limit,
        )
        return Response(ProductSerializer(products, many=True, context={"request": request}).data)


class AISearchView(APIView):
    """GET /api/ai/search?q=&price_min=&price_max=&category=&in_stock="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query     = request.query_params.get("q", "").strip()
        price_min = request.query_params.get("price_min")
        price_max = request.query_params.get("price_max")
        category  = request.query_params.get("category")
        in_stock  = request.query_params.get("in_stock", "").lower() == "true"
        limit     = min(int(request.query_params.get("limit", 20)), 50)

        if not query:
            return Response({"results": [], "intent": {}, "total": 0, "corrected_query": None})

        result = ai_search(
            query,
            limit=limit,
            price_min=float(price_min) if price_min else None,
            price_max=float(price_max) if price_max else None,
            category=category,
            in_stock=in_stock,
        )

        return Response({
            "results": ProductSerializer(result["results"], many=True, context={"request": request}).data,
            "intent": result["intent"],
            "total": result["total"],
            "corrected_query": result["corrected_query"],
        })


class AIAutocompleteView(APIView):
    """GET /api/ai/autocomplete?q="""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        suggestions = get_autocomplete(query)
        return Response({"suggestions": suggestions})


class AIChatbotView(APIView):
    """POST /api/ai/chat  { message: string }"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"error": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

        user_id = request.user.id if request.user.is_authenticated else None
        result = process_message(message, user_id=user_id)
        return Response(result)


class AIFraudAlertsView(APIView):
    """GET /api/ai/fraud-alerts — admin only"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admin only."}, status=status.HTTP_403_FORBIDDEN)
        alerts = get_fraud_alerts()
        return Response({"alerts": alerts, "count": len(alerts)})


class AIReportView(APIView):
    """GET /api/ai/report?days=30 — admin only"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response({"detail": "Admin only."}, status=status.HTTP_403_FORBIDDEN)
        days = min(int(request.query_params.get("days", 30)), 365)
        report = get_ai_report(period_days=days)
        return Response(report)


class AISellerSuggestionsView(APIView):
    """POST /api/ai/seller/suggestions  { name?, description?, category?, price? }"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("seller", "admin"):
            return Response({"detail": "Seller only."}, status=status.HTTP_403_FORBIDDEN)

        name        = (request.data.get("name") or "").strip()
        description = (request.data.get("description") or "").strip()
        category    = (request.data.get("category") or "").strip()
        price       = (request.data.get("price") or "").strip()

        result = generate_product_listing(
            name=name,
            description=description,
            category=category,
            price=price,
        )
        return Response(result)


class AIProductVisionView(APIView):
    """POST /api/ai/seller/analyze-image  { image_base64, mime_type? }"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("seller", "admin"):
            return Response({"detail": "Seller only."}, status=status.HTTP_403_FORBIDDEN)

        image_base64 = request.data.get("image_base64", "")
        mime_type    = request.data.get("mime_type", "image/jpeg")

        if not image_base64:
            return Response({"error": "image_base64 is required"}, status=status.HTTP_400_BAD_REQUEST)

        result = analyze_product_image(image_base64, mime_type)
        return Response(result)


class AIPersonalShopperView(APIView):
    """POST /api/ai/personal-shopper  { query: string, limit?: int }"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        query = (request.data.get("query") or "").strip()
        if not query:
            return Response({"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST)
        limit = min(int(request.data.get("limit", 6)), 12)
        result = personal_shopper(query, limit=limit)
        return Response({
            "response": result["response"],
            "products": ProductSerializer(result["products"], many=True, context={"request": request}).data,
            "reasoning": result["reasoning"],
            "query_analysis": result["query_analysis"],
        })


class AIReviewAnalysisView(APIView):
    """POST /api/ai/reviews/analyze  { reviews: [...] }"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        reviews = request.data.get("reviews", [])
        if not isinstance(reviews, list):
            return Response({"error": "reviews must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        result = analyze_reviews(reviews)
        return Response(result)
