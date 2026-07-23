# UtilityDev

Aplicação com Next.js, Django REST Framework e PostgreSQL, executada com Docker Compose.

## Arquitetura

- `frontend`: único serviço publicado no host, na porta `3000` do IP Tailscale.
- `backend`: acessível somente pela rede interna do Docker na porta `8000`.
- `db`: acessível somente pela rede interna do Docker na porta `5432`.

Não é necessário instalar Traefik ou Portainer para esta configuração.

## Perfis de execução

O mesmo código atende desenvolvimento, servidor caseiro e VPS. As diferenças ficam
em arquivos Compose complementares e no `.env`.

### Servidor caseiro

Envie ou clone o projeto no servidor e acesse-o por SSH. Dentro do diretório do projeto:

```bash
cp .env.example .env
```

Edite `.env` e defina, no mínimo:

- `TAILSCALE_IP`: IP Tailscale atual do servidor.
- `DJANGO_SECRET_KEY`: valor longo e aleatório.
- `POSTGRES_PASSWORD`: senha forte e exclusiva.
- `DJANGO_ALLOWED_HOSTS`: deve conter `backend` e o IP Tailscale.

Confirme o IP no servidor com:

```bash
tailscale ip -4
```

Construa e inicie a aplicação:

```bash
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
```

A aplicação ficará disponível em:

```text
http://<IP_TAILSCALE>:3000
```

O bind usa o valor de `TAILSCALE_IP`. Se a variável não for definida, a porta fica disponível apenas em `127.0.0.1`, evitando exposição acidental em todas as interfaces.

Configure também a origem usada no navegador, por exemplo:

```dotenv
DJANGO_CSRF_TRUSTED_ORIGINS=http://100.118.213.109:3000
TRANSCRIPTION_COMPLETION_MODE=polling
MEDIA_STORAGE_BACKEND=filesystem
```

### Desenvolvimento

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Esse perfil publica PostgreSQL e Django somente em `127.0.0.1` e usa duas tasks
Celery em paralelo.

Para testar o modo anônimo, podem ser usadas as credenciais dummy oficiais do
Turnstile. Como a resposta dummy pode omitir `action`, deixe
`TURNSTILE_EXPECTED_ACTION=` vazio somente nesse ambiente. O `.env` local atual usa
limites mais folgados (`10/minuto`, `100/24h` por IP e `50/24h` por cookie); eles não
alteram os padrões de produção presentes no `.env.example`.

### VPS com HTTPS e webhook

Antes de subir o perfil, aponte o DNS do domínio para a VPS e configure:

```dotenv
PUBLIC_DOMAIN=utileazy.exemplo.com
PUBLIC_BASE_URL=https://utileazy.exemplo.com
DJANGO_ALLOWED_HOSTS=backend
DJANGO_CSRF_TRUSTED_ORIGINS=https://utileazy.exemplo.com
DJANGO_CORS_ALLOWED_ORIGINS=https://utileazy.exemplo.com
DJANGO_SECURE_COOKIES=1
TRANSCRIPTION_COMPLETION_MODE=webhook
ASSEMBLYAI_WEBHOOK_SECRET=<segredo-longo-e-aleatorio>
TURNSTILE_SITE_KEY=<site-key-real>
TURNSTILE_SECRET_KEY=<secret-key-real>
TURNSTILE_EXPECTED_HOSTNAME=utileazy.exemplo.com
TURNSTILE_EXPECTED_ACTION=anonymous_transcription
VPS_MEDIA_CONCURRENCY=2
VPS_PROVIDER_CONCURRENCY=2
```

Em uma VPS de 2 vCPU use `VPS_MEDIA_CONCURRENCY=1`. Em 4 vCPU, o valor inicial
recomendado é 2.

```bash
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d --build
```

O Caddy obtém e renova o certificado TLS. A AssemblyAI chama o webhook público
através do frontend, que encaminha a requisição ao backend privado.

Para usar um storage S3 compatível no lugar do volume local:

```dotenv
MEDIA_STORAGE_BACKEND=s3
S3_ENDPOINT_URL=https://endpoint-do-provedor
S3_BUCKET_NAME=utileazy-private
S3_REGION=<regiao>
S3_ACCESS_KEY=<chave>
S3_SECRET_KEY=<segredo>
```

O bucket deve ser privado.

## Usuários e autenticação

Visitantes podem transcrever após CAPTCHA e recebem um resultado temporário protegido
por token, que expira em 24 horas. Contas autenticadas dispensam CAPTCHA, preservam o
resultado e terão histórico. Crie o primeiro administrador:

```bash
docker compose exec backend python manage.py createsuperuser
```

O administrador pode criar usuários comuns em `/admin/`. O login da aplicação usa
sessão segura e CSRF; não há cadastro público nesta versão.

O padrão limita visitantes por IP e cookie e limita todos os usuários a quatro horas
de áudio por dia. Ajuste `ANON_*` e `TRANSCRIPTION_DAILY_BUDGET_SECONDS` no `.env` de
acordo com os créditos disponíveis.

Tentativas anteriores à implementação não entram no rate limit: os contadores são
criados no Redis apenas quando o endpoint anônimo é usado. CAPTCHA inválido consome
somente o limite curto por IP; os contadores de 24 horas são incrementados após uma
validação bem-sucedida.

## Atualização

Depois de enviar ou baixar uma nova versão do código no servidor:

```bash
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
```

## Comandos úteis

Ver o estado e os logs:

```bash
docker compose ps
docker compose logs -f
```

Criar um superusuário:

```bash
docker compose exec backend python manage.py createsuperuser
```

Executar migrações manualmente:

```bash
docker compose exec backend python manage.py migrate
```

Parar a aplicação sem apagar o banco:

```bash
docker compose down
```

Apagar também os dados persistidos do PostgreSQL:

```bash
docker compose down -v
```

O último comando remove permanentemente PostgreSQL, Redis, mídias e dados do Caddy.
Não o execute em um ambiente com dados importantes.

## Validação

```bash
docker compose run --rm backend python manage.py check
docker compose run --rm backend python manage.py makemigrations --check --dry-run
docker compose run --rm backend python manage.py test apps.accounts apps.transcriptions
docker compose build frontend
```
