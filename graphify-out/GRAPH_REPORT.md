# Graph Report - utileazy  (2026-08-31)

## Corpus Check
- Large corpus: 216 files · ~1,097,872 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1103 nodes · 1712 edges · 109 communities (71 shown, 38 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Transcription Backend
- Document Conversion API
- Grouping Presentation Tools
- Document Data Models
- Anonymous API Proxy
- Image to PDF
- API Integration Tests
- Conversion Transcription Pages
- Media Subtitle Features
- Homepage Backend Status
- PDF Merge Tool
- Random Draw Tool
- TypeScript Compiler Config
- Backend Architecture Docs
- QR Code Generator
- Account Serialization
- UI Runtime Dependencies
- Deployment Security Operations
- Frontend Build Dependencies
- Transcription Pipeline Docs
- Application Shell Layout
- Frontend Module Aliases
- Frontend Architecture Docs
- Profile Settings
- Account API Tests
- Graphify Documentation
- Docker Runtime Stack
- Package Metadata
- Login Flow
- Frontend Build Scripts
- User Profile Model
- Health Check Endpoint
- Backup Restore Testing
- Deployment Soak Monitoring
- Backup Execution
- Backup Maintenance
- Database Design Docs
- Backend Context Docs
- Randomization Features
- Repository Publication Security
- Moonlit Knight Scene
- Nocturnal Castle Scene
- Celestial Castle Scene
- Resting Knight Scene
- Dark Knight Scene
- Haloed Warrior Scene
- Celestial Warrior Scene
- Monochrome Castle Scene
- Accounts App Config
- Common App Config
- Documents App Config
- Transcriptions App Config
- Transcription Pipeline Migration
- Ownership Storage Migration
- PostgreSQL Restore Test
- Security Audit Script
- Frontend Proxy Flows
- YouTube Download Evaluation
- Speed Test Feature
- Screen Recorder Feature
- Constellation Canvas
- PostCSS Configuration
- Dark App Icon
- Placeholder Brand Logo
- Placeholder Triangle Logo
- Accounts Initial Migration
- Transcriptions Initial Migration
- Anonymous Access Migration
- Home Tunnel Deployment
- Docker LAN Guard
- Webhook Auth Test
- Alert Sending Script
- Transcription Artifact Ownership
- Next.js Configuration
- Next.js Environment Types
- Motion Dependency
- Next.js Dependency
- QR Code Dependency
- React Dependency
- React DOM Dependency
- UtilityDev Apple Icon
- Knight Overlook Scene
- Gothic Fantasy Scene
- Knight Castle Landscape
- Sunlit Knight Scene
- Adaptive UtilityDev Icon
- Light App Icon
- Generic Placeholder Graphic
- Blank Image Placeholder
- Generic User Avatar
- PDF.js Type Declaration

## God Nodes (most connected - your core abstractions)
1. `Transcricao` - 38 edges
2. `DocumentConversion` - 23 edges
3. `process_transcription()` - 18 edges
4. `compilerOptions` - 17 edges
5. `hash_secret()` - 16 edges
6. `TranscriptionApiTests` - 16 edges
7. `DocumentConversionError` - 15 edges
8. `DocumentConversionSerializer` - 14 edges
9. `TranscricaoSerializer` - 14 edges
10. `TranscriptionTaskTests` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Backend Python Dependency Stack` --conceptually_related_to--> `Django Backend Service`  [INFERRED]
  backend/requirements.txt → docker-compose.yml
- `Graphify-First Codebase Policy` --references--> `Graphify Knowledge Graph Pipeline`  [EXTRACTED]
  AGENTS.md → .codex/skills/graphify/SKILL.md
- `Development Compose Profile` --implements--> `Base Docker Compose Stack`  [INFERRED]
  docker-compose.dev.yml → docker-compose.yml
- `DOCKER-USER LAN Guard` --conceptually_related_to--> `Home Tunnel Compose Profile`  [INFERRED]
  deploy/host-firewall/README.md → docker-compose.home-tunnel.yml
- `Home Tunnel Compose Profile` --implements--> `Base Docker Compose Stack`  [INFERRED]
  docker-compose.home-tunnel.yml → docker-compose.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **UtilityDev Runtime Stack** — docker_compose_postgresql_service, docker_compose_redis_service, docker_compose_django_backend_service, docker_compose_celery_worker_service, docker_compose_nextjs_frontend_service [EXTRACTED 1.00]
- **Graphify Extraction and Navigation Workflow** — _codex_skills_graphify_skill_graphify_pipeline, _codex_skills_graphify_skill_semantic_extraction, _codex_skills_graphify_references_query_graph_query, _codex_skills_graphify_references_update_incremental_update [INFERRED 0.95]
- **Secure Phased Home Release** — deploy_host_firewall_readme_host_firewall_runbook, deploy_phase6_readme_gradual_publication_runbook, deploy_phase7_readme_security_test_runbook, deploy_phase8_readme_continuous_ops_runbook [EXTRACTED 1.00]
- **Ambientes de implantação configuráveis** — docs_backend_01_base_django_docker_monolito_django_modular, docs_backend_07_deploy_overrides_por_ambiente, docs_backend_11_docker_contexto_servicos_docker_base, docs_backend_12_servidor_upgrade_capacidade_dos_ambientes, docs_backend_13_backend_escalavel_backend_configuravel [EXTRACTED 1.00]
- **Proteção de jobs anônimos** — docs_backend_03_app_transcriptions_acesso_anonimo_por_uuid_e_segredo, docs_backend_04_api_backend_protecao_anonima_em_camadas, docs_backend_13_backend_escalavel_controles_de_visitantes, docs_backend_14_conversao_documentos_documentconversion, docs_frontend_10_autenticacao_e_proxy_credencial_anonima_em_sessionstorage [INFERRED 0.95]
- **Ferramentas processadas integralmente no navegador** — docs_issues_002_juntar_pdfs_mesclagem_no_navegador_com_pdf_lib, docs_issues_003_imagens_para_pdf_geracao_local_com_canvas_e_pdf_lib, docs_issues_005_sorteador_aleatoriedade_criptografica_local, docs_issues_006_ordem_de_apresentacao_fisher_yates_criptografico, docs_issues_007_divisor_de_grupos_distribuicao_round_robin_balanceada, docs_issues_008_gerador_de_qr_code_qr_code_local_png_svg, docs_issues_010_gravador_de_tela_mediarecorder_local [EXTRACTED 1.00]
- **Pipeline Assíncrono de Mídia** — docs_issues_011_gerador_de_legendas_gerador_legendas, docs_issues_012_cortar_video_corte_video, docs_requisitos_01_arquitetura_workers_separados, docs_requisitos_03_funcionalidades_regras_de_negocio_transcriptionjob [INFERRED 0.95]
- **Fronteira Segura do n8n** — docs_requisitos_05_automacao_n8n_orquestracao_auxiliar, docs_requisitos_05_automacao_n8n_integracao_por_api, docs_requisitos_06_seguranca_webhooks_uploads, docs_requisitos_06_seguranca_isolamento_bancos [INFERRED 0.95]
- **Fantasy Night Composition** — frontend_public_fundo12_armored_knight, frontend_public_fundo12_moonlit_mountains, frontend_public_fundo12_campfire [EXTRACTED 1.00]
- **Heavenly Architecture Composition** — frontend_public_fundo15_gothic_castle, frontend_public_fundo15_cloud_sea, frontend_public_fundo15_sunlit_sky [EXTRACTED 1.00]
- **Dark Fantasy Journey Composition** — frontend_public_fundo5_resting_knight, frontend_public_fundo5_gothic_citadel, frontend_public_fundo5_crescent_night [EXTRACTED 1.00]
- **Sacred Warrior Composition** — frontend_public_fundo8_armored_woman, frontend_public_fundo8_golden_halo, frontend_public_fundo8_cloud_castle [EXTRACTED 1.00]

## Communities (109 total, 38 thin omitted)

### Community 0 - "Transcription Backend"
Cohesion: 0.06
Nodes (54): AnonymousSessionAdmin, AudioAdmin, DailyTranscriptionBudgetAdmin, register, TranscricaoAdmin, TranscriptionArtifactAdmin, Migration, AnonymousSession (+46 more)

### Community 1 - "Document Conversion API"
Cohesion: 0.07
Nodes (40): DocumentConversionSerializer, Meta, _authorized_job(), DocumentConversionClaimView, DocumentConversionCreateView, DocumentConversionDetailView, DocumentConversionDownloadView, _not_found() (+32 more)

### Community 2 - "Grouping Presentation Tools"
Cohesion: 0.07
Nodes (40): metadata, metadata, GroupDividerWorkspace(), changeMode(), clearResult(), divideGroups(), resetWorkspace(), updateParticipants() (+32 more)

### Community 3 - "Document Data Models"
Cohesion: 0.08
Nodes (30): DocumentConversionAdmin, register, Migration, DocumentConversion, DocumentConversionCapacity, Meta, Operation, Status (+22 more)

### Community 4 - "Anonymous API Proxy"
Cohesion: 0.05
Nodes (43): dynamic, GET(), RouteContext, runtime, DELETE, dynamic, GET, PATCH (+35 more)

### Community 5 - "Image to PDF"
Cohesion: 0.08
Nodes (42): metadata, canvasToBlob(), DecodedImage, decodeImage(), formatBytes(), ImageItem, ImageToPdfWorkspace(), addFiles() (+34 more)

### Community 6 - "API Integration Tests"
Cohesion: 0.06
Nodes (13): DocumentConversionApiTests, override_settings, TestCase, _configuration_hash(), override_settings, TestCase, TranscriptionApiTests, override_settings (+5 more)

### Community 7 - "Conversion Transcription Pages"
Cohesion: 0.07
Nodes (28): metadata, metadata, AnonymousContext, DocumentJob, fetchDocumentJob(), formatBytes(), JobStatus, PdfDocxConverter() (+20 more)

### Community 8 - "Media Subtitle Features"
Cohesion: 0.06
Nodes (37): Issue: Gerador de Legendas SRT/VTT, Geração Sob Demanda sem Cópias Permanentes, Gerador de Legendas SRT/VTT, Segmentação de Legendas, Timestamps Canônicos no TranscriptionArtifact, Especificação W3C WebVTT, Corte de Vídeo Assíncrono, Issue: Corte de Vídeo (+29 more)

### Community 9 - "Homepage Backend Status"
Cohesion: 0.08
Nodes (20): BackendStatus(), DevSection(), devTools, Hero(), SectionHeader(), SectionHeaderProps, ToolCard(), ToolCardProps (+12 more)

### Community 10 - "PDF Merge Tool"
Cohesion: 0.10
Nodes (22): metadata, formatBytes(), isPdf(), PdfFirstPage(), PdfItem, PdfMergeWorkspace(), addFiles(), downloadMergedPdf() (+14 more)

### Community 11 - "Random Draw Tool"
Cohesion: 0.14
Nodes (22): metadata, DrawMode, RandomDrawWorkspace(), changeMode(), clearFeedback(), executeDraw(), resetDraw(), drawItems() (+14 more)

### Community 12 - "TypeScript Compiler Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+20 more)

### Community 13 - "Backend Architecture Docs"
Cohesion: 0.07
Nodes (28): Backend privado acessado via Next.js, Base do backend: Django e Docker, Filas Celery media, provider e maintenance, Monólito Django modular, API de conversão de documentos, API do backend, Autenticação por sessão e CSRF, Proteção anônima em camadas (+20 more)

### Community 14 - "QR Code Generator"
Cohesion: 0.15
Nodes (18): metadata, contentTypes, initialWifi, QrCodeGenerator(), changeContentType(), generateQrCode(), invalidatePreview(), resetGenerator() (+10 more)

### Community 15 - "Account Serialization"
Cohesion: 0.17
Nodes (12): DeleteAccountSerializer, Meta, UpdateProfileSerializer, UserSerializer, AvatarView, CsrfView, DeleteAccountView, LoginView (+4 more)

### Community 16 - "UI Runtime Dependencies"
Cohesion: 0.11
Nodes (19): @base-ui/react, class-variance-authority, clsx, dependencies, @base-ui/react, class-variance-authority, clsx, lucide-react (+11 more)

### Community 17 - "Deployment Security Operations"
Cohesion: 0.12
Nodes (19): DOCKER-USER LAN Guard, Home Server Firewall Runbook, Home Tunnel Deployment Plan, Trusted Proxy IP Normalization, Gradual Publication Runbook, Deployment Soak Monitor, Isolated PostgreSQL Restore Test, Mandatory Security Test Runbook (+11 more)

### Community 18 - "Frontend Build Dependencies"
Cohesion: 0.11
Nodes (19): devDependencies, jsqr, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/qrcode, @types/react (+11 more)

### Community 19 - "Transcription Pipeline Docs"
Cohesion: 0.12
Nodes (18): Acesso anônimo por UUID e segredo, App de transcrições, Conclusão por polling ou webhook, Deduplicação por áudio e configuração, Pipeline de transcrição, Storage materializável em caminho temporário, Deploy, Overrides Compose por ambiente (+10 more)

### Community 20 - "Application Shell Layout"
Cohesion: 0.15
Nodes (10): geistMono, metadata, viewport, AppShell(), domains, isToolActive(), applyTheme(), getDocumentTheme() (+2 more)

### Community 21 - "Frontend Module Aliases"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 22 - "Frontend Architecture Docs"
Cohesion: 0.12
Nodes (16): AppShell global, Contexto do Frontend Atual, Divisão local de grupos, Geração local de QR Code, Imagens para PDF no navegador, Mesclagem local de PDFs, Ordem de apresentação local, Stack Next.js, React, TypeScript e Tailwind (+8 more)

### Community 23 - "Profile Settings"
Cohesion: 0.18
Nodes (8): metadata, ProfileData, ProfileSettings(), getCsrf(), handleAvatarRemove(), handleAvatarUpload(), handleDeleteAccount(), handleSave()

### Community 24 - "Account API Tests"
Cohesion: 0.17
Nodes (3): AccountApiTests, override_settings, TestCase

### Community 25 - "Graphify Documentation"
Cohesion: 0.24
Nodes (11): URL Ingestion and Folder Watching, Optional Graph Exports, Semantic Extraction Contract, Repository Clone and Graph Merge, Graphify Commit and Claude Hooks, Graph Query, Path, and Explain Workflow, Whisper Media Transcription, Incremental Graph Update (+3 more)

### Community 26 - "Docker Runtime Stack"
Cohesion: 0.20
Nodes (10): Backend Python Dependency Stack, Celery Beat Service, Celery Worker Service, Django Backend Service, Internal Caddy Service, Cloudflared Tunnel Service, Next.js Frontend Service, PostgreSQL Service (+2 more)

### Community 27 - "Package Metadata"
Cohesion: 0.20
Nodes (9): name, postcss, sharp, packageManager, pnpm, overrides, private, type (+1 more)

### Community 29 - "Frontend Build Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test

### Community 30 - "User Profile Model"
Cohesion: 0.40
Nodes (3): create_user_profile(), Profile, receiver

### Community 32 - "Backup Restore Testing"
Cohesion: 0.50
Nodes (3): utileazy-backup-restore-test script, fail(), RESTIC_CACHE_DIR

### Community 33 - "Deployment Soak Monitoring"
Cohesion: 0.83
Nodes (3): utileazy-soak-snapshot script, numeric_or_zero(), warn()

### Community 34 - "Backup Execution"
Cohesion: 0.67
Nodes (3): utileazy-backup script, fail(), RESTIC_CACHE_DIR

### Community 35 - "Backup Maintenance"
Cohesion: 0.67
Nodes (3): utileazy-backup-maintenance script, fail(), RESTIC_CACHE_DIR

### Community 36 - "Database Design Docs"
Cohesion: 0.50
Nodes (4): Arquivos temporários fora do banco, Banco de dados atual, Capacidade e orçamento com locks transacionais, PostgreSQL como fonte definitiva

### Community 37 - "Backend Context Docs"
Cohesion: 0.50
Nodes (4): Arquitetura backend do Utileazy, Contexto atual do backend, Fluxo assíncrono de jobs, Isolamento de propriedade dos jobs

### Community 38 - "Randomization Features"
Cohesion: 0.50
Nodes (4): Aleatoriedade criptográfica local, Implementar sorteador de números e itens, Fisher-Yates com fonte criptográfica, Implementar ordem de apresentação

### Community 39 - "Repository Publication Security"
Cohesion: 0.50
Nodes (4): Auditoria de Segredos, Auditoria para Publicação do Repositório, Rotação da Chave AssemblyAI, Dependabot Secret Scanning e Push Protection

### Community 40 - "Moonlit Knight Scene"
Cohesion: 0.50
Nodes (4): Resting Armored Knight, Rocky Campsite Fire, Moonlit Armored Knight Landscape, Moonlit Mountain Valley

### Community 41 - "Nocturnal Castle Scene"
Cohesion: 0.50
Nodes (4): Blue Nocturnal Castle Landscape, Crescent Moon, Dark Flower Fields, Gothic Castle

### Community 42 - "Celestial Castle Scene"
Cohesion: 0.50
Nodes (4): Celestial Gothic Castle Above Clouds, Sea of Bright Clouds, Monumental Gothic Fantasy Castle, Warm Sunlit Sky

### Community 43 - "Resting Knight Scene"
Cohesion: 0.50
Nodes (4): Armored Knight, Gothic Castle, Resting Knight and Distant Castle, Sword Beside a Tree

### Community 44 - "Dark Knight Scene"
Cohesion: 0.50
Nodes (4): Crescent Moon Mountain Night, Monochrome Dark Knight and Distant Citadel, Distant Gothic Citadel, Resting Armored Knight Beneath Tree

### Community 45 - "Haloed Warrior Scene"
Cohesion: 0.50
Nodes (4): Armored Warrior, Golden Halo, Haloed Warrior Before Gothic Castle, Nocturnal Gothic Castle

### Community 46 - "Celestial Warrior Scene"
Cohesion: 0.50
Nodes (4): Regal Armored Woman with Sword, Celestial Armored Woman Before Cloud Castle, Sunlit Gothic Castle Above Clouds, Radiant Golden Halo

### Community 47 - "Monochrome Castle Scene"
Cohesion: 0.50
Nodes (4): Crescent Moon, Dark Moonlit Gothic Castle Landscape, Gothic Castle, Monochrome Fantasy Landscape

### Community 56 - "Frontend Proxy Flows"
Cohesion: 0.67
Nodes (3): Conversão documental assíncrona no frontend, Interface de transcrição, Proxy same-origin do Next.js

### Community 57 - "YouTube Download Evaluation"
Cohesion: 0.67
Nodes (3): Decisão go ou no-go, Avaliar download autorizado do YouTube, Downloader restrito com yt-dlp

### Community 58 - "Speed Test Feature"
Cohesion: 0.67
Nodes (3): Corpos de teste fora de Django e Next, LibreSpeed em serviço dedicado, Implementar teste de velocidade

### Community 59 - "Screen Recorder Feature"
Cohesion: 0.67
Nodes (3): Detecção real da disponibilidade de áudio, Implementar gravador de tela com áudio, Gravação local com MediaRecorder

### Community 62 - "Dark App Icon"
Cohesion: 0.67
Nodes (3): Black Angular Monogram Icon, Light Circular Background, Stylized Lettermark

### Community 63 - "Placeholder Brand Logo"
Cohesion: 0.67
Nodes (3): Acme Inc. Placeholder Logo, Acme Inc. Wordmark, Angular Geometric Emblem

### Community 64 - "Placeholder Triangle Logo"
Cohesion: 0.67
Nodes (3): Dotted Triangular Connections, Three Circular Nodes, Three-Node Triangle Logo

## Knowledge Gaps
- **297 isolated node(s):** `Migration`, `Meta`, `Migration`, `Status`, `Operation` (+292 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Transcricao` connect `Transcription Backend` to `Document Conversion API`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `CaptchaError` connect `Document Conversion API` to `API Integration Tests`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 22 inferred relationships involving `Transcricao` (e.g. with `TranscricaoSerializer` and `_apply_legacy_provider_result()`) actually correct?**
  _`Transcricao` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `DocumentConversion` (e.g. with `DocumentConversionSerializer` and `convert_document()`) actually correct?**
  _`DocumentConversion` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `process_transcription()` (e.g. with `Audio` and `Transcricao`) actually correct?**
  _`process_transcription()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Migration`, `Meta`, `Migration` to the rest of the system?**
  _297 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Transcription Backend` be split into smaller, more focused modules?**
  _Cohesion score 0.06458941901979877 - nodes in this community are weakly interconnected._