# Contexto do Frontend Atual

Este documento resume apenas o estado atual do frontend do projeto Utileazy. A intenção é servir como arquivo de contexto para retomar o trabalho em outro chat Codex ou em outro computador.

## 1. Stack atual

```text
Frontend:
Next.js 16.2.6 + React 19 + TypeScript + Tailwind CSS 4

Fonte global:
Geist Mono via next/font/google

UI:
Tailwind CSS com tokens CSS customizados em app/globals.css
lucide-react para ícones
class-variance-authority, clsx e tailwind-merge disponíveis
motion para animações do carrossel da home
pdfjs-dist para pré-visualização local da primeira página de PDFs

Package manager:
pnpm 10.24.0
```

Scripts relevantes em `frontend/package.json`:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

O script `pnpm lint` roda:

```bash
tsc --noEmit
```

## 2. Containers do frontend

O frontend roda pelo `docker-compose.yml` no serviço `frontend`.

Configuração atual:

```text
service: frontend
container_name: utilitydev-frontend
build context: ./frontend
porta publicada: ${TAILSCALE_IP:-127.0.0.1}:3000:3000
variavel interna: API_INTERNAL_BASE_URL=http://backend:8000
comando: pnpm start --hostname 0.0.0.0
depende de: backend
```

O Dockerfile do frontend usa múltiplos estágios:

```text
dependencies:
- base node:22-alpine
- corepack enable
- pnpm install --frozen-lockfile

checker:
- usado pelo serviço frontend-check
- executa pnpm lint

builder:
- copia o frontend
- executa pnpm build

runner:
- produção com NODE_ENV=production
- usuário nextjs sem root
- copia .next, public e node_modules do build
- expõe porta 3000
- executa pnpm start --hostname 0.0.0.0
```

Comandos usados para validar alterações no frontend:

```bash
docker compose build frontend
docker compose up -d frontend
```

O build atual do Next compila as rotas:

```text
/
/juntarpdf
/login
/pdf-docx
/transcrisao
/_not-found
/api/auth/[...path]
/api/transcriptions
/api/transcriptions/[...path]
/api/webhooks/[...path]
```

Observação: a rota existente é `/transcrisao`, sem cedilha e com essa grafia. Não renomear sem ajustar links, documentação e navegação.

## 3. Estrutura frontend relevante

```text
frontend/
  app/
    api/
      auth/[...path]/route.ts
      transcriptions/route.ts
      transcriptions/[...path]/route.ts
      webhooks/[...path]/route.ts
    layout.tsx
    page.tsx
    globals.css
    juntarpdf/
      page.tsx
    login/
      page.tsx
    pdf-docx/
      page.tsx
    transcrisao/
      page.tsx
  components/
    app-shell.tsx
    backend-status.tsx
    dev-section.tsx
    hero.tsx
    navbar.tsx
    pdf-docx-converter.tsx
    pdf-merge-workspace.tsx
    section-header.tsx
    theme-toggle.tsx
    tool-card.tsx
    tools-sections.tsx
    ui/
      feature-carousel.tsx
    transcricao/
      upload-area.tsx
  lib/
    api.ts
    backend-proxy.ts
    utils.ts
  types/
    pdfjs-dist-webpack.d.ts
  public/
    fundo6.png
    fundo7.png
    fundo8.png
    fundo9.png
    fundo12.png
    fundo13.png
    demais placeholders e icones
```

Existe também `components/transcrisao/upload-area.tsx`, mas a rota atual `/transcrisao` importa `components/transcricao/upload-area.tsx`. Se for limpar duplicidade no futuro, verificar antes qual componente está em uso.

## 4. Layout global, fonte e tema

Arquivo principal: `frontend/app/layout.tsx`.

O layout carrega `Geist_Mono` via `next/font/google` e aplica a classe no `<body>`.

Todas as rotas são envolvidas por `components/app-shell.tsx`, que fornece o cabeçalho fixo, a navegação principal, a barra lateral recolhível e os links para as ferramentas. Em mobile, a barra lateral abre como menu sobreposto.

Também existe um script inline `themeScript` que roda antes da hidratação para definir:

```text
document.documentElement.dataset.theme
```

Regras atuais:

```text
1. Se houver localStorage.getItem('theme'), usa esse valor.
2. Senão, usa prefers-color-scheme: light para iniciar em light.
3. Se algo falhar, cai para dark.
```

O tema é alternado pelo componente `components/theme-toggle.tsx`, que grava no `localStorage` e muda `data-theme` para `light` ou `dark`.

O Tailwind foi configurado em `globals.css` para a variante dark olhar para:

