"""
AI Recommendation Engine — pure Python, no external ML deps required.
Uses collaborative filtering signals + content-based scoring.
"""
from __future__ import annotations

import math
from collections import defaultdict
from typing import List

from django.db.models import Count, Q
from catalog.models import Product


def _tfidf_score(query_tokens: list[str], text: str) -> float:
    """Simple TF score for content matching."""
    text_lower = text.lower()
    score = 0.0
    for token in query_tokens:
        tf = text_lower.count(token)
        if tf:
            score += 1 + math.log(tf)
    return score


def get_recommendations(
    *,
    product_id: int | None = None,
    user_id: int | None = None,
    category_id: int | None = None,
    limit: int = 8,
) -> List[Product]:
    """
    Return recommended products based on:
    1. Same category (content-based)
    2. Co-purchased products (collaborative)
    3. Trending (most ordered recently)
    """
    from purchases.models import OrderItem

    exclude_ids = set()
    if product_id:
        exclude_ids.add(product_id)

    scored: dict[int, float] = defaultdict(float)

    # ── 1. Category-based ────────────────────────────────────────────────────
    if product_id:
        try:
            base = Product.objects.select_related("category").get(pk=product_id)
            category_id = base.category_id
            # Boost products with similar name tokens
            tokens = base.name.lower().split()
            for p in Product.objects.filter(category_id=category_id).exclude(pk=product_id)[:50]:
                scored[p.id] += 3.0 + _tfidf_score(tokens, p.name + " " + p.description)
        except Product.DoesNotExist:
            pass

    if category_id and not product_id:
        for p in Product.objects.filter(category_id=category_id)[:50]:
            scored[p.id] += 2.0

    # ── 2. Collaborative: co-purchased ───────────────────────────────────────
    if product_id:
        # Find orders that contain this product
        order_ids = OrderItem.objects.filter(product_id=product_id).values_list("order_id", flat=True)[:200]
        # Find other products in those orders
        co_items = (
            OrderItem.objects.filter(order_id__in=order_ids)
            .exclude(product_id=product_id)
            .values("product_id")
            .annotate(cnt=Count("product_id"))
        )
        for item in co_items:
            scored[item["product_id"]] += item["cnt"] * 2.0

    # ── 3. User purchase history ──────────────────────────────────────────────
    if user_id:
        user_orders = OrderItem.objects.filter(order__user_id=user_id).values_list("product_id", flat=True)
        exclude_ids.update(user_orders)
        # Get categories user bought from
        user_cats = (
            Product.objects.filter(id__in=user_orders)
            .values_list("category_id", flat=True)
            .distinct()
        )
        for p in Product.objects.filter(category_id__in=user_cats).exclude(id__in=exclude_ids)[:50]:
            scored[p.id] += 1.5

    # ── 4. Trending (most ordered overall) ───────────────────────────────────
    trending = (
        OrderItem.objects.values("product_id")
        .annotate(cnt=Count("product_id"))
        .order_by("-cnt")[:30]
    )
    for item in trending:
        scored[item["product_id"]] += item["cnt"] * 0.5

    # Remove excluded
    for eid in exclude_ids:
        scored.pop(eid, None)

    if not scored:
        # Fallback: latest products
        return list(
            Product.objects.select_related("category", "seller")
            .prefetch_related("images")
            .order_by("-created_at")[:limit]
        )

    top_ids = sorted(scored, key=lambda k: scored[k], reverse=True)[:limit]
    products = {
        p.id: p
        for p in Product.objects.filter(id__in=top_ids)
        .select_related("category", "seller")
        .prefetch_related("images")
    }
    return [products[pid] for pid in top_ids if pid in products]
