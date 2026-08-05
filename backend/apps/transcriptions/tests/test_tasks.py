import shutil
import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.transcriptions.models import (
    Audio,
    DailyTranscriptionBudget,
    Transcricao,
    TranscriptionArtifact,
)
from apps.transcriptions.tasks import (
    PIPELINE_VERSION,
    _apply_provider_result,
    _configuration_hash,
    delete_provider_transcription,
    process_transcription,
    purge_expired_transcription_data,
    submit_transcription,
)


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="utileazy-task-tests-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class TranscriptionTaskTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.user = get_user_model().objects.create_user("worker-owner")
        self.other_user = get_user_model().objects.create_user("other-owner")

    def create_job(self, name="meeting.mp3", owner=None):
        stored_name = default_storage.save(
            f"transcriptions/uploads/{name}",
            ContentFile(b"fake media"),
        )
        return Transcricao.objects.create(
            owner=owner or self.user,
            nome_original=name,
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            arquivo_temporario=stored_name,
        )

    def test_media_stage_persists_canonical_audio_and_enqueues_provider(self):
        job = self.create_job()
        uploaded_name = job.arquivo_temporario

        def create_output(input_path, output_path):
            Path(output_path).write_bytes(b"canonical audio")

        with (
            patch("apps.transcriptions.tasks.inspect_media", return_value={"duration_seconds": 20, "source_kind": "audio"}),
            patch("apps.transcriptions.tasks.create_canonical_audio", side_effect=create_output),
            patch("apps.transcriptions.tasks.calculate_sha256", return_value="b" * 64),
            patch("apps.transcriptions.tasks.submit_transcription.delay") as enqueue_provider,
        ):
            process_transcription.run(job.pk)

        job.refresh_from_db()
        self.assertEqual(job.status, Transcricao.Status.UPLOADING_PROVIDER)
        self.assertEqual(job.audio.hash, "b" * 64)
        self.assertFalse(default_storage.exists(uploaded_name))
        self.assertTrue(default_storage.exists(job.arquivo_processado))
        enqueue_provider.assert_called_once_with(job.pk)

    def test_provider_stage_submits_and_schedules_polling(self):
        processed_name = default_storage.save(
            "transcriptions/processed/provider.mp3", ContentFile(b"canonical")
        )
        audio = Audio.objects.create(hash="e" * 64, filename="provider.mp3", tempo=20)
        artifact = TranscriptionArtifact.objects.create(
            audio=audio,
            configuration_hash=_configuration_hash(),
            pipeline_version=PIPELINE_VERSION,
        )
        job = Transcricao.objects.create(
            owner=self.user,
            audio=audio,
            artifact=artifact,
            nome_original="provider.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.UPLOADING_PROVIDER,
            arquivo_processado=processed_name,
        )
        with (
            patch("apps.transcriptions.tasks.AssemblyAIClient.upload_file", return_value="https://upload.test/audio"),
            patch("apps.transcriptions.tasks.AssemblyAIClient.submit_transcription", return_value="provider-123") as submit,
            patch("apps.transcriptions.tasks.poll_transcription.apply_async") as schedule_poll,
        ):
            submit_transcription.run(job.pk)

        job.refresh_from_db()
        self.assertEqual(job.status, Transcricao.Status.PROCESSING)
        self.assertEqual(job.provider_transcription_id, "provider-123")
        self.assertFalse(default_storage.exists(processed_name))
        submit.assert_called_once_with(
            "https://upload.test/audio", webhook_url=None, webhook_secret=None
        )
        schedule_poll.assert_called_once()

    def test_terminal_result_is_saved_before_provider_deletion_is_enqueued(self):
        audio = Audio.objects.create(hash="f" * 64, filename="terminal.mp3")
        artifact = TranscriptionArtifact.objects.create(
            audio=audio,
            configuration_hash=_configuration_hash(),
            pipeline_version=PIPELINE_VERSION,
            provider_transcription_id="provider-terminal",
        )
        job = Transcricao.objects.create(
            owner=self.user,
            audio=audio,
            artifact=artifact,
            nome_original="terminal.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.PROCESSING,
            provider_transcription_id="provider-terminal",
        )

        with patch(
            "apps.transcriptions.tasks.delete_provider_transcription.delay"
        ) as enqueue_delete:
            terminal = _apply_provider_result(
                job,
                {"status": "completed", "text": "Texto persistido localmente"},
            )

        artifact.refresh_from_db()
        job.refresh_from_db()
        self.assertTrue(terminal)
        self.assertEqual(artifact.transcript_text, "Texto persistido localmente")
        self.assertEqual(job.status, Transcricao.Status.COMPLETED)
        enqueue_delete.assert_called_once_with("provider-terminal")

    def test_provider_deletion_clears_local_provider_identifiers(self):
        audio = Audio.objects.create(hash="1" * 64, filename="delete.mp3")
        artifact = TranscriptionArtifact.objects.create(
            audio=audio,
            configuration_hash=_configuration_hash(),
            pipeline_version=PIPELINE_VERSION,
            status=TranscriptionArtifact.Status.COMPLETED,
            provider_transcription_id="provider-delete",
        )
        job = Transcricao.objects.create(
            owner=self.user,
            audio=audio,
            artifact=artifact,
            nome_original="delete.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.COMPLETED,
            provider_transcription_id="provider-delete",
        )

        with patch("apps.transcriptions.tasks.AssemblyAIClient") as client_class:
            result = delete_provider_transcription.run("provider-delete")

        artifact.refresh_from_db()
        job.refresh_from_db()
        client_class.return_value.delete_transcription.assert_called_once_with(
            "provider-delete"
        )
        self.assertEqual(result, "provider-delete")
        self.assertIsNone(artifact.provider_transcription_id)
        self.assertIsNone(job.provider_transcription_id)

    def test_expiration_keeps_shared_artifact_until_last_job_is_removed(self):
        audio = Audio.objects.create(hash="2" * 64, filename="retention.mp3")
        artifact = TranscriptionArtifact.objects.create(
            audio=audio,
            configuration_hash=_configuration_hash(),
            pipeline_version=PIPELINE_VERSION,
            status=TranscriptionArtifact.Status.COMPLETED,
            transcript_text="Texto compartilhado",
        )
        expired_job = Transcricao.objects.create(
            owner=self.user,
            audio=audio,
            artifact=artifact,
            nome_original="expired.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.COMPLETED,
            expira_em=timezone.now() - timedelta(seconds=1),
        )
        active_job = Transcricao.objects.create(
            owner=self.other_user,
            audio=audio,
            artifact=artifact,
            nome_original="active.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.COMPLETED,
            expira_em=timezone.now() + timedelta(days=1),
        )

        self.assertEqual(purge_expired_transcription_data.run(), 1)
        self.assertFalse(Transcricao.objects.filter(pk=expired_job.pk).exists())
        self.assertTrue(TranscriptionArtifact.objects.filter(pk=artifact.pk).exists())
        self.assertTrue(Audio.objects.filter(pk=audio.pk).exists())

        Transcricao.objects.filter(pk=active_job.pk).update(
            expira_em=timezone.now() - timedelta(seconds=1)
        )
        self.assertEqual(purge_expired_transcription_data.run(), 1)
        self.assertFalse(TranscriptionArtifact.objects.filter(pk=artifact.pk).exists())
        self.assertFalse(Audio.objects.filter(pk=audio.pk).exists())

    def test_completed_artifact_is_reused_without_exposing_another_job(self):
        audio = Audio.objects.create(
            hash="c" * 64,
            filename="audio.mp3",
            formato=Audio.Formato.MP3,
            tempo=20,
        )
        artifact = TranscriptionArtifact.objects.create(
            audio=audio,
            configuration_hash=_configuration_hash(),
            pipeline_version=PIPELINE_VERSION,
            status=TranscriptionArtifact.Status.COMPLETED,
            transcript_text="Texto existente",
        )
        Transcricao.objects.create(
            owner=self.user,
            audio=audio,
            artifact=artifact,
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
            patch("apps.transcriptions.tasks.submit_transcription.delay") as enqueue_provider,
        ):
            process_transcription.run(duplicate.pk)

        duplicate.refresh_from_db()
        self.assertEqual(duplicate.status, Transcricao.Status.COMPLETED)
        self.assertEqual(duplicate.artifact, artifact)
        self.assertIsNone(duplicate.duplicate_of)
        self.assertEqual(duplicate.effective_text, "Texto existente")
        enqueue_provider.assert_not_called()

    def test_same_audio_from_another_user_reuses_only_shared_artifact(self):
        audio = Audio.objects.create(hash="d" * 64, filename="audio.mp3")
        artifact = TranscriptionArtifact.objects.create(
            audio=audio,
            configuration_hash=_configuration_hash(),
            pipeline_version=PIPELINE_VERSION,
            status=TranscriptionArtifact.Status.COMPLETED,
            transcript_text="Texto compartilhado pelo cache",
        )
        private_job = Transcricao.objects.create(
            owner=self.other_user,
            audio=audio,
            artifact=artifact,
            nome_original="private.mp3",
            tipo_origem=Transcricao.TipoOrigem.AUDIO,
            status=Transcricao.Status.COMPLETED,
            texto_transcricao="Texto privado",
        )
        job = self.create_job("same.mp3")

        def create_output(input_path, output_path):
            Path(output_path).write_bytes(b"canonical audio")

        with (
            patch("apps.transcriptions.tasks.inspect_media", return_value={"duration_seconds": 20, "source_kind": "audio"}),
            patch("apps.transcriptions.tasks.create_canonical_audio", side_effect=create_output),
            patch("apps.transcriptions.tasks.calculate_sha256", return_value="d" * 64),
            patch("apps.transcriptions.tasks.submit_transcription.delay") as enqueue_provider,
        ):
            process_transcription.run(job.pk)

        job.refresh_from_db()
        self.assertEqual(job.status, Transcricao.Status.COMPLETED)
        self.assertIsNone(job.duplicate_of)
        self.assertEqual(job.artifact, artifact)
        self.assertNotEqual(job.pk, private_job.pk)
        self.assertEqual(job.effective_text, "Texto compartilhado pelo cache")
        enqueue_provider.assert_not_called()

    @override_settings(TRANSCRIPTION_DAILY_BUDGET_SECONDS=10)
    def test_global_daily_budget_rejects_audio_before_provider_submission(self):
        job = self.create_job("over-budget.mp3")
        with (
            patch(
                "apps.transcriptions.tasks.inspect_media",
                return_value={"duration_seconds": 20, "source_kind": "audio"},
            ),
            patch("apps.transcriptions.tasks.create_canonical_audio") as canonicalize,
            patch("apps.transcriptions.tasks.submit_transcription.delay") as enqueue_provider,
        ):
            process_transcription.run(job.pk)

        job.refresh_from_db()
        self.assertEqual(job.status, Transcricao.Status.FAILED)
        self.assertIn("cota diária", job.error_message.lower())
        self.assertFalse(DailyTranscriptionBudget.objects.exists())
        canonicalize.assert_not_called()
        enqueue_provider.assert_not_called()