```css
@custom-variant dark (&:is([data-theme='dark'] *));
```

## 5. Paleta e tokens atuais

Arquivo principal: `frontend/app/globals.css`.

Os tokens escuros vivem em `:root`:

```text
background: #1f1f1f
foreground: #fafafa
card: #202020
primary: #fafafa
secondary: #242424
muted: #2a2a2a
muted-foreground: #f99b73
border: #383838
accent: #333333
brand: #767673
brand-light: #9db1c5
warning: #ffab70
warning-foreground: #ffcfad
```

Os tokens claros vivem em:

```css
html[data-theme='light']
```

Valores claros atuais:

```text
background: #f6efe4
foreground: #1f1d1a
card: #fff7ea
primary: #1f1d1a
primary-foreground: #fff7ea
secondary: #eadcc7
muted-foreground: #5c5144
border: #d0bea4
accent: #dfc8a7
brand: #7b4c22
brand-light: #5a6f78
warning: #9a4b16
warning-foreground: #71330f
```

A fonte global usa:

```css
font-family: var(--font-geist-mono), 'Geist Mono', monospace;
```

## 6. Imagens de fundo por rota e tema

Os backgrounds são camadas fixas com `position: fixed`, `pointer-events: none`, `background-size: cover` e overlays em gradiente para preservar contraste.

### Home

Classe:

```css
.home-image-background
```

Uso:

```tsx
<div aria-hidden="true" className="home-image-background" />
```

Imagens atuais:

```text
Dark mode: /fundo7.png
Light mode: /fundo8.png
```

O modo claro da home usa `fundo8.png`, imagem clara com castelo nas nuvens e personagem central.

### Transcrição

Classe:

```css
.transcricao-image-background
```

Uso:

```tsx
<div aria-hidden="true" className="transcricao-image-background" />
```

Imagens atuais:

```text
Dark mode: /fundo12.png
Light mode: /fundo13.png
```

O modo claro de `/transcrisao` usa `fundo13.png`; o modo escuro usa `fundo12.png`.

Há overrides específicos dentro de `@media (max-width: 768px)` para ajustar overlays em mobile.

### Ferramentas PDF

As rotas `/pdf-docx` e `/juntarpdf` reutilizam a classe:

```css
.pdf-docx-image-background
```

Essa camada usa `fundo7.png` no modo escuro e `fundo8.png` no modo claro, com filtro em escala de cinza e overlays próprios.

## 7. Tela Home atual

Rota real:

```text
/
```

Na conversa, essa tela pode ser chamada de home ou `/home`, mas no Next ela está implementada em:

```text
frontend/app/page.tsx
```

Composição atual:

```text
main
- camada .home-image-background
- Hero
- BackendStatus
- FeatureCarousel
- FileToolsSection
- MediaSection
- ProductivitySection
- DevSection
- espaçamento final
```

O cabeçalho e a navegação lateral da home vêm do `AppShell` global. O arquivo `components/navbar.tsx` ainda existe, mas não é importado por `frontend/app/page.tsx`.

### AppShell

Arquivo:

```text
components/app-shell.tsx
```

Estado atual:

```text
- cabeçalho fixo com marca Utileazy
- navegação principal para Início, Desenvolvedores e Recentes
- barra lateral recolhível com domínios e ferramentas
- link de Juntar PDFs para /juntarpdf
- botão ThemeToggle
- consulta `GET /api/auth/me` ao navegar
- quando anônimo, exibe o link Entrar
- quando autenticado, exibe username e botão Sair
- logout obtém CSRF, encerra a sessão e redireciona para /login
```

### Hero

Arquivo:

```text
components/hero.tsx
```

Texto principal:

```text
Utilidades do dia a dia em um só lugar
```

Descrição:

```text
Uma coleção de ferramentas para arquivos, mídia e produtividade, além de utilitários feitos especialmente para desenvolvedores.
```

CTAs:

```text
Explorar ferramentas -> #ferramentas
Ver ferramentas para Devs -> #devs
```

### BackendStatus

Arquivo:

```text
components/backend-status.tsx
```

Esse componente chama `getBackendHealth()` e renderiza um card de integração com o backend.

Endpoint usado:

```text
GET /api/health/
```

A URL base vem de `frontend/lib/api.ts`:

```text
API_INTERNAL_BASE_URL
NEXT_PUBLIC_API_BASE_URL
fallback: http://localhost:8000
```

Dentro do Docker Compose, `API_INTERNAL_BASE_URL` é:

```text
http://backend:8000
```

### Carrossel de funcionalidades

