# Automação com n8n

## 1. Papel do n8n no projeto

O n8n não será usado como backend principal.

Ele será usado como **camada auxiliar de automação e orquestração externa**.

Responsabilidades do n8n:

```text
- receber webhooks de serviços externos
- buscar notícias periodicamente
- enviar notificações por e-mail, Telegram ou Discord
- integrar com Google Drive, Notion, GitHub, Slack etc.
- criar fluxos administrativos
- avisar sobre falhas de conversão/transcrição
- automatizar coleta de conteúdos para dicas de devs
```

O n8n deve se comunicar com a aplicação principal por API, não acessando diretamente o banco principal.

---

## 2. Arquitetura com n8n

```text
Site principal
Django/FastAPI/Nest/.NET
        |
        | chama APIs internas / dispara eventos
        v
Fila / Webhooks / Jobs
        |
        v
n8n
        |
        | integra com serviços externos
        v
AssemblyAI, RSS, e-mail, Telegram, Discord, Google Drive, Notion, APIs etc.
```

Uso ideal do n8n:

```text
- receber webhooks da AssemblyAI
- enviar e-mails/notificações
- buscar RSS/APIs periodicamente
- criar alertas administrativos
- integrar com Telegram/Discord
- enviar arquivos para Google Drive
- coletar links para dicas de devs
- gerar relatórios administrativos
```

---

## 3. O que NÃO deve ficar no n8n

```text
- login/cadastro
- permissões
- planos/créditos
- regras principais de negócio
- conversão pesada de arquivos
- processamento de arquivos grandes
- banco principal da aplicação
```

O n8n deve chamar APIs internas do backend, por exemplo:

```text
PATCH /api/transcriptions/{id}/complete
POST /api/news/suggestions
POST /api/notifications
```

Não deve acessar diretamente o banco principal.
