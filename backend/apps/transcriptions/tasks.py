import hashlib
import json
import logging
import tempfile
from datetime import timedelta
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import (
    AnonymousSession,
    Audio,
    DailyTranscriptionBudget,
    Transcricao,
    TranscriptionArtifact,
)
from .providers.assemblyai import AssemblyAIClient, AssemblyAIError
from .services import (
    MediaProcessingError,
    calculate_sha256,
    create_canonical_audio,
    delete_storage_file,
    inspect_media,
    materialize_storage_file,
    save_local_file,
)

logger = logging.getLogger(__name__)
PIPELINE_VERSION = "canonical-mp3-v1"
ACTIVE_JOB_STATUSES = [
    Transcricao.Status.QUEUED,
    Transcricao.Status.EXTRACTING,
    Transcricao.Status.CHECKING_DUPLICATE,
    Transcricao.Status.UPLOADING_PROVIDER,
    Transcricao.Status.PROCESSING,
]


class DailyBudgetExceeded(Exception):
    pass


def _configuration_hash():
    payload = {
        "provider": "assemblyai",
        "language_code": "pt",
        "format_text": True,
        "pipeline_version": PIPELINE_VERSION,
    }
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _reserve_daily_budget(job_id, duration_seconds):
    duration_seconds = max(1, int(duration_seconds or 1))
    with transaction.atomic():
        job = Transcricao.objects.select_for_update().get(pk=job_id)
        if job.quota_reserved_seconds:
            return
        budget_date = timezone.localdate()
        DailyTranscriptionBudget.objects.get_or_create(date=budget_date)
        budget = DailyTranscriptionBudget.objects.select_for_update().get(
            date=budget_date
        )
        projected = (
            budget.reserved_seconds + budget.consumed_seconds + duration_seconds
        )
        if projected > settings.TRANSCRIPTION_DAILY_BUDGET_SECONDS:
            raise DailyBudgetExceeded(
                "A cota diária de transcrição foi atingida. Tente novamente amanhã."
            )
        budget.reserved_seconds += duration_seconds
        budget.save(update_fields=["reserved_seconds", "atualizado_em"])
        job.quota_date = budget_date
        job.quota_reserved_seconds = duration_seconds
        job.save(
            update_fields=[
                "quota_date",
                "quota_reserved_seconds",
                "atualizado_em",
            ]
        )


def _release_daily_budget(job_id):
    with transaction.atomic():
        job = Transcricao.objects.select_for_update().get(pk=job_id)
        seconds = job.quota_reserved_seconds
        budget_date = job.quota_date
        if not seconds or not budget_date:
            return
        budget = DailyTranscriptionBudget.objects.select_for_update().filter(
            date=budget_date
        ).first()
        if budget:
            budget.reserved_seconds = max(0, budget.reserved_seconds - seconds)
            budget.save(update_fields=["reserved_seconds", "atualizado_em"])
        job.quota_reserved_seconds = 0
        job.quota_date = None
        job.save(
            update_fields=["quota_reserved_seconds", "quota_date", "atualizado_em"]
        )


def _consume_daily_budget(job_id):
    with transaction.atomic():
        job = Transcricao.objects.select_for_update().get(pk=job_id)
        seconds = job.quota_reserved_seconds
        budget_date = job.quota_date
        if not seconds or not budget_date:
            return
        budget = DailyTranscriptionBudget.objects.select_for_update().filter(
            date=budget_date
        ).first()
        if budget:
            budget.reserved_seconds = max(0, budget.reserved_seconds - seconds)
            budget.consumed_seconds += seconds
            budget.save(
                update_fields=[
                    "reserved_seconds",
                    "consumed_seconds",
                    "atualizado_em",
                ]
            )
        job.quota_reserved_seconds = 0
        job.save(update_fields=["quota_reserved_seconds", "atualizado_em"])


