import shutil
import tempfile
from datetime import timedelta
from io import BytesIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.transcriptions.anonymous import CaptchaError, hash_secret
from apps.transcriptions.models import Audio, Transcricao


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="utileazy-tests-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class TranscriptionApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("alice", password="test-password")
        self.other_user = get_user_model().objects.create_user("bob", password="test-password")
        self.client.force_login(self.user)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    @override_settings(AUTHENTICATED_RESULT_TTL_DAYS=180)
    def test_upload_creates_job_with_authenticated_retention(self):
        upload = SimpleUploadedFile("meeting.mp3", b"fake audio", content_type="audio/mpeg")
        with patch("apps.transcriptions.views.process_transcription.delay") as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                with self.settings(CELERY_TASK_ALWAYS_EAGER=True):
                    response = self.client.post(
                        reverse("transcriptions:create"),
                        {"file": upload},
                    )

        self.assertEqual(response.status_code, 202)
        job = Transcricao.objects.get(public_id=response.json()["id"])
        self.assertEqual(job.status, Transcricao.Status.QUEUED)
        self.assertEqual(job.owner, self.user)
        self.assertEqual(job.nome_original, "meeting.mp3")
        expected_expiration = timezone.now() + timedelta(days=180)
        self.assertLess(abs(job.expira_em - expected_expiration), timedelta(seconds=5))
        enqueue.assert_called_once_with(job.pk)

    def test_rejects_unsupported_extension(self):
        upload = SimpleUploadedFile("notes.txt", b"text", content_type="text/plain")
        response = self.client.post(reverse("transcriptions:create"), {"file": upload})
        self.assertEqual(response.status_code, 415)

    @override_settings(TRANSCRIPTION_MAX_FILE_SIZE=1024 * 1024)
    def test_rejects_upload_over_configured_size_limit(self):
        upload = SimpleUploadedFile(
            "large.mp3",
            b"x" * (1024 * 1024 + 1),
            content_type="audio/mpeg",
        )
        response = self.client.post(reverse("transcriptions:create"), {"file": upload})
        self.assertEqual(response.status_code, 413)
        self.assertEqual(response.json()["detail"], "O tamanho máximo permitido é 1 MB.")

    def test_completed_job_downloads_pdf(self):
        audio = Audio.objects.create(
            hash="a" * 64,
            filename="audio.mp3",
            formato=Audio.Formato.MP3,
            tempo=10,
        )
        job = Transcricao.objects.create(
            owner=self.user,
            audio=audio,
            nome_original="meeting.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.COMPLETED,
            texto_transcricao="Uma transcrição de teste.",
        )
        response = self.client.get(
            reverse("transcriptions:pdf", kwargs={"public_id": job.public_id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF"))

    @override_settings(TURNSTILE_ENABLED=False)
    def test_anonymous_upload_returns_one_time_job_token(self):
        self.client.logout()
        session_response = self.client.get(reverse("anonymous-session"))
        self.assertEqual(session_response.status_code, 200)
        self.assertFalse(session_response.json()["authenticated"])

        upload = SimpleUploadedFile("meeting.mp3", b"fake audio", content_type="audio/mpeg")
        with (
            patch("apps.transcriptions.views.enforce_anonymous_burst_limit"),
            patch("apps.transcriptions.views.enforce_anonymous_rate_limits"),
            patch("apps.transcriptions.views.process_transcription.delay") as enqueue,
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(
                reverse("transcriptions:create"), {"file": upload}
            )

        self.assertEqual(response.status_code, 202)
        payload = response.json()
        self.assertTrue(payload["anonymous"])
        self.assertTrue(payload["access_token"])
        job = Transcricao.objects.get(public_id=payload["id"])
        self.assertIsNone(job.owner_id)
        self.assertEqual(job.access_token_hash, hash_secret(payload["access_token"]))
        self.assertNotEqual(job.access_token_hash, payload["access_token"])
        enqueue.assert_called_once_with(job.pk)

        denied = self.client.get(
            reverse("transcriptions:detail", kwargs={"public_id": job.public_id})
        )
        allowed = self.client.get(
            reverse("transcriptions:detail", kwargs={"public_id": job.public_id}),
            HTTP_X_JOB_TOKEN=payload["access_token"],
        )
        self.assertEqual(denied.status_code, 404)
        self.assertEqual(allowed.status_code, 200)
        self.assertNotIn("access_token", allowed.json())

        wrong_token = self.client.get(
            reverse("transcriptions:detail", kwargs={"public_id": job.public_id}),
            HTTP_X_JOB_TOKEN="token-incorreto",
        )
        self.assertEqual(wrong_token.status_code, 404)

        job.expira_em = timezone.now() - timedelta(seconds=1)
        job.save(update_fields=["expira_em"])
        expired = self.client.get(
            reverse("transcriptions:detail", kwargs={"public_id": job.public_id}),
            HTTP_X_JOB_TOKEN=payload["access_token"],
        )
        self.assertEqual(expired.status_code, 404)

    @override_settings(TURNSTILE_ENABLED=False)
    def test_logged_in_user_can_claim_unexpired_anonymous_job(self):
        self.client.logout()
        self.client.get(reverse("anonymous-session"))
        upload = SimpleUploadedFile("claim.mp3", b"fake audio", content_type="audio/mpeg")
        with (
            patch("apps.transcriptions.views.enforce_anonymous_burst_limit"),
            patch("apps.transcriptions.views.enforce_anonymous_rate_limits"),
            patch("apps.transcriptions.views.process_transcription.delay"),
            self.captureOnCommitCallbacks(execute=True),
        ):
            created = self.client.post(reverse("transcriptions:create"), {"file": upload})
        token = created.json()["access_token"]
        job_id = created.json()["id"]

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("transcriptions:claim", kwargs={"public_id": job_id}),
            HTTP_X_JOB_TOKEN=token,
        )

        self.assertEqual(response.status_code, 200)
        job = Transcricao.objects.get(public_id=job_id)
        self.assertEqual(job.owner, self.user)
        self.assertIsNone(job.anonymous_session_id)
        self.assertEqual(job.access_token_hash, "")
        expected_expiration = timezone.now() + timedelta(days=180)
        self.assertLess(abs(job.expira_em - expected_expiration), timedelta(seconds=5))

    def test_invalid_captcha_does_not_consume_daily_anonymous_limits(self):
        self.client.logout()
        self.client.get(reverse("anonymous-session"))
        upload = SimpleUploadedFile("captcha.mp3", b"fake audio", content_type="audio/mpeg")
        with (
            patch("apps.transcriptions.views.enforce_anonymous_burst_limit") as burst,
            patch(
                "apps.transcriptions.views.validate_turnstile",
                side_effect=CaptchaError("CAPTCHA inválido."),
            ),
            patch("apps.transcriptions.views.enforce_anonymous_rate_limits") as daily,
        ):
            response = self.client.post(
                reverse("transcriptions:create"), {"file": upload, "captcha_token": "invalid"}
            )

        self.assertEqual(response.status_code, 400)
        burst.assert_called_once()
        daily.assert_not_called()

    def test_user_cannot_read_another_users_job(self):
        job = Transcricao.objects.create(
            owner=self.other_user,
            nome_original="private.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
        )
        detail = self.client.get(
            reverse("transcriptions:detail", kwargs={"public_id": job.public_id})
        )
        pdf = self.client.get(
            reverse("transcriptions:pdf", kwargs={"public_id": job.public_id})
        )
        self.assertEqual(detail.status_code, 404)
        self.assertEqual(pdf.status_code, 404)

    def test_list_only_returns_owned_jobs(self):
        own_job = Transcricao.objects.create(
            owner=self.user,
            nome_original="mine.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
        )
        Transcricao.objects.create(
            owner=self.other_user,
            nome_original="theirs.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
        )
        response = self.client.get(reverse("transcriptions:create"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [str(own_job.public_id)])

    def test_expired_authenticated_job_is_hidden_and_inaccessible(self):
        expired_job = Transcricao.objects.create(
            owner=self.user,
            nome_original="expired.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            expira_em=timezone.now() - timedelta(seconds=1),
        )

        history = self.client.get(reverse("transcriptions:create"))
        detail = self.client.get(
            reverse(
                "transcriptions:detail",
                kwargs={"public_id": expired_job.public_id},
            )
        )

        self.assertEqual(history.status_code, 200)
        self.assertNotIn(str(expired_job.public_id), [item["id"] for item in history.json()])
        self.assertEqual(detail.status_code, 404)
