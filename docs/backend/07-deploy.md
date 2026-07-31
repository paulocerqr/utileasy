# Deploy

## Código comum e configurações por ambiente

Não existem dois backends funcionais. O código suporta polling/webhook,
filesystem/S3 e diferentes concorrências. Arquivos Compose complementares escolhem
o comportamento adequado ao hardware:

```text
docker-compose.yml       serviços base
docker-compose.home.yml  i5 2c/4t e 6 GB
docker-compose.home-tunnel.yml  Caddy e Tunnel sem portas no host
docker-compose.dev.yml   Ryzen 5600GT, 16 GB e portas locais
docker-compose.vps.yml   2–4 vCPU, 8 GB, HTTPS e workers separados
```

## Preparação comum

```bash
cp .env.example .env
```

Preencher pelo menos `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD` e
`ASSEMBLYAI_API_KEY`. Se o uso anônimo estiver habilitado, configure também o par de
chaves Turnstile adequado ao ambiente. Depois da primeira inicialização:

Para preparar o servidor caseiro que será publicado por HTTPS através do Cloudflare
Tunnel, use `deploy/env.home.example` como base. Esse template ativa cookies seguros,
mantém o worker solo e limita uploads a 95 MiB para deixar margem dentro do limite de
100 MB dos planos Free/Pro da Cloudflare. Substitua o domínio de exemplo e todos os
placeholders antes de usá-lo.

```bash
docker compose exec backend python manage.py createsuperuser
```

O cadastro público não está habilitado; o administrador cria usuários comuns pelo
Django Admin.

## Servidor caseiro com Cloudflare Tunnel

Use `deploy/env.home.example` como base do `.env`, substitua o domínio e todos os
placeholders e configure `PUID`/`PGID` para o usuário que executa o Docker.

O token do Tunnel fica somente em:

```text
secrets/cloudflare-tunnel-token
```

O arquivo deve pertencer ao usuário indicado por `PUID`/`PGID`, usar permissão `600`
e conter apenas o token do túnel gerenciado remotamente. No painel Cloudflare, a
rota publicada deve apontar para:

```text
http://caddy:8080
```

Inicialização:

```bash
docker compose version
docker compose \
  -f docker-compose.yml \
  -f docker-compose.home.yml \
  -f docker-compose.home-tunnel.yml \
  config --quiet

docker compose \
  -f docker-compose.yml \
  -f docker-compose.home.yml \
  -f docker-compose.home-tunnel.yml \
  up -d --build
```

O último override remove a porta `3000` herdada do Compose base. `cloudflared` e
Caddy usam imagens com versão fixa, rodam sem capabilities e com filesystem
somente leitura. O token é montado em `/run/secrets`; ele não aparece na linha de
comando nem no ambiente do processo.

O override usa a tag Compose `!reset`. Se a validação informar que essa tag não é
suportada, atualize o plugin `docker compose` antes de continuar; não substitua o
reset por uma lista vazia sem conferir o merge, pois isso pode manter a porta
herdada.

Caddy escuta HTTP somente na porta 8080 da rede Docker. O HTTPS termina na borda
Cloudflare e o túnel transporta a requisição até o host. Não publique 80, 443, 3000,
8000, 5432, 6379 ou 2000 no roteador ou no host.

O perfil acrescenta health checks para backend, frontend, Caddy e Tunnel, limita
logs a três arquivos de 10 MB por container e reserva 192 MB para cada serviço de
borda. O worker continua `solo`, com uma task por vez.

## Servidor caseiro com Tailscale

Configuração principal:

```dotenv
TAILSCALE_IP=<ip-tailscale>
DJANGO_ALLOWED_HOSTS=backend
DJANGO_CSRF_TRUSTED_ORIGINS=http://<ip-tailscale>:3000
TRANSCRIPTION_COMPLETION_MODE=polling
MEDIA_STORAGE_BACKEND=filesystem
CELERY_WORKER_POOL=solo
CELERY_WORKER_CONCURRENCY=1
```

Inicialização:

```bash
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
```

