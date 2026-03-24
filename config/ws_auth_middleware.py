"""
JWT WebSocket authentication middleware.

Reads ?token=<access_token> from the WebSocket query string,
validates it with SimpleJWT, and injects the user into scope —
exactly like AuthMiddlewareStack does for session auth.

Usage in asgi.py:
    from config.ws_auth_middleware import JwtAuthMiddlewareStack
    application = ProtocolTypeRouter({
        "websocket": JwtAuthMiddlewareStack(URLRouter(...))
    })
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user_from_token(token: str):
    """Validate a SimpleJWT access token and return the User, or AnonymousUser."""
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
        from django.contrib.auth import get_user_model

        User = get_user_model()
        validated = AccessToken(token)
        user_id = validated["user_id"]
        return User.objects.get(pk=user_id)
    except Exception:
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    """Inject authenticated user into WebSocket scope via JWT query param."""

    async def __call__(self, scope, receive, send):
        # Only act on WebSocket connections
        if scope["type"] == "websocket":
            qs = parse_qs(scope.get("query_string", b"").decode())
            token = qs.get("token", [None])[0]
            if token:
                scope["user"] = await get_user_from_token(token)
            else:
                scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    """Drop-in replacement for AuthMiddlewareStack that supports JWT."""
    return JwtAuthMiddleware(inner)