def _mark_job_failed(job, message):
    now = timezone.now()
    Transcricao.objects.filter(pk=job.pk).update(
        status=Transcricao.Status.FAILED,
        error_message=message,
        arquivo_temporario="",
        arquivo_processado="",
        finalizado_em=now,
        atualizado_em=now,
    )
    _release_daily_budget(job.pk)


def _mark_artifact_failed(artifact, primary_job, message):
    now = timezone.now()
    TranscriptionArtifact.objects.filter(pk=artifact.pk).update(
        status=TranscriptionArtifact.Status.FAILED,
        error_message=message,
        atualizado_em=now,
    )
    Transcricao.objects.filter(artifact=artifact, status__in=ACTIVE_JOB_STATUSES).update(
        status=Transcricao.Status.FAILED,
        error_message=message,
        finalizado_em=now,
        atualizado_em=now,
    )
    _release_daily_budget(primary_job.pk)


def _schedule_provider_deletion(provider_id):
    if not provider_id:
        return
    try:
        delete_provider_transcription.delay(provider_id)
    except Exception:
        logger.exception(
            "Could not enqueue deletion of provider transcription %s", provider_id
        )


def _apply_provider_result(job, result):
    artifact = job.artifact
    if not artifact:
        return _apply_legacy_provider_result(job, result)
    provider_status = result.get("status")
    if provider_status == "completed":
        now = timezone.now()
        text = result.get("text") or ""
        TranscriptionArtifact.objects.filter(pk=artifact.pk).update(
            transcript_text=text,
            status=TranscriptionArtifact.Status.COMPLETED,
            error_message="",
            atualizado_em=now,
        )
        Transcricao.objects.filter(
            artifact=artifact, status__in=ACTIVE_JOB_STATUSES
        ).update(
            status=Transcricao.Status.COMPLETED,
            error_message="",
            finalizado_em=now,
            atualizado_em=now,
        )
        _consume_daily_budget(job.pk)
        _schedule_provider_deletion(artifact.provider_transcription_id)
        return True
    if provider_status == "error":
        _mark_artifact_failed(
            artifact,
            job,
            result.get("error")
            or "A AssemblyAI não conseguiu transcrever o arquivo.",
        )
        _schedule_provider_deletion(artifact.provider_transcription_id)
        return True
    return False


def _apply_legacy_provider_result(job, result):
    provider_status = result.get("status")
    if provider_status == "completed":
        now = timezone.now()
        job.texto_transcricao = result.get("text") or ""
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
        _consume_daily_budget(job.pk)
        _schedule_provider_deletion(job.provider_transcription_id)
        return True
    if provider_status == "error":
        _mark_job_failed(
            job,
            result.get("error")
            or "A AssemblyAI não conseguiu transcrever o arquivo.",
        )
        _schedule_provider_deletion(job.provider_transcription_id)
        return True
    return False


