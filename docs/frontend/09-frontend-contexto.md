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
pdf-lib para mesclar PDFs localmente no navegador
qrcode para gerar QR Codes em PNG e SVG no navegador
jsQR somente nos testes para decodificar amostras geradas

Package manager:
pnpm 10.24.0
```

Scripts relevantes em `frontend/package.json`:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
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
/divisor-de-grupos
/imagens-para-pdf
/juntarpdf
/login
/ordem-de-apresentacao
/pdf-docx
/qr-code
/sorteador
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
    divisor-de-grupos/
      page.tsx
    imagens-para-pdf/
      page.tsx
    juntarpdf/
      page.tsx
    login/
      page.tsx
    ordem-de-apresentacao/
      page.tsx
    pdf-docx/
      page.tsx
    qr-code/
      page.tsx
    sorteador/
      page.tsx
    transcrisao/
      page.tsx
  components/
    app-shell.tsx
    backend-status.tsx
    dev-section.tsx
    hero.tsx
    group-divider-workspace.tsx
    image-to-pdf-workspace.tsx
    navbar.tsx
    pdf-docx-converter.tsx
    pdf-merge-workspace.tsx
    presentation-order-workspace.tsx
    qr-code-generator.tsx
    random-draw-workspace.tsx
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
    group-divider.ts
    group-divider.test.mjs
    image-to-pdf.ts
    image-to-pdf.test.mjs
    pdf-merge.ts
    pdf-merge.test.mjs
    presentation-order.ts
    presentation-order.test.mjs
    qr-code.ts
    qr-code.test.mjs
    sorteador.ts
    sorteador.test.ts
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
- Mantém links reais para /pdf-docx, /juntarpdf, /imagens-para-pdf, /sorteador,
  /ordem-de-apresentacao, /divisor-de-grupos, /qr-code e /transcrisao.
```

### Seções de ferramentas

Arquivo:

```text
components/tools-sections.tsx
```

Seção `Ferramentas de Arquivos`:

```text
- Conversão PDF ↔ DOCX -> href /pdf-docx
- Juntar PDFs -> href /juntarpdf
- Imagens para PDF -> href /imagens-para-pdf
```

Seção `Mídia & Vídeo`:

```text
- Baixar vídeos do YouTube
- Transcrição de áudio e vídeo -> href /transcrisao
```

O card de YouTube tem badge `USO RESPONSÁVEL` e aviso sobre direitos autorais.

Seção `Produtividade`:

```text
- Sorteador -> href /sorteador
- Ordem de apresentação -> href /ordem-de-apresentacao
- Divisor de grupos -> href /divisor-de-grupos
- Gerador de QR Code -> href /qr-code
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
- Rota /juntarpdf para seleção, pré-visualização, ordenação e mesclagem local de PDFs.
- Rota /imagens-para-pdf com normalização e geração local de PDFs.
- Rota /sorteador com sorteio local de números e itens sem repetição.
- Rota /ordem-de-apresentacao com sorteio local e exportação em TXT.
- Rota /divisor-de-grupos com divisão local, balanceada e copiável.
- Rota /qr-code com geração local para URL e Wi-Fi.
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
- Rotas reais para a maioria dos cards da home.
```

## 11. Cuidados ao continuar

```text
- Preservar a rota /transcrisao enquanto ela estiver linkada na home.
- Preservar a rota /juntarpdf, que está linkada no AppShell, nos cards e no carrossel.
- Preservar /imagens-para-pdf, que está linkada no AppShell, nos cards e no carrossel.
- Preservar a rota /qr-code, que está linkada no AppShell, nos cards e no carrossel.
- Em /juntarpdf, pdfjs-dist renderiza a prévia e pdf-lib realiza a mesclagem.
- Manter o limite acumulado de 100 MB e o aviso sobre consumo de memória em celulares.
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
/divisor-de-grupos
/imagens-para-pdf
/juntarpdf
/login
/ordem-de-apresentacao
/pdf-docx
/qr-code
/sorteador
/transcrisao
/api/auth/[...path]
/api/anonymous/[...path]
/api/transcriptions
/api/transcriptions/[...path]
/api/webhooks/[...path]
/_not-found
```

## 14. Juntar PDFs

A ferramenta funcional está em:

```text
/juntarpdf
```

Arquivos principais:

```text
frontend/app/juntarpdf/page.tsx
frontend/components/pdf-merge-workspace.tsx
frontend/lib/pdf-merge.ts
frontend/lib/pdf-merge.test.mjs
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
6. O painel Opções permite adicionar mais arquivos e configurar a confirmação antes da remoção.
7. O resumo lateral e o contador de tamanho acompanham a ordem e o total atuais.
8. O usuário inicia a mesclagem explicitamente; os controles ficam bloqueados durante o trabalho.
9. pdf-lib copia todas as páginas na ordem visual e informa o progresso por arquivo.
10. O navegador baixa `utileazy-pdfs-unidos.pdf` e revoga a URL temporária.
```