Arquivo:

```text
components/ui/feature-carousel.tsx
```

Estado atual:

```text
- Componente client-side animado com motion.
- Exibe as 18 funcionalidades presentes nas seções da home.
- Possui autoplay, pausa por hover/foco e controles anterior/próximo.
- Permite selecionar funcionalidades pela lista lateral.
- Respeita prefers-reduced-motion.
- Usa imagens do Unsplash agrupadas por categoria.
- Mantém links reais para /pdf-docx, /juntarpdf e /transcrisao.
```

### Seções de ferramentas

Arquivo:

```text
components/tools-sections.tsx
```

Seção `Ferramentas de Arquivos`:

```text
- Conversão PDF ↔ DOCX -> href /pdf-docx
- Juntar e separar PDFs -> href /juntarpdf
- Imagens para PDF
```

Seção `Mídia & Vídeo`:

```text
- Baixar vídeos do YouTube
- Transcrição de áudio e vídeo -> href /transcrisao
```

O card de YouTube tem badge `USO RESPONSÁVEL` e aviso sobre direitos autorais.

Seção `Produtividade`:

```text
- Sorteador
- Ordem de apresentação
- Divisor de grupos
- Gerador de QR Code
```

### Seção Para Desenvolvedores

Arquivo:

```text
components/dev-section.tsx
```

Cards atuais:

```text
- Decodificador JWT
- Teste de velocidade
- Dicas de Linux
- Distribuições Linux
- Onde baixar Linux
- Comparar distros
- Dicas de Git
- Dicas de Docker
- Dicas de Banco de Dados
```

## 8. Tela /transcrisao atual

Rota real:

```text
/transcrisao
```

Arquivo:

```text
frontend/app/transcrisao/page.tsx
```

Composição atual:

```text
page wrapper
- camada .transcricao-image-background
- main centralizado
  - título
  - subtítulo dentro de card arredondado
  - pills Rápido e Seguro
  - UploadArea
  - texto de rodapé sobre tamanho máximo e armazenamento
```

O cabeçalho e a navegação lateral são fornecidos pelo `AppShell` global.

Título:

```text
Transcrição de Áudio e Vídeo
```

Subtítulo atual:

```text
Envie arquivos e gere transcrições automáticas com boa precisão
```

Esse subtítulo foi colocado dentro de um card retangular com bordas arredondadas para resolver contraste no modo claro. A classe atual usa tokens de tema:

```text
border border-border
bg-card/45
text-foreground
shadow-lg
backdrop-blur-sm
```

Pills de recurso:

```text
- Rápido
- Seguro
```

### UploadArea

Arquivo em uso:

```text
components/transcricao/upload-area.tsx
```

Estado atual:

```text
- Componente client-side com seleção e drag-and-drop.
- Aceita MP3, WAV, M4A, AAC, OGG, FLAC, MP4, MOV, MKV, WebM e AVI.
- Valida o limite de 500 MB antes do envio.
- Envia FormData para POST /api/transcriptions.
- Obtém um token em GET /api/auth/csrf antes do upload.
- Envia o token no header X-CSRFToken.
- Inicializa cookie anônimo e Turnstile quando não existe login.
- Guarda temporariamente o segredo do job anônimo em sessionStorage.
- Exibe erros 400 de CAPTCHA e 429 de limite devolvidos pelo backend.
- Consulta o status do job a cada 5 segundos.
- Exibe estados de processamento, erros e o texto concluído.
- Permite copiar a transcrição e baixar o PDF gerado pelo backend.
```

O fluxo real de upload, polling e download está implementado por rotas same-origin do Next e é detalhado na seção 13 deste documento.

## 9. Cards e padrão visual

Arquivo:

```text
components/tool-card.tsx
```

Os cards usam:

```text
rounded-xl
border border-border
bg-card/45
hover:border-brand
hover:bg-secondary
```

`ToolCard` e `ToolCardWide` aceitam:

```text
icon
title
description
warning opcional
href opcional
badge opcional no wide
```

Quando `href` não é informado, o fallback atual é `#`.

Avisos usam tokens:

```text
warning
warning-foreground
```

## 10. Estado funcional atual do frontend

Implementado:

```text
- Next.js em produção via Docker Compose.
- Home visual completa com seções e cards.
- Carrossel animado com as 18 funcionalidades da home.
- Rota /pdf-docx com fluxo visual de conversão.
- Rota /juntarpdf para seleção, pré-visualização e ordenação local de PDFs.
- Rota /transcrisao integrada ao backend para upload, polling e download.
- Login real por sessão Django, cookie HttpOnly e CSRF.
- Identificação do usuário e logout no AppShell.
- Proxy same-origin para autenticação, transcrições e webhook.
- Tema claro e escuro com persistência em localStorage.
- Imagens de fundo diferentes por rota e por tema.
- Fonte global Geist Mono.
- Integração com backend health check na home.
- Build Docker validado com docker compose build frontend.
- Serviço validado com docker compose up -d frontend.
```

