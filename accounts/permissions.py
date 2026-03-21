from rest_framework.permissions import BasePermission


class RoleRequired(BasePermission):
    """
    Generic role gate for DRF views.
    """

    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return user.role in self.allowed_roles


class IsAdminRole(RoleRequired):
    allowed_roles = ("admin",)


class IsSellerRole(RoleRequired):
    allowed_roles = ("seller",)


class IsCustomerRole(RoleRequired):
    allowed_roles = ("customer",)

