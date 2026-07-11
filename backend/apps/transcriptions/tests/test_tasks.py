import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase, override_settings

from apps.transcriptions.models import Audio, Transcricao
from apps.transcriptions.tasks import process_transcription


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="utileazy-task-tests-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class TranscriptionTaskTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def create_job(self, name="meeting.mp3"):
        stored_name = default_storage.save(
            f"transcriptions/uploads/{name}",
            ContentFile(b"fake media"),
        )
        return Transcricao.objects.create(
            nome_original=name,
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            arquivo_temporario=stored_name,
        )

    def test_new_audio_is_submitted_without_loading_it_into_database(self):
        job = self.create_job()
        uploaded_name = job.arquivo_temporario

        def create_output(input_path, output_path):
            Path(output_path).write_bytes(b"canonical audio")

        with (
            patch("apps.transcriptions.tasks.inspect_media", return_value={"duration_seconds": 20, "source_kind": "audio"}),
            patch("apps.transcriptions.tasks.create_canonical_audio", side_effect=create_output),
            patch("apps.transcriptions.tasks.calculate_sha256", return_value="b" * 64),
            patch("apps.transcriptions.tasks.AssemblyAIClient.upload_file", return_value="https://upload.test/audio"),
            patch("apps.transcriptions.tasks.AssemblyAIClient.submit_transcription", return_value="provider-123"),
            patch("apps.transcriptions.tasks.poll_transcription.apply_async") as schedule_poll,
        ):
            process_transcription.run(job.pk)

        job.refresh_from_db()
        self.assertEqual(job.status, Transcricao.Status.PROCESSING)
        self.assertEqual(job.provider_transcription_id, "provider-123")
        self.assertEqual(job.audio.hash, "b" * 64)
        self.assertFalse(default_storage.exists(uploaded_name))
        schedule_poll.assert_called_once()

    def test_duplicate_reuses_completed_transcription(self):
        audio = Audio.objects.create(
            hash="c" * 64,
            filename="audio.mp3",
            formato=Audio.Formato.MP3,
            tempo=20,
        )
        primary = Transcricao.objects.create(
            audio=audio,
            nome_original="original.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.COMPLETED,
            texto_transcricao="Texto existente",
        )
        duplicate = self.create_job("duplicate.mp3")

        def create_output(input_path, output_path):
            Path(output_path).write_bytes(b"canonical audio")

        with (
            patch("apps.transcriptions.tasks.inspect_media", return_value={"duration_seconds": 20, "source_kind": "audio"}),
            patch("apps.transcriptions.tasks.create_canonical_audio", side_effect=create_output),
            patch("apps.transcriptions.tasks.calculate_sha256", return_value="c" * 64),
            patch("apps.transcriptions.tasks.AssemblyAIClient.upload_file") as provider_upload,
        ):
            process_transcription.run(duplicate.pk)

        duplicate.refresh_from_db()
        self.assertEqual(duplicate.status, Transcricao.Status.COMPLETED)
        self.assertEqual(duplicate.duplicate_of, primary)
        self.assertEqual(duplicate.effective_transcription.texto_transcricao, "Texto existente")
        provider_upload.assert_not_called()
