from django.core.validators import MaxValueValidator
from django.db import models
from django.utils import timezone


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
        validators=[MaxValueValidator(86400)],
        help_text="Duracao do audio em segundos.",
    )
    formato = models.CharField(max_length=10, choices=Formato.choices)
    hash = models.CharField(max_length=64, unique=True)
    filename = models.CharField(max_length=255)

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
    id_transcricao = models.BigAutoField(primary_key=True, db_column="idTranscricao")
    audio = models.ForeignKey(
        Audio,
        on_delete=models.CASCADE,
        related_name="transcricoes",
        db_column="idAudio",
    )
    texto_transcricao = models.TextField(db_column="textoTranscricao")
    data_processamento = models.DateTimeField(
        default=timezone.now,
        db_column="dataProcessamento",
    )
    texto_com_interlocutores = models.TextField(
        blank=True,
        db_column="textoComInterlocutores",
    )
    numero_interlocutores = models.PositiveSmallIntegerField(
        default=0,
        validators=[MaxValueValidator(100)],
        db_column="numeroInterlocutores",
    )
    tem_diarizacao = models.BooleanField(default=False, db_column="temDiarizacao")

    class Meta:
        db_table = "Transcricao"
        verbose_name = "transcricao"
        verbose_name_plural = "transcricoes"
        indexes = [
            models.Index(fields=["data_processamento"], name="transc_processamento_idx"),
            models.Index(fields=["tem_diarizacao"], name="transc_diarizacao_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(numero_interlocutores__lte=100),
                name="transc_interlocutores_max_chk",
            ),
        ]

    def __str__(self):
        return f"Transcricao {self.id_transcricao}"
