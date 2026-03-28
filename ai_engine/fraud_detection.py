"""
Fraud & suspicious activity detection for admin dashboard.
Rule-based scoring — no ML deps required.
"""
from __future__ import annotations

from datetime import timedelta
from typing import List, Dict, Any

from django.utils import timezone
from django.db.models import Count, Sum, Q


def get_fraud_alerts() -> List[Dict[str, Any]]:
    """
    Scan for suspicious activity and return alert list.
    Each alert: { type, severity, message, user_id, user_email, count, created_at }
    """
    from accounts.models import User
    from purchases.models import Order
    from payments.models import Payment

    alerts: List[Dict[str, Any]] = []
    now = timezone.now()
    window_1h = now - timedelta(hours=1)
    window_24h = now - timedelta(hours=24)
    window_7d = now - timedelta(days=7)

    # ── 1. Multiple failed payments from same user ────────────────────────────
    failed_payments = (
        Payment.objects.filter(status="failed", created_at__gte=window_24h)
        .values("user_id")
        .annotate(cnt=Count("id"))
        .filter(cnt__gte=3)
    )
    for fp in failed_payments:
        try:
            user = User.objects.get(pk=fp["user_id"])
            alerts.append({
                "type": "multiple_failed_payments",
                "severity": "high",
                "message": f"User {user.email} had {fp['cnt']} failed payments in 24h",
                "user_id": fp["user_id"],
                "user_email": user.email,
                "count": fp["cnt"],
                "created_at": now.isoformat(),
            })
        except User.DoesNotExist:
            pass

    # ── 2. Unusually high order value ─────────────────────────────────────────
    high_value_orders = Order.objects.filter(
        created_at__gte=window_24h,
        total_price__gte=50000,  # 50,000 ETB threshold
    ).select_related("user")
    for order in high_value_orders:
        alerts.append({
            "type": "high_value_order",
            "severity": "medium",
            "message": f"High-value order #{order.id} of {order.total_price} ETB by {order.user.email}",
            "user_id": order.user_id,
            "user_email": order.user.email,
            "count": 1,
            "created_at": order.created_at.isoformat(),
        })

    # ── 3. Rapid order placement (>5 orders in 1 hour) ───────────────────────
    rapid_orders = (
        Order.objects.filter(created_at__gte=window_1h)
        .values("user_id")
        .annotate(cnt=Count("id"))
        .filter(cnt__gte=5)
    )
    for ro in rapid_orders:
        try:
            user = User.objects.get(pk=ro["user_id"])
            alerts.append({
                "type": "rapid_orders",
                "severity": "high",
                "message": f"User {user.email} placed {ro['cnt']} orders in the last hour",
                "user_id": ro["user_id"],
                "user_email": user.email,
                "count": ro["cnt"],
                "created_at": now.isoformat(),
            })
        except User.DoesNotExist:
            pass

    # ── 4. New seller with many products added quickly ────────────────────────
    from catalog.models import Product
    new_seller_spam = (
        Product.objects.filter(created_at__gte=window_24h)
        .values("seller_id")
        .annotate(cnt=Count("id"))
        .filter(cnt__gte=20)
    )
    for ns in new_seller_spam:
        try:
            user = User.objects.get(pk=ns["seller_id"])
            alerts.append({
                "type": "seller_product_spam",
                "severity": "medium",
                "message": f"Seller {user.email} added {ns['cnt']} products in 24h",
                "user_id": ns["seller_id"],
                "user_email": user.email,
                "count": ns["cnt"],
                "created_at": now.isoformat(),
            })
        except User.DoesNotExist:
            pass

    # ── 5. Cancelled orders spike ─────────────────────────────────────────────
    cancelled_count = Order.objects.filter(
        status="cancelled", created_at__gte=window_24h
    ).count()
    total_count = Order.objects.filter(created_at__gte=window_24h).count()
    if total_count > 10 and cancelled_count / total_count > 0.4:
        alerts.append({
            "type": "high_cancellation_rate",
            "severity": "medium",
            "message": f"High cancellation rate: {cancelled_count}/{total_count} orders cancelled in 24h ({int(cancelled_count/total_count*100)}%)",
            "user_id": None,
            "user_email": None,
            "count": cancelled_count,
            "created_at": now.isoformat(),
        })

    return sorted(alerts, key=lambda a: {"high": 0, "medium": 1, "low": 2}[a["severity"]])


