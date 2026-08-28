# Contexto atual do backend

## Visão geral

O Utileazy usa Django 5.2, DRF, PostgreSQL, Redis e Celery. O frontend Next.js é a
única entrada pública e funciona como proxy same-origin. Contas usam sessão Django;
visitantes usam cookie anônimo, CAPTCHA e um segredo por job.

## Apps e modelos

```text
apps.common          health check
apps.accounts        CSRF, login, logout e usuário atual
apps.transcriptions  upload, quota, deduplicação, webhook, expiração e PDF
apps.documents       conversão assíncrona PDF e DOCX

Audio                     MP3 canônico e SHA-256
AnonymousSession          hash do cookie e expiração
TranscriptionArtifact     resultado por áudio/configuração
Transcricao               solicitação privada de conta ou visitante
TranscriptionCapacity     lock dos limites simultâneos
DocumentConversion        job privado PDF para DOCX ou DOCX para PDF
DocumentConversionCapacity lock da capacidade global de documentos
DailyTranscriptionBudget  segundos reservados/consumidos por dia
```

Transcrições chegam à migration `0005_authenticated_result_expiration.py` e
documentos à `0001_initial.py`. Jobs legados continuam preservados no usuário inativo
`legacy-transcriptions`.

## Segurança e autorização

```text
autenticado  sessão + CSRF + owner
anônimo      Turnstile + limites Redis por IP/cookie + UUID + X-Job-Token
todos        capacidade simultânea + cota diária global de segundos
```

Cookies e tokens anônimos são persistidos somente como SHA-256. Jobs temporários
expiram em 24 horas; login antes da expiração permite reivindicá-los por 180 dias.
Jobs autenticados também expiram em 180 dias, contados desde a criação ou claim. O rate limit de
aplicação mitiga abuso, mas proteção contra DDoS continua sendo responsabilidade da
borda e infraestrutura.

O Redis mantém um contador curto por IP antes do CAPTCHA e, somente após validação,
janelas de 24 horas por IP e cookie. Esses contadores não consultam jobs históricos.
A cota global de créditos é separada, persistida no PostgreSQL por data local e vale
também para usuários autenticados.

## Fluxo

```text
POST autenticado ou anônimo
  -> storage salva upload
  -> lock de capacidade e limite do ator
  -> fila media: ffprobe e reserva da cota diária
  -> FFmpeg, SHA-256 do canônico e lock do Audio
  -> artefato existente: reutiliza/aguarda e libera reserva
  -> artefato novo: fila provider e AssemblyAI
  -> polling ou webhook
  -> texto salvo no TranscriptionArtifact e jobs concluídos
  -> temporários removidos e exclusão agendada na AssemblyAI
```

A deduplicação usa `(SHA-256 do MP3 canônico, configuration_hash)`. O artefato não
contém proprietário, nome original nem UUID de job, impedindo cruzamento desses
metadados entre usuários.

## Filas, storage e perfis

```text
media        CPU/disco de áudio
provider     rede e conclusão
documents    LibreOffice e pdf2docx
maintenance reconciliação, exclusão no provedor, arquivos órfãos e expiração
```

Casa usa um worker solo. VPS separa media de provider/maintenance. Todos os perfis
executam um Beat leve para que expiração e limpeza não dependam da VPS.
`MEDIA_STORAGE_BACKEND` seleciona filesystem ou S3; objetos remotos são
materializados em diretório temporário para o FFmpeg.

`polling` funciona sem endpoint público. Em VPS HTTPS, `webhook` reduz consultas ao
provedor e a reconciliação recupera callbacks perdidos.

## Validação

Foram validados 42 testes, `manage.py check`, migrations sem divergência e TypeScript
do frontend. AssemblyAI, webhook e S3 reais ainda dependem das respectivas
credenciais e infraestrutura externa.
