from rest_framework import serializers

from .models import DocumentConversion


STATUS_PROGRESS = {
    DocumentConversion.Status.QUEUED: 10,
    DocumentConversion.Status.VALIDATING: 30,
    DocumentConversion.Status.CONVERTING: 70,
    DocumentConversion.Status.COMPLETED: 100,
    DocumentConversion.Status.FAILED: 100,
}


class DocumentConversionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    original_filename = serializers.CharField(source="nome_original", read_only=True)
    output_filename = serializers.CharField(source="nome_saida", read_only=True)
    input_size = serializers.IntegerField(source="tamanho_entrada_bytes", read_only=True)
    output_size = serializers.IntegerField(source="tamanho_saida_bytes", read_only=True)
    page_count = serializers.IntegerField(source="paginas", read_only=True)
    error_message = serializers.SerializerMethodField()
    anonymous = serializers.SerializerMethodField()
    expires_at = serializers.DateTimeField(source="expira_em", read_only=True)
    created_at = serializers.DateTimeField(source="criado_em", read_only=True)
    finished_at = serializers.DateTimeField(source="finalizado_em", read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = DocumentConversion
        fields = [
            "id",
            "operation",
            "original_filename",
            "output_filename",
            "input_size",
            "output_size",
            "page_count",
            "status",
            "progress",
            "error_message",
            "anonymous",
            "expires_at",
            "created_at",
            "finished_at",
        ]

    def get_error_message(self, instance):
        return instance.error_message if instance.status == DocumentConversion.Status.FAILED else ""

    def get_anonymous(self, instance):
        return instance.anonymous_session_id is not None

    def get_progress(self, instance):
        return STATUS_PROGRESS[instance.status]
