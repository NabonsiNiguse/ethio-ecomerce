from django.urls import path

from .profile_views import ProfileMeAPIView, ProfileUpdateAPIView

urlpatterns = [
    path("me", ProfileMeAPIView.as_view(), name="users-me"),
    path("update", ProfileUpdateAPIView.as_view(), name="users-update"),
]

