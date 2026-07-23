import secrets

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Transcricao
from .tasks import finalize_transcription


class AssemblyAIWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, public_id):
        supplied_secret = request.headers.get("X-AssemblyAI-Webhook-Secret", "")
        expected_secret = settings.ASSEMBLYAI_WEBHOOK_SECRET
        if not expected_secret or not secrets.compare_digest(
            supplied_secret, expected_secret
        ):
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        provider_id = str(request.data.get("transcript_id", "")).strip()
        if not provider_id:
            return Response(
                {"detail": "transcript_id ausente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                job = Transcricao.objects.select_for_update().get(public_id=public_id)
            except Transcricao.DoesNotExist:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if (
                job.provider_transcription_id
                and job.provider_transcription_id != provider_id
            ):
                return Response(status=status.HTTP_409_CONFLICT)
            if not job.provider_transcription_id:
                job.provider_transcription_id = provider_id
                job.save(
                    update_fields=["provider_transcription_id", "atualizado_em"]
                )
            transaction.on_commit(lambda: finalize_transcription.delay(job.pk))

        return Response(status=status.HTTP_202_ACCEPTED)
