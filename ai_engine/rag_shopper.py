"""
RAG AI Personal Shopper — powered by GPT-4o-mini + real product database.
Retrieves actual products, then uses GPT to generate personalized responses.
"""
from __future__ import annotations

import re
import json
from typing import List, Dict, Any

from catalog.models import Product
from .search import ai_search
from .openai_client import chat_completion, is_available


SHOPPER_SYSTEM = """You are a personal shopping assistant for Ethio eCommerce.
Your job is to help users find the perfect products from our catalog.

Rules:
- Only recommend products from the provided catalog data
- Be specific about why each product fits the user's request
- Mention price in ETB
- Be warm, helpful, and concise
- If no products match perfectly, suggest the closest alternatives
- Consider budget, recipient, occasion, and preferences"""


def _parse_budget(query: str) -> tuple[float | None, float | None]:
    q = query.lower()
    patterns = [
        (r"under\s+(?:etb\s*)?\$?(\d+(?:,\d{3})*(?:\.\d+)?)", "max"),
        (r"below\s+(?:etb\s*)?\$?(\d+(?:,\d{3})*(?:\.\d+)?)", "max"),
        (r"less\s+than\s+(?:etb\s*)?\$?(\d+(?:,\d{3})*(?:\.\d+)?)", "max"),
        (r"(?:etb\s*)?\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:etb)?\s*(?:or\s+)?(?:less|max|maximum)", "max"),
        (r"above\s+(?:etb\s*)?\$?(\d+(?:,\d{3})*(?:\.\d+)?)", "min"),
        (r"over\s+(?:etb\s*)?\$?(\d+(?:,\d{3})*(?:\.\d+)?)", "min"),
        (r"between\s+(?:etb\s*)?\$?(\d+)\s+and\s+(?:etb\s*)?\$?(\d+)", "range"),
    ]
    for pattern, kind in patterns:
        m = re.search(pattern, q)
        if m:
            def clean_num(s: str) -> float:
                return float(s.replace(",", ""))
            if kind == "max":
                return None, clean_num(m.group(1))
            elif kind == "min":
                return clean_num(m.group(1)), None
            elif kind == "range":
                return clean_num(m.group(1)), clean_num(m.group(2))
    return None, None


def _detect_recipient(query: str) -> str | None:
    q = query.lower()
    patterns = {
        "child":   ["kid", "child", "boy", "girl", "toddler", "baby", "year-old", "years old", "son", "daughter"],
        "teen":    ["teen", "teenager", "adolescent"],
        "woman":   ["woman", "wife", "girlfriend", "mom", "mother", "sister", "her", "female"],
        "man":     ["man", "husband", "boyfriend", "dad", "father", "brother", "him", "male"],
        "elderly": ["grandma", "grandpa", "grandmother", "grandfather", "elderly", "senior"],
    }
    for recipient, keywords in patterns.items():
        if any(kw in q for kw in keywords):
            return recipient
    return None


def _detect_occasion(query: str) -> str | None:
    q = query.lower()
    occasions = {
        "birthday":    ["birthday", "bday"],
        "christmas":   ["christmas", "xmas", "holiday"],
        "wedding":     ["wedding", "marriage", "bride"],
        "graduation":  ["graduation", "graduate"],
        "anniversary": ["anniversary"],
        "valentine":   ["valentine", "love"],
        "gift":        ["gift", "present"],
    }
    for occasion, keywords in occasions.items():
        if any(kw in q for kw in keywords):
            return occasion
    return None


def _build_product_catalog_text(products: List[Product]) -> str:
    """Format products as structured text for GPT context."""
    lines = []
    for p in products:
        img = p.images.first()
        lines.append(
            f"[ID:{p.id}] {p.name}\n"
            f"  Category: {p.category.name if p.category else 'General'}\n"
            f"  Price: {p.price} ETB\n"
            f"  Stock: {p.stock} units\n"
            f"  Description: {(p.description or '')[:120]}\n"
            f"  Image: {img.image_url if img else 'none'}"
        )
    return "\n\n".join(lines)


