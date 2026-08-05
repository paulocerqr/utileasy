import uuid
from datetime import timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator
from django.db import models
from django.utils import timezone


def default_authenticated_result_expiration():
    return timezone.now() + timedelta(
        days=getattr(settings, "AUTHENTICATED_RESULT_TTL_DAYS", 180)
    )


class Audio(models.Model):
    class Formato(models.TextChoices):
        MP3 = "mp3", "MP3"
        MP4 = "mp4", "MP4"
        WAV = "wav", "WAV"
        M4A = "m4a", "M4A"
        OGG = "ogg", "OGG"
        OUTRO = "outro", "Outro"

    id_audio = models.BigAutoField(primary_key=True, db_column="idAudio")
    tempo = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MaxValueValidator(86400)],
        help_text="Duracao do audio em segundos.",
    )
    formato = models.CharField(max_length=10, choices=Formato.choices, default=Formato.MP3)
    hash = models.CharField(max_length=64, unique=True)
    filename = models.CharField(max_length=255)
    tamanho_bytes = models.PositiveBigIntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "Audio"
        verbose_name = "audio"
        verbose_name_plural = "audios"
        indexes = [
            models.Index(fields=["formato"], name="audio_formato_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    formato__in=["mp3", "mp4", "wav", "m4a", "ogg", "outro"]
                ),
                name="audio_formato_valido_chk",
            ),
            models.CheckConstraint(
                condition=models.Q(tempo__lte=86400),
                name="audio_tempo_max_chk",
            ),
        ]

    def __str__(self):
        return self.filename


class AnonymousSession(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    cookie_hash = models.CharField(max_length=64, unique=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    ultimo_uso_em = models.DateTimeField(auto_now=True)
    expira_em = models.DateTimeField(db_index=True)

    def __str__(self):
        return f"Sessao anonima {self.public_id}"


class TranscriptionArtifact(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing", "Processando"
        COMPLETED = "completed", "Concluido"
        FAILED = "failed", "Falhou"

    audio = models.ForeignKey(Audio, on_delete=models.CASCADE, related_name="artifacts")
    configuration_hash = models.CharField(max_length=64)
    pipeline_version = models.CharField(max_length=32)
    provider = models.CharField(max_length=32, default="assemblyai")
    provider_transcription_id = models.CharField(
        max_length=100, unique=True, null=True, blank=True
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PROCESSING, db_index=True
    )
    transcript_text = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["audio", "configuration_hash"],
                name="artifact_audio_config_uniq",
            )
        ]


class Transcricao(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Na fila"
        EXTRACTING = "extracting", "Extraindo audio"
        CHECKING_DUPLICATE = "checking_duplicate", "Verificando duplicidade"
        UPLOADING_PROVIDER = "uploading_provider", "Enviando ao provedor"
        PROCESSING = "processing", "Processando"
        COMPLETED = "completed", "Concluida"
        FAILED = "failed", "Falhou"

    class TipoOrigem(models.TextChoices):
        AUDIO = "audio", "Audio"
        VIDEO = "video", "Video"

    id_transcricao = models.BigAutoField(primary_key=True, db_column="idTranscricao")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="transcricoes",
        null=True,
        blank=True,
    )
    anonymous_session = models.ForeignKey(
        AnonymousSession,
        on_delete=models.CASCADE,
        related_name="transcricoes",
        null=True,
        blank=True,
    )
    artifact = models.ForeignKey(
        TranscriptionArtifact,
        on_delete=models.SET_NULL,
        related_name="jobs",
        null=True,
        blank=True,
    )
    audio = models.ForeignKey(
        Audio,
        on_delete=models.CASCADE,
        related_name="transcricoes",
        db_column="idAudio",
        null=True,
        blank=True,
    )
    duplicate_of = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="duplicate_jobs",
        null=True,
        blank=True,
    )
    nome_original = models.CharField(max_length=255)
    tipo_origem = models.CharField(max_length=10, choices=TipoOrigem.choices)
    arquivo_temporario = models.CharField(max_length=500, blank=True)
    arquivo_processado = models.CharField(max_length=500, blank=True)
    access_token_hash = models.CharField(max_length=64, blank=True)
    expira_em = models.DateTimeField(
        default=default_authenticated_result_expiration,
        db_index=True,
    )
    quota_date = models.DateField(null=True, blank=True)
    quota_reserved_seconds = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    provider = models.CharField(max_length=32, default="assemblyai")
    provider_transcription_id = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )
    texto_transcricao = models.TextField(blank=True, db_column="textoTranscricao")
    error_message = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "Transcricao"
        verbose_name = "transcricao"
        verbose_name_plural = "transcricoes"
        indexes = [
            models.Index(fields=["-criado_em"], name="transc_criado_idx"),
            models.Index(fields=["owner", "-criado_em"], name="transc_owner_criado_idx"),
            models.Index(
                fields=["anonymous_session", "-criado_em"],
                name="transc_anon_criado_idx",
            ),
            models.Index(fields=["audio", "status"], name="transc_audio_status_idx"),
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
                        models.Q(
                            owner__isnull=True,
                            anonymous_session__isnull=False,
                        )
                        & ~models.Q(access_token_hash="")
                    )
                ),
                name="transc_exatamente_um_ator_chk",
            )
        ]

    def __str__(self):
        return f"Transcricao {self.id_transcricao}"

    @property
    def effective_transcription(self):
        return self.duplicate_of or self

    @property
    def effective_text(self):
        if self.artifact_id and self.artifact.status == TranscriptionArtifact.Status.COMPLETED:
            return self.artifact.transcript_text
        return self.effective_transcription.texto_transcricao

    @property
    def effective_error(self):
        if self.error_message:
            return self.error_message
        if self.artifact_id:
            return self.artifact.error_message
        return self.effective_transcription.error_message


class TranscriptionCapacity(models.Model):
    """Singleton row used to serialize admission checks across API processes."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "capacidade de transcrição"
        verbose_name_plural = "capacidade de transcrição"


class DailyTranscriptionBudget(models.Model):
    date = models.DateField(unique=True)
    reserved_seconds = models.PositiveBigIntegerField(default=0)
    consumed_seconds = models.PositiveBigIntegerField(default=0)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Orcamento {self.date}"
