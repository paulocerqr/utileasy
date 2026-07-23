from rest_framework import serializers

from .models import Transcricao


class TranscricaoSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    original_filename = serializers.CharField(source="nome_original", read_only=True)
    transcript_text = serializers.SerializerMethodField()
    error_message = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source="criado_em", read_only=True)
    finished_at = serializers.DateTimeField(source="finalizado_em", read_only=True)
    anonymous = serializers.SerializerMethodField()
    expires_at = serializers.DateTimeField(source="expira_em", read_only=True)

    class Meta:
        model = Transcricao
        fields = [
            "id",
            "original_filename",
            "status",
            "transcript_text",
            "error_message",
            "created_at",
            "finished_at",
            "anonymous",
            "expires_at",
        ]

    def get_transcript_text(self, instance):
        return instance.effective_text if instance.status == Transcricao.Status.COMPLETED else ""

    def get_error_message(self, instance):
        return instance.effective_error if instance.status == Transcricao.Status.FAILED else ""

    def get_anonymous(self, instance):
        return instance.anonymous_session_id is not None
