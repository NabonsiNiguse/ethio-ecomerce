from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Profile
from .serializers import ProfileSerializer, UserPublicSerializer

User = get_user_model()


class ProfileMeAPIView(APIView):
    """
    GET /api/users/me
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Optimization: prefetch the OneToOne relation in the same query.
        user = User.objects.select_related("profile").get(pk=request.user.pk)

        # If the user doesn't have a profile yet, create it (idempotent).
        try:
            profile = user.profile
        except Profile.DoesNotExist:
            with transaction.atomic():
                Profile.objects.create(user=user)
            user = User.objects.select_related("profile").get(pk=request.user.pk)
            profile = user.profile

        return Response(
            {
                "user": UserPublicSerializer(user).data,
                "profile": ProfileSerializer(profile).data,
            },
            status=status.HTTP_200_OK,
        )


class ProfileUpdateAPIView(APIView):
    """
    PUT /api/users/update
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def put(self, request, *args, **kwargs):
        user = User.objects.select_related("profile").get(pk=request.user.pk)

        try:
            profile = user.profile
        except Profile.DoesNotExist:
            with transaction.atomic():
                Profile.objects.create(user=user)
            user = User.objects.select_related("profile").get(pk=request.user.pk)
            profile = user.profile

        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            serializer.save()

        return Response(
            {"message": "Profile updated", "profile": serializer.data},
            status=status.HTTP_200_OK,
        )