@shared_task(acks_late=True, reject_on_worker_lost=True)
def process_transcription(transcricao_id):
    job = Transcricao.objects.get(pk=transcricao_id)
    if job.status in {Transcricao.Status.COMPLETED, Transcricao.Status.FAILED}:
        return

    input_name = job.arquivo_temporario
    processed_name = ""
    try:
        job.status = Transcricao.Status.EXTRACTING
        job.error_message = ""
        job.save(update_fields=["status", "error_message", "atualizado_em"])

        with materialize_storage_file(input_name) as input_path, tempfile.TemporaryDirectory(
            prefix="utileazy-processed-"
        ) as temp_dir:
            output_path = Path(temp_dir) / f"{job.public_id}.mp3"
            metadata = inspect_media(input_path)
            _reserve_daily_budget(job.pk, metadata["duration_seconds"])
            if metadata["source_kind"] != job.tipo_origem:
                job.tipo_origem = metadata["source_kind"]
                job.save(update_fields=["tipo_origem", "atualizado_em"])

            create_canonical_audio(input_path, output_path)
            job.status = Transcricao.Status.CHECKING_DUPLICATE
            job.save(update_fields=["status", "atualizado_em"])

            media_hash = calculate_sha256(output_path)
            configuration_hash = _configuration_hash()
            release_reservation = False
            enqueue_provider = False
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
                Audio.objects.select_for_update().get(pk=audio.pk)
                artifact = (
                    TranscriptionArtifact.objects.select_for_update()
                    .filter(audio=audio, configuration_hash=configuration_hash)
                    .first()
                )
                if not artifact:
                    artifact = TranscriptionArtifact.objects.create(
                        audio=audio,
                        configuration_hash=configuration_hash,
                        pipeline_version=PIPELINE_VERSION,
                    )
                    enqueue_provider = True
                elif artifact.status == TranscriptionArtifact.Status.COMPLETED:
                    release_reservation = True
                elif artifact.status == TranscriptionArtifact.Status.PROCESSING:
                    release_reservation = True
                else:
                    artifact.status = TranscriptionArtifact.Status.PROCESSING
                    artifact.provider_transcription_id = None
                    artifact.transcript_text = ""
                    artifact.error_message = ""
                    artifact.save(
                        update_fields=[
                            "status",
                            "provider_transcription_id",
                            "transcript_text",
                            "error_message",
                            "atualizado_em",
                        ]
                    )
                    enqueue_provider = True

                job.audio = audio
                job.artifact = artifact
                job.arquivo_temporario = ""
                if artifact.status == TranscriptionArtifact.Status.COMPLETED:
                    job.status = Transcricao.Status.COMPLETED
                    job.finalizado_em = timezone.now()
                elif enqueue_provider:
                    processed_name = save_local_file(
                        output_path,
                        f"transcriptions/processed/{job.public_id}.mp3",
                    )
                    job.arquivo_processado = processed_name
                    job.status = Transcricao.Status.UPLOADING_PROVIDER
                else:
                    job.status = Transcricao.Status.PROCESSING
                job.save(
                    update_fields=[
                        "audio",
                        "artifact",
                        "arquivo_temporario",
                        "arquivo_processado",
                        "status",
                        "finalizado_em",
                        "atualizado_em",
                    ]
                )
            if release_reservation:
                _release_daily_budget(job.pk)
            if enqueue_provider:
                submit_transcription.delay(job.pk)
    except DailyBudgetExceeded as exc:
        _mark_job_failed(job, str(exc))
    except (MediaProcessingError, AssemblyAIError) as exc:
        logger.warning("Transcription %s failed: %s", job.public_id, exc)
        _mark_job_failed(job, str(exc))
        delete_storage_file(processed_name)
    except Exception:
        logger.exception("Unexpected transcription failure for %s", job.public_id)
        _mark_job_failed(job, "Erro interno durante o processamento da transcrição.")
        delete_storage_file(processed_name)
    finally:
        delete_storage_file(input_name)


