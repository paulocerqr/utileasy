from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class AccountApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            "alice", password="correct-password", email="alice@example.com"
        )

    def test_login_requires_csrf_and_creates_session(self):
        client = Client(enforce_csrf_checks=True)
        rejected = client.post(
            reverse("accounts:login"),
            {"username": "alice", "password": "correct-password"},
            content_type="application/json",
        )
        self.assertEqual(rejected.status_code, 403)

        csrf_response = client.get(reverse("accounts:csrf"))
        token = csrf_response.json()["csrf_token"]
        response = client.post(
            reverse("accounts:login"),
            {"username": "alice", "password": "correct-password"},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "alice")
        self.assertEqual(client.get(reverse("accounts:me")).status_code, 200)

    def test_invalid_credentials_are_rejected(self):
        response = self.client.post(
            reverse("accounts:login"),
            {"username": "alice", "password": "wrong"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
