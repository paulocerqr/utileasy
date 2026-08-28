import shutil
import tempfile
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.documents.models import DocumentConversion
from apps.transcriptions.anonymous import hash_secret


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="utileazy-document-api-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class DocumentConversionApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("alice", password="test-password")
        self.other_user = get_user_model().objects.create_user("bob", password="test-password")
        self.client.force_login(self.user)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def test_pdf_upload_creates_authenticated_job_and_enqueues_after_commit(self):
        upload = SimpleUploadedFile(
            "reference.pdf",
            b"%PDF-1.7\nfixture",
            content_type="application/pdf",
        )
        with (
            patch("apps.documents.views.process_document_conversion.delay") as enqueue,
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(
                reverse("documents:create"),
                {"file": upload, "target_format": "docx"},
            )

        self.assertEqual(response.status_code, 202)
        job = DocumentConversion.objects.get(public_id=response.json()["id"])
        self.assertEqual(job.owner, self.user)
        self.assertEqual(job.operation, DocumentConversion.Operation.PDF_TO_DOCX)
        self.assertEqual(job.nome_saida, "reference.docx")
        self.assertEqual(job.status, DocumentConversion.Status.QUEUED)
        enqueue.assert_called_once_with(job.pk)

    def test_docx_upload_selects_pdf_operation(self):
        upload = SimpleUploadedFile(
            "reference.docx",
            b"PK\x03\x04fixture",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        with (
            patch("apps.documents.views.process_document_conversion.delay"),
            self.captureOnCommitCallbacks(execute=True),
        ):
            response = self.client.post(reverse("documents:create"), {"file": upload})

        self.assertEqual(response.status_code, 202)
        job = DocumentConversion.objects.get(public_id=response.json()["id"])
        self.assertEqual(job.operation, DocumentConversion.Operation.DOCX_TO_PDF)
        self.assertEqual(job.nome_saida, "reference.pdf")

    def test_rejects_invalid_signature_extension_and_size(self):
        invalid = SimpleUploadedFile("invalid.pdf", b"not a pdf")
        invalid_response = self.client.post(reverse("documents:create"), {"file": invalid})
        self.assertEqual(invalid_response.status_code, 415)

        unsupported = SimpleUploadedFile("notes.txt", b"text")
        unsupported_response = self.client.post(
            reverse("documents:create"), {"file": unsupported}
        )
        self.assertEqual(unsupported_response.status_code, 415)

        with self.settings(DOCUMENT_MAX_FILE_SIZE=8):
            large = SimpleUploadedFile("large.pdf", b"%PDF-1.7-too-large")
            large_response = self.client.post(
                reverse("documents:create"), {"file": large}
            )
        self.assertEqual(large_response.status_code, 413)

    @override_settings(TURNSTILE_ENABLED=False)
    def test_anonymous_job_requires_one_time_token_and_can_be_claimed(self):
        self.client.logout()
        self.client.get(reverse("anonymous-session"))
        upload = SimpleUploadedFile("temporary.pdf", b"%PDF-1.7\nfixture")
        with (
            patch("apps.documents.views.enforce_anonymous_burst_limit"),
            patch("apps.documents.views.enforce_anonymous_rate_limits"),
            patch("apps.documents.views.process_document_conversion.delay"),
            self.captureOnCommitCallbacks(execute=True),
        ):
            created = self.client.post(reverse("documents:create"), {"file": upload})

        self.assertEqual(created.status_code, 202)
        token = created.json()["access_token"]
        job = DocumentConversion.objects.get(public_id=created.json()["id"])
        self.assertEqual(job.access_token_hash, hash_secret(token))
        denied = self.client.get(
            reverse("documents:detail", kwargs={"public_id": job.public_id})
        )
        allowed = self.client.get(
            reverse("documents:detail", kwargs={"public_id": job.public_id}),
            HTTP_X_JOB_TOKEN=token,
        )
        self.assertEqual(denied.status_code, 404)
        self.assertEqual(allowed.status_code, 200)
        self.assertNotIn("access_token", allowed.json())

        self.client.force_login(self.user)
        claimed = self.client.post(
            reverse("documents:claim", kwargs={"public_id": job.public_id}),
            HTTP_X_JOB_TOKEN=token,
        )
        self.assertEqual(claimed.status_code, 200)
        job.refresh_from_db()
        self.assertEqual(job.owner, self.user)
        self.assertIsNone(job.anonymous_session_id)
        self.assertEqual(job.access_token_hash, "")

    def test_download_is_private_and_streams_completed_result(self):
        output_name = default_storage.save(
            "documents/results/test.docx", ContentFile(b"PK\x03\x04converted")
        )
        job = DocumentConversion.objects.create(
            owner=self.user,
            operation=DocumentConversion.Operation.PDF_TO_DOCX,
            nome_original="input.pdf",
            nome_saida="input.docx",
            arquivo_saida=output_name,
            status=DocumentConversion.Status.COMPLETED,
            finalizado_em=timezone.now(),
        )
        response = self.client.get(
            reverse("documents:download", kwargs={"public_id": job.public_id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"PK\x03\x04converted")
        self.assertIn("attachment", response["Content-Disposition"])

        self.client.force_login(self.other_user)
        denied = self.client.get(
            reverse("documents:download", kwargs={"public_id": job.public_id})
        )
        self.assertEqual(denied.status_code, 404)

    def test_expired_job_is_not_authorized(self):
        job = DocumentConversion.objects.create(
            owner=self.user,
            operation=DocumentConversion.Operation.DOCX_TO_PDF,
            nome_original="input.docx",
            nome_saida="input.pdf",
            expira_em=timezone.now() - timedelta(seconds=1),
        )
        response = self.client.get(
            reverse("documents:detail", kwargs={"public_id": job.public_id})
        )
        self.assertEqual(response.status_code, 404)
