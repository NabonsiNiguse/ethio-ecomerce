from django.urls import path
from .views import (
    AIRecommendationsView,
    AISearchView,
    AIAutocompleteView,
    AIChatbotView,
    AIFraudAlertsView,
    AIReportView,
    AISellerSuggestionsView,
    AIProductVisionView,
    AIPersonalShopperView,
    AIReviewAnalysisView,
)

urlpatterns = [
    path("ai/recommendations",       AIRecommendationsView.as_view(),   name="ai-recommendations"),
    path("ai/search",                AISearchView.as_view(),             name="ai-search"),
    path("ai/autocomplete",          AIAutocompleteView.as_view(),       name="ai-autocomplete"),
    path("ai/chat",                  AIChatbotView.as_view(),            name="ai-chat"),
    path("ai/fraud-alerts",          AIFraudAlertsView.as_view(),        name="ai-fraud-alerts"),
    path("ai/report",                AIReportView.as_view(),             name="ai-report"),
    path("ai/seller/suggestions",    AISellerSuggestionsView.as_view(),  name="ai-seller-suggestions"),
    path("ai/seller/analyze-image",  AIProductVisionView.as_view(),      name="ai-product-vision"),
    path("ai/personal-shopper",      AIPersonalShopperView.as_view(),    name="ai-personal-shopper"),
    path("ai/reviews/analyze",       AIReviewAnalysisView.as_view(),     name="ai-review-analysis"),
]
