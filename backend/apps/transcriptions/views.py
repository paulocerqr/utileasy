import os
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Transcricao
from .pdf import build_transcription_pdf
from .serializers import TranscricaoSerializer
from .tasks import process_transcription


ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}


class TranscriptionCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"detail": "Envie um arquivo no campo 'file'."}, status=status.HTTP_400_BAD_REQUEST)

        extension = Path(upload.name).suffix.lower()
        allowed_extensions = ALLOWED_AUDIO_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS
        if extension not in allowed_extensions:
            return Response(
                {"detail": "Formato não suportado. Use MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, MKV, WebM ou AVI."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )
        if upload.size > settings.TRANSCRIPTION_MAX_FILE_SIZE:
            max_mb = settings.TRANSCRIPTION_MAX_FILE_SIZE // 1024 // 1024
            return Response(
                {"detail": f"O tamanho máximo permitido é {max_mb} MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        active_count = Transcricao.objects.filter(
            status__in=[
                Transcricao.Status.QUEUED,
                Transcricao.Status.EXTRACTING,
                Transcricao.Status.CHECKING_DUPLICATE,
                Transcricao.Status.UPLOADING_PROVIDER,
                Transcricao.Status.PROCESSING,
            ]
        ).count()
        if active_count >= settings.TRANSCRIPTION_MAX_PENDING_JOBS:
            return Response(
                {"detail": "A fila está cheia. Tente novamente mais tarde."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        safe_original_name = Path(upload.name).name[:255]
        relative_name = f"transcriptions/uploads/{uuid4().hex}{extension}"
        saved_name = default_storage.save(relative_name, upload)
        source_kind = "video" if extension in ALLOWED_VIDEO_EXTENSIONS else "audio"

        try:
            with transaction.atomic():
                transcription = Transcricao.objects.create(
                    nome_original=safe_original_name,
                    tipo_origem=source_kind,
                    arquivo_temporario=saved_name,
                    status=Transcricao.Status.QUEUED,
                )
                transaction.on_commit(lambda: process_transcription.delay(transcription.pk))
        except Exception:
            default_storage.delete(saved_name)
            raise

        return Response(TranscricaoSerializer(transcription).data, status=status.HTTP_202_ACCEPTED)


class TranscriptionDetailView(APIView):
    def get(self, request, public_id):
        try:
            transcription = Transcricao.objects.select_related("duplicate_of").get(public_id=public_id)
        except Transcricao.DoesNotExist:
            return Response({"detail": "Transcrição não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TranscricaoSerializer(transcription).data)


class TranscriptionPdfView(APIView):
    def get(self, request, public_id):
        try:
            transcription = Transcricao.objects.select_related("duplicate_of").get(public_id=public_id)
        except Transcricao.DoesNotExist:
            return Response({"detail": "Transcrição não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if transcription.status != Transcricao.Status.COMPLETED:
            return Response({"detail": "A transcrição ainda não foi concluída."}, status=status.HTTP_409_CONFLICT)

        pdf = build_transcription_pdf(transcription)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="transcricao-{public_id}.pdf"'
        return response
