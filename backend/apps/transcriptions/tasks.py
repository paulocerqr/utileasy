import logging
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Audio, Transcricao
from .providers.assemblyai import AssemblyAIClient, AssemblyAIError
from .services import (
    MediaProcessingError,
    calculate_sha256,
    create_canonical_audio,
    delete_local_file,
    delete_storage_file,
    inspect_media,
    storage_path,
)

logger = logging.getLogger(__name__)


def _complete_duplicate(job, primary):
    job.audio = primary.audio
    job.duplicate_of = primary
    job.status = Transcricao.Status.COMPLETED
    job.finalizado_em = timezone.now()
    job.arquivo_temporario = ""
    job.save(
        update_fields=[
            "audio",
            "duplicate_of",
            "status",
            "finalizado_em",
            "arquivo_temporario",
            "atualizado_em",
        ]
    )


def _wait_for_primary(job, primary):
    job.audio = primary.audio
    job.duplicate_of = primary
    job.status = Transcricao.Status.PROCESSING
    job.arquivo_temporario = ""
    job.save(
        update_fields=[
            "audio",
            "duplicate_of",
            "status",
            "arquivo_temporario",
            "atualizado_em",
        ]
    )


def _mark_failed(job, message):
    now = timezone.now()
    Transcricao.objects.filter(pk=job.pk).update(
        status=Transcricao.Status.FAILED,
        error_message=message,
        arquivo_temporario="",
        finalizado_em=now,
        atualizado_em=now,
    )
    Transcricao.objects.filter(duplicate_of_id=job.pk).update(
        status=Transcricao.Status.FAILED,
        error_message=message,
        finalizado_em=now,
        atualizado_em=now,
    )


@shared_task(acks_late=True, reject_on_worker_lost=True)
def process_transcription(transcricao_id):
    job = Transcricao.objects.get(pk=transcricao_id)
    if job.status in {Transcricao.Status.COMPLETED, Transcricao.Status.FAILED}:
        return

    input_relative_name = job.arquivo_temporario
    input_path = storage_path(input_relative_name)
    processed_dir = Path(settings.MEDIA_ROOT) / "transcriptions" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    output_path = processed_dir / f"{job.public_id}.mp3"

    try:
        job.status = Transcricao.Status.EXTRACTING
        job.error_message = ""
        job.save(update_fields=["status", "error_message", "atualizado_em"])

        metadata = inspect_media(input_path)
        if metadata["source_kind"] != job.tipo_origem:
            job.tipo_origem = metadata["source_kind"]
            job.save(update_fields=["tipo_origem", "atualizado_em"])

        create_canonical_audio(input_path, output_path)

        job.status = Transcricao.Status.CHECKING_DUPLICATE
        job.save(update_fields=["status", "atualizado_em"])

        media_hash = calculate_sha256(output_path)
        with transaction.atomic():
            audio, _ = Audio.objects.get_or_create(
                hash=media_hash,
                defaults={
                    "tempo": metadata["duration_seconds"] or None,
                    "formato": Audio.Formato.MP3,
                    "filename": f"{media_hash}.mp3",
                    "tamanho_bytes": output_path.stat().st_size,
                },
            )
            primary = (
                Transcricao.objects.select_for_update()
                .filter(audio=audio, duplicate_of__isnull=True)
                .exclude(pk=job.pk)
                .exclude(status=Transcricao.Status.FAILED)
                .order_by("criado_em")
                .first()
            )

            if primary and primary.status == Transcricao.Status.COMPLETED:
                _complete_duplicate(job, primary)
                return
            if primary:
                _wait_for_primary(job, primary)
                return

            job.audio = audio
            job.status = Transcricao.Status.UPLOADING_PROVIDER
            job.save(update_fields=["audio", "status", "atualizado_em"])

        client = AssemblyAIClient()
        upload_url = client.upload_file(output_path)
        provider_id = client.submit_transcription(upload_url)

        job.provider_transcription_id = provider_id
        job.status = Transcricao.Status.PROCESSING
        job.arquivo_temporario = ""
        job.save(
            update_fields=[
                "provider_transcription_id",
                "status",
                "arquivo_temporario",
                "atualizado_em",
            ]
        )
        poll_transcription.apply_async(args=[job.pk], countdown=settings.ASSEMBLYAI_POLL_INTERVAL)
    except (MediaProcessingError, AssemblyAIError) as exc:
        logger.warning("Transcription %s failed: %s", job.public_id, exc)
        _mark_failed(job, str(exc))
    except Exception:
        logger.exception("Unexpected transcription failure for %s", job.public_id)
        _mark_failed(job, "Erro interno durante o processamento da transcrição.")
    finally:
        delete_storage_file(input_relative_name)
        delete_local_file(output_path)


@shared_task(bind=True, acks_late=True, reject_on_worker_lost=True, max_retries=360)
def poll_transcription(self, transcricao_id):
    job = Transcricao.objects.get(pk=transcricao_id)
    if job.status in {Transcricao.Status.COMPLETED, Transcricao.Status.FAILED}:
        return
    if not job.provider_transcription_id:
        _mark_failed(job, "O provedor não retornou um identificador de transcrição.")
        return

    try:
        result = AssemblyAIClient().get_transcription(job.provider_transcription_id)
    except AssemblyAIError as exc:
        if self.request.retries >= self.max_retries:
            _mark_failed(job, str(exc))
            return
        raise self.retry(exc=exc, countdown=settings.ASSEMBLYAI_POLL_INTERVAL)

    provider_status = result.get("status")
    if provider_status == "completed":
        now = timezone.now()
        text = result.get("text") or ""
        job.texto_transcricao = text
        job.status = Transcricao.Status.COMPLETED
        job.finalizado_em = now
        job.error_message = ""
        job.save(
            update_fields=[
                "texto_transcricao",
                "status",
                "finalizado_em",
                "error_message",
                "atualizado_em",
            ]
        )
        Transcricao.objects.filter(duplicate_of_id=job.pk).update(
            status=Transcricao.Status.COMPLETED,
            finalizado_em=now,
            atualizado_em=now,
        )
        return

    if provider_status == "error":
        _mark_failed(job, result.get("error") or "A AssemblyAI não conseguiu transcrever o arquivo.")
        return

    if self.request.retries >= self.max_retries:
        _mark_failed(job, "A transcrição ultrapassou o tempo limite.")
        return
    raise self.retry(countdown=settings.ASSEMBLYAI_POLL_INTERVAL)