@shared_task(acks_late=True, reject_on_worker_lost=True)
def submit_transcription(transcricao_id):
    job = Transcricao.objects.select_related("artifact").get(pk=transcricao_id)
    if job.status in {Transcricao.Status.COMPLETED, Transcricao.Status.FAILED}:
        return
    processed_name = job.arquivo_processado
    if not processed_name or not job.artifact_id:
        _mark_job_failed(job, "O áudio processado não está disponível.")
        return

    try:
        with materialize_storage_file(processed_name) as audio_path:
            client = AssemblyAIClient()
            upload_url = client.upload_file(audio_path)
            webhook_url = None
            webhook_secret = None
            if settings.TRANSCRIPTION_COMPLETION_MODE == "webhook":
                webhook_url = (
                    f"{settings.PUBLIC_BASE_URL}/api/webhooks/assemblyai/{job.public_id}/"
                )
                webhook_secret = settings.ASSEMBLYAI_WEBHOOK_SECRET
            provider_id = client.submit_transcription(
                upload_url,
                webhook_url=webhook_url,
                webhook_secret=webhook_secret,
            )

        with transaction.atomic():
            artifact = TranscriptionArtifact.objects.select_for_update().get(
                pk=job.artifact_id
            )
            artifact.provider_transcription_id = provider_id
            artifact.save(
                update_fields=["provider_transcription_id", "atualizado_em"]
            )
            job.provider_transcription_id = provider_id
            job.status = Transcricao.Status.PROCESSING
            job.arquivo_processado = ""
            job.save(
                update_fields=[
                    "provider_transcription_id",
                    "status",
                    "arquivo_processado",
                    "atualizado_em",
                ]
            )
        if settings.TRANSCRIPTION_COMPLETION_MODE == "polling":
            poll_transcription.apply_async(
                args=[job.pk], countdown=settings.ASSEMBLYAI_POLL_INTERVAL
            )
    except (MediaProcessingError, AssemblyAIError) as exc:
        logger.warning("Provider submission %s failed: %s", job.public_id, exc)
        _mark_artifact_failed(job.artifact, job, str(exc))
    except Exception:
        logger.exception("Unexpected provider submission failure for %s", job.public_id)
        _mark_artifact_failed(
            job.artifact, job, "Erro interno durante o envio para transcrição."
        )
    finally:
        delete_storage_file(processed_name)
        Transcricao.objects.filter(pk=job.pk).update(arquivo_processado="")


@shared_task(acks_late=True, reject_on_worker_lost=True)
def finalize_transcription(transcricao_id):
    job = Transcricao.objects.select_related("artifact").get(pk=transcricao_id)
    if job.status in {Transcricao.Status.COMPLETED, Transcricao.Status.FAILED}:
        return job.status
    provider_id = (
        job.artifact.provider_transcription_id
        if job.artifact_id
        else job.provider_transcription_id
    )
    if not provider_id:
        return "missing_provider_id"
    result = AssemblyAIClient().get_transcription(provider_id)
    _apply_provider_result(job, result)
    return result.get("status")


@shared_task(bind=True, acks_late=True, reject_on_worker_lost=True, max_retries=360)
def poll_transcription(self, transcricao_id):
    job = Transcricao.objects.select_related("artifact").get(pk=transcricao_id)
    if job.status in {Transcricao.Status.COMPLETED, Transcricao.Status.FAILED}:
        return
    provider_id = (
        job.artifact.provider_transcription_id
        if job.artifact_id
        else job.provider_transcription_id
    )
    if not provider_id:
        _mark_job_failed(job, "O provedor não retornou um identificador de transcrição.")
        return
    try:
        result = AssemblyAIClient().get_transcription(provider_id)
    except AssemblyAIError as exc:
        if self.request.retries >= self.max_retries:
            if job.artifact_id:
                _mark_artifact_failed(job.artifact, job, str(exc))
            else:
                _mark_job_failed(job, str(exc))
            _schedule_provider_deletion(provider_id)
            return
        raise self.retry(exc=exc, countdown=settings.ASSEMBLYAI_POLL_INTERVAL)

    if _apply_provider_result(job, result):
        return
    if self.request.retries >= self.max_retries:
        message = "A transcrição ultrapassou o tempo limite."
        if job.artifact_id:
            _mark_artifact_failed(job.artifact, job, message)
        else:
            _mark_job_failed(job, message)
        _schedule_provider_deletion(provider_id)
        return
    raise self.retry(countdown=settings.ASSEMBLYAI_POLL_INTERVAL)


@shared_task
def reconcile_stale_transcriptions():
    if settings.TRANSCRIPTION_COMPLETION_MODE != "webhook":
        return 0
    cutoff = timezone.now() - timedelta(
        seconds=settings.TRANSCRIPTION_RECONCILE_AFTER_SECONDS
    )
    job_ids = list(
        Transcricao.objects.filter(
            status=Transcricao.Status.PROCESSING,
            atualizado_em__lt=cutoff,
            provider_transcription_id__isnull=False,
        ).values_list("pk", flat=True)[:100]
    )
    for job_id in job_ids:
        finalize_transcription.delay(job_id)
    return len(job_ids)


