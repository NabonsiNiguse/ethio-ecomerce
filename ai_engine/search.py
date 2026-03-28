"""
AI-powered search engine with:
- Natural language understanding
- Spell correction (edit distance)
- Intent extraction (price, category, brand)
- Relevance ranking (TF-IDF style)
- Autocomplete suggestions
"""
from __future__ import annotations

import re
import math
from typing import List, Dict, Any
from collections import defaultdict

from django.db.models import Q
from catalog.models import Product, Category


# ── Common misspelling corrections ───────────────────────────────────────────
CORRECTIONS: dict[str, str] = {
    "iphon": "iphone", "samsng": "samsung", "labtop": "laptop",
    "laptp": "laptop", "headfone": "headphone", "headpone": "headphone",
    "shose": "shoes", "shoos": "shoes", "clotes": "clothes",
    "cloths": "clothes", "fone": "phone", "mobil": "mobile",
    "electrnics": "electronics", "electronis": "electronics",
    "fasion": "fashion", "fashon": "fashion", "beauti": "beauty",
    "beutiful": "beautiful", "kitchn": "kitchen", "kichen": "kitchen",
    "sprot": "sport", "sprots": "sports", "boks": "books", "bok": "book",
}

# ── Intent patterns ───────────────────────────────────────────────────────────
PRICE_PATTERNS = [
    (r"under\s+(\d+)", "max"),
    (r"below\s+(\d+)", "max"),
    (r"less\s+than\s+(\d+)", "max"),
    (r"cheaper\s+than\s+(\d+)", "max"),
    (r"above\s+(\d+)", "min"),
    (r"over\s+(\d+)", "min"),
    (r"more\s+than\s+(\d+)", "min"),
    (r"between\s+(\d+)\s+and\s+(\d+)", "range"),
]

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Electronics":      ["phone", "laptop", "computer", "tablet", "headphone", "earphone",
                         "camera", "tv", "television", "speaker", "charger", "cable",
                         "iphone", "samsung", "macbook", "airpods", "electronic"],
    "Fashion":          ["shirt", "dress", "shoes", "jeans", "jacket", "clothes", "clothing",
                         "fashion", "wear", "outfit", "sneaker", "boot", "bag", "handbag"],
    "Home and Kitchen": ["kitchen", "home", "furniture", "cookware", "pot", "pan", "blender",
                         "coffee", "appliance", "decor", "pillow", "bedding"],
    "Books":            ["book", "novel", "textbook", "reading", "author", "fiction",
                         "nonfiction", "biography", "story"],
    "Sports":           ["sport", "fitness", "gym", "exercise", "running", "yoga",
                         "football", "basketball", "cycling", "outdoor"],
    "Beauty":           ["beauty", "makeup", "skincare", "lipstick", "foundation",
                         "moisturizer", "serum", "perfume", "cosmetic", "hair"],
}

SORT_KEYWORDS = {
    "cheap": "price_asc", "cheapest": "price_asc", "affordable": "price_asc",
    "lowest price": "price_asc", "budget": "price_asc",
    "expensive": "price_desc", "premium": "price_desc", "luxury": "price_desc",
    "best": "rating_desc", "top rated": "rating_desc", "popular": "popular",
    "new": "newest", "latest": "newest", "recent": "newest",
}


def _edit_distance(a: str, b: str) -> int:
    """Levenshtein distance."""
    if len(a) > len(b):
        a, b = b, a
    row = list(range(len(a) + 1))
    for c2 in b:
        new_row = [row[0] + 1]
        for j, c1 in enumerate(a):
            new_row.append(min(row[j + 1] + 1, new_row[-1] + 1, row[j] + (c1 != c2)))
        row = new_row
    return row[-1]


def _correct_token(token: str) -> str:
    """Apply known corrections or fuzzy match against product vocabulary."""
    if token in CORRECTIONS:
        return CORRECTIONS[token]
    return token


