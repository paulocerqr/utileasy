# API do backend

## Política de acesso

O DRF usa `SessionAuthentication` e `IsAuthenticated` como padrão. As rotas de
sessão anônima, criação, detalhe e PDF de transcrição declaram `AllowAny`, mas aplicam
as regras específicas abaixo. O navegador chama o Next.js no mesmo domínio; o Django
permanece privado na rede Docker.

## Autenticação

```text
GET  /api/auth/csrf/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

Login recebe `{"username":"alice","password":"senha"}`. Operações mutáveis com
sessão Django exigem `X-CSRFToken` e o cookie correspondente.

## Inicialização anônima

```text
GET /api/anonymous/session/
```

Para visitante, cria ou renova o contexto anônimo e define um cookie secreto HttpOnly.
A resposta informa `captcha_enabled`, `site_key` pública e `expires_at`. Para usuário
logado, responde apenas `authenticated: true`.

## Transcrições

```text
GET  /api/transcriptions/                  histórico autenticado (até 100)
POST /api/transcriptions/                  cria job autenticado ou anônimo
GET  /api/transcriptions/{public_id}/      consulta estado e resultado
GET  /api/transcriptions/{public_id}/pdf/  baixa PDF concluído
POST /api/transcriptions/{public_id}/claim/ transfere job anônimo para a conta
```

O POST usa multipart `file`. Visitantes também enviam `captcha_token`, precisam do
cookie criado pela inicialização e passam por limites Redis de IP e cookie. A criação
anônima retorna `access_token` somente nessa resposta. Nas consultas seguintes e no
PDF, envie:

```http
X-Job-Token: <segredo-do-job>
```

No fluxo anônimo, o limite de rajada por IP é verificado antes do Siteverify. Depois
de um CAPTCHA válido são consumidos os contadores de 24 horas por IP e cookie. Uma
falha de CAPTCHA não incrementa esses dois contadores diários. Eles são independentes
das linhas `Transcricao` e, portanto, não contam jobs criados antes da funcionalidade.

O servidor guarda apenas SHA-256 do cookie e do token. Respostas posteriores nunca
repetem o segredo. Usuários logados acessam somente jobs em que `owner` corresponde à
sessão. Em ambos os casos, falha de autorização responde 404 para não revelar UUIDs.

O endpoint `claim` exige login, CSRF e o `X-Job-Token` ainda válido. Em sucesso,
define o usuário como proprietário, remove as credenciais anônimas e troca o prazo
temporário pelo prazo autenticado de 180 dias.

Campos adicionais da resposta:

```text
anonymous   indica se o job usa credencial anônima
expires_at  instante em que o resultado deixa de estar disponível
```

Falhas comuns:

```text
400 arquivo ausente, CAPTCHA inválido ou expirado
401 histórico solicitado sem login
404 job inexistente ou credencial/proprietário incorreto
409 PDF antes da conclusão
413 arquivo acima do limite
415 extensão não suportada
428 cookie anônimo ainda não inicializado
429 limite por IP/cookie, ator ou capacidade global
```

Respostas 429 do rate limit Redis incluem `Retry-After`. Os padrões de produção são
2 tentativas por minuto/IP, 10 por 24 horas/IP e 3 por 24 horas/cookie. O ambiente de
desenvolvimento pode sobrescrevê-los sem alterar o código.

O backend ignora headers de IP por padrão. O perfil caseiro habilita
`DJANGO_TRUST_PROXY_HEADERS=1` somente na rede interna e consome exclusivamente o
`X-Real-IP` normalizado pelo Caddy. `X-Forwarded-For` e `CF-Connecting-IP` nunca são
interpretados diretamente pelo Django; valores ausentes ou inválidos falham de forma
segura para `REMOTE_ADDR`.

A cota diária de segundos é verificada de forma exata pelo worker depois do ffprobe.
Quando esgotada, o job muda para `failed` antes de chamar a AssemblyAI.

## Webhook AssemblyAI

```text
POST /api/webhooks/assemblyai/{public_id}/
X-AssemblyAI-Webhook-Secret: <segredo>
```

O callback é público, valida segredo e IDs, é idempotente e apenas agenda a consulta
definitiva à AssemblyAI. O texto recebido no payload não é confiado diretamente.
Depois de salvar localmente um resultado terminal, uma tarefa idempotente exclui a
transcrição e o upload associado da AssemblyAI. Uma reconciliação horária repete a
operação caso a fila ou o provedor estivessem indisponíveis.

## Camadas

```text
anonymous.py   cookie, IP, Redis e Turnstile
models.py      jobs, artefatos, sessões e orçamento diário
views.py       HTTP, admissão e autorização
services.py    FFmpeg, hash e abstração de storage
tasks.py       filas, deduplicação, quota e expiração
webhooks.py    callback do provedor
pdf.py         PDF em memória
```
