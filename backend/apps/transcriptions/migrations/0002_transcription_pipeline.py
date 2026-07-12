import uuid

import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def fill_existing_rows(apps, schema_editor):
    Audio = apps.get_model("transcriptions", "Audio")
    Transcricao = apps.get_model("transcriptions", "Transcricao")
    now = timezone.now()
    Audio.objects.filter(criado_em__isnull=True).update(criado_em=now)
    Transcricao.objects.filter(criado_em__isnull=True).update(criado_em=now)
    for item in Transcricao.objects.filter(public_id__isnull=True).iterator():
        item.public_id = uuid.uuid4()
        item.save(update_fields=["public_id"])


class Migration(migrations.Migration):
    dependencies = [("transcriptions", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="audio",
            name="criado_em",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="audio",
            name="tamanho_bytes",
            field=models.PositiveBigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="audio",
            name="formato",
            field=models.CharField(
                choices=[
                    ("mp3", "MP3"),
                    ("mp4", "MP4"),
                    ("wav", "WAV"),
                    ("m4a", "M4A"),
                    ("ogg", "OGG"),
                    ("outro", "Outro"),
                ],
                default="mp3",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="audio",
            name="tempo",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Duracao do audio em segundos.",
                null=True,
                validators=[django.core.validators.MaxValueValidator(86400)],
            ),
        ),
        migrations.RemoveIndex(model_name="transcricao", name="transc_processamento_idx"),
        migrations.RemoveIndex(model_name="transcricao", name="transc_diarizacao_idx"),
        migrations.RemoveConstraint(model_name="transcricao", name="transc_interlocutores_max_chk"),
        migrations.RemoveField(model_name="transcricao", name="data_processamento"),
        migrations.RemoveField(model_name="transcricao", name="numero_interlocutores"),
        migrations.RemoveField(model_name="transcricao", name="tem_diarizacao"),
        migrations.RemoveField(model_name="transcricao", name="texto_com_interlocutores"),
        migrations.AddField(
            model_name="transcricao",
            name="arquivo_temporario",
            field=models.CharField(blank=True, default="", max_length=500),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="transcricao",
            name="atualizado_em",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="criado_em",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="duplicate_of",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="duplicate_jobs",
                to="transcriptions.transcricao",
            ),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="error_message",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="finalizado_em",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="nome_original",
            field=models.CharField(default="arquivo", max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="transcricao",
            name="provider",
            field=models.CharField(default="assemblyai", max_length=32),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="provider_transcription_id",
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="public_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="status",
            field=models.CharField(
                choices=[
                    ("queued", "Na fila"),
                    ("extracting", "Extraindo audio"),
                    ("checking_duplicate", "Verificando duplicidade"),
                    ("uploading_provider", "Enviando ao provedor"),
                    ("processing", "Processando"),
                    ("completed", "Concluida"),
                    ("failed", "Falhou"),
                ],
                db_index=True,
                default="queued",
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="tipo_origem",
            field=models.CharField(
                choices=[("audio", "Audio"), ("video", "Video")],
                default="audio",
                max_length=10,
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="transcricao",
            name="audio",
            field=models.ForeignKey(
                blank=True,
                db_column="idAudio",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="transcricoes",
                to="transcriptions.audio",
            ),
        ),
        migrations.AlterField(
            model_name="transcricao",
            name="texto_transcricao",
            field=models.TextField(blank=True, db_column="textoTranscricao"),
        ),
        migrations.RunPython(
            fill_existing_rows,
            migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="transcricao",
            name="public_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name="audio",
            name="criado_em",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name="transcricao",
            name="criado_em",
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AddIndex(
            model_name="transcricao",
            index=models.Index(fields=["-criado_em"], name="transc_criado_idx"),
        ),
        migrations.AddIndex(
            model_name="transcricao",
            index=models.Index(fields=["audio", "status"], name="transc_audio_status_idx"),
        ),
    ]
