from django.contrib import admin
from django.urls import include, path

from apps.transcriptions.webhooks import AssemblyAIWebhookView
from apps.transcriptions.views import AnonymousSessionView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.common.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/transcriptions/", include("apps.transcriptions.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/anonymous/session/", AnonymousSessionView.as_view(), name="anonymous-session"),
    path(
        "api/webhooks/assemblyai/<uuid:public_id>/",
        AssemblyAIWebhookView.as_view(),
        name="assemblyai-webhook",
    ),
]