O painel de opções contém:

```text
- Adicionar mais arquivos.
- Pedir confirmação antes de remover PDF, ativado por padrão.
- Contador do tamanho acumulado em relação aos 100 MB.
- Barra visual de progresso do limite.
- Instruções de reordenação.
- Resumo ordenado com ação de remoção.
- Progresso da mesclagem e confirmação do download.
```

### Pré-visualização

A dependência `pdfjs-dist` é carregada no cliente por `pdfjs-dist/webpack.mjs`. O worker é empacotado pelo build do Next. A declaração local em `frontend/types/pdfjs-dist-webpack.d.ts` fornece os tipos para esse subpath.

Os arquivos permanecem como objetos `File` na memória do navegador. A pré-visualização
não envia dados para o backend e não persiste a lista após recarregar a página. A
tarefa do PDF.js é destruída depois de renderizar cada primeira página.

Os identificadores internos dos cards usam `crypto.randomUUID()` quando disponível e
geram um UUID v4 com `crypto.getRandomValues()` como fallback. Isso mantém a seleção
de arquivos funcional quando o servidor caseiro é acessado por IP Tailscale via HTTP,
origem em que alguns navegadores não expõem `randomUUID()`.

### Mesclagem local

`frontend/lib/pdf-merge.ts` valida no mínimo dois documentos e no máximo 100 MB,
carrega cada arquivo com `PDFDocument.load`, copia todas as páginas com `copyPages` e
serializa o resultado com `save`. O arquivo final preserva primeiro a ordem dos
arquivos e depois a ordem interna de suas páginas.

PDFs protegidos por senha, corrompidos, vazios ou estruturalmente inválidos são
rejeitados com uma mensagem que identifica o arquivo. O botão não permite duas
execuções simultâneas, e a interface bloqueia adição, remoção e reordenação durante o
processamento.

Os bytes intermediários e documentos do `pdf-lib` ficam restritos ao escopo da
operação e são liberados pelo coletor de lixo depois dela. A URL de `Blob` usada no
download é revogada após o clique. Nenhum `fetch`, endpoint, storage ou histórico
participa desse fluxo.

Testes:

```text
- preservação da ordem dos arquivos e de todas as páginas
- inversão da ordem visual
- mínimo de arquivos e limite acumulado
- PDF inválido com identificação do nome
- mensagem específica para PDF protegido
```

## 15. Ordem de apresentação

A ferramenta funcional está em:

```text
/ordem-de-apresentacao
```

Arquivos principais:

```text
frontend/app/ordem-de-apresentacao/page.tsx
frontend/components/presentation-order-workspace.tsx
frontend/lib/presentation-order.ts
frontend/lib/presentation-order.test.mjs
```

O usuário informa uma pessoa ou equipe por linha. A normalização remove linhas
vazias, espaços nas extremidades e espaços internos repetidos. Nomes duplicados são
comparados sem diferenciar maiúsculas e minúsculas e bloqueiam o sorteio até serem
corrigidos.

A ordenação usa Fisher–Yates com `crypto.getRandomValues()` e rejeição de viés. Cada
participante aparece exatamente uma vez na lista numerada. O resultado pode ser
copiado ou baixado como `ordem-de-apresentacao.txt`.

Um novo sorteio exige confirmação porque substitui a ordem visível. Alterar a entrada
limpa o resultado anterior para evitar divergência entre participantes e resultado.

Limites atuais:

```text
participantes        mínimo 2 e máximo 500
caracteres por nome  120
```

Todo o processamento acontece no navegador, sem API, `localStorage` ou histórico. A
interface anuncia resultados, downloads e erros em uma região `aria-live`.

Validação:

```bash
docker compose run --rm frontend-check node lib/presentation-order.test.mjs
docker compose run --rm frontend-check
docker compose build frontend
```

## 16. Divisor de grupos

A ferramenta funcional está em:

```text
/divisor-de-grupos
```

Arquivos principais:

```text
frontend/app/divisor-de-grupos/page.tsx
frontend/components/group-divider-workspace.tsx
frontend/lib/group-divider.ts
frontend/lib/group-divider.test.mjs
```

O usuário informa um participante por linha. Linhas vazias e espaços extras são
normalizados; nomes repetidos, sem diferenciar maiúsculas e minúsculas, bloqueiam a
divisão até serem corrigidos.

Modos disponíveis:

