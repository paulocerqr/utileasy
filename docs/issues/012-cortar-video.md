# [Mídia] Implementar corte de vídeo

**Categoria:** Mídia e vídeos  
**Tipo:** Backend, worker e frontend  
**Complexidade:** Média/Alta  
**Prioridade sugerida:** Etapa 3

## Descrição da tarefa

Permitir que o usuário envie um vídeo próprio, selecione o instante inicial e final e
baixe somente o trecho escolhido, com processamento assíncrono e limites adequados ao
servidor caseiro e à VPS.

## Contexto

Um corte sem recodificação é rápido e economiza CPU, mas pode começar no keyframe
anterior ou posterior ao instante solicitado. Um corte preciso exige decodificar e
recodificar o vídeo, aumentando muito o tempo e o uso de CPU. O MVP deve oferecer
somente o modo rápido e explicar essa diferença antes do processamento.

## Solução proposta

- Criar a rota `/cortar-video`.
- Permitir pré-visualização local e seleção de início/fim pelo player e por campos de
  tempo acessíveis.
- Criar um job de mídia com proprietário ou sessão anônima, UUID público, token
  secreto, status, parâmetros validados, chaves privadas de storage e expiração.
- Validar arquivo, container, codecs, duração e streams com ffprobe antes de executar.
- Validar novamente no backend que `0 <= início < fim <= duração`.
- Executar FFmpeg nativo na fila `media`, com stream copy sempre que container e
  codecs forem compatíveis.
- Preservar áudio e vídeo presentes no trecho e remover metadados desnecessários.
- Informar na interface que o modo rápido respeita keyframes e pode não ser exato.
- Salvar o resultado no storage privado e fornecer download protegido.
- Reutilizar autenticação, sessão anônima, CAPTCHA, rate limit, capacidade global,
  token por job e rotinas de expiração.
- Executar FFmpeg sem shell, usando argumentos separados e caminhos locais
  controlados pela aplicação.

Referência técnica: <https://ffmpeg.org/ffmpeg.html>

## Impacto no servidor

Baixo/moderado em CPU no modo rápido, mas proporcional ao tamanho do arquivo em disco
e transferência. O upload original e o resultado coexistem temporariamente, portanto
a admissão deve considerar espaço disponível.

Configuração inicial sugerida:

- concorrência global 1 no servidor caseiro e na VPS;
- no máximo um corte ativo por visitante e dois por usuário;
- limite configurável, inicialmente 500 MB e 2 horas de vídeo;
- timeout proporcional à duração/tamanho, com teto absoluto;
- FFmpeg limitado a um thread;
- expiração rápida do resultado anônimo e limpeza em sucesso, falha e timeout.

## Fora de escopo do MVP

- Corte preciso com recodificação.
- Vários cortes ou união de trechos.
- Timeline multipista, transições ou filtros.
- Alteração de resolução, bitrate, codec ou proporção.
- Inserção de música, texto, marca d'água ou legenda.
- Processamento de URLs externas, lives ou arquivos protegidos.

## Critérios de aceitação

- [ ] O usuário pode selecionar um arquivo e definir início e fim válidos.
- [ ] O backend nunca confia apenas na duração ou nos tempos informados pelo frontend.
- [ ] Um vídeo compatível gera um único arquivo contendo o trecho solicitado.
- [ ] O resultado mantém as faixas de áudio e vídeo compatíveis do original.
- [ ] A interface explica que o início pode variar por causa dos keyframes.
- [ ] Arquivos inválidos, protegidos, incompatíveis ou acima dos limites são rejeitados.
- [ ] O processamento acontece no worker e não bloqueia requisições HTTP.
- [ ] Um ator não consulta nem baixa jobs pertencentes a outro ator.
- [ ] Visitantes precisam do token secreto e o resultado expira automaticamente.
- [ ] Nenhuma entrada do usuário é interpolada em comandos shell.
- [ ] Originais, resultados e temporários são removidos conforme a política definida.
- [ ] Testes cobrem validação temporal, autorização, limites, falha e limpeza.

## Evidências esperadas

- Fixtures curtas com MP4 e WebM, com e sem áudio.
- Verificação da duração e dos streams do resultado usando ffprobe.
- Medição de tempo, disco e pico de RAM nos perfis caseiro e VPS.
- Teste de integração do upload ao download protegido.

