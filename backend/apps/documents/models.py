import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def default_document_expiration():
    return timezone.now() + timedelta(
        days=getattr(settings, "AUTHENTICATED_RESULT_TTL_DAYS", 180)
    )


class DocumentConversion(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Na fila"
        VALIDATING = "validating", "Validando"
        CONVERTING = "converting", "Convertendo"
        COMPLETED = "completed", "Concluída"
        FAILED = "failed", "Falhou"

    class Operation(models.TextChoices):
        PDF_TO_DOCX = "pdf_to_docx", "PDF para DOCX"
        DOCX_TO_PDF = "docx_to_pdf", "DOCX para PDF"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="document_conversions",
        null=True,
        blank=True,
    )
    anonymous_session = models.ForeignKey(
        "transcriptions.AnonymousSession",
        on_delete=models.CASCADE,
        related_name="document_conversions",
        null=True,
        blank=True,
    )
    access_token_hash = models.CharField(max_length=64, blank=True)
    operation = models.CharField(max_length=16, choices=Operation.choices)
    nome_original = models.CharField(max_length=255)
    nome_saida = models.CharField(max_length=255)
    arquivo_entrada = models.CharField(max_length=500, blank=True)
    arquivo_saida = models.CharField(max_length=500, blank=True)
    tamanho_entrada_bytes = models.PositiveBigIntegerField(default=0)
    tamanho_saida_bytes = models.PositiveBigIntegerField(default=0)
    paginas = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    error_message = models.TextField(blank=True)
    expira_em = models.DateTimeField(default=default_document_expiration, db_index=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner", "-criado_em"], name="doc_owner_created_idx"),
            models.Index(
                fields=["anonymous_session", "-criado_em"],
                name="doc_anon_created_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(
                        owner__isnull=False,
                        anonymous_session__isnull=True,
                        access_token_hash="",
                    )
                    | (
                        models.Q(owner__isnull=True, anonymous_session__isnull=False)
                        & ~models.Q(access_token_hash="")
                    )
                ),
                name="document_conversion_single_actor_chk",
            )
        ]

    def __str__(self):
        return f"Conversão {self.public_id}"


class DocumentConversionCapacity(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "capacidade de conversão de documentos"
        verbose_name_plural = "capacidade de conversão de documentos"
