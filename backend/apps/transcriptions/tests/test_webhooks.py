from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.transcriptions.models import Transcricao


@override_settings(ASSEMBLYAI_WEBHOOK_SECRET="webhook-secret")
class AssemblyAIWebhookTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("webhook-owner")
        self.job = Transcricao.objects.create(
            owner=self.user,
            nome_original="meeting.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.PROCESSING,
        )
        self.url = reverse("assemblyai-webhook", kwargs={"public_id": self.job.public_id})

    def test_rejects_invalid_secret(self):
        response = self.client.post(
            self.url,
            {"transcript_id": "provider-1"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_accepts_authenticated_delivery_idempotently(self):
        with patch("apps.transcriptions.webhooks.finalize_transcription.delay") as finalize:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    self.url,
                    {"transcript_id": "provider-1"},
                    content_type="application/json",
                    HTTP_X_ASSEMBLYAI_WEBHOOK_SECRET="webhook-secret",
                )
        self.assertEqual(response.status_code, 202)
        self.job.refresh_from_db()
        self.assertEqual(self.job.provider_transcription_id, "provider-1")
        finalize.assert_called_once_with(self.job.pk)
