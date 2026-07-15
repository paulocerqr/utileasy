# Banco de Dados

## 1. PostgreSQL

Banco principal do sistema.

Armazenará:

```text
- usuários
- jobs de conversão
- jobs de transcrição
- histórico
- dicas para devs
- categorias
- notícias salvas
- logs básicos do sistema
```

---

## 2. Modelos/tabelas importantes pensados até agora

### FileJob

Representa uma tarefa de conversão/processamento de arquivo.

```text
FileJob
- id
- user_id
- original_filename
- input_file_path
- output_file_path
- job_type
- status
- error_message
- created_at
- finished_at
```

Status possíveis:

```text
pending
processing
completed
failed
expired
```

### TranscriptionJob

Representa uma transcrição de áudio/vídeo.

```text
TranscriptionJob
- id
- user_id
- file
- status
- provider
- provider_transcription_id
- transcript_text
- summary
- language
- created_at
- finished_at
```
