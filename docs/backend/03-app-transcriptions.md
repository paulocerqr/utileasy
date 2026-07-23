# App de transcrições

## Objetivo

`apps.transcriptions` recebe áudio ou vídeo de uma conta ou visitante, cria um job,
normaliza a faixa principal com FFmpeg, deduplica o artefato globalmente, envia
material novo à AssemblyAI e disponibiliza texto e PDF com autorização por ator.

Para conta, a leitura exige propriedade. Para visitante, exige UUID e o segredo
adicional do job; conhecer somente um deles não concede acesso.

## Estrutura

```text
apps/transcriptions/
├── admin.py
├── anonymous.py
├── models.py
├── serializers.py
├── views.py
├── webhooks.py
├── urls.py
├── services.py
├── tasks.py
├── pdf.py
├── providers/assemblyai.py
├── migrations/
│   ├── 0001_initial.py
│   ├── 0002_transcription_pipeline.py
│   ├── 0003_ownership_and_storage.py
│   └── 0004_anonymous_access_and_artifacts.py
└── tests/
    ├── test_api.py
    ├── test_tasks.py
    └── test_webhooks.py
```

## Modelos

### Audio

Guarda metadados da representação MP3 canônica: duração, formato, SHA-256, nome
lógico, tamanho e criação. O hash é único.

### Transcricao

Campos centrais:

```text
public_id
owner
anonymous_session
access_token_hash
expira_em
audio
artifact
duplicate_of
nome_original
tipo_origem
arquivo_temporario
arquivo_processado
status
provider
provider_transcription_id
texto_transcricao
error_message
timestamps
```

`duplicate_of` permanece para dados legados. Jobs novos recebem um
`TranscriptionArtifact`, que contém somente o resultado técnico compartilhável e não
expõe o job ou metadados de outro usuário.

### AnonymousSession, TranscriptionArtifact e DailyTranscriptionBudget

`AnonymousSession` guarda apenas hash do cookie e expiração. `TranscriptionArtifact`
é único por áudio/configuração e centraliza resultado do provider. O orçamento diário
guarda segundos reservados e consumidos com locks no PostgreSQL.

### TranscriptionCapacity

Singleton bloqueado durante a admissão. Ele serializa a contagem global e por usuário
entre processos Gunicorn concorrentes.

## API

```text
GET  /api/transcriptions/                  histórico dos 100 mais recentes
POST /api/transcriptions/                  cria job
GET  /api/transcriptions/{public_id}/      estado e resultado
GET  /api/transcriptions/{public_id}/pdf/  PDF concluído
POST /api/transcriptions/{public_id}/claim/ preserva job anônimo após login
```

O POST aceita multipart/form-data no campo `file`.

Validações:

```text
arquivo obrigatório
extensão permitida
tamanho máximo
capacidade global
capacidade simultânea do usuário
CAPTCHA e limites por IP/cookie para visitante
```

Ordem das proteções anônimas:

```text
1. valida cookie/sessão anônima
2. consome o limite curto por IP
3. valida o token Turnstile no Siteverify
4. consome as janelas de 24 horas por IP e cookie
5. valida capacidade simultânea e cria o job
```

Assim, tokens CAPTCHA inválidos ou expirados não gastam os limites de 24 horas. O
limite curto continua antes do Siteverify para impedir flood de chamadas externas.

Extensões:

```text
Áudio: .mp3 .wav .m4a .aac .ogg .flac
Vídeo: .mp4 .mov .mkv .webm .avi
```

O nome físico usa UUID aleatório. O job e o enqueue são ligados por
`transaction.on_commit`.

## Estados

```text
queued
extracting
checking_duplicate
uploading_provider
processing
completed
failed
```

## Pipeline por filas

### Fila media: process_transcription

```text
1. Materializa o upload em caminho local quando o storage é remoto.
2. ffprobe valida faixa, duração e tipo real.
3. Reserva a duração na cota diária global.
4. FFmpeg produz MP3 mono, 16 kHz, 64 kbps, sem vídeo/metadados.
5. SHA-256 é calculado em blocos.
6. Audio é criado ou recuperado e bloqueado.
7. Busca o artefato pela configuração completa do pipeline.
8. Reutiliza concluído, aguarda o artefato ativo ou salva o canônico temporário.
9. Enfileira submit_transcription somente para conteúdo novo.
10. Libera reserva no cache hit e remove o upload original.
```

