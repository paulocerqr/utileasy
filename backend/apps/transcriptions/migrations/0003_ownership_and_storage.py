from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import migrations, models
import django.db.models.deletion


def assign_legacy_owner(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    Transcricao = apps.get_model("transcriptions", "Transcricao")
    Capacity = apps.get_model("transcriptions", "TranscriptionCapacity")
    legacy, _ = User.objects.get_or_create(
        username="legacy-transcriptions",
        defaults={
            "password": make_password(None),
            "is_active": False,
        },
    )
    Transcricao.objects.filter(owner__isnull=True).update(owner=legacy)
    Capacity.objects.get_or_create(pk=1)


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("transcriptions", "0002_transcription_pipeline"),
    ]

    operations = [
        migrations.AddField(
            model_name="transcricao",
            name="owner",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="transcricoes",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="transcricao",
            name="arquivo_processado",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.CreateModel(
            name="TranscriptionCapacity",
            fields=[
                (
                    "id",
                    models.PositiveSmallIntegerField(
                        default=1, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "capacidade de transcrição",
                "verbose_name_plural": "capacidade de transcrição",
            },
        ),
        migrations.RunPython(assign_legacy_owner, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="transcricao",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="transcricoes",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddIndex(
            model_name="transcricao",
            index=models.Index(
                fields=["owner", "-criado_em"], name="transc_owner_criado_idx"
            ),
        ),
    ]
