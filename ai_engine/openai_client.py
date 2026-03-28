"""
OpenAI client wrapper with graceful fallback.
Uses gpt-4o-mini for cost efficiency and speed.
Falls back to rule-based logic if API is unavailable or quota exceeded.
"""
from __future__ import annotations

import os
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Don't cache None — always try to create client if key exists
_client_instance = None
_client_key_used = None  # track which key was used


def _get_client():
    global _client_instance, _client_key_used
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None

    # Re-create client if key changed
    if _client_instance is not None and _client_key_used == api_key:
        return _client_instance

    try:
        from openai import OpenAI
        _client_instance = OpenAI(api_key=api_key)
        _client_key_used = api_key
        return _client_instance
    except ImportError:
        logger.warning("openai package not installed. Run: pip install openai")
        return None
    except Exception as e:
        logger.warning(f"OpenAI client init failed: {e}")
        return None


def chat_completion(
    system: str,
    user: str,
    *,
    model: str = "gpt-4o-mini",
    temperature: float = 0.7,
    max_tokens: int = 800,
    json_mode: bool = False,
) -> str | None:
    """
    Call OpenAI chat completion. Returns text or None on any failure.
    Handles quota errors, network errors, and invalid responses gracefully.
    """
    client = _get_client()
    if not client:
        return None

    try:
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = client.chat.completions.create(**kwargs)
        content = response.choices[0].message.content
        return content
    except Exception as e:
        err_str = str(e).lower()
        if "quota" in err_str or "insufficient_quota" in err_str:
            logger.warning("OpenAI quota exceeded — falling back to rule-based logic")
        elif "rate_limit" in err_str:
            logger.warning("OpenAI rate limit hit — falling back")
        elif "auth" in err_str or "invalid_api_key" in err_str:
            logger.warning("OpenAI auth error — check API key")
        else:
            logger.warning(f"OpenAI API call failed: {e}")
        return None


def parse_json_response(text: str | None, fallback: Any = None) -> Any:
    """Safely parse JSON from OpenAI response."""
    if not text:
        return fallback
    try:
        clean = text.strip()
        if clean.startswith("```"):
            lines = clean.split("\n")
            # Remove first line (```json or ```) and last line (```)
            inner = lines[1:]
            if inner and inner[-1].strip() == "```":
                inner = inner[:-1]
            clean = "\n".join(inner)
        return json.loads(clean)
    except (json.JSONDecodeError, ValueError):
        return fallback


def is_available() -> bool:
    """Check if OpenAI client can be created (key exists)."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return False
    try:
        from openai import OpenAI  # noqa: F401
        return True
    except ImportError:
        return False