@shared_task(bind=True, max_retries=8)
def delete_provider_transcription(self, provider_id):
    try:
        AssemblyAIClient().delete_transcription(provider_id)
    except AssemblyAIError as exc:
        countdown = min(3600, 60 * (2**self.request.retries))
        raise self.retry(exc=exc, countdown=countdown)

    TranscriptionArtifact.objects.filter(
        provider_transcription_id=provider_id
    ).update(provider_transcription_id=None)
    Transcricao.objects.filter(provider_transcription_id=provider_id).update(
        provider_transcription_id=None
    )
    return provider_id


@shared_task
def reconcile_provider_deletions():
    terminal_artifact_statuses = [
        TranscriptionArtifact.Status.COMPLETED,
        TranscriptionArtifact.Status.FAILED,
    ]
    terminal_job_statuses = [
        Transcricao.Status.COMPLETED,
        Transcricao.Status.FAILED,
    ]
    provider_ids = set(
        TranscriptionArtifact.objects.filter(
            status__in=terminal_artifact_statuses,
            provider_transcription_id__isnull=False,
        )
        .exclude(provider_transcription_id="")
        .values_list("provider_transcription_id", flat=True)[:200]
    )
    provider_ids.update(
        Transcricao.objects.filter(
            status__in=terminal_job_statuses,
            provider_transcription_id__isnull=False,
        )
        .exclude(provider_transcription_id="")
        .values_list("provider_transcription_id", flat=True)[:200]
    )
    for provider_id in provider_ids:
        _schedule_provider_deletion(provider_id)
    return len(provider_ids)


@shared_task
def cleanup_orphaned_files():
    jobs = Transcricao.objects.exclude(arquivo_temporario="").filter(
        status__in=[Transcricao.Status.COMPLETED, Transcricao.Status.FAILED]
    ) | Transcricao.objects.exclude(arquivo_processado="").filter(
        status__in=[Transcricao.Status.COMPLETED, Transcricao.Status.FAILED]
    )
    cleaned = 0
    for job in jobs.distinct()[:200]:
        delete_storage_file(job.arquivo_temporario)
        delete_storage_file(job.arquivo_processado)
        Transcricao.objects.filter(pk=job.pk).update(
            arquivo_temporario="", arquivo_processado=""
        )
        cleaned += 1
    return cleaned


@shared_task
def purge_expired_transcription_data():
    now = timezone.now()
    expired_jobs = list(
        Transcricao.objects.filter(expira_em__lte=now).values(
            "pk",
            "artifact_id",
            "audio_id",
            "arquivo_temporario",
            "arquivo_processado",
        )[:500]
    )
    artifact_ids = {item["artifact_id"] for item in expired_jobs if item["artifact_id"]}
    audio_ids = {item["audio_id"] for item in expired_jobs if item["audio_id"]}
    audio_ids.update(
        TranscriptionArtifact.objects.filter(pk__in=artifact_ids).values_list(
            "audio_id", flat=True
        )
    )
    for item in expired_jobs:
        delete_storage_file(item["arquivo_temporario"])
        delete_storage_file(item["arquivo_processado"])
        _release_daily_budget(item["pk"])
    Transcricao.objects.filter(pk__in=[item["pk"] for item in expired_jobs]).delete()
    TranscriptionArtifact.objects.filter(
        pk__in=artifact_ids,
        jobs__isnull=True,
    ).delete()
    Audio.objects.filter(
        pk__in=audio_ids,
        transcricoes__isnull=True,
        artifacts__isnull=True,
    ).delete()
    AnonymousSession.objects.filter(
        expira_em__lte=now,
        transcricoes__isnull=True,
        document_conversions__isnull=True,
    ).delete()
    return len(expired_jobs)


@shared_task
def purge_expired_anonymous_data():
    """Compatibility entry point for schedules created before phase 8."""
    return purge_expired_transcription_data.run()
