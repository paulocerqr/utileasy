from rest_framework import serializers

from .models import Audio, Transcricao


class AudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Audio
        fields = ["id_audio", "tempo", "formato", "hash", "filename"]
        read_only_fields = ["id_audio"]


class TranscricaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transcricao
        fields = [
            "id_transcricao",
            "audio",
            "texto_transcricao",
            "data_processamento",
            "texto_com_interlocutores",
            "numero_interlocutores",
            "tem_diarizacao",
        ]
        read_only_fields = ["id_transcricao", "data_processamento"]
