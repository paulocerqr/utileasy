# [Mídia] Implementar gerador de legendas SRT/VTT

**Categoria:** Mídia e vídeos  
**Tipo:** Backend, worker e frontend  
**Complexidade:** Alta  
**Prioridade sugerida:** Etapa 3

## Descrição da tarefa

Permitir que o usuário envie um áudio ou vídeo próprio, acompanhe a transcrição e
baixe legendas sincronizadas nos formatos SRT e WebVTT, além do texto já disponível.

## Contexto atual

O pipeline já valida mídia com ffprobe, normaliza áudio com FFmpeg, deduplica
artefatos, envia o conteúdo à AssemblyAI e protege os resultados por usuário ou token
anônimo. Para gerar legendas corretamente, ele ainda precisa obter, validar e
persistir timestamps do provedor no artefato compartilhado.

## Solução proposta

- Evoluir o `TranscriptionArtifact` para armazenar os timestamps canônicos necessários
  para as legendas, sem duplicá-los em cada job.
- Adaptar o cliente da AssemblyAI e a finalização para obter palavras ou segmentos
  com início e fim, tanto no modo polling quanto no webhook.
- Criar um serviço puro de segmentação que agrupe palavras respeitando:
  - timestamps crescentes;
  - duração máxima por legenda;
  - quantidade máxima de caracteres e linhas;
  - pausas entre palavras;
  - ausência de sobreposição entre blocos.
- Criar endpoints protegidos para baixar
  `/api/transcriptions/{public_id}/subtitles.srt` e
  `/api/transcriptions/{public_id}/subtitles.vtt`.
- Gerar os arquivos sob demanda a partir dos timestamps persistidos, sem criar
  cópias permanentes no storage.
- Adicionar os downloads SRT e VTT à tela `/transcrisao` quando o job possuir
  timestamps válidos.
- Reutilizar deduplicação, cota diária, CAPTCHA, rate limit, capacidade global,
  propriedade, token secreto e expiração do pipeline atual.
- Tratar artefatos antigos sem timestamps como incompatíveis, sem fabricar tempos a
  partir apenas do texto.

Referências técnicas:

- Formato WebVTT: <https://www.w3.org/TR/webvtt1/>
- AssemblyAI:
  <https://www.assemblyai.com/docs/speech-to-text/pre-recorded-audio>

## Impacto no servidor

Baixo para gerar SRT/VTT e igual ao custo atual para transcrever mídia. A geração dos
arquivos é textual; os principais custos continuam sendo a preparação do áudio, o
upload ao provedor e os créditos de transcrição.

Os timestamps aumentam o tamanho do registro no banco. Devem ser armazenados uma vez
por `TranscriptionArtifact`, com limite de duração e monitoramento do crescimento.

## Fora de escopo do MVP

- Editor visual de legendas ou ajuste manual de timestamps.
- Tradução automática.
- Identificação e cores por locutor.
- Incorporação permanente da legenda no vídeo.
- Karaoke ou sincronização por fonema.
- Geração de timestamps para transcrições legadas que possuem somente texto.

## Critérios de aceitação

- [ ] Uma transcrição concluída com timestamps permite baixar SRT e VTT válidos.
- [ ] Os dois arquivos usam o texto e a ordem temporal retornados pelo provedor.
- [ ] Os blocos possuem início menor que o fim e não se sobrepõem.
- [ ] SRT usa índices sequenciais e timestamps no formato `HH:MM:SS,mmm`.
- [ ] WebVTT contém o cabeçalho e timestamps no formato esperado.
- [ ] Caracteres Unicode e quebras de linha são serializados corretamente.
- [ ] Jobs deduplicados reutilizam os mesmos timestamps sem nova cobrança.
- [ ] Usuários e visitantes obedecem às mesmas regras de acesso do job original.
- [ ] Artefatos sem timestamps não exibem downloads e retornam erro útil.
- [ ] A geração do arquivo não cria objetos permanentes no storage.
- [ ] Polling e webhook persistem o mesmo formato canônico de timestamps.
- [ ] Testes cobrem segmentação, serialização, autorização e artefatos legados.

## Evidências esperadas

- Fixtures com pausas, pontuação, Unicode e duração superior a uma hora.
- Testes que validem os arquivos com parsers de SRT e WebVTT.
- Comparação manual da legenda com o player em uma mídia curta de referência.