Ainda não implementado:

```text
- Cadastro público; usuários são criados pelo administrador Django.
- Tela visual de histórico; o endpoint autenticado já existe no backend.
- Guia de uso funcional.
- Mesclagem real dos PDFs selecionados em /juntarpdf.
- Envio dos PDFs de /juntarpdf para o backend.
- Download do PDF mesclado.
- Rotas reais para a maioria dos cards da home.
```

## 11. Cuidados ao continuar

```text
- Preservar a rota /transcrisao enquanto ela estiver linkada na home.
- Preservar a rota /juntarpdf, que está linkada no AppShell, nos cards e no carrossel.
- Não implementar a mesclagem de PDFs até ser decidido se o processamento ficará no backend ou no frontend.
- Em /juntarpdf, pdfjs-dist é usado somente para renderizar a primeira página; não confundir pré-visualização com processamento.
- Manter o limite acumulado de 100 MB na preparação da mesclagem.
- Usar tokens de tema em vez de hexadecimais diretos sempre que possível.
- Verificar contraste nos dois temas, principalmente sobre imagens claras.
- Para textos sobre imagem, preferir card/superfície com bg-card/90 e border-border.
- Não recolocar canvas de fundo na home; ele foi substituído por imagens.
- Ao alterar frontend, validar com docker compose build frontend e depois docker compose up -d frontend.
- POSTs autenticados devem obter CSRF em /api/auth/csrf e enviar X-CSRFToken.
- O arquivo components/transcrisao/upload-area.tsx parece legado/duplicado; a rota atual usa components/transcricao/upload-area.tsx.
```

## 12. Comandos úteis para outro chat Codex

Instalar dependências localmente, se necessário:

```bash
cd frontend
pnpm install
```

Validar TypeScript localmente:

```bash
cd frontend
pnpm lint
```

Build e subida pelo fluxo usado no projeto:

```bash
docker compose build frontend
docker compose up -d frontend
```

Ver containers:

```bash
docker compose ps
```

Acessar localmente:

```text
http://localhost:3000
```

Se `TAILSCALE_IP` estiver configurado no `.env`, a porta será publicada em:

```text
http://<TAILSCALE_IP>:3000
```

## 13. Transcrição de áudio e vídeo

A rota funcional é `/transcrisao` e importa `frontend/components/transcricao/upload-area.tsx`. Existe outro componente em `components/transcrisao/upload-area.tsx`, mas ele não é usado pela rota atual.

### Fluxo da interface

```text
1. Usuário entra com uma conta criada pelo administrador.
2. Usuário seleciona ou arrasta um arquivo.
3. Frontend valida extensão e limite de 500 MB.
4. Frontend obtém CSRF e envia FormData no campo `file` com X-CSRFToken.
5. API cria o job da conta ou um job temporário com UUID e segredo adicional.
6. Frontend consulta a cada 5 segundos usando sessão ou `X-Job-Token`.
7. Ao concluir, renderiza o texto em um card.
8. Usuário pode copiar o texto ou baixar o PDF do próprio job.
```

Formatos aceitos:

```text
Áudio: MP3, WAV, M4A, AAC, OGG, FLAC
Vídeo: MP4, MOV, MKV, WebM, AVI
```

O frontend não usa FFmpeg WASM, não calcula o hash do arquivo inteiro no navegador e não possui player, WebSocket, tela de histórico ou diarização. A preparação do áudio, propriedade e deduplicação são responsabilidades do backend. O histórico já pode ser obtido por `GET /api/transcriptions/`, mas ainda não possui tela própria.

### Estados exibidos

```text
queued
extracting
checking_duplicate
uploading_provider
processing
completed
failed
```

O card final exibe o nome original, a quantidade de palavras, indicação de resultado reutilizado quando aplicável, botão de cópia e link para PDF.

### API same-origin do Next

Como somente o frontend é publicado no host, o navegador usa estas rotas do Next:

```text
GET  /api/auth/csrf
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/transcriptions
GET  /api/transcriptions/{uuid}
GET  /api/transcriptions/{uuid}/pdf
POST /api/webhooks/assemblyai/{uuid}/
```

