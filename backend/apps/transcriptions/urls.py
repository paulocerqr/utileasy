from django.urls import path

from .views import TranscriptionCreateView, TranscriptionDetailView, TranscriptionPdfView


app_name = "transcriptions"

urlpatterns = [
    path("", TranscriptionCreateView.as_view(), name="create"),
    path("<uuid:public_id>/", TranscriptionDetailView.as_view(), name="detail"),
    path("<uuid:public_id>/pdf/", TranscriptionPdfView.as_view(), name="pdf"),
]
