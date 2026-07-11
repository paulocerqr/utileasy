from django.contrib import admin

from .models import Audio, Transcricao


@admin.register(Audio)
class AudioAdmin(admin.ModelAdmin):
    list_display = ("id_audio", "filename", "formato", "tempo", "tamanho_bytes", "hash")
    list_filter = ("formato",)
    search_fields = ("filename", "hash")
    readonly_fields = ("id_audio",)


@admin.register(Transcricao)
class TranscricaoAdmin(admin.ModelAdmin):
    list_display = (
        "id_transcricao",
        "public_id",
        "nome_original",
        "status",
        "audio",
        "criado_em",
        "finalizado_em",
    )
    list_filter = ("status", "tipo_origem", "provider", "criado_em")
    search_fields = ("public_id", "nome_original", "texto_transcricao", "audio__hash")
    readonly_fields = ("id_transcricao", "public_id", "criado_em", "atualizado_em")
