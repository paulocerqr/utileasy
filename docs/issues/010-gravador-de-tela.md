# [Mídia] Implementar gravador de tela com áudio

**Categoria:** Mídia e vídeos  
**Tipo:** Frontend  
**Complexidade:** Média  
**Prioridade sugerida:** Etapa 2

## Descrição da tarefa

Criar uma ferramenta para gravar uma tela, janela ou aba compartilhada pelo usuário,
incluindo o áudio disponibilizado pelo navegador e, opcionalmente, o microfone. A
gravação deve permanecer no dispositivo e ser baixada sem passar pelo backend.

## Contexto

A disponibilidade do áudio da tela varia conforme navegador, sistema operacional e
superfície escolhida. A interface deve detectar as capacidades reais e nunca afirmar
que o áudio do sistema será capturado quando o navegador não o oferecer.

## Solução proposta

- Criar a rota `/gravador-de-tela`.
- Solicitar a superfície compartilhada com `getDisplayMedia()`.
- Solicitar o microfone com `getUserMedia()` somente quando o usuário ativar essa
  opção.
- Quando existirem áudio da tela e microfone, combiná-los com Web Audio API em uma
  única faixa.
- Gravar com `MediaRecorder`, escolhendo o formato por
  `MediaRecorder.isTypeSupported()` e usando WebM como primeira opção compatível.
- Exibir estado, indicador de gravação, duração, pausa, retomada e encerramento.
- Finalizar a gravação automaticamente quando o compartilhamento for interrompido
  pelo controle nativo do navegador.
- Apresentar uma prévia e permitir download com nome previsível.
- Revogar URLs temporárias e encerrar todas as faixas de mídia ao concluir, cancelar,
  trocar de página ou ocorrer um erro.
- Manter os chunks apenas no navegador e advertir sobre o consumo de memória em
  gravações longas.

Referências técnicas:

- Screen Capture API:
  <https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API>
- MediaRecorder:
  <https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder>

## Impacto no servidor

Nenhum. Não há upload, job, storage ou consumo de créditos. CPU, memória e espaço do
arquivo final são responsabilidade do dispositivo do usuário.

O MVP deve usar um limite de duração configurável na interface, inicialmente 30
minutos, para reduzir o risco de esgotar a memória do navegador.

## Fora de escopo do MVP

- Captura de câmera.
- Upload automático ou histórico na conta.
- Transmissão ao vivo.
- Edição, corte, compressão ou conversão da gravação.
- Garantia de captura do áudio do sistema em todos os navegadores.
- Gravação silenciosa, automática ou sem uma permissão explícita.

## Critérios de aceitação

- [ ] O usuário pode escolher uma tela, janela ou aba pelo seletor nativo.
- [ ] Nenhuma câmera é solicitada ou gravada.
- [ ] O áudio da superfície é incluído quando o navegador o disponibiliza.
- [ ] O microfone só é solicitado quando sua opção estiver ativada.
- [ ] A interface informa claramente quando o áudio da tela não está disponível.
- [ ] É possível pausar, retomar, encerrar, pré-visualizar e baixar a gravação.
- [ ] Encerrar o compartilhamento pelo navegador também finaliza o arquivo.
- [ ] Permissões negadas ou dispositivos indisponíveis geram mensagens úteis.
- [ ] Nenhum chunk, nome de tela ou dado da gravação é enviado ao servidor.
- [ ] Todas as faixas, URLs e referências temporárias são liberadas ao sair.
- [ ] A interface impede gravações acima do limite configurado.
- [ ] Testes cobrem detecção de suporte, transições de estado e limpeza de recursos.

## Evidências esperadas

- Testes automatizados dos estados do gravador com APIs simuladas.
- Validação manual em Chrome/Chromium e Firefox.
- Registro das combinações testadas de navegador, sistema e captura de áudio.

