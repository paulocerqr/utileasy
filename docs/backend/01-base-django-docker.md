# Base do Backend: Django e Docker

## Visão geral

O backend do Utileazy é um monólito Django modular. O projeto Django fica em backend/config e seus domínios ficam em backend/apps. A infraestrutura atual é Docker Compose com PostgreSQL, Redis, Django/Gunicorn, Celery e Next.js.

Este documento descreve a base comum. O fluxo de transcrições está em [03-app-transcriptions.md](03-app-transcriptions.md).

## Estrutura

\`\`\`text
backend/
├── manage.py
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── config/
│   ├── __init__.py
│   ├── asgi.py
│   ├── celery.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── apps/
    ├── common/
    └── transcriptions/
\`\`\`

Config concentra os itens transversais; cada app concentra um domínio de negócio. Esse desenho permite adicionar ferramentas sem misturar modelos, rotas e regras de negócio.

## Arquivos Django

### manage.py

É a entrada dos comandos administrativos. Define config.settings e entrega o comando ao Django.

\`\`\`bash
python manage.py migrate
python manage.py check
python manage.py createsuperuser
python manage.py test
\`\`\`

No Compose:

\`\`\`bash
docker compose exec backend python manage.py check
\`\`\`

### config/settings.py

É a configuração central.

**Segurança e hosts.** BASE_DIR é a raiz do backend, equivalente a /app na imagem. DJANGO_SECRET_KEY e DJANGO_DEBUG vêm do ambiente. A chave padrão só serve para desenvolvimento; em servidor, a chave deve ser longa, única e secreta. DEBUG só é ligado quando DJANGO_DEBUG=1. DJANGO_ALLOWED_HOSTS é uma lista separada por vírgulas e deve conter backend para a comunicação entre contêineres.

**Apps instalados.**

\`\`\`text
django.contrib.*       administração, autenticação, sessões e estáticos
corsheaders            CORS
rest_framework         API REST
apps.common            recursos compartilhados
apps.transcriptions    domínio de transcrições
\`\`\`

**Middlewares.** CorsMiddleware vem antes para tratar CORS cedo. SecurityMiddleware aplica proteções gerais. WhiteNoiseMiddleware entrega estáticos. Os demais cuidam de sessão, CSRF, autenticação, mensagens e clickjacking.

**Banco.** O banco padrão é PostgreSQL e lê:

\`\`\`text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_HOST
POSTGRES_PORT
\`\`\`

No Compose, POSTGRES_HOST vale db, que é o DNS interno do serviço PostgreSQL. O banco não publica porta no host.

**Localidade e arquivos.** O projeto usa pt-br, America/Sao_Paulo e USE_TZ=True. Novos modelos usam BigAutoField. STATIC_ROOT recebe estáticos coletados e WhiteNoise os serve com nomes versionados e comprimidos. MEDIA_ROOT é /app/media no Compose, um volume compartilhado entre backend e worker.

**CORS e DRF.** DJANGO_CORS_ALLOWED_ORIGINS define quais navegadores podem chamar a API. A rede interna Docker é diferente: o frontend chama o DNS backend sem publicar a API no host. O DRF oferece JSON, interface navegável, JSON, formulários e multipart/form-data, necessário para uploads.

**Celery.** CELERY_BROKER_URL vale redis://redis:6379/0 no Compose. Não existe backend de resultados no Redis: o estado definitivo de jobs fica no PostgreSQL. As opções de confirmação tardia, rejeição quando worker morre e prefetch um reduzem a chance de perda de tarefas e limitam reservas simultâneas.

Os limites de transcrição também vêm do ambiente:

\`\`\`text
TRANSCRIPTION_MAX_FILE_SIZE
TRANSCRIPTION_MAX_DURATION_SECONDS
TRANSCRIPTION_MAX_PENDING_JOBS
ASSEMBLYAI_POLL_INTERVAL
\`\`\`

### config/urls.py

É o roteador global:

\`\`\`text
/admin/                 Django Admin
/api/health/            health check do app common
/api/transcriptions/    rotas de transcrições
\`\`\`

Ele apenas encaminha prefixos para cada app; não contém regra de negócio.

### config/wsgi.py e config/asgi.py

wsgi.py cria a aplicação atendida pelo Gunicorn e é a entrada HTTP usada hoje. asgi.py deixa o projeto preparado para usos assíncronos, como WebSockets, mas não é a entrada usada no Compose atual.

### config/celery.py e config/__init__.py

celery.py cria a aplicação Celery utilitydev, lê as configurações que começam por CELERY e descobre automaticamente arquivos tasks.py nos apps instalados. O __init__.py importa a aplicação durante a inicialização do pacote config, garantindo o registro das tarefas.

## App common

apps/common/apps.py registra o app. apps/common/urls.py e views.py definem GET /api/health/. A resposta não exige autenticação nem permissão:

\`\`\`json
{"status":"ok","service":"backend"}
\`\`\`

Esse endpoint confirma que a API está disponível e permite ao frontend validar a integração.

## Dependências

| Dependência | Responsabilidade |
|---|---|
| Django | framework do backend |
| Django REST Framework | API REST |
| django-cors-headers | CORS |
| psycopg | driver PostgreSQL |
| Gunicorn | servidor WSGI |
| WhiteNoise | estáticos |
| Celery com Redis | fila e tarefas assíncronas |
| requests | integração HTTP externa |
| ReportLab | PDFs |

As faixas em requirements.txt evitam atualizações automáticas entre versões principais incompatíveis.

## Docker Compose

O arquivo [docker-compose.yml](../../docker-compose.yml) liga os serviços:

\`\`\`text
Navegador
   |
   v
frontend:3000
   |
   v
backend:8000 ---- db:5432 (PostgreSQL)
   |
   +---- redis:6379 (broker Celery)
               |
               v
         worker (Celery e FFmpeg)
\`\`\`

Apenas frontend publica uma porta no host; backend, banco e Redis ficam na rede privada do Compose.

### db

Usa postgres:16-alpine, recebe credenciais pelo .env e persiste em postgres_data. Seu health check usa pg_isready; backend e worker aguardam o banco saudável.

### redis

Usa redis:7-alpine como broker Celery, com AOF ativo, limite de 96 MB e política noeviction. AOF ajuda a preservar a fila após reinícios. noeviction evita descartar jobs silenciosamente; o estado final continua no PostgreSQL. O volume é redis_data.

### backend

Usa a imagem de backend/Dockerfile, lê .env e recebe estas configurações internas:

\`\`\`text
POSTGRES_HOST=db
POSTGRES_PORT=5432
CELERY_BROKER_URL=redis://redis:6379/0
MEDIA_ROOT=/app/media
\`\`\`

Monta transcription_media em /app/media, expõe 8000 apenas à rede Docker e inicia nesta sequência:

\`\`\`bash
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 60
\`\`\`

Migrations e estáticos são preparados antes de atender requisições.

### worker

Usa a mesma imagem e o mesmo volume do backend, mas roda:

\`\`\`bash
celery -A config worker --loglevel=INFO --pool=solo --concurrency=1
\`\`\`

A concorrência unitária evita que dois FFmpeg disputem CPU e memória do servidor doméstico.

### frontend e frontend-check

Frontend é a única entrada para usuários e recebe API_INTERNAL_BASE_URL=http://backend:8000. A porta publicada é configurada pelo valor de TAILSCALE_IP e, na ausência dele, fica limitada a 127.0.0.1:3000. frontend-check apenas roda o lint do frontend.

### Volumes

| Volume | Conteúdo |
|---|---|
| postgres_data | dados PostgreSQL |
| redis_data | AOF e dados Redis |
| transcription_media | uploads e temporários de transcrição |

Não use docker compose down -v em ambiente com dados importantes: ele remove os volumes.

## Imagem do backend

backend/Dockerfile parte de python:3.12-slim, instala FFmpeg e ffprobe, instala dependências, copia o código e roda collectstatic. Seu comando padrão usa Gunicorn com três workers, mas o Compose o substitui pelo comando que executa migrations e inicia Gunicorn com dois workers; portanto, Compose é a fonte da execução efetiva.

backend/.dockerignore exclui caches Python, ambientes virtuais e db.sqlite3 do contexto de build.

## Inicialização

Crie o ambiente:

\`\`\`bash
cp .env.example .env
\`\`\`

Preencha ao menos:

\`\`\`dotenv
TAILSCALE_IP=<ip-do-servidor-ou-vazio>
DJANGO_SECRET_KEY=<chave-longa-e-aleatoria>
DJANGO_ALLOWED_HOSTS=backend,<ip-tailscale>
POSTGRES_PASSWORD=<senha-forte>
ASSEMBLYAI_API_KEY=<chave-da-assemblyai>
\`\`\`

Inicie:

\`\`\`bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend worker
\`\`\`

Na primeira execução, os volumes são criados, banco e Redis passam por health checks, backend aplica migrations e inicia Gunicorn, worker conecta ao Redis e frontend passa a servir a aplicação na porta 3000.

## Estado atual

A base já contém Django, DRF, PostgreSQL, Redis, Celery, Gunicorn, WhiteNoise, health check e estrutura modular. Autenticação e associação de jobs a usuários ainda não existem no fluxo de transcrição.

