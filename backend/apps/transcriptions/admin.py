from django.contrib import admin

from .models import (
    AnonymousSession,
    Audio,
    DailyTranscriptionBudget,
    Transcricao,
    TranscriptionArtifact,
)


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
        "owner",
        "anonymous_session",
        "nome_original",
        "status",
        "audio",
        "criado_em",
        "finalizado_em",
    )
    list_filter = ("status", "tipo_origem", "provider", "criado_em")
    search_fields = (
        "public_id",
        "owner__username",
        "nome_original",
        "texto_transcricao",
        "audio__hash",
    )
    readonly_fields = ("id_transcricao", "public_id", "criado_em", "atualizado_em")


@admin.register(AnonymousSession)
class AnonymousSessionAdmin(admin.ModelAdmin):
    list_display = ("public_id", "criado_em", "ultimo_uso_em", "expira_em")
    readonly_fields = ("public_id", "cookie_hash", "criado_em", "ultimo_uso_em")


@admin.register(TranscriptionArtifact)
class TranscriptionArtifactAdmin(admin.ModelAdmin):
    list_display = ("id", "audio", "status", "pipeline_version", "criado_em")
    list_filter = ("status", "provider", "pipeline_version")
    search_fields = ("audio__hash", "provider_transcription_id")


@admin.register(DailyTranscriptionBudget)
class DailyTranscriptionBudgetAdmin(admin.ModelAdmin):
    list_display = ("date", "reserved_seconds", "consumed_seconds", "atualizado_em")
