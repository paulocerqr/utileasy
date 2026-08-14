from django.contrib import admin

from .models import DocumentConversion


@admin.register(DocumentConversion)
class DocumentConversionAdmin(admin.ModelAdmin):
    list_display = (
        "public_id",
        "owner",
        "anonymous_session",
        "operation",
        "nome_original",
        "status",
        "criado_em",
        "finalizado_em",
    )
    list_filter = ("operation", "status", "criado_em")
    search_fields = ("public_id", "owner__username", "nome_original", "nome_saida")
    readonly_fields = ("public_id", "criado_em", "atualizado_em", "finalizado_em")
