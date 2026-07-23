# [Arquivos] Implementar conversão real de PDF ↔ DOCX

**Categoria:** Arquivos  
**Tipo:** Backend, worker e frontend  
**Complexidade:** Alta  
**Prioridade sugerida:** Etapa 3

## Descrição da tarefa

Substituir a simulação existente em `/pdf-docx` por conversões reais de PDF para DOCX
e DOCX para PDF, com processamento assíncrono, download protegido e comunicação
honesta sobre possíveis diferenças de layout.

## Contexto atual

A rota, o upload, as opções e o feedback visual já existem, mas o progresso é
simulado e o download contém apenas um arquivo de texto. A home promete manutenção da
formatação original, algo que não pode ser garantido em todos os documentos.

## Solução proposta

- Criar um modelo genérico de job de documentos ou modelos específicos com:
  proprietário ou sessão anônima, UUID público, token secreto, status, tipo da
  operação, chaves privadas de storage, erro, expiração e timestamps.
- Criar uma fila Celery `documents`, separada de `media` e `provider`.
- Para DOCX → PDF, executar LibreOffice em modo headless dentro do worker.
- Para PDF → DOCX, realizar um spike com `pdf2docx`/PyMuPDF e fixar a versão escolhida.
  O projeto `pdf2docx` não é mais mantido ativamente, portanto a decisão deve ser
  registrada e coberta por testes de regressão.
- Materializar arquivos do storage em diretório temporário, executar a conversão e
  salvar somente o resultado final no storage privado.
- Reutilizar CAPTCHA, rate limit e token por job para visitantes.
- Preservar resultados autenticados e expirar resultados anônimos.
- Atualizar a interface para mostrar progresso real por polling.
- Alterar a promessa para “preservar o layout quando possível”.

Referências técnicas:

- LibreOffice: <https://help.libreoffice.org/latest/is/text/shared/guide/pdf_params.html>
- pdf2docx: <https://github.com/ArtifexSoftware/pdf2docx>
- PyMuPDF: <https://pymupdf.readthedocs.io/>

## Impacto no servidor

Alto. LibreOffice aumenta consideravelmente a imagem Docker e pode consumir centenas
de MB de RAM por processo. PDF → DOCX também usa CPU e memória proporcionalmente ao
número de páginas, imagens e tabelas.

Configuração inicial:

- servidor caseiro: concorrência 1;
- VPS 2–4 vCPU: concorrência 1, aumentando somente após medição;
- limite inicial: 50 MB e 200 páginas;
- timeout e limite de memória por processo;
- limpeza obrigatória de entradas e saídas temporárias.

## Fora de escopo do MVP

- Garantia de fidelidade pixel a pixel.
- PDFs protegidos por senha.
- Macros, arquivos `.doc` antigos ou documentos corrompidos.
- OCR de PDFs escaneados. O toggle atual deve ficar oculto/desabilitado até uma issue
  própria definir Tesseract, idiomas e custo.
- Edição online do DOCX.

## Critérios de aceitação

- [ ] Um DOCX válido gera um PDF que pode ser aberto e baixado.
- [ ] Um PDF textual válido gera um DOCX que pode ser aberto no LibreOffice e Word.
- [ ] Texto, imagens e tabelas simples são preservados nos arquivos de referência.
- [ ] A interface não afirma que a formatação será idêntica ao original.
- [ ] Arquivos inválidos, acima do limite, protegidos ou corrompidos retornam erro útil.
- [ ] O processamento acontece na fila `documents` e não bloqueia requisições HTTP.
- [ ] Um usuário não acessa jobs ou arquivos de outro usuário.
- [ ] Visitantes precisam do token do job e perdem o resultado após a expiração.
- [ ] Arquivos temporários são removidos em sucesso, falha e timeout.
- [ ] Os testes cobrem os dois sentidos, autorização, limites e limpeza.

## Evidências esperadas

- Testes automatizados do backend.
- Fixtures pequenas com texto, imagem e tabela.
- Medição de pico de RAM e tempo em casa e na VPS.
- Build Docker validando a instalação do LibreOffice.