`frontend/lib/backend-proxy.ts` implementa o proxy comum. Os handlers em
`frontend/app/api/auth/`, `transcriptions/` e `webhooks/` encaminham método, headers,
cookies, corpo em streaming, status e resposta para `API_INTERNAL_BASE_URL`,
normalmente `http://backend:8000`. O `Content-Length` do multipart é preservado para
que uploads grandes cheguem corretamente ao Gunicorn.

O webhook também passa pelo Next: na VPS, Caddy publica o domínio HTTPS, Next recebe
`/api/webhooks/...` e encaminha ao Django privado. O segredo permanece em header e
é validado somente pelo backend.

### Autenticação da interface

Arquivos principais:

```text
frontend/app/login/page.tsx
frontend/components/login-form.tsx
frontend/components/app-shell.tsx
frontend/app/api/auth/[...path]/route.ts
```

Fluxo de login:

```text
1. LoginForm chama GET /api/auth/csrf.
2. Envia username/password em JSON com X-CSRFToken.
3. Django devolve Set-Cookie da sessão através do proxy Next.
4. A interface redireciona para /transcrisao.
5. AppShell consulta /api/auth/me e mostra o username.
```

Fluxo de logout:

```text
1. AppShell obtém CSRF.
2. Envia POST /api/auth/logout.
3. Limpa o estado local e redireciona para /login.
```

Não existe token em `localStorage` nem JWT. O segredo de um job anônimo fica apenas
em estado e `sessionStorage`, para sobreviver ao redirecionamento de login e permitir
o claim. O formulário não oferece cadastro público.

### Limitações atuais

```text
- O polling é interrompido visualmente após 720 consultas, mas o job continua salvo no backend.
- A tela de histórico e o Guia de Uso ainda são funcionalidades futuras.
- Não há cadastro público nem recuperação de senha pela interface.
- O download de PDF é feito pelo endpoint do backend, não por window.print().
- O resultado anônimo expira em 24 horas se não for reivindicado após login.
```

O build validado do Next inclui:

```text
/
/juntarpdf
/login
/pdf-docx
/transcrisao
/api/auth/[...path]
/api/anonymous/[...path]
/api/transcriptions
/api/transcriptions/[...path]
/api/webhooks/[...path]
/_not-found
```

## 14. Preparação para juntar PDFs

A rota de preparação é:

```text
/juntarpdf
```

Arquivos principais:

```text
frontend/app/juntarpdf/page.tsx
frontend/components/pdf-merge-workspace.tsx
frontend/types/pdfjs-dist-webpack.d.ts
```

O protótipo de referência criado no Google Stitch fica em `JuntarPDF/`, com `DESIGN.md`, `code.html` e `screen.png`. Esses arquivos não são importados pelo frontend em runtime.

### Fluxo atual da interface

```text
1. Usuário seleciona vários PDFs ou arrasta arquivos para o workspace.
2. Frontend ignora formatos inválidos e impede que a soma ultrapasse 100 MB.
3. PDF.js renderiza localmente a primeira página de cada arquivo em um canvas.
4. Usuário arrasta os cards para reordenar ou usa os botões direcionais.
5. Usuário pode remover um PDF pelo card ou pelo resumo lateral.
6. O painel Options permite adicionar mais arquivos e configurar a confirmação antes da remoção.
7. O resumo lateral e o contador de tamanho acompanham a ordem e o total atuais.
```

O painel de opções contém:

```text
- Adicionar mais arquivos.
- Pedir confirmação antes de remover PDF, ativado por padrão.
- Contador do tamanho acumulado em relação aos 100 MB.
- Barra visual de progresso do limite.
- Instruções de reordenação.
- Resumo ordenado com ação de remoção.
```

### Pré-visualização

A dependência `pdfjs-dist` é carregada no cliente por `pdfjs-dist/webpack.mjs`. O worker é empacotado pelo build do Next. A declaração local em `frontend/types/pdfjs-dist-webpack.d.ts` fornece os tipos para esse subpath.

Os arquivos permanecem como objetos `File` na memória do navegador. A pré-visualização não envia dados para o backend e não persiste a lista após recarregar a página.

### Limitação deliberada

A mesclagem ainda não foi implementada. O botão `Juntar PDFs` é habilitado quando há pelo menos dois arquivos, mas apenas informa que a ordenação está pronta e que a integração depende da decisão entre backend e frontend.

Não há atualmente:

```text
- Biblioteca de mesclagem de PDFs.
- Endpoint de upload ou mesclagem para essa rota.
- Geração de arquivo final.
- Download do PDF mesclado.
- Histórico de mesclagens.
```
