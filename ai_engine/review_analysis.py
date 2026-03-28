"""
AI-powered review sentiment analysis.
Rule-based NLP — no external deps required.
"""
from __future__ import annotations

import re
from typing import Dict, Any, List

# Positive/negative word lists
POSITIVE_WORDS = {
    "excellent", "amazing", "great", "good", "love", "perfect", "best", "awesome",
    "fantastic", "wonderful", "outstanding", "superb", "brilliant", "happy",
    "satisfied", "recommend", "quality", "fast", "quick", "easy", "beautiful",
    "nice", "helpful", "reliable", "durable", "worth", "value", "comfortable",
    "clean", "fresh", "smooth", "strong", "solid", "impressive", "pleased",
}

NEGATIVE_WORDS = {
    "bad", "poor", "terrible", "awful", "horrible", "worst", "hate", "disappointed",
    "broken", "defective", "slow", "expensive", "cheap", "fake", "wrong", "damaged",
    "missing", "late", "delayed", "difficult", "hard", "confusing", "waste",
    "useless", "fragile", "weak", "small", "large", "uncomfortable", "ugly",
    "dirty", "smells", "noisy", "loud", "heavy", "light", "thin", "flimsy",
}

NEGATION_WORDS = {"not", "no", "never", "don't", "doesn't", "didn't", "isn't", "wasn't", "won't"}


def _tokenize(text: str) -> List[str]:
    return re.findall(r"\b\w+\b", text.lower())


def _analyze_sentiment(text: str) -> tuple[str, float]:
    """Return (sentiment, confidence) for a text."""
    tokens = _tokenize(text)
    pos_score = 0
    neg_score = 0

    for i, token in enumerate(tokens):
        # Check for negation in previous 2 words
        negated = any(tokens[max(0, i-2):i][j] in NEGATION_WORDS for j in range(min(2, i)))

        if token in POSITIVE_WORDS:
            if negated:
                neg_score += 1
            else:
                pos_score += 1
        elif token in NEGATIVE_WORDS:
            if negated:
                pos_score += 0.5
            else:
                neg_score += 1

    total = pos_score + neg_score
    if total == 0:
        return "neutral", 0.5

    pos_ratio = pos_score / total
    if pos_ratio >= 0.65:
        return "positive", min(0.95, 0.5 + pos_ratio * 0.5)
    elif pos_ratio <= 0.35:
        return "negative", min(0.95, 0.5 + (1 - pos_ratio) * 0.5)
    else:
        return "neutral", 0.5


def _extract_aspects(reviews: List[str]) -> Dict[str, List[str]]:
    """Extract mentioned aspects from reviews."""
    aspects = {
        "quality": ["quality", "build", "material", "durable", "sturdy", "solid", "well-made"],
        "delivery": ["delivery", "shipping", "arrived", "fast", "quick", "slow", "late", "package"],
        "value": ["price", "value", "worth", "expensive", "cheap", "affordable", "cost"],
        "design": ["design", "look", "style", "color", "beautiful", "ugly", "appearance"],
        "size": ["size", "fit", "small", "large", "big", "tiny", "perfect fit"],
        "performance": ["works", "performance", "function", "battery", "speed", "power"],
    }

    mentioned: Dict[str, List[str]] = {}
    for review in reviews:
        tokens = _tokenize(review)
        for aspect, keywords in aspects.items():
            if any(kw in tokens or kw in review.lower() for kw in keywords):
                if aspect not in mentioned:
                    mentioned[aspect] = []
                mentioned[aspect].append(review[:100])

    return mentioned


def analyze_reviews(reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze a list of reviews and return sentiment summary.
    Each review: { id, user, rating, comment, date }
    """
    if not reviews:
        return {
            "total": 0,
            "positive": 0,
            "negative": 0,
            "neutral": 0,
            "avg_rating": 0,
            "pros": [],
            "cons": [],
            "summary": "No reviews yet.",
            "sentiment_breakdown": {},
        }

    sentiments = {"positive": 0, "negative": 0, "neutral": 0}
    rated_reviews = []

    for review in reviews:
        comment = review.get("comment", "")
        rating = review.get("rating", 3)
        sentiment, confidence = _analyze_sentiment(comment)

        # Boost with star rating
        if rating >= 4:
            sentiment = "positive"
        elif rating <= 2:
            sentiment = "negative"

        sentiments[sentiment] += 1
        rated_reviews.append({**review, "sentiment": sentiment, "confidence": confidence})

    total = len(reviews)
    avg_rating = sum(r.get("rating", 3) for r in reviews) / total

    # Extract pros and cons
    positive_comments = [r["comment"] for r in rated_reviews if r["sentiment"] == "positive"]
    negative_comments = [r["comment"] for r in rated_reviews if r["sentiment"] == "negative"]

    pos_aspects = _extract_aspects(positive_comments)
    neg_aspects = _extract_aspects(negative_comments)

    pros = []
    if "quality" in pos_aspects:
        pros.append("Customers love the quality and build")
    if "delivery" in pos_aspects:
        pros.append("Fast and reliable delivery")
    if "value" in pos_aspects:
        pros.append("Great value for money")
    if "design" in pos_aspects:
        pros.append("Attractive design and appearance")
    if "performance" in pos_aspects:
        pros.append("Excellent performance")
    if not pros and sentiments["positive"] > 0:
        pros.append(f"{sentiments['positive']} customers gave positive reviews")

    cons = []
    if "size" in neg_aspects:
        cons.append("Some users say sizing runs off")
    if "delivery" in neg_aspects:
        cons.append("A few delivery delays reported")
    if "quality" in neg_aspects:
        cons.append("Some quality concerns mentioned")
    if "value" in neg_aspects:
        cons.append("Some find it pricey for the value")
    if not cons and sentiments["negative"] > 0:
        cons.append(f"{sentiments['negative']} customers had concerns")

    # Generate summary
    pos_pct = int(sentiments["positive"] / total * 100)
    if pos_pct >= 80:
        summary = f"Highly rated product — {pos_pct}% of customers are satisfied."
    elif pos_pct >= 60:
        summary = f"Generally well-received — {pos_pct}% positive reviews."
    elif pos_pct >= 40:
        summary = f"Mixed reviews — {pos_pct}% positive, {int(sentiments['negative']/total*100)}% negative."
    else:
        summary = f"Needs improvement — only {pos_pct}% positive reviews."

    return {
        "total": total,
        "positive": sentiments["positive"],
        "negative": sentiments["negative"],
        "neutral": sentiments["neutral"],
        "avg_rating": round(avg_rating, 1),
        "pros": pros[:4],
        "cons": cons[:3],
        "summary": summary,
        "sentiment_breakdown": {
            "positive_pct": round(sentiments["positive"] / total * 100),
            "negative_pct": round(sentiments["negative"] / total * 100),
            "neutral_pct": round(sentiments["neutral"] / total * 100),
        },
        "reviews_with_sentiment": rated_reviews,
    }
