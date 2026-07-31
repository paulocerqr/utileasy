from pathlib import Path
import os


BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-secret-key")
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "apps.common",
    "apps.accounts",
    "apps.transcriptions",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "utilitydev"),
        "USER": os.getenv("POSTGRES_USER", "utilitydev"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "utilitydev"),
        "HOST": os.getenv("POSTGRES_HOST", "db"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", BASE_DIR / "media"))
MEDIA_URL = "/media/"
STORAGES = {
    "default": {
        "BACKEND": (
            "storages.backends.s3.S3Storage"
            if os.getenv("MEDIA_STORAGE_BACKEND", "filesystem") == "s3"
            else "django.core.files.storage.FileSystemStorage"
        ),
        "OPTIONS": (
            {
                "bucket_name": os.getenv("S3_BUCKET_NAME", ""),
                "endpoint_url": os.getenv("S3_ENDPOINT_URL") or None,
                "region_name": os.getenv("S3_REGION") or None,
                "access_key": os.getenv("S3_ACCESS_KEY") or None,
                "secret_key": os.getenv("S3_SECRET_KEY") or None,
                "default_acl": None,
                "querystring_auth": True,
                "file_overwrite": False,
            }
            if os.getenv("MEDIA_STORAGE_BACKEND", "filesystem") == "s3"
            else {"location": MEDIA_ROOT}
        ),
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "DJANGO_CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
}

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]
SESSION_COOKIE_SECURE = os.getenv("DJANGO_SECURE_COOKIES", "0") == "1"
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
DJANGO_TRUST_PROXY_HEADERS = os.getenv("DJANGO_TRUST_PROXY_HEADERS", "0") == "1"
SECURE_PROXY_SSL_HEADER = (
    ("HTTP_X_FORWARDED_PROTO", "https") if DJANGO_TRUST_PROXY_HEADERS else None
)

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = None
CELERY_TASK_TRACK_STARTED = False
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_TASK_DEFAULT_QUEUE = "provider"
CELERY_TASK_ROUTES = {
    "apps.transcriptions.tasks.process_transcription": {"queue": "media"},
    "apps.transcriptions.tasks.submit_transcription": {"queue": "provider"},
    "apps.transcriptions.tasks.poll_transcription": {"queue": "provider"},
    "apps.transcriptions.tasks.finalize_transcription": {"queue": "provider"},
    "apps.transcriptions.tasks.reconcile_stale_transcriptions": {"queue": "maintenance"},
    "apps.transcriptions.tasks.cleanup_orphaned_files": {"queue": "maintenance"},
    "apps.transcriptions.tasks.purge_expired_anonymous_data": {"queue": "maintenance"},
}
CELERY_WORKER_MAX_TASKS_PER_CHILD = int(os.getenv("CELERY_MAX_TASKS_PER_CHILD", "50"))

TRANSCRIPTION_MAX_FILE_SIZE = int(os.getenv("TRANSCRIPTION_MAX_FILE_SIZE", 500 * 1024 * 1024))
TRANSCRIPTION_MAX_DURATION_SECONDS = int(os.getenv("TRANSCRIPTION_MAX_DURATION_SECONDS", 7200))
TRANSCRIPTION_MAX_PENDING_JOBS = int(os.getenv("TRANSCRIPTION_MAX_PENDING_JOBS", 10))
TRANSCRIPTION_MAX_PENDING_PER_USER = int(os.getenv("TRANSCRIPTION_MAX_PENDING_PER_USER", 2))
TRANSCRIPTION_MAX_PENDING_PER_ANON = int(os.getenv("TRANSCRIPTION_MAX_PENDING_PER_ANON", 1))
TRANSCRIPTION_DAILY_BUDGET_SECONDS = int(
    os.getenv("TRANSCRIPTION_DAILY_BUDGET_SECONDS", "14400")
)
ANONYMOUS_RESULT_TTL_HOURS = int(os.getenv("ANONYMOUS_RESULT_TTL_HOURS", "24"))
ANONYMOUS_COOKIE_NAME = os.getenv("ANONYMOUS_COOKIE_NAME", "utileazy_anon")
ANONYMOUS_COOKIE_MAX_AGE = ANONYMOUS_RESULT_TTL_HOURS * 3600
ANON_IP_BURST_LIMIT = int(os.getenv("ANON_IP_BURST_LIMIT", "2"))
ANON_IP_DAILY_LIMIT = int(os.getenv("ANON_IP_DAILY_LIMIT", "10"))
ANON_COOKIE_DAILY_LIMIT = int(os.getenv("ANON_COOKIE_DAILY_LIMIT", "3"))
TURNSTILE_SITE_KEY = os.getenv("TURNSTILE_SITE_KEY", "")
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "")
TURNSTILE_EXPECTED_HOSTNAME = os.getenv("TURNSTILE_EXPECTED_HOSTNAME", "")
TURNSTILE_EXPECTED_ACTION = os.getenv(
    "TURNSTILE_EXPECTED_ACTION", "anonymous_transcription"
)
TURNSTILE_ENABLED = os.getenv("TURNSTILE_ENABLED", "1") == "1"
ASSEMBLYAI_POLL_INTERVAL = int(os.getenv("ASSEMBLYAI_POLL_INTERVAL", 10))
TRANSCRIPTION_COMPLETION_MODE = os.getenv("TRANSCRIPTION_COMPLETION_MODE", "polling").lower()
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
ASSEMBLYAI_WEBHOOK_SECRET = os.getenv("ASSEMBLYAI_WEBHOOK_SECRET", "")
TRANSCRIPTION_RECONCILE_AFTER_SECONDS = int(
    os.getenv("TRANSCRIPTION_RECONCILE_AFTER_SECONDS", "300")
)

if TRANSCRIPTION_COMPLETION_MODE not in {"polling", "webhook"}:
    raise ValueError("TRANSCRIPTION_COMPLETION_MODE deve ser 'polling' ou 'webhook'.")
if TRANSCRIPTION_COMPLETION_MODE == "webhook" and (
    not PUBLIC_BASE_URL or not ASSEMBLYAI_WEBHOOK_SECRET
):
    raise ValueError("O modo webhook exige PUBLIC_BASE_URL e ASSEMBLYAI_WEBHOOK_SECRET.")

CELERY_BEAT_SCHEDULE = {
    "reconcile-stale-transcriptions": {
        "task": "apps.transcriptions.tasks.reconcile_stale_transcriptions",
        "schedule": 300.0,
    },
    "cleanup-orphaned-transcription-files": {
        "task": "apps.transcriptions.tasks.cleanup_orphaned_files",
        "schedule": 3600.0,
    },
    "purge-expired-anonymous-data": {
        "task": "apps.transcriptions.tasks.purge_expired_anonymous_data",
        "schedule": 3600.0,
    },
}
