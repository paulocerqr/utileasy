import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.documents.models import DocumentConversion
from apps.documents.services import DocumentConversionError
from apps.documents.tasks import process_document_conversion, purge_expired_document_data


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="utileazy-document-tasks-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class DocumentConversionTaskTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("worker-user")

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def create_job(self):
        input_name = default_storage.save(
            "documents/uploads/input.pdf", ContentFile(b"%PDF-1.7 fixture")
        )
        return DocumentConversion.objects.create(
            owner=self.user,
            operation=DocumentConversion.Operation.PDF_TO_DOCX,
            nome_original="input.pdf",
            nome_saida="input.docx",
            arquivo_entrada=input_name,
            tamanho_entrada_bytes=16,
        )

    def test_task_saves_only_result_and_removes_input(self):
        job = self.create_job()

        def fake_conversion(input_path, output_directory, operation):
            output = Path(output_directory) / "result.docx"
            output.write_bytes(b"PK\x03\x04converted")
            return output, 3

        with patch("apps.documents.tasks.convert_document", side_effect=fake_conversion):
            result = process_document_conversion.run(job.pk)

        self.assertEqual(result, DocumentConversion.Status.COMPLETED)
        job.refresh_from_db()
        self.assertEqual(job.status, DocumentConversion.Status.COMPLETED)
        self.assertEqual(job.paginas, 3)
        self.assertEqual(job.arquivo_entrada, "")
        self.assertTrue(default_storage.exists(job.arquivo_saida))

    def test_task_returns_useful_error_and_cleans_input(self):
        job = self.create_job()
        with patch(
            "apps.documents.tasks.convert_document",
            side_effect=DocumentConversionError("PDF inválido ou corrompido."),
        ):
            result = process_document_conversion.run(job.pk)

        self.assertEqual(result, DocumentConversion.Status.FAILED)
        job.refresh_from_db()
        self.assertEqual(job.status, DocumentConversion.Status.FAILED)
        self.assertEqual(job.error_message, "PDF inválido ou corrompido.")
        self.assertEqual(job.arquivo_entrada, "")

    def test_expiration_removes_input_output_and_database_row(self):
        job = self.create_job()
        output_name = default_storage.save(
            "documents/results/output.docx", ContentFile(b"converted")
        )
        job.arquivo_saida = output_name
        job.expira_em = timezone.now()
        job.save(update_fields=["arquivo_saida", "expira_em"])

        purged = purge_expired_document_data.run()

        self.assertEqual(purged, 1)
        self.assertFalse(DocumentConversion.objects.filter(pk=job.pk).exists())
        self.assertFalse(default_storage.exists(output_name))
