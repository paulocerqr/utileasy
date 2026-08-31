import secrets
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.anonymous import (
    CaptchaError,
    RateLimitError,
    enforce_anonymous_burst_limit,
    enforce_anonymous_rate_limits,
    generate_secret,
    get_anonymous_session,
    hash_secret,
    validate_turnstile,
)

from .models import DocumentConversion, DocumentConversionCapacity
from .serializers import DocumentConversionSerializer
from .tasks import process_document_conversion


ACTIVE_STATUSES = [
    DocumentConversion.Status.QUEUED,
    DocumentConversion.Status.VALIDATING,
    DocumentConversion.Status.CONVERTING,
]
FORMAT_BY_EXTENSION = {
    ".pdf": (DocumentConversion.Operation.PDF_TO_DOCX, "docx"),
    ".docx": (DocumentConversion.Operation.DOCX_TO_PDF, "pdf"),
}


def _not_found():
    return Response(
        {"detail": "Conversão não encontrada."},
        status=status.HTTP_404_NOT_FOUND,
    )


def _authorized_job(request, public_id):
    job = DocumentConversion.objects.filter(public_id=public_id).first()
    if not job or job.expira_em <= timezone.now():
        return None
    if job.owner_id:
        if request.user.is_authenticated and request.user.pk == job.owner_id:
            return job
        return None
    supplied_token = request.headers.get("X-Job-Token", "")
    if not supplied_token or not secrets.compare_digest(
        hash_secret(supplied_token), job.access_token_hash
    ):
        return None
    return job


def _valid_signature(upload, extension):
    position = upload.tell()
    header = upload.read(8)
    upload.seek(position)
    if extension == ".pdf":
        return header.startswith(b"%PDF-")
    return header.startswith(b"PK")


class DocumentConversionCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Entre para consultar seu histórico."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        jobs = DocumentConversion.objects.filter(
            owner=request.user,
            expira_em__gt=timezone.now(),
        ).order_by("-criado_em")[:100]
        return Response(DocumentConversionSerializer(jobs, many=True).data)

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
                validate_turnstile(
                    request.data.get("captcha_token", ""),
                    request,
                    expected_action=settings.DOCUMENT_TURNSTILE_EXPECTED_ACTION,
                )
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
        if extension not in FORMAT_BY_EXTENSION:
            return Response(
                {"detail": "Formato não suportado. Use PDF ou DOCX."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )
        if upload.size > settings.DOCUMENT_MAX_FILE_SIZE:
            max_mb = settings.DOCUMENT_MAX_FILE_SIZE // 1024 // 1024
            return Response(
                {"detail": f"O tamanho máximo permitido é {max_mb} MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        if not _valid_signature(upload, extension):
            return Response(
                {"detail": f"O conteúdo não corresponde a um arquivo {extension[1:].upper()} válido."},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        operation, target_format = FORMAT_BY_EXTENSION[extension]
        requested_target = str(request.data.get("target_format", target_format)).lower()
        if requested_target != target_format:
            return Response(
                {"detail": "O formato de destino não corresponde ao arquivo enviado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        safe_original_name = Path(upload.name).name[:255]
        output_stem = Path(safe_original_name).stem[: 254 - len(target_format)] or "documento"
        output_name = f"{output_stem}.{target_format}"
        relative_name = f"documents/uploads/{uuid4().hex}{extension}"
        saved_name = default_storage.save(relative_name, upload)

        try:
            with transaction.atomic():
                DocumentConversionCapacity.objects.select_for_update().get(pk=1)
                active_count = DocumentConversion.objects.filter(
                    status__in=ACTIVE_STATUSES
                ).count()
                if active_count >= settings.DOCUMENT_MAX_PENDING_JOBS:
                    raise RateLimitError(
                        "A fila de documentos está cheia. Tente novamente mais tarde."
                    )
                actor_query = {"owner": owner} if owner else {"anonymous_session": anonymous_session}
                actor_active = DocumentConversion.objects.filter(
                    status__in=ACTIVE_STATUSES,
                    **actor_query,
                ).count()
                actor_limit = (
                    settings.DOCUMENT_MAX_PENDING_PER_USER
                    if owner
                    else settings.DOCUMENT_MAX_PENDING_PER_ANON
                )
                if actor_active >= actor_limit:
                    raise RateLimitError(
                        "Você já possui uma conversão de documento ativa."
                    )
                if anonymous_session:
                    raw_access_token = generate_secret()
                conversion = DocumentConversion.objects.create(
                    owner=owner,
                    anonymous_session=anonymous_session,
                    access_token_hash=(
                        hash_secret(raw_access_token) if raw_access_token else ""
                    ),
                    operation=operation,
                    nome_original=safe_original_name,
                    nome_saida=output_name,
                    arquivo_entrada=saved_name,
                    tamanho_entrada_bytes=upload.size,
                    expira_em=(
                        timezone.now()
                        + timedelta(hours=settings.ANONYMOUS_RESULT_TTL_HOURS)
                        if anonymous_session
                        else timezone.now()
                        + timedelta(days=settings.AUTHENTICATED_RESULT_TTL_DAYS)
                    ),
                )
                transaction.on_commit(
                    lambda: process_document_conversion.delay(conversion.pk)
                )
        except RateLimitError as exc:
            default_storage.delete(saved_name)
            return Response(
                {"detail": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        except Exception:
            default_storage.delete(saved_name)
            raise

        payload = DocumentConversionSerializer(conversion).data
        if raw_access_token:
            payload["access_token"] = raw_access_token
        return Response(payload, status=status.HTTP_202_ACCEPTED)


class DocumentConversionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        job = _authorized_job(request, public_id)
        if not job:
            return _not_found()
        return Response(DocumentConversionSerializer(job).data)


class DocumentConversionDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, public_id):
        job = _authorized_job(request, public_id)
        if not job:
            return _not_found()
        if job.status != DocumentConversion.Status.COMPLETED or not job.arquivo_saida:
            return Response(
                {"detail": "A conversão ainda não foi concluída."},
                status=status.HTTP_409_CONFLICT,
            )
        content_type = (
            "application/pdf"
            if job.operation == DocumentConversion.Operation.DOCX_TO_PDF
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
        return FileResponse(
            default_storage.open(job.arquivo_saida, "rb"),
            as_attachment=True,
            filename=job.nome_saida,
            content_type=content_type,
        )


class DocumentConversionClaimView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, public_id):
        with transaction.atomic():
            job = DocumentConversion.objects.select_for_update().filter(
                public_id=public_id
            ).first()
            if not job or job.expira_em <= timezone.now():
                return _not_found()
            if job.owner_id:
                if job.owner_id == request.user.pk:
                    return Response(DocumentConversionSerializer(job).data)
                return _not_found()
            supplied_token = request.headers.get("X-Job-Token", "")
            if not supplied_token or not secrets.compare_digest(
                hash_secret(supplied_token), job.access_token_hash
            ):
                return _not_found()
            job.owner = request.user
            job.anonymous_session = None
            job.access_token_hash = ""
            job.expira_em = timezone.now() + timedelta(
                days=settings.AUTHENTICATED_RESULT_TTL_DAYS
            )
            job.save(
                update_fields=[
                    "owner",
                    "anonymous_session",
                    "access_token_hash",
                    "expira_em",
                    "atualizado_em",
                ]
            )
        return Response(DocumentConversionSerializer(job).data)
