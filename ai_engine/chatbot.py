"""
AI Shopping Assistant Chatbot — powered by GPT-4o-mini with real product data.
Falls back to rule-based logic if OpenAI is unavailable.
"""
from __future__ import annotations

import re
from typing import Dict, Any, List

from catalog.models import Product, Category
from .openai_client import chat_completion, is_available


# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a friendly, knowledgeable AI shopping assistant for Ethio eCommerce — Ethiopia's premier online marketplace.

Your role:
- Help buyers find products, compare items, and make purchase decisions
- Answer questions about shipping, returns, and payments (Chapa: Telebirr, CBE Birr, bank transfer)
- Help sellers with product listings and store management
- Assist with order tracking and support

Store context:
- Currency: ETB (Ethiopian Birr)
- Payment: Chapa (Telebirr, CBE Birr, Awash Bank, Visa/Mastercard)
- Free shipping on orders over 500 ETB
- 30-day return policy
- Categories: Electronics, Fashion, Home & Kitchen, Books, Sports, Beauty

Rules:
- Be concise, warm, and helpful
- Always suggest relevant products when possible
- If asked about specific products, use the product data provided
- Keep responses under 150 words unless detail is needed
- Use emojis sparingly but naturally
- Respond in the same language the user writes in"""


def _get_product_context(query: str, limit: int = 5) -> tuple[List[Product], str]:
    """Fetch relevant products and format as context string."""
    from django.db.models import Q

    tokens = [t for t in query.lower().split() if len(t) >= 3]
    if not tokens:
        products = list(
            Product.objects.filter(stock__gt=0)
            .select_related("category").prefetch_related("images")
            .order_by("-created_at")[:limit]
        )
    else:
        q_filter = Q()
        for token in tokens:
            q_filter |= Q(name__icontains=token) | Q(description__icontains=token)
        products = list(
            Product.objects.filter(q_filter, stock__gt=0)
            .select_related("category").prefetch_related("images")[:limit]
        )

    if not products:
        products = list(
            Product.objects.filter(stock__gt=0)
            .select_related("category").prefetch_related("images")
            .order_by("-created_at")[:3]
        )

    context_lines = []
    for p in products:
        img = p.images.first()
        context_lines.append(
            f"- ID:{p.id} | {p.name} | {p.category.name if p.category else 'General'} | "
            f"{p.price} ETB | Stock:{p.stock} | "
            f"Image:{img.image_url if img else 'none'}"
        )

    return products, "\n".join(context_lines)


def _format_product(p: Product) -> Dict[str, Any]:
    img = p.images.first()
    return {
        "id": p.id,
        "name": p.name,
        "price": str(p.price),
        "category": p.category.name if p.category else "",
        "image": img.image_url if img else None,
        "url": f"/products/{p.id}",
    }


def _get_trending_products(limit: int = 3) -> List[Product]:
    from purchases.models import OrderItem
    from django.db.models import Count
    top_ids = (
        OrderItem.objects.values("product_id")
        .annotate(cnt=Count("product_id"))
        .order_by("-cnt")
        .values_list("product_id", flat=True)[:limit]
    )
    products = {
        p.id: p for p in Product.objects.filter(id__in=top_ids)
        .select_related("category").prefetch_related("images")
    }
    return [products[pid] for pid in top_ids if pid in products]


def _rule_based_fallback(message: str, user_id: int | None) -> Dict[str, Any]:
    """Original rule-based logic as fallback."""
    import random
    msg_lower = message.lower()

    GREETINGS = [r"\b(hi|hello|hey|good morning|good evening|salaam|selam)\b"]
    FAREWELLS  = [r"\b(bye|goodbye|thanks|thank you|see you)\b"]

    if any(re.search(p, msg_lower) for p in GREETINGS):
        return {
            "message": "Hi there! 👋 I'm your AI shopping assistant. How can I help you today?",
            "products": [],
            "intent": "greeting",
            "suggestions": ["Show trending products", "Find electronics", "Products under 1000 ETB"],
        }
    if any(re.search(p, msg_lower) for p in FAREWELLS):
        return {
            "message": "Thanks for shopping with us! Have a great day! 🛍️",
            "products": [],
            "intent": "farewell",
            "suggestions": [],
        }

    # Try product search
    from django.db.models import Q
    tokens = [t for t in msg_lower.split() if len(t) >= 3]
    q_filter = Q()
    for t in tokens:
        q_filter |= Q(name__icontains=t)
    found = list(
        Product.objects.filter(q_filter, stock__gt=0)
        .select_related("category").prefetch_related("images")[:3]
    )
    if found:
        return {
            "message": f"Here's what I found for you:",
            "products": [_format_product(p) for p in found],
            "intent": "search",
            "suggestions": ["Show more", "Filter by price", "Browse categories"],
        }

    trending = _get_trending_products(3)
    return {
        "message": "I can help you find products, check prices, or track orders. What would you like to do?",
        "products": [_format_product(p) for p in trending],
        "intent": "unknown",
        "suggestions": ["Find products", "Show trending", "Get help"],
    }


def process_message(
    message: str,
    *,
    user_id: int | None = None,
    conversation_history: list | None = None,
) -> Dict[str, Any]:
    """
    Process a user message using GPT-4o-mini with real product context.
    Falls back to rule-based logic if OpenAI unavailable.
    """
    # Fetch relevant products as context
    products_list, product_context = _get_product_context(message)

    # Try OpenAI first
    if is_available():
        user_prompt = f"""User message: "{message}"

Available products in our store:
{product_context}

Instructions:
1. Answer the user's question helpfully and concisely
2. If relevant products exist above, mention 1-3 of them by name and price
3. Return a JSON object with these exact fields:
   - "message": your response text (string)
   - "product_ids": list of product IDs to show (from the products above, max 3, or empty list)
   - "suggestions": list of 2-3 quick reply suggestions (strings)
   - "intent": one of: greeting, search, recommendation, price_query, order_status, help, farewell, unknown

Return ONLY valid JSON."""

        response_text = chat_completion(
            SYSTEM_PROMPT,
            user_prompt,
            temperature=0.7,
            max_tokens=400,
            json_mode=True,
        )

        if response_text:
            try:
                import json
                data = json.loads(response_text)
                msg = data.get("message", "")
                product_ids = data.get("product_ids", [])
                suggestions = data.get("suggestions", [])
                intent = data.get("intent", "unknown")

                # Map product IDs to formatted products
                id_to_product = {p.id: p for p in products_list}
                shown_products = [
                    _format_product(id_to_product[pid])
                    for pid in product_ids
                    if pid in id_to_product
                ]

                return {
                    "message": msg,
                    "products": shown_products,
                    "intent": intent,
                    "suggestions": suggestions,
                }
            except Exception:
                pass  # Fall through to rule-based

    # Fallback
    return _rule_based_fallback(message, user_id)