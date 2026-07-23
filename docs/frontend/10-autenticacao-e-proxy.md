# Autenticação, uso anônimo e proxy do frontend

## Arquitetura

O navegador conversa somente com o Next.js. Os handlers encaminham stream, cookies,
CSRF e headers de autorização ao Django privado.

```text
/api/auth/*              sessão Django
/api/anonymous/*         cookie temporário e configuração Turnstile
/api/transcriptions/*    upload, polling, PDF e claim
/api/webhooks/*          callback AssemblyAI
```

O proxy comum está em `frontend/lib/backend-proxy.ts`. A autorização continua sendo
decidida pelo Django.

## Conta autenticada

`LoginForm` obtém `/api/auth/csrf`, envia username e senha com `X-CSRFToken` e recebe
o cookie HttpOnly da sessão. `AppShell` consulta `/api/auth/me`, mostra o usuário e
faz logout com CSRF. Não há JWT nem senha em storage do navegador.

Usuários logados podem transcrever sem CAPTCHA. Seus jobs são persistentes e podem
ser listados por `GET /api/transcriptions/`; a tela visual de histórico ainda é uma
pendência.

## Visitante

Ao abrir a área de transcrição, `UploadArea` chama `GET /api/anonymous/session`. O
backend define o cookie secreto HttpOnly e devolve a site key pública. O componente
`TurnstileWidget` carrega o script oficial, usa a ação
`anonymous_transcription` e entrega o token de uso único ao formulário.

O upload anônimo envia:

```text
multipart: file + captcha_token
cookie: contexto anônimo HttpOnly
CSRF: token/cookie same-origin
```

O backend aplica primeiro o limite curto por IP, valida o Turnstile e só então
incrementa os limites de 24 horas por IP e cookie. Portanto, uma mensagem de CAPTCHA
não reduz a cota diária anônima. Uma resposta 429 pode trazer `Retry-After`, que indica
quantos segundos restam na janela bloqueada.

A resposta contém `access_token` somente uma vez. O frontend mantém o segredo em
estado e em `sessionStorage` para acompanhar aquele job na aba; não usa
`localStorage`. Polling e download de PDF enviam `X-Job-Token`. Sem ele, conhecer o
UUID não é suficiente.

A interface informa antes do upload que o resultado expira em 24 horas e não entra
no histórico. Após conclusão, repete o convite para login.

## Preservação após login

Antes de navegar para login, o job temporário permanece em `sessionStorage`. Depois
que a autenticação tem sucesso, `LoginForm` chama:

```text
POST /api/transcriptions/{id}/claim/
X-CSRFToken: ...
X-Job-Token: ...
```

Se o token ainda for válido, o backend transforma o job em persistente e o frontend
remove a credencial temporária. Uma falha de claim não desfaz um login bem-sucedido.

## Turnstile por ambiente

Desenvolvimento pode usar as chaves oficiais de teste “always pass” com
`TURNSTILE_EXPECTED_ACTION=` vazio, ou `TURNSTILE_ENABLED=0`. Produção deve usar
chaves reais, `TURNSTILE_EXPECTED_ACTION=anonymous_transcription` e
`TURNSTILE_EXPECTED_HOSTNAME`. A secret key existe somente no backend; apenas a site
key chega ao navegador.

As credenciais dummy podem retornar `hostname=example.com` e omitir `action`; por
isso hostname e ação esperados ficam vazios apenas no `.env` local. Essa exceção não
deve ser usada com as chaves reais da VPS.

## Pendências

```text
tela de histórico
cadastro público e recuperação de senha
tratamento visual dedicado para expiração enquanto a página está aberta
reset automático do widget após um POST rejeitado depois de validar o token
proteção adicional de borda/CDN para tráfego hostil em produção
```

O frontend aplica validação de conveniência, mas CAPTCHA, limites, cota e autorização
são sempre validados novamente no backend.
