import shutil
import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.transcriptions.models import Audio, Transcricao


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="utileazy-tests-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class TranscriptionApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def test_upload_creates_persistent_job(self):
        upload = SimpleUploadedFile("meeting.mp3", b"fake audio", content_type="audio/mpeg")
        from unittest.mock import patch

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
        self.assertEqual(job.nome_original, "meeting.mp3")
        enqueue.assert_called_once_with(job.pk)

    def test_rejects_unsupported_extension(self):
        upload = SimpleUploadedFile("notes.txt", b"text", content_type="text/plain")
        response = self.client.post(reverse("transcriptions:create"), {"file": upload})
        self.assertEqual(response.status_code, 415)

    def test_completed_job_downloads_pdf(self):
        audio = Audio.objects.create(
            hash="a" * 64,
            filename="audio.mp3",
            formato=Audio.Formato.MP3,
            tempo=10,
        )
        job = Transcricao.objects.create(
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
