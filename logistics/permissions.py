from rest_framework.permissions import BasePermission


class IsAdminOnly(BasePermission):
    """
    Admin can do write operations in logistics assignment.
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and getattr(user, "role", None) == "admin")