def get_ai_report(period_days: int = 30) -> Dict[str, Any]:
    """
    Generate an AI-powered analytics report for the admin.
    Uses GPT-4o-mini to generate natural language insights.
    """
    from purchases.models import Order, OrderItem
    from payments.models import Payment
    from catalog.models import Product
    from accounts.models import User
    from .openai_client import chat_completion, is_available

    now = timezone.now()
    start = now - timedelta(days=period_days)
    prev_start = start - timedelta(days=period_days)

    # Current period
    orders = Order.objects.filter(created_at__gte=start)
    revenue = orders.filter(status__in=["paid", "shipped", "delivered"]).aggregate(
        total=Sum("total_price")
    )["total"] or 0

    # Previous period
    prev_orders = Order.objects.filter(created_at__gte=prev_start, created_at__lt=start)
    prev_revenue = prev_orders.filter(status__in=["paid", "shipped", "delivered"]).aggregate(
        total=Sum("total_price")
    )["total"] or 0

    # Growth rates
    order_growth = _growth_rate(orders.count(), prev_orders.count())
    revenue_growth = _growth_rate(float(revenue), float(prev_revenue))

    # Top categories
    top_cats = list(
        OrderItem.objects.filter(order__created_at__gte=start)
        .values("product__category__name")
        .annotate(revenue=Sum("line_total"), units=Count("id"))
        .order_by("-revenue")[:5]
    )

    # New users
    new_users = User.objects.filter(date_joined__gte=start).count()
    prev_new_users = User.objects.filter(date_joined__gte=prev_start, date_joined__lt=start).count()
    user_growth = _growth_rate(new_users, prev_new_users)

    # Rule-based insights
    rule_insights = []
    if revenue_growth > 20:
        rule_insights.append(f"Revenue grew {revenue_growth:.1f}% vs last period — strong performance!")
    elif revenue_growth < -10:
        rule_insights.append(f"Revenue declined {abs(revenue_growth):.1f}% — consider running promotions.")
    if order_growth > 15:
        rule_insights.append(f"Order volume up {order_growth:.1f}% — platform is growing well.")
    if user_growth > 20:
        rule_insights.append(f"{new_users} new users joined — {user_growth:.1f}% growth in registrations.")
    low_stock = Product.objects.filter(stock__lte=5, stock__gt=0).count()
    if low_stock > 0:
        rule_insights.append(f"{low_stock} products are running low on stock — notify sellers.")
    out_of_stock = Product.objects.filter(stock=0).count()
    if out_of_stock > 0:
        rule_insights.append(f"{out_of_stock} products are out of stock — potential lost sales.")

    # GPT-enhanced insights
    insights = rule_insights
    if is_available() and (orders.count() > 0 or new_users > 0):
        top_cats_str = "\n".join(
            f"- {c.get('product__category__name', 'Unknown')}: {float(c.get('revenue', 0)):.0f} ETB"
            for c in top_cats[:3]
        )
        gpt_prompt = f"""Platform analytics for the last {period_days} days:
- Revenue: {float(revenue):.0f} ETB ({revenue_growth:+.1f}% vs previous period)
- Orders: {orders.count()} ({order_growth:+.1f}% change)
- New users: {new_users} ({user_growth:+.1f}% change)
- Low stock products: {low_stock}
- Out of stock: {out_of_stock}
Top categories by revenue:
{top_cats_str}

Generate 3 concise, actionable business insights for the admin. Each insight should be 1 sentence.
Return as JSON: {{"insights": ["insight1", "insight2", "insight3"]}}"""

        gpt_response = chat_completion(
            "You are a business analytics expert for an eCommerce platform.",
            gpt_prompt,
            temperature=0.6,
            max_tokens=200,
            json_mode=True,
        )
        if gpt_response:
            try:
                import json
                gpt_data = json.loads(gpt_response)
                gpt_insights = gpt_data.get("insights", [])
                if gpt_insights:
                    insights = gpt_insights + rule_insights
            except Exception:
                pass

    return {
        "period_days": period_days,
        "revenue": float(revenue),
        "revenue_growth": revenue_growth,
        "total_orders": orders.count(),
        "order_growth": order_growth,
        "new_users": new_users,
        "user_growth": user_growth,
        "top_categories": top_cats,
        "insights": insights[:6],
        "generated_at": now.isoformat(),
    }


def _growth_rate(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round((current - previous) / previous * 100, 1)
