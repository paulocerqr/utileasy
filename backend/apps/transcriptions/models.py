import uuid

from django.core.validators import MaxValueValidator
from django.db import models


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
            models.Index(fields=["audio", "status"], name="transc_audio_status_idx"),
        ]

    def __str__(self):
        return f"Transcricao {self.id_transcricao}"

    @property
    def effective_transcription(self):
        return self.duplicate_of or self