```text
quantidade de grupos   cria exatamente a quantidade solicitada
tamanho máximo         calcula quantos grupos são necessários para respeitar o limite
```

Depois de embaralhar com Fisher–Yates e `crypto.getRandomValues()`, a distribuição
round-robin mantém a diferença entre grupos em no máximo uma pessoa. No modo por
tamanho, nenhum grupo ultrapassa o valor configurado.

O usuário pode renomear cada grupo, refazer a divisão após confirmação, copiar um
grupo ou copiar todos. Nomes vazios de grupos retornam ao padrão quando o campo perde
o foco.

Limites atuais:

```text
participantes          mínimo 2 e máximo 500
caracteres por nome    120
caracteres por grupo   60
grupos                 mínimo 2 e sem grupos vazios
```

Todo o processamento acontece no navegador, sem API, `localStorage` ou histórico. A
interface anuncia criação, cópia e erros em uma região `aria-live`.

Validação:

```bash
docker compose run --rm frontend-check pnpm test
docker compose run --rm frontend-check
docker compose build frontend
```

## 17. Gerador de QR Code

A ferramenta funcional está em:

```text
/qr-code
```

Arquivos principais:

```text
frontend/app/qr-code/page.tsx
frontend/components/qr-code-generator.tsx
frontend/lib/qr-code.ts
frontend/lib/qr-code.test.mjs
```

Tipos de conteúdo disponíveis:

```text
URL HTTP ou HTTPS
Wi-Fi com SSID, segurança, senha e indicador de rede oculta
```

Os payloads Wi-Fi escapam barra invertida, ponto e vírgula, vírgula, dois-pontos e
aspas. URLs com protocolos diferentes de HTTP(S) e conteúdos vazios ou maiores que
1.200 bytes são rejeitados antes da geração.

Padrão fixo de saída:

```text
tamanho              384 pixels
margem                4 módulos
correção de erro      M
cores                 #111827 sobre #ffffff
downloads             PNG e SVG
```

Todo o processamento usa `qrcode` diretamente no navegador. O conteúdo não é
executado, aberto, enviado à API, salvo em `localStorage` ou persistido pelo
Utileazy. A prévia SVG não usa HTML injetado; somente a versão PNG é exibida como
imagem, e o SVG é mantido como texto até o download.

Os testes criam matrizes QR reais e usam `jsQR` para decodificar amostras de URL e
Wi-Fi, comparando o resultado com o payload original. Também cobrem protocolos,
escapes, limite de conteúdo, campos obrigatórios e os downloads no padrão fixo.

Validação:

```bash
docker compose run --rm frontend-check pnpm test
docker compose run --rm frontend-check
docker compose build frontend
```

## 18. Imagens para PDF

A ferramenta funcional está em:

```text
/imagens-para-pdf
```

Arquivos principais:

```text
frontend/app/imagens-para-pdf/page.tsx
frontend/components/image-to-pdf-workspace.tsx
frontend/lib/image-to-pdf.ts
frontend/lib/image-to-pdf.test.mjs
```

Formatos e limites:

```text
entrada              JPEG, PNG e WebP
quantidade           até 50 imagens
tamanho acumulado    até 100 MB
dimensão processada  até 3.000 pixels no maior lado
saída                 utileazy-imagens.pdf
```

O usuário pode selecionar ou arrastar imagens, conferir as prévias, remover arquivos
e definir a ordem por drag-and-drop ou botões direcionais. Cada imagem gera exatamente
uma página na ordem visual.

Configurações:

```text
página       A4 com orientação automática ou tamanho natural da imagem
margem       nenhuma, pequena, média ou grande
ajuste       conter a imagem inteira ou preencher a página com possível corte
```

Antes da incorporação, `createImageBitmap` e Canvas aplicam a orientação visual,
reduzem fotografias grandes e normalizam WebP para JPEG. PNG permanece PNG para
preservar transparência. Navegadores sem `createImageBitmap` usam `Image.decode()`
com uma URL temporária.

`pdf-lib` incorpora cada imagem sequencialmente e gera o PDF no navegador. O botão
fica bloqueado durante o processamento, mostra progresso por imagem e inicia o
download ao concluir. Nenhuma imagem passa por `fetch`, API, storage ou histórico.

Bitmaps são fechados depois do desenho, Canvas é zerado, URLs de prévia são revogadas
na remoção ou ao sair da rota e a URL do PDF é revogada depois do download.

Os testes cobrem formatos aceitos, redimensionamento proporcional, orientação A4,
margens, modos de ajuste, ordem/dimensões das páginas, arquivo inválido e limites.

Validação:

```bash
docker compose run --rm frontend-check pnpm test
docker compose run --rm frontend-check
docker compose build frontend
```
