from django.contrib import admin

from .models import Audio, Transcricao


@admin.register(Audio)
class AudioAdmin(admin.ModelAdmin):
    list_display = ("id_audio", "filename", "formato", "tempo", "hash")
    list_filter = ("formato",)
    search_fields = ("filename", "hash")
    readonly_fields = ("id_audio",)


@admin.register(Transcricao)
class TranscricaoAdmin(admin.ModelAdmin):
    list_display = (
        "id_transcricao",
        "audio",
        "data_processamento",
        "numero_interlocutores",
        "tem_diarizacao",
    )
    list_filter = ("tem_diarizacao", "data_processamento")
    search_fields = ("texto_transcricao", "texto_com_interlocutores", "audio__filename")
    readonly_fields = ("id_transcricao",)
