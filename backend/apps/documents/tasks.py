import logging
import tempfile
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.transcriptions.models import AnonymousSession
from apps.transcriptions.services import (
    delete_storage_file,
    materialize_storage_file,
    save_local_file,
)

from .models import DocumentConversion
from .services import DocumentConversionError, convert_document


logger = logging.getLogger(__name__)


def _mark_failed(job_id, message):
    now = timezone.now()
    job = DocumentConversion.objects.filter(pk=job_id).first()
    if not job:
        return
    delete_storage_file(job.arquivo_entrada)
    delete_storage_file(job.arquivo_saida)
    DocumentConversion.objects.filter(pk=job_id).update(
        status=DocumentConversion.Status.FAILED,
        error_message=message,
        arquivo_entrada="",
        arquivo_saida="",
        tamanho_saida_bytes=0,
        finalizado_em=now,
        atualizado_em=now,
    )


@shared_task(acks_late=True, reject_on_worker_lost=True)
def process_document_conversion(conversion_id):
    job = DocumentConversion.objects.get(pk=conversion_id)
    if job.status in {
        DocumentConversion.Status.COMPLETED,
        DocumentConversion.Status.FAILED,
    }:
        return job.status

    input_name = job.arquivo_entrada
    saved_output_name = ""
    try:
        DocumentConversion.objects.filter(pk=job.pk).update(
            status=DocumentConversion.Status.VALIDATING,
            error_message="",
            atualizado_em=timezone.now(),
        )
        with materialize_storage_file(input_name) as local_input:
            with tempfile.TemporaryDirectory(prefix="utileazy-documents-") as temp_dir:
                DocumentConversion.objects.filter(pk=job.pk).update(
                    status=DocumentConversion.Status.CONVERTING,
                    atualizado_em=timezone.now(),
                )
                output_path, page_count = convert_document(
                    local_input,
                    Path(temp_dir),
                    job.operation,
                )
                extension = Path(job.nome_saida).suffix.lower()
                requested_name = f"documents/results/{job.public_id.hex}{extension}"
                saved_output_name = save_local_file(output_path, requested_name)
                output_size = output_path.stat().st_size

        with transaction.atomic():
            locked_job = DocumentConversion.objects.select_for_update().get(pk=job.pk)
            if locked_job.expira_em <= timezone.now():
                raise DocumentConversionError(
                    "O prazo deste job expirou durante a conversão."
                )
            locked_job.status = DocumentConversion.Status.COMPLETED
            locked_job.arquivo_saida = saved_output_name
            locked_job.arquivo_entrada = ""
            locked_job.tamanho_saida_bytes = output_size
            locked_job.paginas = page_count
            locked_job.error_message = ""
            locked_job.finalizado_em = timezone.now()
            locked_job.save(
                update_fields=[
                    "status",
                    "arquivo_saida",
                    "arquivo_entrada",
                    "tamanho_saida_bytes",
                    "paginas",
                    "error_message",
                    "finalizado_em",
                    "atualizado_em",
                ]
            )
        delete_storage_file(input_name)
        return DocumentConversion.Status.COMPLETED
    except DocumentConversionError as exc:
        delete_storage_file(saved_output_name)
        _mark_failed(job.pk, str(exc))
        return DocumentConversion.Status.FAILED
    except Exception:
        logger.exception("Document conversion %s failed unexpectedly", job.public_id)
        delete_storage_file(saved_output_name)
        _mark_failed(job.pk, "Não foi possível converter o documento.")
        return DocumentConversion.Status.FAILED


@shared_task
def cleanup_orphaned_document_files():
    terminal_statuses = [
        DocumentConversion.Status.COMPLETED,
        DocumentConversion.Status.FAILED,
    ]
    jobs = DocumentConversion.objects.filter(status__in=terminal_statuses).exclude(
        arquivo_entrada=""
    )[:200]
    cleaned = 0
    for job in jobs:
        delete_storage_file(job.arquivo_entrada)
        DocumentConversion.objects.filter(pk=job.pk).update(arquivo_entrada="")
        cleaned += 1

    failed_outputs = DocumentConversion.objects.filter(
        status=DocumentConversion.Status.FAILED
    ).exclude(arquivo_saida="")[:200]
    for job in failed_outputs:
        delete_storage_file(job.arquivo_saida)
        DocumentConversion.objects.filter(pk=job.pk).update(arquivo_saida="")
        cleaned += 1
    return cleaned


@shared_task
def purge_expired_document_data():
    now = timezone.now()
    expired = list(
        DocumentConversion.objects.filter(expira_em__lte=now).values(
            "pk", "arquivo_entrada", "arquivo_saida"
        )[:500]
    )
    for item in expired:
        delete_storage_file(item["arquivo_entrada"])
        delete_storage_file(item["arquivo_saida"])
    DocumentConversion.objects.filter(
        pk__in=[item["pk"] for item in expired]
    ).delete()
    AnonymousSession.objects.filter(
        expira_em__lte=now,
        transcricoes__isnull=True,
        document_conversions__isnull=True,
    ).delete()
    return len(expired)
