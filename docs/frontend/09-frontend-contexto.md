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
/transcrisao
/_not-found
```

Observação: a rota existente é `/transcrisao`, sem cedilha e com essa grafia. Não renomear sem ajustar links, documentação e navegação.

## 3. Estrutura frontend relevante

```text
frontend/
  app/
    layout.tsx
    page.tsx
    globals.css
    transcrisao/
      page.tsx
  components/
    backend-status.tsx
    dev-section.tsx
    hero.tsx
    navbar.tsx
    section-header.tsx
    theme-toggle.tsx
    tool-card.tsx
    tools-sections.tsx
    transcricao/
      upload-area.tsx
  lib/
    api.ts
    utils.ts
  public/
    fundo6.png
    fundo7.png
    fundo8.png
    fundo9.png
    demais placeholders e icones
```

Existe também `components/transcrisao/upload-area.tsx`, mas a rota atual `/transcrisao` importa `components/transcricao/upload-area.tsx`. Se for limpar duplicidade no futuro, verificar antes qual componente está em uso.

## 4. Layout global, fonte e tema

Arquivo principal: `frontend/app/layout.tsx`.

O layout carrega `Geist_Mono` via `next/font/google` e aplica a classe no `<body>`.

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
Dark mode: /fundo6.png
Light mode: /fundo9.png
```

O modo claro de `/transcrisao` usa `fundo9.png`, imagem com cavaleiro, arvore, caminho e castelo ao fundo.

Há overrides específicos dentro de `@media (max-width: 768px)` para ajustar overlays em mobile.

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
- Navbar
- Hero
- BackendStatus
- FileToolsSection
- MediaSection
- ProductivitySection
- DevSection
- espaçamento final
```

### Navbar

Arquivo:

```text
components/navbar.tsx
```

Estado atual:

```text
- marca exibida: Utileazy
- ícone LayoutList
- links internos: #ferramentas e #devs
- botão ThemeToggle
- botões visuais Entrar e Criar conta
```

Os botões Entrar e Criar conta ainda são visuais; não há autenticação implementada.

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

### Seções de ferramentas

Arquivo:

```text
components/tools-sections.tsx
```

Seção `Ferramentas de Arquivos`:

```text
- Conversão PDF ↔ DOCX
- Juntar e separar PDFs
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
- Navbar
- main centralizado
  - botões Histórico e Guia de Uso
  - título
  - subtítulo dentro de card arredondado
  - pills Rápido, Seguro, Multi-speaker
  - UploadArea
  - texto de rodapé sobre tamanho máximo e armazenamento
```

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
bg-card/90
text-foreground
shadow-lg
backdrop-blur-sm
```

Pills de recurso:

```text
- Rápido
- Seguro
- Multi-speaker
```

### UploadArea

Arquivo em uso:

```text
components/transcricao/upload-area.tsx
```

Estado atual:

```text
- Componente client-side.
- Usa input file escondido e botão visual.
- Aceita audio/*, video/*, .mp3, .mp4, .wav, .m4a, .ogg.
- Guarda o arquivo selecionado em useState.
- Exibe nome e tamanho do arquivo selecionado.
- Botão Iniciar transcrição fica disabled quando não há arquivo.
```

Ainda não há envio real para o backend. A tela é visual/interativa localmente, mas o fluxo de job de transcrição ainda precisa ser conectado a endpoints reais.

## 9. Cards e padrão visual

Arquivo:

```text
components/tool-card.tsx
```

Os cards usam:

```text
rounded-xl
border border-border
bg-card/90
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
- Rota /transcrisao visual/interativa para seleção local de arquivo.
- Tema claro e escuro com persistência em localStorage.
- Imagens de fundo diferentes por rota e por tema.
- Fonte global Geist Mono.
- Integração com backend health check na home.
- Build Docker validado com docker compose build frontend.
- Serviço validado com docker compose up -d frontend.
```

Ainda não implementado:

```text
- Login/cadastro real.
- Histórico real de transcrições.
- Guia de uso funcional.
- Upload real para backend.
- Criação de TranscriptionJob via API.
- Status de processamento.
- Download/exportação de transcrição.
- Rotas reais para a maioria dos cards da home.
```

## 11. Cuidados ao continuar

```text
- Preservar a rota /transcrisao enquanto ela estiver linkada na home.
- Usar tokens de tema em vez de hexadecimais diretos sempre que possível.
- Verificar contraste nos dois temas, principalmente sobre imagens claras.
- Para textos sobre imagem, preferir card/superfície com bg-card/90 e border-border.
- Não recolocar canvas de fundo na home; ele foi substituído por imagens.
- Ao alterar frontend, validar com docker compose build frontend e depois docker compose up -d frontend.
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
1. Usuário seleciona ou arrasta um arquivo.
2. Frontend valida extensão e limite de 500 MB.
3. Frontend envia FormData no campo `file`.
4. API retorna um UUID público e status `queued`.
5. Frontend consulta o status a cada 5 segundos.
6. Ao concluir, renderiza o texto em um card.
7. Usuário pode copiar o texto ou baixar o PDF.
```

Formatos aceitos:

```text
Áudio: MP3, WAV, M4A, AAC, OGG, FLAC
Vídeo: MP4, MOV, MKV, WebM, AVI
```

O frontend não usa FFmpeg WASM, não calcula o hash do arquivo inteiro no navegador e não possui player, WebSocket, histórico ou diarização. A preparação do áudio e a deduplicação são responsabilidades do worker no backend.

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
POST /api/transcriptions
GET  /api/transcriptions/{uuid}
GET  /api/transcriptions/{uuid}/pdf
```

Os handlers em `frontend/app/api/transcriptions/` encaminham as requisições em streaming para `API_INTERNAL_BASE_URL`, normalmente `http://backend:8000`. O `Content-Length` do multipart é preservado para que uploads grandes cheguem corretamente ao Gunicorn.

### Limitações atuais

```text
- Não existe autenticação associada ao job.
- O polling é interrompido visualmente após 720 consultas, mas o job continua salvo no backend.
- Histórico e Guia de Uso ainda são funcionalidades futuras.
- O download de PDF é feito pelo endpoint do backend, não por window.print().
```

O build validado do Next inclui:

```text
/
/transcrisao
/api/transcriptions
/api/transcriptions/[...path]
/_not-found
```
