import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from logistics.routing import websocket_urlpatterns as dispatch_ws
from chat.routing import websocket_urlpatterns as chat_ws
from config.ws_auth_middleware import JwtAuthMiddlewareStack

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddlewareStack(
        URLRouter(dispatch_ws + chat_ws)
    ),
})
