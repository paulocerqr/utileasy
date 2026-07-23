from unittest.mock import Mock, patch

from django.test import RequestFactory, SimpleTestCase, override_settings

from apps.transcriptions.anonymous import CaptchaError, get_client_ip, validate_turnstile


@override_settings(
    TURNSTILE_ENABLED=True,
    TURNSTILE_SECRET_KEY="test-secret",
    TURNSTILE_EXPECTED_HOSTNAME="app.example.com",
    TURNSTILE_EXPECTED_ACTION="anonymous_transcription",
)
class AnonymousProtectionTests(SimpleTestCase):
    def setUp(self):
        self.request = RequestFactory().post(
            "/api/transcriptions/",
            REMOTE_ADDR="192.0.2.10",
        )

    @patch("apps.transcriptions.anonymous.requests.post")
    def test_turnstile_accepts_expected_action_and_hostname(self, request_post):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "success": True,
            "hostname": "app.example.com",
            "action": "anonymous_transcription",
        }
        request_post.return_value = response

        validate_turnstile("single-use-token", self.request)

        sent = request_post.call_args.kwargs["data"]
        self.assertEqual(sent["remoteip"], "192.0.2.10")
        self.assertEqual(sent["response"], "single-use-token")

    @patch("apps.transcriptions.anonymous.requests.post")
    def test_turnstile_rejects_token_for_another_action(self, request_post):
        response = Mock()
        response.raise_for_status.return_value = None
        response.json.return_value = {
            "success": True,
            "hostname": "app.example.com",
            "action": "another_action",
        }
        request_post.return_value = response

        with self.assertRaises(CaptchaError):
            validate_turnstile("wrong-action-token", self.request)

    def test_client_ip_uses_first_valid_forwarded_address(self):
        request = RequestFactory().get(
            "/",
            HTTP_X_FORWARDED_FOR="198.51.100.20, 172.18.0.2",
            REMOTE_ADDR="172.18.0.3",
        )
        self.assertEqual(get_client_ip(request), "198.51.100.20")
