"""
AI tools for sellers — powered by GPT-4o-mini with rule-based fallback.
"""
from __future__ import annotations

import json
from typing import Dict, Any

from .openai_client import chat_completion, is_available, _get_client


SELLER_SYSTEM = """You are an expert eCommerce product listing specialist for Ethio eCommerce.
You help sellers create compelling, accurate product listings that drive sales.
Always respond with valid JSON. Be specific, professional, and concise."""


def _get_market_price_data(name: str, category: str) -> dict:
    """Get market price statistics from the database."""
    from catalog.models import Product
    from django.db.models import Avg, Min, Max

    qs = Product.objects.all()
    if category:
        qs = qs.filter(category__name__iexact=category)
    elif name:
        tokens = name.lower().split()
        if tokens:
            qs = qs.filter(name__icontains=tokens[0])

    stats = qs.aggregate(avg=Avg("price"), min=Min("price"), max=Max("price"))
    return stats


def generate_product_listing(
    name: str = "",
    description: str = "",
    category: str = "",
    price: str = "",
) -> Dict[str, Any]:
    """
    Generate AI-powered product listing suggestions.
    Uses GPT-4o-mini if available, falls back to rule-based logic.
    """
    stats = _get_market_price_data(name, category)

    price_context = ""
    if stats.get("avg"):
        price_context = (
            f"Market price data: avg={float(stats['avg']):.0f} ETB, "
            f"min={float(stats['min']):.0f} ETB, max={float(stats['max']):.0f} ETB"
        )

    # Try GPT
    if is_available():
        user_prompt = f"""Create a complete product listing for:
Name: {name or '(not provided)'}
Description: {description or '(not provided)'}
Category: {category or '(not provided)'}
Current price: {price or '(not set)'}
{price_context}

Return JSON with these exact fields:
{{
  "title": "Optimized product title (max 80 chars, SEO-friendly)",
  "description": "Compelling 2-3 sentence product description highlighting key benefits",
  "category": "Best matching category from: Electronics, Fashion, Home and Kitchen, Books, Sports, Beauty",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "price_suggestion": {{
    "recommended": <number in ETB>,
    "min_market": <number>,
    "max_market": <number>,
    "reasoning": "Brief explanation"
  }},
  "title_alternatives": ["Alternative title 1", "Alternative title 2"],
  "description_tips": ["Tip 1", "Tip 2", "Tip 3"]
}}"""

        response = chat_completion(
            SELLER_SYSTEM,
            user_prompt,
            temperature=0.7,
            max_tokens=600,
            json_mode=True,
        )

        if response:
            try:
                data = json.loads(response)
                return {
                    "title_suggestions": [data.get("title", "")] + data.get("title_alternatives", []),
                    "description": data.get("description", ""),
                    "category_suggestion": data.get("category", ""),
                    "tags": data.get("tags", []),
                    "price_suggestion": data.get("price_suggestion"),
                    "description_tips": data.get("description_tips", []),
                    "ai_powered": True,
                }
            except Exception:
                pass  # Fall through to rule-based

    # Rule-based fallback — always works
    return _rule_based_suggestions(name, description, category, stats)


def _rule_based_suggestions(name: str, description: str, category: str, stats: dict) -> Dict[str, Any]:
    """Rule-based product suggestions — no API required."""
    from catalog.models import Product
    from ai_engine.search import CATEGORY_KEYWORDS

    result: Dict[str, Any] = {"ai_powered": False}

    # Title suggestions from similar products
    if name:
        tokens = name.lower().split()
        similar = []
        if tokens:
            similar = list(
                Product.objects.filter(name__icontains=tokens[0])
                .values_list("name", flat=True)[:3]
            )
        result["title_suggestions"] = similar if similar else [name]
    else:
        result["title_suggestions"] = []

    # Price suggestion
    if stats.get("avg"):
        result["price_suggestion"] = {
            "recommended": round(float(stats["avg"]), 2),
            "min_market": round(float(stats["min"]), 2),
            "max_market": round(float(stats["max"]), 2),
            "reasoning": "Based on similar products in the market",
        }

    # Category suggestion
    if name and not category:
        name_lower = name.lower()
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if any(kw in name_lower for kw in keywords):
                result["category_suggestion"] = cat
                break

    # Description tips
    if not description or len(description) < 50:
        result["description_tips"] = [
            "Include key features and specifications",
            "Mention material, size, or dimensions",
            "Highlight what makes your product unique",
            "Add warranty or return policy info",
            "Use bullet points for easy reading",
        ]

    return result


