import hashlib
import ipaddress
import secrets
import uuid
from datetime import timedelta

import redis
import requests
from django.conf import settings
from django.utils import timezone

from .models import AnonymousSession


class AnonymousAccessError(Exception):
    pass


class CaptchaError(AnonymousAccessError):
    pass


class RateLimitError(AnonymousAccessError):
    def __init__(self, message, retry_after=60):
        super().__init__(message)
        self.retry_after = max(1, int(retry_after))


def generate_secret():
    return secrets.token_urlsafe(32)


def hash_secret(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def get_client_ip(request):
    forwarded = request.headers.get("X-Forwarded-For", "")
    candidates = [item.strip() for item in forwarded.split(",") if item.strip()]
    candidates.append(request.META.get("REMOTE_ADDR", ""))
    for candidate in candidates:
        try:
            return str(ipaddress.ip_address(candidate))
        except ValueError:
            continue
    return "unknown"


def get_anonymous_session(request):
    raw_cookie = request.COOKIES.get(settings.ANONYMOUS_COOKIE_NAME, "")
    if not raw_cookie:
        return None
    now = timezone.now()
    session = AnonymousSession.objects.filter(
        cookie_hash=hash_secret(raw_cookie), expira_em__gt=now
    ).first()
    if session:
        AnonymousSession.objects.filter(pk=session.pk).update(ultimo_uso_em=now)
    return session


def create_anonymous_session():
    raw_cookie = generate_secret()
    session = AnonymousSession.objects.create(
        cookie_hash=hash_secret(raw_cookie),
        expira_em=timezone.now() + timedelta(hours=settings.ANONYMOUS_RESULT_TTL_HOURS),
    )
    return session, raw_cookie


def set_anonymous_cookie(response, raw_cookie):
    response.set_cookie(
        settings.ANONYMOUS_COOKIE_NAME,
        raw_cookie,
        max_age=settings.ANONYMOUS_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="Lax",
    )


RATE_LIMIT_SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
"""


def consume_rate_limit(scope, identifier, limit, window_seconds):
    identifier_hash = hash_secret(identifier)
    key = f"utileazy:rate:{scope}:{identifier_hash}"
    client = redis.Redis.from_url(settings.CELERY_BROKER_URL)
    current, ttl = client.eval(RATE_LIMIT_SCRIPT, 1, key, window_seconds)
    if int(current) > limit:
        raise RateLimitError(
            "Limite de uso anônimo atingido. Tente novamente mais tarde.",
            retry_after=ttl,
        )


def enforce_anonymous_burst_limit(request):
    client_ip = get_client_ip(request)
    consume_rate_limit("anon-ip-burst", client_ip, settings.ANON_IP_BURST_LIMIT, 60)


def enforce_anonymous_rate_limits(request, session):
    client_ip = get_client_ip(request)
    consume_rate_limit("anon-ip-day", client_ip, settings.ANON_IP_DAILY_LIMIT, 86400)
    consume_rate_limit(
        "anon-cookie-day",
        str(session.public_id),
        settings.ANON_COOKIE_DAILY_LIMIT,
        86400,
    )


def validate_turnstile(token, request):
    if not settings.TURNSTILE_ENABLED:
        return
    if not settings.TURNSTILE_SECRET_KEY:
        raise CaptchaError("O CAPTCHA não foi configurado no servidor.")
    if not token:
        raise CaptchaError("Conclua a verificação CAPTCHA.")
    try:
        response = requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": settings.TURNSTILE_SECRET_KEY,
                "response": token,
                "remoteip": get_client_ip(request),
                "idempotency_key": str(uuid.uuid4()),
            },
            timeout=(5, 10),
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise CaptchaError("Não foi possível validar o CAPTCHA.") from exc
    if not result.get("success"):
        raise CaptchaError("CAPTCHA inválido ou expirado. Tente novamente.")
    if settings.TURNSTILE_EXPECTED_HOSTNAME and (
        result.get("hostname") != settings.TURNSTILE_EXPECTED_HOSTNAME
    ):
        raise CaptchaError("O CAPTCHA foi emitido para outro domínio.")
    if settings.TURNSTILE_EXPECTED_ACTION and (
        result.get("action") != settings.TURNSTILE_EXPECTED_ACTION
    ):
        raise CaptchaError("O CAPTCHA não corresponde a esta operação.")
