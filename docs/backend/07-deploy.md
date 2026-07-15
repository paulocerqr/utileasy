# Deploy

## 1. Deploy inicial — Docker Compose

Serviços atuais no Docker Compose:

```text
- db: PostgreSQL 16, porta 5432
- backend: Django/DRF, porta 8000
- frontend: Next.js, porta 3000
```

Limitações atuais (ver também `08-status-e-proximos-passos.md`):

```text
- Redis/Celery ainda não estão conectados no Docker Compose atual.
- n8n ainda não está configurado no compose.
```

---

## 2. Deploy com Tailscale

Alterações concluídas e validadas.

Principais ajustes:

```text
- Frontend agora usa build de produção do Next.js.
- Backend usa Gunicorn.
- WhiteNoise configurado para arquivos estáticos do Django.
- PostgreSQL e backend não são mais publicados no servidor.
- Somente TAILSCALE_IP:3000 fica exposto.
- Credenciais do backend não são injetadas no frontend.
- Volumes de desenvolvimento foram removidos.
- .env.example configurado para 100.118.213.109.
- README atualizado com implantação via SSH.
```

Validações realizadas:

```text
- docker compose config: passou.
- Build completo das imagens frontend e backend: passou.
- Build TypeScript/Next.js: passou.
- git diff --check: passou.
```

### Passos no servidor

Após enviar ou clonar o projeto:

```bash
cp .env.example .env
nano .env
docker compose up -d --build
docker compose ps
```

Altere principalmente `DJANGO_SECRET_KEY` e `POSTGRES_PASSWORD`. Depois acesse:

```text
http://100.118.213.109:3000
```
