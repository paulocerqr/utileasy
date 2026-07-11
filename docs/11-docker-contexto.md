# Contexto Docker do Utileazy

Este documento registra as alterações feitas no Docker Compose para suportar a transcrição assíncrona.

## 1. Serviços atuais

```text
db               PostgreSQL 16
redis            Redis 7, broker persistente do Celery
backend          Django + Gunicorn
worker           Celery + FFmpeg + pipeline de transcrição
frontend         Next.js publicado na porta 3000
frontend-check   verificação TypeScript do frontend
```

Somente o serviço `frontend` publica uma porta no host:

```text
${TAILSCALE_IP:-127.0.0.1}:3000:3000
```

O backend, PostgreSQL e Redis ficam apenas na rede interna do Compose.

## 2. Redis

```text
Redis 7 Alpine
AOF habilitado
maxmemory: 96 MB
maxmemory-policy: noeviction
```

O volume é `redis_data:/data`. O AOF ajuda a preservar tarefas enfileiradas durante reinícios; o estado definitivo do job permanece no PostgreSQL.

## 3. Backend e worker

Backend e worker usam a mesma imagem construída em `backend/Dockerfile`. A imagem instala FFmpeg/ffprobe e as dependências Python do Django, Celery, requests e ReportLab.

O worker é iniciado com:

```bash
celery -A config worker --loglevel=INFO --pool=solo --concurrency=1
```

A concorrência unitária evita que dois processos FFmpeg consumam simultaneamente os dois núcleos do servidor doméstico. O backend usa dois workers Gunicorn.

## 4. Volumes

Backend e worker compartilham:

```text
transcription_media:/app/media
```

O upload entra em `/app/media/transcriptions/uploads`. O áudio normalizado é criado em `/app/media/transcriptions/processed`. Ambos são removidos após o envio ou falha do job.

O PostgreSQL continua usando `postgres_data:/var/lib/postgresql/data`.

## 5. Variáveis novas

Adicionar ao `.env`:

```text
ASSEMBLYAI_API_KEY=
TRANSCRIPTION_MAX_FILE_SIZE=524288000
TRANSCRIPTION_MAX_DURATION_SECONDS=7200
TRANSCRIPTION_MAX_PENDING_JOBS=10
ASSEMBLYAI_POLL_INTERVAL=10
```

O Compose injeta internamente:

```text
CELERY_BROKER_URL=redis://redis:6379/0
MEDIA_ROOT=/app/media
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

## 6. Inicialização e atualização

No PC de desenvolvimento:

```bash
cp .env.example .env
# preencher DJANGO_SECRET_KEY, POSTGRES_PASSWORD e ASSEMBLYAI_API_KEY
docker compose up -d --build
docker compose ps
docker compose logs -f worker
```

O backend executa automaticamente `migrate`, `collectstatic` e inicia o Gunicorn com dois workers.

No servidor doméstico:

```bash
git pull
docker compose up -d --build
docker compose ps
```

Não executar `docker compose down -v` em um ambiente com dados importantes, pois isso remove o volume do PostgreSQL.

## 7. Validações realizadas

```bash
docker compose config --quiet
docker compose build backend frontend
docker compose run --rm backend python manage.py check
docker compose run --rm backend python manage.py makemigrations --check --dry-run
docker compose run --rm backend python manage.py test apps.transcriptions --verbosity 2
```

O build do frontend confirmou as rotas `/transcrisao` e `/api/transcriptions`. O proxy local respondeu ao endpoint de upload e um job inválido percorreu a fila até `failed`, com remoção do arquivo temporário.

## 8. Observações para o servidor limitado

```text
- Manter worker com concorrência 1.
- Monitorar espaço do volume transcription_media.
- Não aumentar Gunicorn ou Celery sem medir RAM/CPU.
- Configurar vm.overcommit_memory=1 no host se o Redis continuar emitindo o alerta de AOF/fork.
- Usar somente um job de FFmpeg por vez; a AssemblyAI continua sendo o processamento pesado remoto.
```
