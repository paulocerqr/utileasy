import secrets
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .anonymous import (
    CaptchaError,
    RateLimitError,
    create_anonymous_session,
    enforce_anonymous_burst_limit,
    enforce_anonymous_rate_limits,
    generate_secret,
    get_anonymous_session,
    hash_secret,
    set_anonymous_cookie,
    validate_turnstile,
)
from .models import Transcricao, TranscriptionCapacity
from .pdf import build_transcription_pdf
from .serializers import TranscricaoSerializer
from .tasks import process_transcription


ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi"}
ACTIVE_STATUSES = [
    Transcricao.Status.QUEUED,
    Transcricao.Status.EXTRACTING,
    Transcricao.Status.CHECKING_DUPLICATE,
    Transcricao.Status.UPLOADING_PROVIDER,
    Transcricao.Status.PROCESSING,
]


def _not_found():
    return Response(
        {"detail": "Transcrição não encontrada."}, status=status.HTTP_404_NOT_FOUND
    )


def _authorized_job(request, public_id):
    job = (
        Transcricao.objects.select_related("artifact", "duplicate_of")
        .filter(public_id=public_id)
        .first()
    )
    if not job:
        return None
    if job.owner_id:
        return job if request.user.is_authenticated and job.owner_id == request.user.pk else None
    if not job.expira_em or job.expira_em <= timezone.now():
        return None
    supplied_token = request.headers.get("X-Job-Token", "")
    if not supplied_token or not secrets.compare_digest(
        hash_secret(supplied_token), job.access_token_hash
    ):
        return None
    return job


class AnonymousSessionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({"authenticated": True})
        session = get_anonymous_session(request)
        raw_cookie = None
        if not session:
            session, raw_cookie = create_anonymous_session()
        response = Response(
            {
                "authenticated": False,
                "site_key": settings.TURNSTILE_SITE_KEY if settings.TURNSTILE_ENABLED else "",
                "captcha_enabled": settings.TURNSTILE_ENABLED,
                "expires_at": session.expira_em,
            }
        )
        if raw_cookie:
            set_anonymous_cookie(response, raw_cookie)
        return response


class TranscriptionCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Entre para consultar seu histórico."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        jobs = (
            Transcricao.objects.filter(owner=request.user)
            .select_related("artifact", "duplicate_of")
            .order_by("-criado_em")[:100]
        )
        return Response(TranscricaoSerializer(jobs, many=True).data)

    def post(self, request):
        owner = request.user if request.user.is_authenticated else None
        anonymous_session = None
        raw_access_token = ""
        if owner is None:
            anonymous_session = get_anonymous_session(request)
            if not anonymous_session:
                return Response(
                    {"detail": "Inicialize a sessão anônima antes do upload."},
                    status=status.HTTP_428_PRECONDITION_REQUIRED,
                )
            try:
                enforce_anonymous_burst_limit(request)
                validate_turnstile(request.data.get("captcha_token", ""), request)
                enforce_anonymous_rate_limits(request, anonymous_session)
            except RateLimitError as exc:
                response = Response(
                    {"detail": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS
                )
                response["Retry-After"] = str(exc.retry_after)
                return response
            except CaptchaError as exc:
                return Response(
                    {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
                )

        upload = request.FILES.get("file")
        if upload is None:
            return Response(
                {"detail": "Envie um arquivo no campo 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = Path(upload.name).suffix.lower()
        allowed_extensions = ALLOWED_AUDIO_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS
        if extension not in allowed_extensions:
            return Response(
                {
                    "detail": "Formato não suportado. Use MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, MKV, WebM ou AVI."
                },
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )
        if upload.size > settings.TRANSCRIPTION_MAX_FILE_SIZE:
            max_mb = settings.TRANSCRIPTION_MAX_FILE_SIZE // 1024 // 1024
            return Response(
                {"detail": f"O tamanho máximo permitido é {max_mb} MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        safe_original_name = Path(upload.name).name[:255]
        relative_name = f"transcriptions/uploads/{uuid4().hex}{extension}"
        saved_name = default_storage.save(relative_name, upload)
        source_kind = "video" if extension in ALLOWED_VIDEO_EXTENSIONS else "audio"

        try:
            with transaction.atomic():
                TranscriptionCapacity.objects.select_for_update().get(pk=1)
                active_count = Transcricao.objects.filter(status__in=ACTIVE_STATUSES).count()
                if active_count >= settings.TRANSCRIPTION_MAX_PENDING_JOBS:
                    raise RateLimitError("A fila está cheia. Tente novamente mais tarde.")

                if owner:
                    actor_active = Transcricao.objects.filter(
                        owner=owner, status__in=ACTIVE_STATUSES
                    ).count()
                    actor_limit = settings.TRANSCRIPTION_MAX_PENDING_PER_USER
                    actor_message = "Você atingiu o limite de transcrições simultâneas."
                else:
                    actor_active = Transcricao.objects.filter(
                        anonymous_session=anonymous_session, status__in=ACTIVE_STATUSES
                    ).count()
                    actor_limit = settings.TRANSCRIPTION_MAX_PENDING_PER_ANON
                    actor_message = "A sessão anônima já possui uma transcrição ativa."
                if actor_active >= actor_limit:
                    raise RateLimitError(actor_message)

                if anonymous_session:
                    raw_access_token = generate_secret()
                transcription = Transcricao.objects.create(
                    owner=owner,
                    anonymous_session=anonymous_session,
                    access_token_hash=(
                        hash_secret(raw_access_token) if raw_access_token else ""
                    ),
                    expira_em=(
                        timezone.now()
                        + timedelta(hours=settings.ANONYMOUS_RESULT_TTL_HOURS)
                        if anonymous_session
                        else None
                    ),
                    nome_original=safe_original_name,
                    tipo_origem=source_kind,
                    arquivo_temporario=saved_name,
                    status=Transcricao.Status.QUEUED,
                )
                transaction.on_commit(
                    lambda: process_transcription.delay(transcription.pk)
                )
        except RateLimitError as exc:
            default_storage.delete(saved_name)
            return Response(
                {"detail": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        except Exception:
            default_storage.delete(saved_name)
            raise

        data = TranscricaoSerializer(transcription).data
        if raw_access_token:
            data["access_token"] = raw_access_token
        return Response(data, status=status.HTTP_202_ACCEPTED)


class TranscriptionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        transcription = _authorized_job(request, public_id)
        if not transcription:
            return _not_found()
        return Response(TranscricaoSerializer(transcription).data)


class TranscriptionPdfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        transcription = _authorized_job(request, public_id)
        if not transcription:
            return _not_found()
        if transcription.status != Transcricao.Status.COMPLETED:
            return Response(
                {"detail": "A transcrição ainda não foi concluída."},
                status=status.HTTP_409_CONFLICT,
            )

        pdf = build_transcription_pdf(transcription)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = (
            f'attachment; filename="transcricao-{public_id}.pdf"'
        )
        return response


class TranscriptionClaimView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, public_id):
        with transaction.atomic():
            try:
                job = Transcricao.objects.select_for_update().get(public_id=public_id)
            except Transcricao.DoesNotExist:
                return _not_found()
            if job.owner_id:
                if job.owner_id == request.user.pk:
                    return Response(TranscricaoSerializer(job).data)
                return _not_found()
            if not job.expira_em or job.expira_em <= timezone.now():
                return _not_found()
            supplied_token = request.headers.get("X-Job-Token", "")
            if not supplied_token or not secrets.compare_digest(
                hash_secret(supplied_token), job.access_token_hash
            ):
                return _not_found()
            job.owner = request.user
            job.anonymous_session = None
            job.access_token_hash = ""
            job.expira_em = None
            job.save(
                update_fields=[
                    "owner",
                    "anonymous_session",
                    "access_token_hash",
                    "expira_em",
                    "atualizado_em",
                ]
            )
        return Response(TranscricaoSerializer(job).data)
