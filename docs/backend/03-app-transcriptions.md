# App de Transcrições

## Objetivo e limites

O app backend/apps/transcriptions recebe áudio ou vídeo, cria um job persistente, normaliza a faixa de áudio com FFmpeg, evita cobranças duplicadas, envia conteúdo novo para AssemblyAI e disponibiliza texto e PDF ao final.

Não há autenticação nem associação de job a usuário. A API expõe UUIDs públicos; os IDs inteiros do banco continuam internos.

## Estrutura

\`\`\`text
apps/transcriptions/
├── admin.py
├── apps.py
├── models.py
├── serializers.py
├── urls.py
├── views.py
├── services.py
├── tasks.py
├── pdf.py
├── providers/assemblyai.py
├── migrations/
│   ├── 0001_initial.py
│   └── 0002_transcription_pipeline.py
└── tests/
    ├── test_api.py
    └── test_tasks.py
\`\`\`

Modelos persistem estado; views recebem HTTP; serializers definem saída; services encapsulam processamento local; tasks executam a fila; o provider isola a API externa; pdf.py produz a exportação.

## Fluxo ponta a ponta

\`\`\`text
POST com arquivo
  -> valida extensão, tamanho e capacidade da fila
  -> salva upload no volume de mídia
  -> cria Transcricao como queued
  -> agenda process_transcription após commit
  -> worker valida com ffprobe
  -> worker normaliza áudio para MP3
  -> calcula SHA-256
  -> reutiliza resultado, aguarda job idêntico ou envia à AssemblyAI
  -> poll_transcription consulta provider
  -> grava texto no PostgreSQL
  -> GET consulta; GET pdf gera PDF sob demanda
\`\`\`

## apps.py, __init__.py e admin.py

TranscriptionsConfig registra apps.transcriptions e usa BigAutoField como padrão. __init__.py não possui lógica.

admin.py registra Audio e Transcricao no Django Admin. As listas mostram identificadores, nomes, formatos, status e datas; filtros e busca facilitam a operação. IDs e datas de auditoria são somente leitura.

## Modelos: models.py

### Audio

Audio é o áudio canônico após normalização, não necessariamente o upload original.

| Campo | Função |
|---|---|
| id_audio | chave primária interna, coluna idAudio |
| tempo | duração opcional em segundos, até 86.400 |
| formato | formato conhecido, normalmente MP3 |
| hash | SHA-256 único do áudio canônico |
| filename | nome lógico normalizado |
| tamanho_bytes | tamanho do normalizado |
| criado_em | criação |

Há índice em formato e constraints para formatos válidos e duração máxima.

### Transcricao

Transcricao representa o job e seu resultado.

| Campo | Função |
|---|---|
| id_transcricao | chave interna, coluna idTranscricao |
| public_id | UUID único exposto |
| audio | áudio canônico, inicialmente nulo |
| duplicate_of | job principal de conteúdo idêntico |
| nome_original | nome sanitizado do upload |
| tipo_origem | audio ou video |
| arquivo_temporario | caminho relativo do upload |
| status | estado do pipeline |
| provider | assemblyai |
| provider_transcription_id | ID devolvido pelo provider |
| texto_transcricao | resultado final |
| error_message | motivo público da falha |
| timestamps | criado_em, atualizado_em e finalizado_em |

Estados:

\`\`\`text
queued
extracting
checking_duplicate
uploading_provider
processing
completed
failed
\`\`\`

Há índices para criação e para a combinação áudio/status. A propriedade effective_transcription retorna o job principal quando há duplicação, sem necessidade de repetir o texto no banco.

## Rotas e serializer

urls.py é incluído sob /api/transcriptions/:

| Método e rota | Finalidade |
|---|---|
| POST /api/transcriptions/ | cria job |
| GET /api/transcriptions/{public_id}/ | consulta job e resultado |
| GET /api/transcriptions/{public_id}/pdf/ | baixa PDF concluído |

O conversor de rota exige UUID válido.

TranscricaoSerializer converte os nomes internos em um contrato para frontend:

\`\`\`json
{
  "id": "uuid-publico",
  "original_filename": "arquivo.mp3",
  "status": "processing",
  "transcript_text": "",
  "error_message": "",
  "created_at": "data-hora",
  "finished_at": null,
  "reused": false
}
\`\`\`

transcript_text só sai quando status é completed; error_message só sai quando failed. Em jobs duplicados, ambos vêm do job principal. reused informa a deduplicação.

## Views: views.py

### TranscriptionCreateView

Aceita multipart ou formulário e recebe o arquivo no campo file.

Validações:

1. Sem arquivo: 400.
2. Extensão não suportada: 415.
3. Arquivo maior que TRANSCRIPTION_MAX_FILE_SIZE: 413.
4. Jobs ativos no limite TRANSCRIPTION_MAX_PENDING_JOBS: 429.

Extensões aceitas:

\`\`\`text
Áudio: .mp3, .wav, .m4a, .aac, .ogg, .flac
Vídeo: .mp4, .mov, .mkv, .webm, .avi
\`\`\`

O nome original é reduzido ao nome-base e limitado a 255 caracteres. O arquivo físico recebe UUID aleatório em transcriptions/uploads, evitando colisões e uso de caminhos vindos do cliente.

O job é criado em transação. process_transcription.delay é registrado em transaction.on_commit, portanto só entra na fila depois do commit do banco. Se a criação falhar, o upload é apagado. A resposta é 202 Accepted porque o trabalho é assíncrono.

### TranscriptionDetailView

Busca por UUID público e responde o serializer; retorna 404 quando não existe. select_related carrega a relação duplicate_of na mesma consulta.

### TranscriptionPdfView

Busca por UUID público, retorna 404 quando não existe e 409 quando não está concluída. Quando concluída, gera o PDF em memória e devolve application/pdf com nome transcricao-{public_id}.pdf.

## Processamento local: services.py

storage_path converte caminho relativo do storage em caminho local. O pipeline exige storage em disco porque FFmpeg e ffprobe recebem caminhos; storage remoto sem path falha explicitamente.

inspect_media executa ffprobe com saída JSON, exige uma faixa de áudio, determina duração, impõe TRANSCRIPTION_MAX_DURATION_SECONDS e identifica se a origem contém vídeo. Erros de subprocesso ou JSON tornam a mídia inválida.

create_canonical_audio executa FFmpeg para obter:

\`\`\`text
primeira faixa de áudio
sem vídeo
mono
16 kHz
MP3 com libmp3lame
64 kbps
sem metadados
um thread
\`\`\`

Assim, o mesmo conteúdo em formatos diferentes tende à mesma representação para deduplicação. O timeout é duas horas.

calculate_sha256 lê em blocos de 1 MB, sem carregar mídia inteira em memória. As funções de exclusão removem upload e arquivo processado sem falhar se já não existirem.

## Tarefas Celery: tasks.py

As auxiliares fazem o seguinte:

- _complete_duplicate conclui um job duplicado e aponta duplicate_of ao job concluído.
- _wait_for_primary aponta o job para uma transcrição idêntica ainda ativa e o mantém em processing.
- _mark_failed falha o job principal e seus dependentes, gravando mensagem e data final.

### process_transcription

É uma shared task com confirmação tardia e rejeição se o worker for perdido.

1. Busca o job interno e ignora estados finais.
2. Localiza upload e cria o diretório de processados.
3. Muda para extracting.
4. Valida mídia e corrige tipo_origem se necessário.
5. Gera MP3 canônico.
6. Muda para checking_duplicate e calcula SHA-256.
7. Cria ou recupera Audio pelo hash dentro de transação.
8. Usa select_for_update para decidir de forma concorrente segura.
9. Se existir job concluído, conclui o duplicado sem chamar AssemblyAI.
10. Se existir job ativo, associa o duplicado e aguarda seu resultado.
11. Caso seja áudio novo, associa Audio e muda para uploading_provider.
12. Envia o MP3 em streaming e cria a transcrição externa.
13. Salva o ID do provider, muda para processing e agenda polling.
14. No finally, remove upload e áudio processado.

Erros de mídia ou provider falham com mensagem controlada. Erros inesperados são registrados no worker e viram uma mensagem genérica ao cliente.

### poll_transcription

É uma task vinculada com máximo de 360 tentativas.

1. Ignora jobs finais.
2. Falha se não houver ID do provider.
3. Consulta a transcrição externa.
4. Falha temporária da API gera retry após ASSEMBLYAI_POLL_INTERVAL.
5. Status completed persiste texto e conclui dependentes duplicados.
6. Status error falha job e dependentes.
7. Status pendente gera retry; o limite gera falha por tempo excedido.

Com o intervalo padrão de 10 segundos, 360 tentativas correspondem a aproximadamente uma hora, sem contar atraso de fila e falhas temporárias.

## Provider: providers/assemblyai.py

AssemblyAIClient lê exclusivamente ASSEMBLYAI_API_KEY. Sem chave, o processamento não começa.

| Método | Endpoint | Papel |
|---|---|---|
| upload_file | POST /v2/upload | envia áudio por streaming e retorna upload_url |
| submit_transcription | POST /v2/transcript | inicia transcrição em português, com texto formatado |
| get_transcription | GET /v2/transcript/{id} | lê estado e resultado |

Timeouts separam conexão e leitura. Erros HTTP, respostas incompletas e JSON inválido são convertidos em AssemblyAIError, isolando detalhes da biblioteca requests.

## PDF: pdf.py

build_transcription_pdf usa ReportLab e devolve bytes em memória; não persiste PDF. O documento inclui título, nome original, data e texto.

Nome e texto são escapados antes de entrarem em Paragraph, evitando interpretação de caracteres especiais como marcação. Quebras de linha são convertidas depois do escape.

## Migrations

0001_initial criou Audio e Transcricao em um modelo anterior, com campos de diarização e processamento simples.

0002_transcription_pipeline converteu esse modelo para o pipeline atual: adicionou UUID público, estados, temporários, provider, deduplicação, timestamps e tamanho do áudio; removeu os campos antigos; atualizou índices e constraints.

A migration preenche datas e UUIDs em linhas existentes antes de tornar os novos campos obrigatórios e únicos.

## Testes

test_api.py cobre criação persistente e enfileiramento após commit, rejeição de extensão e PDF concluído.

test_tasks.py cobre envio de áudio novo sem carregar mídia no banco e reutilização de resultado sem novo upload ao provider.

\`\`\`bash
docker compose run --rm backend python manage.py test apps.transcriptions --verbosity 2
\`\`\`

## Limitações atuais

- Não há autenticação, autorização ou propriedade de jobs por usuário.
- O polling existe porque o ambiente atual não expõe webhook HTTPS público.
- O pipeline depende de storage local compartilhado entre backend e worker.
- O worker tem concorrência um para preservar CPU e memória; o throughput é deliberadamente limitado.
- Arquivos temporários são removidos ao final, portanto não há biblioteca persistente de mídias.

