# Contexto Docker atual

## Serviços base

```text
db              PostgreSQL 16
redis           Redis 7 com AOF, 96 MB e noeviction
backend         Django + Gunicorn, migrations e collectstatic
worker          Celery; comportamento escolhido pelo override
beat            agendador leve de reconciliação, limpeza e expiração
frontend        Next.js de produção
frontend-check  TypeScript com tsc --noEmit
```

Volumes base:

```text
postgres_data       banco
redis_data          AOF do broker
transcription_media uploads e canônicos quando filesystem está ativo
```

Além das filas, o Redis guarda `utileazy:rate:*` para rajada e janelas anônimas de 24
horas. O AOF e o volume fazem esses contadores sobreviverem à recriação dos
containers; eles expiram pelo próprio TTL e não incluem transcrições históricas.

## Compose base

`docker-compose.yml` define rede, health checks, dependências e defaults seguros. O
worker lê do ambiente:

```text
CELERY_WORKER_POOL
CELERY_WORKER_CONCURRENCY
CELERY_WORKER_QUEUES
```

Os defaults continuam adequados ao servidor caseiro: `solo`, concorrência 1 e filas
`media,provider,maintenance`.

## Perfil caseiro

`docker-compose.home.yml` aplica limites de CPU/RAM e fixa o worker sequencial. O
frontend é publicado no IP Tailscale; demais serviços ficam internos.

```bash
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
```

## Perfil de desenvolvimento

`docker-compose.dev.yml` publica PostgreSQL e backend em loopback e usa prefork com
concorrência 2.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

## Perfil VPS

`docker-compose.vps.yml` altera e acrescenta:

```text
worker             somente fila media
worker-provider    filas provider e maintenance
beat               recebe limites de CPU/RAM do perfil
caddy              HTTPS e reverse proxy para frontend
caddy_data         certificados
caddy_config       configuração persistente
```

Concorrências:

```text
VPS_MEDIA_CONCURRENCY       1 em 2 vCPU; 2 em 4 vCPU
VPS_PROVIDER_CONCURRENCY    padrão 2
```

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

O frontend continua encaminhando `/api/auth`, `/api/anonymous`, `/api/transcriptions` e
`/api/webhooks` para `http://backend:8000`. Assim, o backend não precisa publicar
porta mesmo quando recebe callbacks externos.

## Filesystem e S3

Backend e workers ainda montam `transcription_media`, necessário quando
`MEDIA_STORAGE_BACKEND=filesystem`. Com `s3`, as mesmas chaves apontam para o bucket
privado e cada worker materializa o objeto em diretório temporário local.

## Inicialização do backend

O comando efetivo continua:

```text
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn com 2 workers e timeout 60
```

O Dockerfile instala FFmpeg/ffprobe e dependências Python, incluindo
`django-storages[s3]`.

## Operação

```bash
docker compose ps
docker compose logs -f backend worker
docker compose run --rm backend python manage.py check
```

No perfil VPS, acompanhe também `worker-provider`, `beat` e `caddy`. Não remova
volumes em produção e monitore espaço, RAM, fila e tempo de upload.
