# API / Backend

## 1. Endpoints atualmente expostos

```text
GET /api/health/
```

Estado funcional atual:

```text
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Health check: GET http://localhost:8000/api/health/
- Integração frontend-backend validada pelo card de status na home
```

---

## 2. Endpoints internos usados pelo n8n (exemplos)

O n8n deve chamar APIs internas do backend, por exemplo:

```text
PATCH /api/transcriptions/{id}/complete
POST /api/news/suggestions
POST /api/notifications
```

Não deve acessar diretamente o banco principal (ver `05-automacao-n8n.md` e `06-seguranca.md`).

---

## 3. Papel de cada camada (organização interna dos apps Django)

```text
- models.py: estrutura do banco do domínio.
- serializers.py: entrada e saída da API.
- views.py: endpoints HTTP.
- services.py: regra de negócio síncrona, por exemplo criar transcrição, validar arquivo, montar payload.
- tasks.py: tarefas Celery, por exemplo enviar áudio para AssemblyAI.
- providers/: integração externa isolada, como AssemblyAI.
- admin.py: painel Django Admin daquele domínio.
- urls.py: rotas do domínio.
```

> Ver detalhes completos da estrutura de pastas em `01-arquitetura.md`.
