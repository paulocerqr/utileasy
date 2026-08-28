from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import apps.documents.models
import uuid


def create_capacity(apps, schema_editor):
    capacity = apps.get_model("documents", "DocumentConversionCapacity")
    capacity.objects.get_or_create(pk=1)


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("transcriptions", "0005_authenticated_result_expiration"),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentConversionCapacity",
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
                "verbose_name": "capacidade de conversão de documentos",
                "verbose_name_plural": "capacidade de conversão de documentos",
            },
        ),
        migrations.CreateModel(
            name="DocumentConversion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("access_token_hash", models.CharField(blank=True, max_length=64)),
                ("operation", models.CharField(choices=[("pdf_to_docx", "PDF para DOCX"), ("docx_to_pdf", "DOCX para PDF")], max_length=16)),
                ("nome_original", models.CharField(max_length=255)),
                ("nome_saida", models.CharField(max_length=255)),
                ("arquivo_entrada", models.CharField(blank=True, max_length=500)),
                ("arquivo_saida", models.CharField(blank=True, max_length=500)),
                ("tamanho_entrada_bytes", models.PositiveBigIntegerField(default=0)),
                ("tamanho_saida_bytes", models.PositiveBigIntegerField(default=0)),
                ("paginas", models.PositiveIntegerField(blank=True, null=True)),
                ("status", models.CharField(choices=[("queued", "Na fila"), ("validating", "Validando"), ("converting", "Convertendo"), ("completed", "Concluída"), ("failed", "Falhou")], db_index=True, default="queued", max_length=16)),
                ("error_message", models.TextField(blank=True)),
                ("expira_em", models.DateTimeField(db_index=True, default=apps.documents.models.default_document_expiration)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                ("finalizado_em", models.DateTimeField(blank=True, null=True)),
                ("anonymous_session", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="document_conversions", to="transcriptions.anonymoussession")),
                ("owner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="document_conversions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["owner", "-criado_em"], name="doc_owner_created_idx"),
                    models.Index(fields=["anonymous_session", "-criado_em"], name="doc_anon_created_idx"),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=(
                            models.Q(("access_token_hash", ""), ("anonymous_session__isnull", True), ("owner__isnull", False))
                            | (models.Q(("anonymous_session__isnull", False), ("owner__isnull", True)) & ~models.Q(("access_token_hash", "")))
                        ),
                        name="document_conversion_single_actor_chk",
                    )
                ],
            },
        ),
        migrations.RunPython(create_capacity, migrations.RunPython.noop),
    ]
