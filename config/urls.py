"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from accounts.dashboard_views import AdminDashboardAPIView

# ── Admin site branding ───────────────────────────────────────────────────────
admin.site.site_header  = "Ethio eCommerce Admin"
admin.site.site_title   = "Ethio eCommerce"
admin.site.index_title  = "Platform Control Panel"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/users/', include('accounts.users_urls')),
    path('api/admin/', include('accounts.admin_urls')),
    path('api/seller/', include('catalog.seller_urls')),
    path('api/admin/dashboard', AdminDashboardAPIView.as_view(), name='admin-dashboard'),
    path('api/', include('catalog.urls')),
    path('api/', include('purchases.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('logistics.urls')),
    path('api/', include('chat.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
