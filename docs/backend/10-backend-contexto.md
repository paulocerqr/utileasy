# Contexto do Backend de Transcrição

Este documento registra o estado implementado do backend Django/DRF para transcrição de áudio e vídeo no Utileazy.

## 1. Estrutura

```text
backend/apps/transcriptions/
  models.py
  serializers.py
  views.py
  urls.py
  services.py
  tasks.py
  pdf.py
  providers/assemblyai.py
  migrations/0002_transcription_pipeline.py
  tests/
```

O Celery é inicializado em `backend/config/celery.py` e carregado por `backend/config/__init__.py`.

## 2. Banco de dados

O domínio usa somente as tabelas `Audio` e `Transcricao`; não existe tabela `Video` no Utileazy.

### Audio

Representa o áudio canônico normalizado:

```text
id_audio
tempo
formato
hash                      SHA-256 único
filename                  nome lógico do áudio normalizado
tamanho_bytes
criado_em
```

### Transcricao

Representa o job e o resultado:

```text
id_transcricao
public_id                 UUID exposto pela API
audio                     áudio canônico, inicialmente nulo
duplicate_of              outro job que já possui o resultado
nome_original
tipo_origem               audio ou video
arquivo_temporario
status
provider                  assemblyai
provider_transcription_id
texto_transcricao
error_message
criado_em
atualizado_em
finalizado_em
```

A migration responsável pela alteração é `backend/apps/transcriptions/migrations/0002_transcription_pipeline.py`.

## 3. Estados do job

```text
queued
extracting
checking_duplicate
uploading_provider
processing
completed
failed
```

O `public_id` deve ser usado pelo frontend. O `id_transcricao` inteiro continua interno para relações e tarefas.

## 4. Endpoints

As rotas ficam sob `/api/transcriptions/`:

```text
POST /api/transcriptions/
GET  /api/transcriptions/{public_id}/
GET  /api/transcriptions/{public_id}/pdf/
```

O POST recebe um multipart no campo `file`, valida extensão e tamanho, salva o arquivo temporário e cria o job. A resposta é `202 Accepted`.

Limites padrão:

```text
TRANSCRIPTION_MAX_FILE_SIZE=524288000       500 MB
TRANSCRIPTION_MAX_DURATION_SECONDS=7200     2 horas
TRANSCRIPTION_MAX_PENDING_JOBS=10
```

## 5. Pipeline do worker

1. O arquivo é validado com `ffprobe`.
2. A faixa de áudio principal é convertida com FFmpeg para MP3 mono, 16 kHz e 64 kbps.
3. O SHA-256 é calculado por streaming sobre o áudio normalizado.
4. O hash é procurado na tabela `Audio`.
5. Se já existir transcrição concluída, o job recebe `duplicate_of` e reutiliza o resultado.
6. Se outro job estiver processando o mesmo áudio, o novo job aguarda o resultado.
7. Para conteúdo novo, o arquivo é enviado por streaming para a AssemblyAI.
8. O ID retornado pelo provedor é salvo no banco.
9. Uma task Celery consulta o status periodicamente.
10. O texto é salvo em `texto_transcricao`.
11. Os arquivos temporários são removidos em sucesso ou falha.

O pré-processamento não aplica denoise, normalização ou diarização, mantendo o uso de CPU adequado ao servidor doméstico.

## 6. AssemblyAI

O provider está em `backend/apps/transcriptions/providers/assemblyai.py` e usa:

```text
POST /v2/upload
POST /v2/transcript
GET  /v2/transcript/{id}
```

A chave deve existir somente no ambiente:

```text
ASSEMBLYAI_API_KEY=
```

Não colocar a chave em código, frontend ou documentação pública.

## 7. PDF

O PDF é gerado sob demanda por `backend/apps/transcriptions/pdf.py` usando ReportLab. O arquivo não é persistido; o endpoint retorna o conteúdo diretamente como `application/pdf`.

## 8. Testes

Existem cinco testes cobrindo criação do job, formato inválido, PDF, envio ao provider e deduplicação:

```bash
docker compose run --rm backend python manage.py test apps.transcriptions --verbosity 2
```

Resultado validado:

```text
Ran 5 tests
OK
```

Também foram validados:

```bash
docker compose run --rm backend python manage.py check
docker compose run --rm backend python manage.py makemigrations --check --dry-run
```

## 9. Limitações conhecidas

```text
- Autenticação e associação do job a usuário ainda não existem.
- Não há histórico público implementado.
- O polling é usado porque o deploy atual não oferece webhook HTTPS público.
- É necessário configurar a chave AssemblyAI antes de testar uma transcrição real.
```
