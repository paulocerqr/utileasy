# Planejamento das features prometidas na home

Esta pasta contém descrições prontas para serem usadas como GitHub Issues. Cada issue
delimita o MVP, o impacto técnico e o que deve ficar para uma evolução posterior.

## Ordem sugerida

### Etapa 1 — ferramentas somente no navegador

1. [Sorteador](005-sorteador.md) — implementado
2. [Ordem de apresentação](006-ordem-de-apresentacao.md) — implementada
3. [Divisor de grupos](007-divisor-de-grupos.md) — implementado
4. [Gerador de QR Code](008-gerador-de-qr-code.md) — implementado

Essas features não consomem CPU, storage ou créditos do servidor e ajudam a consolidar
um padrão visual reutilizável para ferramentas simples.

### Etapa 2 — arquivos e mídia processados no navegador

5. [Juntar PDFs](002-juntar-pdfs.md) — implementado
6. [Imagens para PDF](003-imagens-para-pdf.md)
7. [Gravador de tela com áudio](010-gravador-de-tela.md)

As ferramentas desta etapa preservam os arquivos no dispositivo do usuário e evitam
consumo de CPU, storage e banda do servidor. Os PDFs usam `pdf-lib`; o gravador usa
as APIs de captura e gravação do navegador.

### Etapa 3 — processamento pesado no backend

8. [Gerador de legendas SRT/VTT](011-gerador-de-legendas.md)
9. [Cortar vídeo](012-cortar-video.md)
10. [Conversão PDF ↔ DOCX](001-conversao-pdf-docx.md)

As legendas reaproveitam o pipeline de transcrição. O corte usa FFmpeg nativo e a
conversão de documentos exige LibreOffice e uma base genérica para seus jobs. Todas
devem passar pelos workers, com concorrência e limites adequados a cada ambiente.

### Etapa 4 — infraestrutura de rede

11. [Teste de velocidade](009-teste-de-velocidade.md)

Precisa de decisão sobre custo de banda e mede a conexão até o servidor escolhido,
não uma velocidade universal da internet.

### Etapa 5 — decisão jurídica e operacional

12. [Download de vídeos do YouTube](004-download-videos-youtube.md)

Não deve ser disponibilizada publicamente antes de uma decisão explícita sobre termos
de uso, direitos autorais, abuso e custo de transferência.

## Decisões transversais

- Ferramentas processadas integralmente no navegador não entram no histórico da conta
  no primeiro MVP.
- Persistência de resultados locais pode ser adicionada depois por uma issue
  transversal de `ToolResult`, com upload opcional apenas para usuários autenticados.
- Ferramentas processadas no backend devem reutilizar autenticação, sessão anônima,
  token por job, CAPTCHA, rate limit, storage privado e expiração já adotados nas
  transcrições.
- Recursos que dependem de capacidades do navegador devem detectar suporte antes de
  exibir controles e explicar limitações sem prometer comportamento indisponível.
- Toda promessa da home deve refletir o escopo realmente entregue. Funcionalidades
  futuras não devem ser apresentadas como prontas.
