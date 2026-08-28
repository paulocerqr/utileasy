from django.urls import path

from .views import CsrfView, LoginView, LogoutView, MeView, AvatarView, DeleteAccountView

app_name = "accounts"

urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="csrf"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("me/avatar/", AvatarView.as_view(), name="avatar"),
    path("me/delete/", DeleteAccountView.as_view(), name="delete-account"),
]
