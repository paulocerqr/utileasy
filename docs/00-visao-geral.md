# Visão Geral — Projeto de Site de Utilidades / Ferramentas Online

## 1. Objetivo geral do projeto

Estou planejando desenvolver uma aplicação web que reúna diversas funcionalidades úteis para o dia a dia, funcionando como uma espécie de **plataforma de ferramentas rápidas**.

A ideia é que o usuário acesse um site principal e encontre ferramentas como:

* Conversão de arquivos PDF, DOCX e PPTX.
* Transcrição de vídeos e áudios.
* Sorteio de números, palavras, nomes e grupos.
* Feed de notícias sobre assuntos específicos.
* Dicas úteis para desenvolvedores, como comandos Git, Docker, Linux, SQL, JSON, etc.
* Outras ferramentas simples e práticas para produtividade e desenvolvimento.

O projeto deve começar como um MVP, mas com uma arquitetura que permita crescer sem precisar reescrever tudo depois.

---

## 2. Stack escolhida

```text
Frontend:
Next.js + React + TypeScript + Tailwind CSS

Backend:
Django + Django REST Framework

Tarefas em background:
Celery

Fila/cache:
Redis

Banco de dados:
PostgreSQL

Conversão de arquivos:
LibreOffice headless rodando em worker/container separado

Transcrição:
AssemblyAI via worker

Automação/orquestração:
n8n como ferramenta auxiliar

Deploy inicial:
Docker Compose
```

Estado atual do frontend:

```text
- O frontend antigo em Vite/React foi substituído por um template gerado pela v0.
- O novo frontend roda em Next.js 16, React 19, TypeScript e Tailwind CSS 4.
- O template está na pasta /frontend e é executado pelo Docker Compose na porta 3000.
- O frontend consome o backend Django pelo endpoint /api/health/ para validar a integração.
- Os cards e seções de ferramentas ainda são protótipo visual; as funcionalidades reais precisam ser conectadas conforme os endpoints forem implementados no backend.
```

---

## 3. Decisões já tomadas

```text
1. O projeto será uma plataforma de ferramentas online.
2. O backend principal será Django + Django REST Framework.
3. O frontend será Next.js + React + TypeScript + Tailwind CSS.
4. O deploy inicial será feito com Docker Compose.
5. A arquitetura será monólito modular no backend, com separação por apps/domínios.
6. Tarefas pesadas irão para workers.
7. Conversão de arquivos usará LibreOffice headless em worker/container.
8. Transcrição usará AssemblyAI.
9. n8n será usado como camada auxiliar de automação.
10. O n8n não será o backend principal.
11. O MVP terá ferramentas simples + conversão + transcrição básica.
12. Microserviços só serão considerados no futuro, se alguma funcionalidade crescer muito.
13. O template visual gerado pela v0 foi adotado como base do frontend atual.
14. Os cards do frontend ainda representam intenção de produto, não funcionalidades completas já implementadas.
```

---

## 4. Próximo pedido sugerido para continuar em novo chat

No novo chat, posso começar com algo como:

"Com base no estado atual do projeto, implemente a primeira ferramenta funcional no frontend Next.js e conecte ao backend Django, começando pelo sorteador de nomes/números/grupos, com rota visual, lógica, validações e Docker funcionando."

Outra opção seria:

"Com base no estado atual do projeto, adicione Redis e Celery ao Docker Compose e prepare o backend Django para processar jobs assíncronos de transcrição e conversão de arquivos."

---

## Documentos relacionados

- `01-arquitetura.md`
- `02-banco-de-dados.md`
- `03-funcionalidades-regras-de-negocio.md`
- `04-api-backend.md`
- `05-automacao-n8n.md`
- `06-seguranca.md`
- `07-deploy.md`
- `08-status-e-proximos-passos.md`
