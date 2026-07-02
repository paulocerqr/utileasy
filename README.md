# UtilityDev

Stack base com Django, Django REST Framework, React e PostgreSQL usando Docker Compose.

## Servicos

- `backend`: Django + Django REST Framework em `http://localhost:8000`
- `frontend`: React + Vite em `http://localhost:5173`
- `db`: PostgreSQL em `localhost:5432`

## Como executar

1. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Suba os containers:

```bash
docker compose up --build
```

3. Acesse:

- Frontend: `http://localhost:5173`
- API de saude: `http://localhost:8000/api/health/`
- Admin Django: `http://localhost:8000/admin/`

## Comandos uteis

Criar superusuario:

```bash
docker compose exec backend python manage.py createsuperuser
```

Rodar migracoes manualmente:

```bash
docker compose exec backend python manage.py migrate
```

Parar a stack:

```bash
docker compose down
```

Remover volumes locais do PostgreSQL:

```bash
docker compose down -v
```