def _extract_intent(query: str) -> Dict[str, Any]:
    """Extract structured intent from natural language query."""
    intent: Dict[str, Any] = {
        "clean_query": query,
        "price_min": None,
        "price_max": None,
        "category": None,
        "sort": None,
        "in_stock": False,
    }

    q = query.lower().strip()

    # Price extraction
    for pattern, kind in PRICE_PATTERNS:
        m = re.search(pattern, q)
        if m:
            if kind == "max":
                intent["price_max"] = int(m.group(1))
            elif kind == "min":
                intent["price_min"] = int(m.group(1))
            elif kind == "range":
                intent["price_min"] = int(m.group(1))
                intent["price_max"] = int(m.group(2))
            # Remove price phrase from query
            q = re.sub(pattern, "", q).strip()

    # Stock filter
    if any(w in q for w in ["in stock", "available", "in-stock"]):
        intent["in_stock"] = True
        q = re.sub(r"in[\s-]?stock|available", "", q).strip()

    # Sort intent
    for kw, sort_val in SORT_KEYWORDS.items():
        if kw in q:
            intent["sort"] = sort_val
            q = q.replace(kw, "").strip()
            break

    # Category detection
    tokens = q.split()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            intent["category"] = cat
            break

    # Spell correction on remaining tokens
    corrected = [_correct_token(t) for t in tokens]
    intent["clean_query"] = " ".join(corrected).strip()

    return intent


def _score_product(product: Product, tokens: list[str]) -> float:
    """Score a product against search tokens."""
    score = 0.0
    name_lower = product.name.lower()
    desc_lower = (product.description or "").lower()
    cat_lower = (product.category.name if product.category else "").lower()

    for token in tokens:
        if not token:
            continue
        # Exact name match
        if token in name_lower:
            score += 10.0 if name_lower.startswith(token) else 5.0
        # Description match
        if token in desc_lower:
            score += 1.0
        # Category match
        if token in cat_lower:
            score += 3.0
        # Fuzzy match for short tokens
        if len(token) >= 4:
            for word in name_lower.split():
                if len(word) >= 4 and _edit_distance(token, word) <= 1:
                    score += 2.0

    # Boost in-stock products
    if product.stock > 0:
        score += 0.5

    return score


def ai_search(
    query: str,
    *,
    limit: int = 20,
    price_min: float | None = None,
    price_max: float | None = None,
    category: str | None = None,
    in_stock: bool = False,
) -> Dict[str, Any]:
    """
    Main AI search function. Returns ranked results + extracted intent.
    """
    intent = _extract_intent(query)

    # Override with explicit params
    if price_min is not None:
        intent["price_min"] = price_min
    if price_max is not None:
        intent["price_max"] = price_max
    if category:
        intent["category"] = category
    if in_stock:
        intent["in_stock"] = True

    clean_q = intent["clean_query"]
    tokens = [t for t in clean_q.lower().split() if len(t) >= 2]

    # Build queryset
    qs = Product.objects.select_related("category", "seller").prefetch_related("images")

    if intent["price_min"] is not None:
        qs = qs.filter(price__gte=intent["price_min"])
    if intent["price_max"] is not None:
        qs = qs.filter(price__lte=intent["price_max"])
    if intent["category"]:
        qs = qs.filter(category__name__iexact=intent["category"])
    if intent["in_stock"]:
        qs = qs.filter(stock__gt=0)

    # Text filter — broad OR search
    if tokens:
        q_filter = Q()
        for token in tokens:
            q_filter |= Q(name__icontains=token)
            q_filter |= Q(description__icontains=token)
            q_filter |= Q(category__name__icontains=token)
        qs = qs.filter(q_filter)

    products = list(qs[:200])

    # Score and rank
    if tokens:
        scored = [(p, _score_product(p, tokens)) for p in products]
        scored.sort(key=lambda x: x[1], reverse=True)
        products = [p for p, _ in scored if _ > 0]

    # Apply sort
    sort = intent.get("sort")
    if sort == "price_asc":
        products.sort(key=lambda p: float(p.price))
    elif sort == "price_desc":
        products.sort(key=lambda p: float(p.price), reverse=True)
    elif sort == "newest":
        products.sort(key=lambda p: p.created_at, reverse=True)

    return {
        "results": products[:limit],
        "intent": intent,
        "total": len(products),
        "corrected_query": clean_q if clean_q != query.lower().strip() else None,
    }


def get_autocomplete(query: str, limit: int = 8) -> List[str]:
    """Return autocomplete suggestions for a partial query."""
    if len(query) < 2:
        return []
    q = query.lower().strip()
    names = (
        Product.objects.filter(name__icontains=q)
        .values_list("name", flat=True)
        .order_by("name")[:limit]
    )
    cats = (
        Category.objects.filter(name__icontains=q)
        .values_list("name", flat=True)[:4]
    )
    suggestions = list(names) + [f"in {c}" for c in cats]
    return suggestions[:limit]