def personal_shopper(query: str, limit: int = 6) -> Dict[str, Any]:
    """
    GPT-4o-mini powered personal shopper with real product retrieval.
    """
    price_min, price_max = _parse_budget(query)
    recipient = _detect_recipient(query)
    occasion = _detect_occasion(query)

    # Step 1: Retrieve relevant products from DB
    result = ai_search(
        query,
        limit=min(limit * 2, 20),  # Fetch more for GPT to choose from
        price_min=price_min,
        price_max=price_max,
        in_stock=True,
    )
    candidate_products = result["results"]

    # If no results, try broader search
    if not candidate_products:
        result = ai_search(query, limit=10, in_stock=True)
        candidate_products = result["results"]

    if not candidate_products:
        return {
            "response": "I couldn't find products matching your request. Try browsing our catalog for more options.",
            "products": [],
            "reasoning": [],
            "query_analysis": {
                "budget_max": price_max, "budget_min": price_min,
                "recipient": recipient, "occasion": occasion, "category": None,
            },
        }

    # Step 2: Use GPT to select and explain the best matches
    if is_available():
        catalog_text = _build_product_catalog_text(candidate_products)

        context_parts = []
        if recipient:
            context_parts.append(f"Recipient: {recipient}")
        if occasion:
            context_parts.append(f"Occasion: {occasion}")
        if price_max:
            context_parts.append(f"Budget: under {price_max:.0f} ETB")
        if price_min:
            context_parts.append(f"Minimum budget: {price_min:.0f} ETB")

        context_str = " | ".join(context_parts) if context_parts else "General shopping"

        user_prompt = f"""Customer request: "{query}"
Context: {context_str}

Available products:
{catalog_text}

Task: Select the {min(limit, len(candidate_products))} best products for this customer.
Return a JSON object with:
{{
  "response": "A warm, helpful 1-2 sentence introduction explaining your picks",
  "selected_ids": [list of product IDs in order of relevance, max {limit}],
  "reasoning": {{
    "PRODUCT_ID": "One sentence explaining why this product fits",
    ...
  }}
}}

Only include IDs from the products listed above."""

        gpt_response = chat_completion(
            SHOPPER_SYSTEM,
            user_prompt,
            temperature=0.6,
            max_tokens=600,
            json_mode=True,
        )

        if gpt_response:
            try:
                data = json.loads(gpt_response)
                selected_ids = data.get("selected_ids", [])
                reasoning_map = data.get("reasoning", {})
                response_text = data.get("response", "")

                id_to_product = {p.id: p for p in candidate_products}
                selected_products = [
                    id_to_product[pid] for pid in selected_ids
                    if pid in id_to_product
                ][:limit]

                reasoning = [
                    {"product_id": pid, "reason": reasoning_map.get(str(pid), "")}
                    for pid in selected_ids
                    if str(pid) in reasoning_map
                ]

                return {
                    "response": response_text,
                    "products": selected_products,
                    "reasoning": reasoning,
                    "query_analysis": {
                        "budget_max": price_max, "budget_min": price_min,
                        "recipient": recipient, "occasion": occasion,
                        "category": result["intent"].get("category"),
                    },
                }
            except Exception:
                pass  # Fall through to rule-based

    # Rule-based fallback
    products = candidate_products[:limit]
    count = len(products)
    parts = []
    if occasion:
        parts.append(f"for {occasion}")
    if recipient:
        parts.append(f"for a {recipient}")
    if price_max:
        parts.append(f"under {price_max:.0f} ETB")

    intro = f"Here are {count} great option{'s' if count > 1 else ''}" + (f" {' '.join(parts)}" if parts else "") + ":"

    reasoning = []
    for p in products[:3]:
        reasons = []
        if price_max and float(p.price) <= price_max:
            reasons.append(f"within your {price_max:.0f} ETB budget")
        if p.stock > 10:
            reasons.append("well-stocked")
        if reasons:
            reasoning.append({"product_id": p.id, "reason": f"Great choice — {', '.join(reasons)}"})

    return {
        "response": intro,
        "products": products,
        "reasoning": reasoning,
        "query_analysis": {
            "budget_max": price_max, "budget_min": price_min,
            "recipient": recipient, "occasion": occasion,
            "category": result["intent"].get("category"),
        },
    }
