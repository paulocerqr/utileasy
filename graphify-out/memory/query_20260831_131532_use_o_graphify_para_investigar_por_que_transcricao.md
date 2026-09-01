---
type: "query"
date: "2026-08-31T13:15:32.402133+00:00"
question: "Use o Graphify para investigar por que Transcricao conecta Transcription Backend com Document Conversion API."
contributor: "graphify"
outcome: "useful"
source_nodes: ["Transcricao", "TranscricaoSerializer", "DocumentConversionSerializer", "AnonymousSession"]
---

# Q: Use o Graphify para investigar por que Transcricao conecta Transcription Backend com Document Conversion API.

## Answer

Expanded from original query via graph vocab: [transcricao, transcription, backend, document, conversion, api, serializer, process, task]. Transcricao has intentional dependencies from its own serializer and views. There is no directed path from Transcricao to DocumentConversionSerializer. The undirected four-hop path is misleading: documents/tasks.py imports AnonymousSession from the transcriptions models module, while that module contains Transcricao; documents/tasks.py does not import Transcricao. Real cross-app coupling exists because documents imports anonymous-session, authorization, rate-limit, and storage helpers from apps.transcriptions. Therefore the Transcricao-to-document-conversion dependency is not direct or intentional; the underlying shared infrastructure is intentionally reused but placed in the transcriptions domain, creating avoidable coupling that belongs in a common/shared module.

## Outcome

- Signal: useful

## Source Nodes

- Transcricao
- TranscricaoSerializer
- DocumentConversionSerializer
- AnonymousSession