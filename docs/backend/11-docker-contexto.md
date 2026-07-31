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

## Perfil caseiro com Cloudflare Tunnel

`docker-compose.home-tunnel.yml` deve ser aplicado depois do perfil caseiro. Ele
remove a publicação da porta `3000` com `!reset`, acrescenta Caddy 2.11.4 e
cloudflared 2026.7.2 e não publica nenhuma porta no host.

```text
Cloudflare -> cloudflared -> caddy:8080 -> frontend:3000 -> backend:8000
```

`cloudflared` participa apenas da rede `tunnel_edge`; Caddy liga essa rede à rede
interna da aplicação. O token do túnel é um secret montado a partir de
`secrets/cloudflare-tunnel-token`. Caddy e cloudflared usam filesystem somente
leitura, não recebem capabilities e rodam com o UID/GID do usuário de deploy.
Uma camada local mínima baseada em `caddy:2.11.4-alpine` remove o
`cap_net_bind_service` embutido no binário oficial, desnecessário porque o listener
interno usa a porta 8080. O `.dockerignore` desse contexto envia somente o
`Dockerfile` ao builder, evitando a inclusão acidental de configurações locais.

O Caddy aceita somente o `PUBLIC_DOMAIN`, confia no salto privado do `cloudflared`,
extrai um endereço único de `CF-Connecting-IP` e sobrescreve os headers enviados ao
Next.js. O frontend remove headers de proxy nos demais perfis e, neste perfil,
repassa apenas os valores normalizados. O Django só habilita a confiança nesses
headers pelo override caseiro. Os logs JSON omitem cookies, autorização, CSRF, token
de job e segredo do webhook; a rotação continua sob responsabilidade do Docker.

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.home.yml \
  -f docker-compose.home-tunnel.yml \
  up -d --build
```

Todos os serviços persistentes usam rotação `json-file` de 10 MB por arquivo e três
arquivos. Health checks encadeiam backend, frontend, Caddy e Tunnel antes de liberar
as dependências.

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
