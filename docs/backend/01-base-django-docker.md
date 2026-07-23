# Base do backend: Django e Docker

## Visão geral

O backend é um monólito Django modular em `backend/`. PostgreSQL persiste o estado,
Redis transporta tasks Celery e o frontend Next.js é a única entrada HTTP para o
navegador nos perfis normais.

O mesmo código roda em desenvolvimento, servidor caseiro e VPS. Comportamentos como
polling/webhook, filesystem/S3 e concorrência são selecionados pelo ambiente.

## Estrutura

```text
backend/
├── manage.py
├── requirements.txt
├── Dockerfile
├── config/
│   ├── celery.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
└── apps/
    ├── common/
    ├── accounts/
    └── transcriptions/
```

Responsabilidades:

```text
common          health check público
accounts        CSRF, login, logout e sessão
transcriptions  upload, jobs, filas, provider, webhook e PDF
```

## Settings

### Segurança

```text
DJANGO_SECRET_KEY
DJANGO_DEBUG
DJANGO_ALLOWED_HOSTS
DJANGO_CORS_ALLOWED_ORIGINS
DJANGO_CSRF_TRUSTED_ORIGINS
DJANGO_SECURE_COOKIES
```

O DRF usa `SessionAuthentication` e `IsAuthenticated` por padrão. Sessão, CSRF e
cookies usam recursos nativos do Django. Em HTTPS, `DJANGO_SECURE_COOKIES=1` ativa
`Secure` para cookies de sessão e CSRF. O proxy informa o protocolo original por
`X-Forwarded-Proto`.

### Banco

```text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

PostgreSQL não publica porta nos perfis caseiro ou VPS.

### Arquivos

`STORAGES["default"]` é configurado por `MEDIA_STORAGE_BACKEND`:

```text
filesystem  FileSystemStorage em MEDIA_ROOT
s3          django-storages com bucket privado
```

WhiteNoise serve apenas estáticos Django. Mídias não são expostas diretamente; elas
são consumidas pelo worker e apagadas ao final.

### Celery

Redis usa `redis://redis:6379/0`. Não existe result backend: o estado definitivo fica
no PostgreSQL.

Configurações importantes:

```text
acks_late=True
reject_on_worker_lost=True
worker_prefetch_multiplier=1
max_tasks_per_child configurável
```

Roteamento:

```text
media        processamento local
provider     AssemblyAI e conclusão
maintenance reconciliação e limpeza
```

## Rotas globais

```text
/admin/
/api/health/
/api/auth/
/api/transcriptions/
/api/webhooks/assemblyai/{public_id}/
```

Consulte [04-api-backend.md](04-api-backend.md) para contratos e segurança.

## Dependências principais

| Dependência | Papel |
|---|---|
| Django | aplicação, autenticação, sessões e admin |
| Django REST Framework | API |
| PostgreSQL/psycopg | persistência |
| Celery + Redis | filas assíncronas |
| Gunicorn | WSGI |
| WhiteNoise | estáticos Django |
| requests | AssemblyAI |
| ReportLab | PDF em memória |
| django-storages + boto3 | S3 compatível |
| FFmpeg/ffprobe | inspeção e áudio canônico |

## Serviços Docker

Base:

```text
Navegador
   |
   v
frontend:3000 -> backend:8000 -> PostgreSQL
                       |
                       +------> Redis -> worker(s)
```

O backend inicia com migrations, collectstatic e dois workers Gunicorn. Backend e
worker usam a mesma imagem, que inclui FFmpeg.

Perfis:

```text
docker-compose.home.yml  limites para i5/6 GB e worker solo
docker-compose.dev.yml   portas loopback e concorrência 2
docker-compose.vps.yml   Caddy, limites do Beat e workers separados
```

Detalhes estão em [11-docker-contexto.md](11-docker-contexto.md).

## Inicialização

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
docker compose exec backend python manage.py createsuperuser
```

Para desenvolvimento ou VPS, substitua o override. Nunca execute
`docker compose down -v` em ambiente com dados importantes.

## Validação

```bash
docker compose run --rm backend python manage.py check
docker compose run --rm backend python manage.py makemigrations --check --dry-run
docker compose run --rm backend python manage.py test apps.accounts apps.transcriptions
docker compose build frontend
```

O estado validado possui 20 testes de backend e verificação TypeScript do Next.js.
