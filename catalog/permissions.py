from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsSellerOwnerOrReadOnly(BasePermission):
    """
    - Public can read (GET/HEAD/OPTIONS).
    - Only authenticated users with role='seller' can create/update/delete.
    - For update/delete, the product must belong to the requesting seller.
    """

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "seller"
        )

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True
        return obj.seller_id == request.user.id

