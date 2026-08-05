# Banco de dados atual

## PostgreSQL

PostgreSQL 16 é a fonte definitiva de usuários, sessões, estado dos jobs e textos
transcritos. Redis transporta mensagens do Celery, mas não é backend de resultados.

Os dados persistem no volume `postgres_data`. Em desenvolvimento, a porta pode ser
publicada apenas em `127.0.0.1` pelo arquivo `docker-compose.dev.yml`; nos perfis
caseiro e VPS o banco permanece somente na rede Docker.

## Usuários e sessões

O projeto usa o modelo padrão `django.contrib.auth.User` e as tabelas de autenticação,
permissões e sessões do Django. Não existe modelo de usuário personalizado.

Uma `Transcricao` possui exatamente um ator: `owner` para conta autenticada ou
`anonymous_session` mais `access_token_hash` para visitante. Uma constraint do banco
impede jobs sem ator ou com os dois tipos ao mesmo tempo. `owner` usa
`on_delete=PROTECT`; uma conta com histórico não pode ser apagada sem tratar os jobs.

A migration `0003_ownership_and_storage.py` associa registros anteriores à mudança
ao usuário inativo `legacy-transcriptions`.

## Audio

Representa o MP3 canônico obtido depois do FFmpeg:

```text
id_audio             chave interna
tempo                duração em segundos
formato              normalmente mp3
hash                 SHA-256 único
filename             nome lógico baseado no hash
tamanho_bytes
criado_em
```

O hash é global para evitar duplicação da representação canônica. O texto reutilizável
é separado do job privado pelo modelo `TranscriptionArtifact`.

## AnonymousSession

Associa um UUID interno a `cookie_hash`, datas de uso e expiração. O cookie bruto
nunca é persistido. Ao excluir a sessão, seus jobs temporários são excluídos em
cascata.

## TranscriptionArtifact

Representa o resultado técnico compartilhável de um áudio e uma configuração do
pipeline. A constraint `(audio, configuration_hash)` impede cobrança duplicada em
concorrência. Guarda status, texto, erro e ID do provedor, mas não proprietário, nome
original nem UUID público de solicitação.

## Transcricao

Representa a solicitação do usuário, seu andamento e resultado:

```text
id_transcricao                 chave interna
public_id                      UUID usado pela API
owner                          usuário ou nulo no modo anônimo
anonymous_session              sessão anônima ou nulo com owner
artifact                       resultado deduplicável do pipeline
audio                          áudio canônico, inicialmente nulo
duplicate_of                   compatibilidade com jobs legados
nome_original
tipo_origem                    audio ou video
arquivo_temporario             chave do upload no storage
arquivo_processado             chave do MP3 canônico temporário
access_token_hash              hash do segredo anônimo
expira_em                      expiração do resultado anônimo ou autenticado
quota_date
quota_reserved_seconds
status
provider                       assemblyai
provider_transcription_id
texto_transcricao
error_message
criado_em
atualizado_em
finalizado_em
```

Estados válidos:

```text
queued
extracting
checking_duplicate
uploading_provider
processing
completed
failed
```

Índices atendem listagem por proprietário ou sessão anônima e data, consulta por
status e busca por áudio/status. `public_id` é único.

## TranscriptionCapacity

É uma tabela singleton. A linha de ID 1 é bloqueada com `select_for_update` durante a
criação de um job. Isso serializa a verificação dos limites global e por usuário e
evita que uploads simultâneos ultrapassem a capacidade configurada.

## DailyTranscriptionBudget

Possui uma linha por data local, com segundos `reserved` e `consumed`. Locks
transacionais impedem dois workers de ultrapassarem a cota global ao mesmo tempo.

## Arquivos não ficam no banco

Uploads e MP3s canônicos ficam temporariamente no backend de storage selecionado. O
banco guarda somente suas chaves durante o pipeline. O texto final permanece no
PostgreSQL por 24 horas no modo anônimo ou 180 dias no modo autenticado; PDFs são
gerados em memória e não são persistidos. A limpeza remove também artefatos e metadados
de áudio quando deixam de ser referenciados.

## Migrations

```text
0001_initial.py                 modelo inicial
0002_transcription_pipeline.py pipeline assíncrono, UUID e deduplicação
0003_ownership_and_storage.py  owner, arquivo_processado e capacidade
0004_anonymous_access_and_artifacts.py sessão anônima, token, artefato e cota
```
