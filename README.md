# UtilityDev

Aplicação com Next.js, Django REST Framework e PostgreSQL, executada com Docker Compose.

## Arquitetura

- `frontend`: único serviço publicado no host, na porta `3000` do IP Tailscale.
- `backend`: acessível somente pela rede interna do Docker na porta `8000`.
- `db`: acessível somente pela rede interna do Docker na porta `5432`.

Não é necessário instalar Traefik ou Portainer para esta configuração.

## Implantação no servidor

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
docker compose up -d --build
```

A aplicação ficará disponível em:

```text
http://<IP_TAILSCALE>:3000
```

O bind usa o valor de `TAILSCALE_IP`. Se a variável não for definida, a porta fica disponível apenas em `127.0.0.1`, evitando exposição acidental em todas as interfaces.

## Atualização

Depois de enviar ou baixar uma nova versão do código no servidor:

```bash
docker compose up -d --build
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

O último comando remove permanentemente o banco da aplicação.
