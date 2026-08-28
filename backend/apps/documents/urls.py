from django.urls import path

from .views import (
    DocumentConversionClaimView,
    DocumentConversionCreateView,
    DocumentConversionDetailView,
    DocumentConversionDownloadView,
)


app_name = "documents"

urlpatterns = [
    path("", DocumentConversionCreateView.as_view(), name="create"),
    path("<uuid:public_id>/", DocumentConversionDetailView.as_view(), name="detail"),
    path(
        "<uuid:public_id>/download/",
        DocumentConversionDownloadView.as_view(),
        name="download",
    ),
    path("<uuid:public_id>/claim/", DocumentConversionClaimView.as_view(), name="claim"),
]