Somente `${TAILSCALE_IP}:3000` é publicado. Backend, PostgreSQL e Redis permanecem
internos. Esse modo direto é útil para diagnóstico privado e não deve ser combinado
com o override do Tunnel.

## Desenvolvimento

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

O override publica Django e PostgreSQL apenas em `127.0.0.1` e usa duas tasks
prefork. Polling continua sendo o padrão; webhook pode ser testado com um túnel
HTTPS e variáveis próprias.

Para as credenciais dummy oficiais do Turnstile:

```dotenv
TURNSTILE_ENABLED=1
TURNSTILE_SITE_KEY=<site-key-dummy>
TURNSTILE_SECRET_KEY=<secret-key-dummy>
TURNSTILE_EXPECTED_HOSTNAME=
TURNSTILE_EXPECTED_ACTION=
ANON_IP_BURST_LIMIT=10
ANON_IP_DAILY_LIMIT=100
ANON_COOKIE_DAILY_LIMIT=50
```

As expectativas vazias são exclusivas das credenciais dummy, que podem devolver
`hostname=example.com` e omitir `action`.

## VPS com HTTPS

Requisitos:

```text
domínio apontado para a VPS
portas 80, 443/tcp e 443/udp liberadas
PUBLIC_DOMAIN e PUBLIC_BASE_URL com o mesmo domínio HTTPS
segredo forte para ASSEMBLYAI_WEBHOOK_SECRET
cookies seguros e origem CSRF HTTPS
chaves Turnstile reais restritas ao domínio
```

Exemplo:

```dotenv
PUBLIC_DOMAIN=utileazy.exemplo.com
PUBLIC_BASE_URL=https://utileazy.exemplo.com
DJANGO_ALLOWED_HOSTS=backend
DJANGO_CSRF_TRUSTED_ORIGINS=https://utileazy.exemplo.com
DJANGO_CORS_ALLOWED_ORIGINS=https://utileazy.exemplo.com
DJANGO_SECURE_COOKIES=1
TRANSCRIPTION_COMPLETION_MODE=webhook
ASSEMBLYAI_WEBHOOK_SECRET=<segredo>
TURNSTILE_ENABLED=1
TURNSTILE_SITE_KEY=<site-key-real>
TURNSTILE_SECRET_KEY=<secret-key-real>
TURNSTILE_EXPECTED_HOSTNAME=utileazy.exemplo.com
TURNSTILE_EXPECTED_ACTION=anonymous_transcription
ANON_IP_BURST_LIMIT=2
ANON_IP_DAILY_LIMIT=10
ANON_COOKIE_DAILY_LIMIT=3
VPS_MEDIA_CONCURRENCY=2
VPS_PROVIDER_CONCURRENCY=2
```

Para 2 vCPU, use `VPS_MEDIA_CONCURRENCY=1`; para 4 vCPU, comece com 2.

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

Caddy obtém TLS e encaminha todo o tráfego para o Next.js. O Next encaminha APIs e
webhooks ao Django privado. Celery Beat agenda reconciliação e limpeza.

Os contadores anônimos ficam no Redis por até 24 horas e não são reconstruídos a
partir do PostgreSQL. Preserve o volume Redis em atualizações normais. Ajustar um
limite no `.env` altera novas verificações, mas não muda o valor já acumulado na chave
até sua expiração.

## Storage na VPS

Filesystem continua válido para uma VPS única. Para separar arquivos do host ou
preparar múltiplos nós, configure um bucket privado S3 compatível:

```dotenv
MEDIA_STORAGE_BACKEND=s3
S3_ENDPOINT_URL=https://endpoint
S3_BUCKET_NAME=utileazy-private
S3_REGION=<regiao>
S3_ACCESS_KEY=<chave>
S3_SECRET_KEY=<segredo>
```

## Atualização e validação

```bash
git pull
docker compose -f docker-compose.yml -f <override> up -d --build
docker compose ps
```

Validações usadas:

```bash
docker compose run --rm backend python manage.py check
docker compose run --rm backend python manage.py makemigrations --check --dry-run
docker compose run --rm backend python manage.py test apps.accounts apps.transcriptions
docker compose build frontend
```

Nunca use `docker compose down -v` em ambiente com dados importantes.