FFmpeg usa um thread por task. Arquivos não são carregados integralmente na memória.

### Fila provider: submit_transcription

Materializa o canônico, envia-o em streaming à AssemblyAI e cria a transcrição. Em
modo polling agenda `poll_transcription`; em modo webhook envia URL e header secreto.
O canônico é removido depois da submissão.

### Finalização

`poll_transcription` consulta periodicamente no modo caseiro. No modo VPS, o webhook
agenda `finalize_transcription`. Ambos usam a mesma regra para persistir texto,
concluir todos os jobs autorizados que apontam para o artefato ou propagar falha.

### Fila maintenance

```text
reconcile_stale_transcriptions  revisita processing antigos no modo webhook
cleanup_orphaned_files          remove chaves restantes de jobs finais
purge_expired_anonymous_data    apaga jobs temporários e sessões vencidas
```

Celery Beat dispara essas rotinas em todos os perfis.

## Webhook

```text
POST /api/webhooks/assemblyai/{public_id}/
X-AssemblyAI-Webhook-Secret: <segredo>
```

O endpoint não usa sessão porque é chamado por serviço externo. Ele valida o segredo
com comparação constante, exige `transcript_id`, rejeita conflito e enfileira a
consulta definitiva após o commit.

## Storage

O código funciona com filesystem e S3. `materialize_storage_file` usa o caminho
direto quando disponível ou copia o objeto remoto para diretório temporário. Assim,
FFmpeg não depende de volume compartilhado entre hosts.

```text
transcriptions/uploads/{uuid}.{ext}
transcriptions/processed/{public_id}.mp3
```

Arquivos são temporários; o sistema não é uma biblioteca persistente de mídia.

## AssemblyAI

```text
POST /v2/upload
POST /v2/transcript
GET  /v2/transcript/{id}
```

`submit_transcription` inclui `webhook_url`, nome do header e segredo apenas quando
`TRANSCRIPTION_COMPLETION_MODE=webhook`. A chave AssemblyAI fica exclusivamente no
ambiente.

## PDF

ReportLab gera o PDF em memória. Nome e texto são escapados antes de entrar em
`Paragraph`; nenhum PDF é salvo no storage.

## Limites configuráveis

Padrões conservadores versionados no `.env.example`:

```text
TRANSCRIPTION_MAX_FILE_SIZE=524288000
TRANSCRIPTION_MAX_DURATION_SECONDS=7200
TRANSCRIPTION_MAX_PENDING_JOBS=10
TRANSCRIPTION_MAX_PENDING_PER_USER=2
TRANSCRIPTION_MAX_PENDING_PER_ANON=1
TRANSCRIPTION_DAILY_BUDGET_SECONDS=14400
ANONYMOUS_RESULT_TTL_HOURS=24
ANON_IP_BURST_LIMIT=2
ANON_IP_DAILY_LIMIT=10
ANON_COOKIE_DAILY_LIMIT=3
ASSEMBLYAI_POLL_INTERVAL=10
```

Os limites anônimos de “dia” são janelas de 86.400 segundos iniciadas na primeira
tentativa aceita pelo contador, não o histórico de jobs nem o dia civil. Eles ficam
no Redis e contam somente requisições feitas depois desta implementação. A cota
global de 14.400 segundos é diferente: usa a data local do servidor, fica no
PostgreSQL e contabiliza duração de áudio para proteger créditos.

No ambiente local usado para desenvolvimento, o `.env` não versionado pode adotar:

```text
ANON_IP_BURST_LIMIT=10
ANON_IP_DAILY_LIMIT=100
ANON_COOKIE_DAILY_LIMIT=50
```

Não copie automaticamente esses valores para uma VPS pública.

## Testes

A suíte conjunta de accounts e transcriptions possui 20 testes:

```bash
docker compose run --rm backend python manage.py test apps.accounts apps.transcriptions --verbosity 2
```

Ela cobre autenticação/CSRF, owner, token anônimo, expiração, claim, histórico,
upload, PDF, filas, deduplicação por artefato, cota global e webhook autenticado.

## Modos de implantação

Consulte [13-backend-escalavel.md](13-backend-escalavel.md) para a matriz de hardware
e [07-deploy.md](07-deploy.md) para comandos de implantação.
