# Graph Report - utileazy  (2026-08-31)

## Corpus Check
- 193 files · ~1,098,397 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1125 nodes · 1739 edges · 104 communities (71 shown, 33 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 124 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c878efcc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transcriptions/tasks.py
- transcriptions/views.py
- group-divider.ts
- DocumentConversion
- backend-proxy.ts
- image-to-pdf.ts
- .patch
- transcricao/upload-area.tsx
- Gerador de Legendas SRT/VTT
- app/page.tsx
- pdf-merge-workspace.tsx
- sorteador.ts
- compilerOptions
- API do backend
- qr-code-generator.tsx
- UserSerializer
- dependencies
- Home Tunnel Deployment Plan
- devDependencies
- Pipeline de transcrição
- layout.tsx
- components.json
- Contexto do Frontend Atual
- ProfileSettings
- AccountApiTests
- Graphify Knowledge Graph Pipeline
- Django Backend Service
- Q: Use o Graphify para investigar por que Transcricao conecta Transcription Backend com Document Conversion API.
- login/page.tsx
- Q: Isso teria muito impacto em leituras futuras ou é melhor consertar o acoplamento?
- accounts/models.py
- HealthCheckView
- utileazy-backup-restore-test
- utileazy-soak-snapshot
- utileazy-backup
- utileazy-backup-maintenance
- PostgreSQL como fonte definitiva
- Arquitetura backend do Utileazy
- Aleatoriedade criptográfica local
- Auditoria para Publicação do Repositório
- Moonlit Armored Knight Landscape
- Blue Nocturnal Castle Landscape
- Celestial Gothic Castle Above Clouds
- Resting Knight and Distant Castle
- Monochrome Dark Knight and Distant Citadel
- Haloed Warrior Before Gothic Castle
- Celestial Armored Woman Before Cloud Castle
- Dark Moonlit Gothic Castle Landscape
- AccountsConfig
- CommonConfig
- DocumentsConfig
- TranscriptionsConfig
- 0002_transcription_pipeline.py
- 0003_ownership_and_storage.py
- test-postgres-restore
- utileazy-security-audit
- Proxy same-origin do Next.js
- Avaliar download autorizado do YouTube
- LibreSpeed em serviço dedicado
- Gravação local com MediaRecorder
- constellation-canvas.tsx
- postcss.config.mjs
- Black Angular Monogram Icon
- Acme Inc. Placeholder Logo
- Three-Node Triangle Logo
- accounts/migrations/0001_initial.py
- transcriptions/migrations/0001_initial.py
- 0004_anonymous_access_and_artifacts.py
- compose-home-tunnel.sh
- utileazy-docker-lan-guard
- test-webhook-auth
- utileazy-send-alert
- Exclusividade de ator da transcrição
- next.config.mjs
- next-env.d.ts
- White Geometric U2 Mark
- Armored Knight Resting at a Mountain Overlook
- Haloed Armored Woman Before a Gothic Castle
- Dark Knight and Castle Landscape
- Resting Knight Facing a Gothic Mountain Castle
- Adaptive UtilityDev Icon
- Abstract Monochrome Logo Mark
- Centered Concentric Circle Mark
- Single-Pixel Light Gray Placeholder
- Generic User Avatar Placeholder
- pdfjs-dist-webpack.d.ts

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
- `DOCKER-USER LAN Guard` --conceptually_related_to--> `Home Tunnel Compose Profile`  [INFERRED]
  deploy/host-firewall/README.md → docker-compose.home-tunnel.yml
- `Development Compose Profile` --implements--> `Base Docker Compose Stack`  [INFERRED]
  docker-compose.dev.yml → docker-compose.yml
- `Home Server Resource Profile` --implements--> `Base Docker Compose Stack`  [INFERRED]
  docker-compose.home.yml → docker-compose.yml
- `Home Tunnel Compose Profile` --implements--> `Base Docker Compose Stack`  [INFERRED]
  docker-compose.home-tunnel.yml → docker-compose.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ambientes de implantação configuráveis** — docs_backend_01_base_django_docker_monolito_django_modular, docs_backend_07_deploy_overrides_por_ambiente, docs_backend_11_docker_contexto_servicos_docker_base, docs_backend_12_servidor_upgrade_capacidade_dos_ambientes, docs_backend_13_backend_escalavel_backend_configuravel [EXTRACTED 1.00]
- **Ferramentas processadas integralmente no navegador** — docs_issues_002_juntar_pdfs_mesclagem_no_navegador_com_pdf_lib, docs_issues_003_imagens_para_pdf_geracao_local_com_canvas_e_pdf_lib, docs_issues_005_sorteador_aleatoriedade_criptografica_local, docs_issues_006_ordem_de_apresentacao_fisher_yates_criptografico, docs_issues_007_divisor_de_grupos_distribuicao_round_robin_balanceada, docs_issues_008_gerador_de_qr_code_qr_code_local_png_svg, docs_issues_010_gravador_de_tela_mediarecorder_local [EXTRACTED 1.00]
- **Fantasy Night Composition** — frontend_public_fundo12_armored_knight, frontend_public_fundo12_moonlit_mountains, frontend_public_fundo12_campfire [EXTRACTED 1.00]
- **Heavenly Architecture Composition** — frontend_public_fundo15_gothic_castle, frontend_public_fundo15_cloud_sea, frontend_public_fundo15_sunlit_sky [EXTRACTED 1.00]
- **Dark Fantasy Journey Composition** — frontend_public_fundo5_resting_knight, frontend_public_fundo5_gothic_citadel, frontend_public_fundo5_crescent_night [EXTRACTED 1.00]
- **Sacred Warrior Composition** — frontend_public_fundo8_armored_woman, frontend_public_fundo8_golden_halo, frontend_public_fundo8_cloud_castle [EXTRACTED 1.00]
- **Secure Phased Home Release** — deploy_host_firewall_readme_host_firewall_runbook, deploy_phase6_readme_gradual_publication_runbook, deploy_phase7_readme_security_test_runbook, deploy_phase8_readme_continuous_ops_runbook [EXTRACTED 1.00]
- **UtilityDev Runtime Stack** — docker_compose_postgresql_service, docker_compose_redis_service, docker_compose_django_backend_service, docker_compose_celery_worker_service, docker_compose_nextjs_frontend_service [EXTRACTED 1.00]
- **Fronteira Segura do n8n** — docs_requisitos_05_automacao_n8n_orquestracao_auxiliar, docs_requisitos_05_automacao_n8n_integracao_por_api, docs_requisitos_06_seguranca_webhooks_uploads, docs_requisitos_06_seguranca_isolamento_bancos [INFERRED 0.95]
- **Graphify Extraction and Navigation Workflow** — _codex_skills_graphify_skill_graphify_pipeline, _codex_skills_graphify_skill_semantic_extraction, _codex_skills_graphify_references_query_graph_query, _codex_skills_graphify_references_update_incremental_update [INFERRED 0.95]
- **Pipeline Assíncrono de Mídia** — docs_issues_011_gerador_de_legendas_gerador_legendas, docs_issues_012_cortar_video_corte_video, docs_requisitos_01_arquitetura_workers_separados, docs_requisitos_03_funcionalidades_regras_de_negocio_transcriptionjob [INFERRED 0.95]
- **Proteção de jobs anônimos** — docs_backend_03_app_transcriptions_acesso_anonimo_por_uuid_e_segredo, docs_backend_04_api_backend_protecao_anonima_em_camadas, docs_backend_13_backend_escalavel_controles_de_visitantes, docs_backend_14_conversao_documentos_documentconversion, docs_frontend_10_autenticacao_e_proxy_credencial_anonima_em_sessionstorage [INFERRED 0.95]

## Communities (104 total, 33 thin omitted)

### Community 0 - "transcriptions/tasks.py"
Cohesion: 0.07
Nodes (53): AnonymousSessionAdmin, AudioAdmin, DailyTranscriptionBudgetAdmin, register, TranscricaoAdmin, TranscriptionArtifactAdmin, Migration, Audio (+45 more)

### Community 1 - "transcriptions/views.py"
Cohesion: 0.09
Nodes (34): Anonymous access helpers shared by backend applications., AnonymousAccessError, CaptchaError, consume_rate_limit(), create_anonymous_session(), enforce_anonymous_burst_limit(), enforce_anonymous_rate_limits(), generate_secret() (+26 more)

### Community 2 - "group-divider.ts"
Cohesion: 0.07
Nodes (40): metadata, metadata, GroupDividerWorkspace(), changeMode(), clearResult(), divideGroups(), resetWorkspace(), updateParticipants() (+32 more)

### Community 3 - "DocumentConversion"
Cohesion: 0.06
Nodes (44): delete_storage_file(), materialize_storage_file(), Exception, Storage helpers shared by document and transcription pipelines., Raised when local storage is required but unavailable., Yield a local path for either filesystem or remote Django storage., save_local_file(), storage_path() (+36 more)

### Community 4 - "backend-proxy.ts"
Cohesion: 0.05
Nodes (43): dynamic, GET(), RouteContext, runtime, DELETE, dynamic, GET, PATCH (+35 more)

### Community 5 - "image-to-pdf.ts"
Cohesion: 0.08
Nodes (42): metadata, canvasToBlob(), DecodedImage, decodeImage(), formatBytes(), ImageItem, ImageToPdfWorkspace(), addFiles() (+34 more)

### Community 6 - ".patch"
Cohesion: 0.05
Nodes (16): DocumentConversionApiTests, override_settings, TestCase, DocumentConversionTaskTests, override_settings, TestCase, _configuration_hash(), override_settings (+8 more)

### Community 7 - "transcricao/upload-area.tsx"
Cohesion: 0.07
Nodes (28): metadata, metadata, AnonymousContext, DocumentJob, fetchDocumentJob(), formatBytes(), JobStatus, PdfDocxConverter() (+20 more)

### Community 8 - "Gerador de Legendas SRT/VTT"
Cohesion: 0.06
Nodes (37): Issue: Gerador de Legendas SRT/VTT, Geração Sob Demanda sem Cópias Permanentes, Gerador de Legendas SRT/VTT, Segmentação de Legendas, Timestamps Canônicos no TranscriptionArtifact, Especificação W3C WebVTT, Corte de Vídeo Assíncrono, Issue: Corte de Vídeo (+29 more)

### Community 9 - "app/page.tsx"
Cohesion: 0.08
Nodes (20): BackendStatus(), DevSection(), devTools, Hero(), SectionHeader(), SectionHeaderProps, ToolCard(), ToolCardProps (+12 more)

### Community 10 - "pdf-merge-workspace.tsx"
Cohesion: 0.10
Nodes (22): metadata, formatBytes(), isPdf(), PdfFirstPage(), PdfItem, PdfMergeWorkspace(), addFiles(), downloadMergedPdf() (+14 more)

### Community 11 - "sorteador.ts"
Cohesion: 0.14
Nodes (22): metadata, DrawMode, RandomDrawWorkspace(), changeMode(), clearFeedback(), executeDraw(), resetDraw(), drawItems() (+14 more)

### Community 12 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+20 more)

### Community 13 - "API do backend"
Cohesion: 0.07
Nodes (28): Backend privado acessado via Next.js, Base do backend: Django e Docker, Filas Celery media, provider e maintenance, Monólito Django modular, API de conversão de documentos, API do backend, Autenticação por sessão e CSRF, Proteção anônima em camadas (+20 more)

### Community 14 - "qr-code-generator.tsx"
Cohesion: 0.15
Nodes (18): metadata, contentTypes, initialWifi, QrCodeGenerator(), changeContentType(), generateQrCode(), invalidatePreview(), resetGenerator() (+10 more)

### Community 15 - "UserSerializer"
Cohesion: 0.17
Nodes (12): DeleteAccountSerializer, Meta, UpdateProfileSerializer, UserSerializer, AvatarView, CsrfView, DeleteAccountView, LoginView (+4 more)

### Community 16 - "dependencies"
Cohesion: 0.07
Nodes (29): @base-ui/react, class-variance-authority, clsx, dependencies, @base-ui/react, class-variance-authority, clsx, lucide-react (+21 more)

### Community 17 - "Home Tunnel Deployment Plan"
Cohesion: 0.12
Nodes (19): DOCKER-USER LAN Guard, Home Server Firewall Runbook, Home Tunnel Deployment Plan, Trusted Proxy IP Normalization, Gradual Publication Runbook, Deployment Soak Monitor, Isolated PostgreSQL Restore Test, Mandatory Security Test Runbook (+11 more)

### Community 18 - "devDependencies"
Cohesion: 0.06
Nodes (34): devDependencies, jsqr, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/qrcode, @types/react (+26 more)

### Community 19 - "Pipeline de transcrição"
Cohesion: 0.12
Nodes (18): Acesso anônimo por UUID e segredo, App de transcrições, Conclusão por polling ou webhook, Deduplicação por áudio e configuração, Pipeline de transcrição, Storage materializável em caminho temporário, Deploy, Overrides Compose por ambiente (+10 more)

### Community 20 - "layout.tsx"
Cohesion: 0.15
Nodes (10): geistMono, metadata, viewport, AppShell(), domains, isToolActive(), applyTheme(), getDocumentTheme() (+2 more)

### Community 21 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 22 - "Contexto do Frontend Atual"
Cohesion: 0.12
Nodes (16): AppShell global, Contexto do Frontend Atual, Divisão local de grupos, Geração local de QR Code, Imagens para PDF no navegador, Mesclagem local de PDFs, Ordem de apresentação local, Stack Next.js, React, TypeScript e Tailwind (+8 more)

### Community 23 - "ProfileSettings"
Cohesion: 0.18
Nodes (8): metadata, ProfileData, ProfileSettings(), getCsrf(), handleAvatarRemove(), handleAvatarUpload(), handleDeleteAccount(), handleSave()

### Community 24 - "AccountApiTests"
Cohesion: 0.17
Nodes (3): AccountApiTests, override_settings, TestCase

### Community 25 - "Graphify Knowledge Graph Pipeline"
Cohesion: 0.24
Nodes (11): URL Ingestion and Folder Watching, Optional Graph Exports, Semantic Extraction Contract, Repository Clone and Graph Merge, Graphify Commit and Claude Hooks, Graph Query, Path, and Explain Workflow, Whisper Media Transcription, Incremental Graph Update (+3 more)

### Community 26 - "Django Backend Service"
Cohesion: 0.20
Nodes (10): Backend Python Dependency Stack, Celery Beat Service, Celery Worker Service, Django Backend Service, Internal Caddy Service, Cloudflared Tunnel Service, Next.js Frontend Service, PostgreSQL Service (+2 more)

### Community 27 - "Q: Use o Graphify para investigar por que Transcricao conecta Transcription Backend com Document Conversion API."
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Use o Graphify para investigar por que Transcricao conecta Transcription Backend com Document Conversion API., Source Nodes

### Community 29 - "Q: Isso teria muito impacto em leituras futuras ou é melhor consertar o acoplamento?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Isso teria muito impacto em leituras futuras ou é melhor consertar o acoplamento?, Source Nodes

### Community 30 - "accounts/models.py"
Cohesion: 0.40
Nodes (3): create_user_profile(), Profile, receiver

### Community 32 - "utileazy-backup-restore-test"
Cohesion: 0.50
Nodes (3): utileazy-backup-restore-test script, fail(), RESTIC_CACHE_DIR

### Community 33 - "utileazy-soak-snapshot"
Cohesion: 0.83
Nodes (3): utileazy-soak-snapshot script, numeric_or_zero(), warn()

### Community 34 - "utileazy-backup"
Cohesion: 0.67
Nodes (3): utileazy-backup script, fail(), RESTIC_CACHE_DIR

### Community 35 - "utileazy-backup-maintenance"
Cohesion: 0.67
Nodes (3): utileazy-backup-maintenance script, fail(), RESTIC_CACHE_DIR

### Community 36 - "PostgreSQL como fonte definitiva"
Cohesion: 0.50
Nodes (4): Arquivos temporários fora do banco, Banco de dados atual, Capacidade e orçamento com locks transacionais, PostgreSQL como fonte definitiva

### Community 37 - "Arquitetura backend do Utileazy"
Cohesion: 0.50
Nodes (4): Arquitetura backend do Utileazy, Contexto atual do backend, Fluxo assíncrono de jobs, Isolamento de propriedade dos jobs

### Community 38 - "Aleatoriedade criptográfica local"
Cohesion: 0.50
Nodes (4): Aleatoriedade criptográfica local, Implementar sorteador de números e itens, Fisher-Yates com fonte criptográfica, Implementar ordem de apresentação

### Community 39 - "Auditoria para Publicação do Repositório"
Cohesion: 0.50
Nodes (4): Auditoria de Segredos, Auditoria para Publicação do Repositório, Rotação da Chave AssemblyAI, Dependabot Secret Scanning e Push Protection

### Community 40 - "Moonlit Armored Knight Landscape"
Cohesion: 0.50
Nodes (4): Resting Armored Knight, Rocky Campsite Fire, Moonlit Armored Knight Landscape, Moonlit Mountain Valley

### Community 41 - "Blue Nocturnal Castle Landscape"
Cohesion: 0.50
Nodes (4): Blue Nocturnal Castle Landscape, Crescent Moon, Dark Flower Fields, Gothic Castle

### Community 42 - "Celestial Gothic Castle Above Clouds"
Cohesion: 0.50
Nodes (4): Celestial Gothic Castle Above Clouds, Sea of Bright Clouds, Monumental Gothic Fantasy Castle, Warm Sunlit Sky

### Community 43 - "Resting Knight and Distant Castle"
Cohesion: 0.50
Nodes (4): Armored Knight, Gothic Castle, Resting Knight and Distant Castle, Sword Beside a Tree

### Community 44 - "Monochrome Dark Knight and Distant Citadel"
Cohesion: 0.50
Nodes (4): Crescent Moon Mountain Night, Monochrome Dark Knight and Distant Citadel, Distant Gothic Citadel, Resting Armored Knight Beneath Tree

### Community 45 - "Haloed Warrior Before Gothic Castle"
Cohesion: 0.50
Nodes (4): Armored Warrior, Golden Halo, Haloed Warrior Before Gothic Castle, Nocturnal Gothic Castle

### Community 46 - "Celestial Armored Woman Before Cloud Castle"
Cohesion: 0.50
Nodes (4): Regal Armored Woman with Sword, Celestial Armored Woman Before Cloud Castle, Sunlit Gothic Castle Above Clouds, Radiant Golden Halo

### Community 47 - "Dark Moonlit Gothic Castle Landscape"
Cohesion: 0.50
Nodes (4): Crescent Moon, Dark Moonlit Gothic Castle Landscape, Gothic Castle, Monochrome Fantasy Landscape

### Community 56 - "Proxy same-origin do Next.js"
Cohesion: 0.67
Nodes (3): Conversão documental assíncrona no frontend, Interface de transcrição, Proxy same-origin do Next.js

### Community 57 - "Avaliar download autorizado do YouTube"
Cohesion: 0.67
Nodes (3): Decisão go ou no-go, Avaliar download autorizado do YouTube, Downloader restrito com yt-dlp

### Community 58 - "LibreSpeed em serviço dedicado"
Cohesion: 0.67
Nodes (3): Corpos de teste fora de Django e Next, LibreSpeed em serviço dedicado, Implementar teste de velocidade

### Community 59 - "Gravação local com MediaRecorder"
Cohesion: 0.67
Nodes (3): Detecção real da disponibilidade de áudio, Implementar gravador de tela com áudio, Gravação local com MediaRecorder

### Community 62 - "Black Angular Monogram Icon"
Cohesion: 0.67
Nodes (3): Black Angular Monogram Icon, Light Circular Background, Stylized Lettermark

### Community 63 - "Acme Inc. Placeholder Logo"
Cohesion: 0.67
Nodes (3): Acme Inc. Placeholder Logo, Acme Inc. Wordmark, Angular Geometric Emblem

### Community 64 - "Three-Node Triangle Logo"
Cohesion: 0.67
Nodes (3): Dotted Triangular Connections, Three Circular Nodes, Three-Node Triangle Logo

## Knowledge Gaps
- **303 isolated node(s):** `Migration`, `Meta`, `Migration`, `Status`, `Operation` (+298 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CaptchaError` connect `transcriptions/views.py` to `DocumentConversion`, `.patch`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `hash_secret()` connect `transcriptions/views.py` to `DocumentConversion`, `.patch`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 22 inferred relationships involving `Transcricao` (e.g. with `TranscricaoSerializer` and `_apply_legacy_provider_result()`) actually correct?**
  _`Transcricao` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `DocumentConversion` (e.g. with `DocumentConversionSerializer` and `convert_document()`) actually correct?**
  _`DocumentConversion` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `process_transcription()` (e.g. with `Audio` and `Transcricao`) actually correct?**
  _`process_transcription()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `hash_secret()` (e.g. with `_authorized_job()` and `.post()`) actually correct?**
  _`hash_secret()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Migration`, `Meta`, `Migration` to the rest of the system?**
  _303 weakly-connected nodes found - possible documentation gaps or missing edges._