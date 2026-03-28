from django.urls import path

from .profile_views import ProfileMeAPIView, ProfileUpdateAPIView
from .notification_views import NotificationListView, NotificationMarkAllReadView, NotificationMarkReadView

urlpatterns = [
    path("me", ProfileMeAPIView.as_view(), name="users-me"),
    path("update", ProfileUpdateAPIView.as_view(), name="users-update"),
]

# Notifications are at /api/notifications/ (registered in config/urls.py)
