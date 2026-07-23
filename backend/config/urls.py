from django.contrib import admin
from django.urls import include, path

from apps.transcriptions.webhooks import AssemblyAIWebhookView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.common.urls")),
    path("api/transcriptions/", include("apps.transcriptions.urls")),
    path(
        "api/webhooks/assemblyai/<uuid:public_id>/",
        AssemblyAIWebhookView.as_view(),
        name="assemblyai-webhook",
    ),
]
