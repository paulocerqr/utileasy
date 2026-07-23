import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("transcriptions", "0003_ownership_and_storage"),
    ]

    operations = [
        migrations.CreateModel(
            name="AnonymousSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("cookie_hash", models.CharField(max_length=64, unique=True)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("ultimo_uso_em", models.DateTimeField(auto_now=True)),
                ("expira_em", models.DateTimeField(db_index=True)),
            ],
        ),
        migrations.CreateModel(
            name="DailyTranscriptionBudget",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(unique=True)),
                ("reserved_seconds", models.PositiveBigIntegerField(default=0)),
                ("consumed_seconds", models.PositiveBigIntegerField(default=0)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="TranscriptionArtifact",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("configuration_hash", models.CharField(max_length=64)),
                ("pipeline_version", models.CharField(max_length=32)),
                ("provider", models.CharField(default="assemblyai", max_length=32)),
                ("provider_transcription_id", models.CharField(blank=True, max_length=100, null=True, unique=True)),
                ("status", models.CharField(choices=[("processing", "Processando"), ("completed", "Concluido"), ("failed", "Falhou")], db_index=True, default="processing", max_length=16)),
                ("transcript_text", models.TextField(blank=True)),
                ("error_message", models.TextField(blank=True)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("audio", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="artifacts", to="transcriptions.audio")),
            ],
        ),
        migrations.AddConstraint(
            model_name="transcriptionartifact",
            constraint=models.UniqueConstraint(fields=("audio", "configuration_hash"), name="artifact_audio_config_uniq"),
        ),
        migrations.AlterField(
            model_name="transcricao",
            name="owner",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="transcricoes", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="access_token_hash",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="anonymous_session",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="transcricoes", to="transcriptions.anonymoussession"),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="artifact",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="jobs", to="transcriptions.transcriptionartifact"),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="expira_em",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="quota_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="quota_reserved_seconds",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddIndex(
            model_name="transcricao",
            index=models.Index(fields=["anonymous_session", "-criado_em"], name="transc_anon_criado_idx"),
        ),
        migrations.AddConstraint(
            model_name="transcricao",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(owner__isnull=False, anonymous_session__isnull=True, access_token_hash="")
                    | (
                        models.Q(owner__isnull=True, anonymous_session__isnull=False)
                        & ~models.Q(access_token_hash="")
                    )
                ),
                name="transc_exatamente_um_ator_chk",
            ),
        ),
    ]
