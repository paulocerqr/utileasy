# Arquitetura

## 1. Decisão arquitetural principal

A decisão foi **não começar com microserviços**.

A arquitetura inicial será um **monólito modular**, porque isso reduz complexidade no começo e facilita:

* Login e autenticação centralizados.
* Banco de dados único.
* Layout único.
* Deploy mais simples.
* Menos duplicação de código.
* Mais facilidade para evoluir o MVP.

A lógica será:

```text
Funcionalidades simples ficam dentro da aplicação principal.
Funcionalidades pesadas rodam em workers.
Funcionalidades muito específicas ou perigosas podem virar serviços separados no futuro.
```

Exemplo:

```text
Sorteador → aplicação principal
Dicas para devs → aplicação principal
Feed de notícias → aplicação principal + tarefas agendadas/n8n
Transcrição → backend + worker + AssemblyAI
Conversão de arquivos → backend + worker/container com LibreOffice
```

A arquitetura principal escolhida foi:

```text
Monólito modular + workers separados + n8n para automações externas
```

A aplicação principal será centralizada, mas organizada internamente em módulos/domínios. Funcionalidades pesadas ou demoradas, como conversão de arquivos e transcrição, não serão executadas diretamente na requisição HTTP. Elas serão enviadas para filas e processadas por workers.

---

## 2. Estrutura geral da arquitetura

```text
[Frontend]
Next.js + React + TypeScript + Tailwind CSS
        |
        | HTTP/REST
        v
[Backend principal]
Django + Django REST Framework
        |
        ├── PostgreSQL
        ├── Redis
        ├── Storage local/S3/MinIO
        ├── Celery Workers
        │     ├── conversão de arquivos
        │     ├── transcrição
        │     └── limpeza de arquivos antigos
        |
        └── Webhooks / API interna
                |
                v
              [n8n]
                |
                ├── AssemblyAI
                ├── RSS/APIs de notícias
                ├── E-mail
                ├── Telegram/Discord
                ├── Google Drive/Notion
                └── GitHub
```

---

## 3. Papel de cada parte do sistema

### Frontend — Next.js + React + Tailwind CSS

Responsável por:

```text
- página inicial da plataforma
- navegação principal
- apresentação dos cards de ferramentas
- experiência visual e responsiva
- consumo da API Django
- renderização do status de integração com o backend
```

Estado atual:

```text
- frontend em /frontend
- baseado no template-com-canvas criado pela v0
- usa canvas animado como background visual
- roda em http://localhost:3000 pelo Docker Compose
- usa API_INTERNAL_BASE_URL=http://backend:8000 dentro da rede Docker
- usa NEXT_PUBLIC_API_BASE_URL para URLs públicas do navegador quando necessário
```

### Backend principal — Django + DRF

Responsável por:

```text
- usuários
- autenticação
- permissões
- histórico dos usuários
- upload/download
- cadastro e status dos jobs
- banco principal
- regras de negócio
- API pública/interna
- painel administrativo
```

### Celery Workers

Responsáveis por:

```text
- conversão de DOCX/PPTX/PDF
- compressão de arquivos
- geração de PDF/DOCX/TXT/SRT
- processamento de arquivos grandes
- chamadas para AssemblyAI, se a lógica ficar no backend
- limpeza automática de arquivos temporários
```

### Redis

Responsável por:

```text
- broker da fila do Celery
- cache, se necessário
- controle de tarefas temporárias
```

### Storage

No MVP pode ser local.

Depois pode evoluir para:

```text
- MinIO
- Amazon S3
- Cloudflare R2
- outro serviço compatível com S3
```

Armazenará:

```text
- arquivos enviados
- arquivos convertidos
- áudios/vídeos enviados
- transcrições exportadas
```

> Para o papel do PostgreSQL, ver `02-banco-de-dados.md`.
> Para o papel do n8n, ver `05-automacao-n8n.md`.

---

## 4. Papel de cada camada do backend (por domínio/app)

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

---

## 5. Estrutura atual do projeto (repositório)

```text
UtilityDev/
  backend/
    config/
      settings.py
      urls.py
      asgi.py
      wsgi.py
    apps/
      common/
        urls.py
        views.py
      transcriptions/
        models.py
        serializers.py
        services.py
        tasks.py
        providers/
          assemblyai.py
    manage.py
    requirements.txt
    Dockerfile

  frontend/
    app/
      layout.tsx
      page.tsx
      globals.css
    components/
      backend-status.tsx
      constellation-canvas.tsx
      dev-section.tsx
      hero.tsx
      navbar.tsx
      tools-sections.tsx
      tool-card.tsx
    lib/
      api.ts
      utils.ts
    public/
    package.json
    pnpm-lock.yaml
    next.config.mjs
    postcss.config.mjs
    tsconfig.json
    Dockerfile

  template-com-canvas/
    template original usado como base do novo frontend

  docker-compose.yml
  contexto.md
```

Serviços atuais no Docker Compose:

```text
- db: PostgreSQL 16, porta 5432
- backend: Django/DRF, porta 8000
- frontend: Next.js, porta 3000
```