def analyze_product_image(image_base64: str, mime_type: str = "image/jpeg") -> Dict[str, Any]:
    """
    Analyze a product image using GPT-4o vision.
    Returns product attributes and auto-generated listing fields.
    """
    client = _get_client()
    if not client:
        return {
            "error": "OpenAI not configured or quota exceeded. Add billing at platform.openai.com",
            "ai_powered": False,
            "quality_warning": None,
        }

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SELLER_SYSTEM},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Analyze this product image and return a JSON object with:
{
  "product_type": "What type of product is this",
  "color": "Primary color(s)",
  "material": "Apparent material (if detectable)",
  "style": "Style description",
  "quality_score": <1-10, where 10 is perfect>,
  "quality_warning": null or "warning message if image is blurry/dark/low quality",
  "title": "SEO-optimized product title (max 80 chars)",
  "description": "2-3 sentence product description",
  "category": "Best category from: Electronics, Fashion, Home and Kitchen, Books, Sports, Beauty",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "confidence": <0.0-1.0>
}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}",
                                "detail": "low",
                            },
                        },
                    ],
                }
            ],
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        data = json.loads(response.choices[0].message.content)
        data["ai_powered"] = True
        return data

    except Exception as e:
        err = str(e)
        if "quota" in err.lower():
            return {
                "error": "OpenAI quota exceeded. Add billing credits at platform.openai.com/billing",
                "ai_powered": False,
                "quality_warning": None,
            }
        return {
            "error": f"Image analysis failed: {err}",
            "ai_powered": False,
            "quality_warning": None,
        }


def generate_sales_summary(
    total_revenue: float,
    total_orders: int,
    top_products: list,
    monthly_data: list,
) -> str:
    """Generate an AI-written sales performance summary for sellers."""
    if not is_available():
        return _rule_based_sales_summary(total_revenue, total_orders, top_products)

    top_str = "\n".join(
        f"- {p.get('product__name', 'Product')}: {float(p.get('revenue', 0)):.0f} ETB ({p.get('units', 0)} units)"
        for p in top_products[:5]
    )
    monthly_str = "\n".join(
        f"- {m.get('month', '')}: {float(m.get('revenue', 0)):.0f} ETB ({m.get('orders', 0)} orders)"
        for m in monthly_data[-3:]
    )

    prompt = f"""Seller performance data:
Total Revenue: {total_revenue:.0f} ETB
Total Orders: {total_orders}

Top Products:
{top_str}

Recent Monthly Trend:
{monthly_str}

Write a 2-3 sentence performance summary. Be encouraging but honest.
Highlight what's working and suggest one actionable improvement. Keep it under 80 words."""

    response = chat_completion(
        "You are a helpful business analytics assistant for an eCommerce platform.",
        prompt,
        temperature=0.7,
        max_tokens=150,
    )

    return response or _rule_based_sales_summary(total_revenue, total_orders, top_products)


def _rule_based_sales_summary(revenue: float, orders: int, top_products: list) -> str:
    if orders == 0:
        return "No sales yet. Add products and promote your store to start selling!"
    avg = revenue / orders if orders else 0
    top = top_products[0].get("product__name", "your top product") if top_products else "your products"
    return (
        f"You've completed {orders} order{'s' if orders > 1 else ''} "
        f"with {revenue:.0f} ETB in total revenue (avg {avg:.0f} ETB/order). "
        f"{top} is your best performer — keep it well-stocked!"
    )
