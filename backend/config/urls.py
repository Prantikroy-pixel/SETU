"""
Root URL Configuration for SETU backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

# Health check endpoint
def health_check(request):
    return JsonResponse({"status": "ok", "message": "SETU backend is running"})

urlpatterns = [
    # Health check
    path('health/', health_check),
    path('api/health/', health_check),

    path('admin/', admin.site.urls),

    # Authentication & User Profiles
    path('api/auth/', include('accounts.urls')),

    # Matching Engine (matches, ranking, confirmation)
    path('api/', include('matching.urls')),

    # Logistics & GPS Fleet Tracking
    path('api/', include('logistics.urls')),

    # Core Domain (districts, needs, resources, conditions, allocations, alerts)
    path('api/', include('core.urls')),

    # Dashboard & District Analytics
    path('api/dashboard/', include('dashboard.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
