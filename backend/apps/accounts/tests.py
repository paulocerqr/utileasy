import tempfile
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile


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

    def test_me_returns_profile_fields(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse("accounts:me"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("first_name", data)
        self.assertIn("bio", data)
        self.assertIn("avatar_url", data)

    def test_patch_profile(self):
        self.client.force_login(self.user)
        response = self.client.patch(
            reverse("accounts:me"),
            {"first_name": "Alice Wonderland", "bio": "New bio info"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Alice Wonderland")
        self.assertEqual(self.user.profile.bio, "New bio info")

    @override_settings(MEDIA_ROOT=tempfile.gettempdir())
    def test_avatar_upload_and_delete(self):
        self.client.force_login(self.user)
        
        # Test upload
        image = SimpleUploadedFile("avatar.jpg", b"file_content", content_type="image/jpeg")
        response = self.client.post(
            reverse("accounts:avatar"),
            {"avatar": image},
            format="multipart"
        )
        self.assertEqual(response.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertTrue(self.user.profile.avatar)

        # Test delete
        del_response = self.client.delete(reverse("accounts:avatar"))
        self.assertEqual(del_response.status_code, 204)
        self.user.profile.refresh_from_db()
        self.assertFalse(self.user.profile.avatar)

    def test_delete_account_requires_correct_password(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("accounts:delete-account"),
            {"password": "wrong-password"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_delete_account_deactivates_user(self):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("accounts:delete-account"),
            {"password": "correct-password"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        
        # Wait, if they are logged out, what's the status for MeView? 
        # By default SessionAuthentication returns 403 Forbidden
        me_response = self.client.get(reverse("accounts:me"))
        self.assertEqual(me_response.status_code, 403)
