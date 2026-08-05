from datetime import timedelta

from apps.transcriptions.models import default_authenticated_result_expiration
from django.db import migrations, models


def set_authenticated_expiration(apps, schema_editor):
    Transcricao = apps.get_model("transcriptions", "Transcricao")
    Transcricao.objects.filter(
        owner__isnull=False,
        expira_em__isnull=True,
    ).update(
        expira_em=models.ExpressionWrapper(
            models.F("criado_em") + timedelta(days=180),
            output_field=models.DateTimeField(),
        )
    )
    Transcricao.objects.filter(
        owner__isnull=True,
        expira_em__isnull=True,
    ).update(
        expira_em=models.ExpressionWrapper(
            models.F("criado_em") + timedelta(hours=24),
            output_field=models.DateTimeField(),
        )
    )


class Migration(migrations.Migration):
    dependencies = [("transcriptions", "0004_anonymous_access_and_artifacts")]

    operations = [
        migrations.RunPython(set_authenticated_expiration, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="transcricao",
            name="expira_em",
            field=models.DateTimeField(
                db_index=True,
                default=default_authenticated_result_expiration,
            ),
        ),
    ]
