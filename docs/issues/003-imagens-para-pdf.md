# [Arquivos] Implementar conversão de imagens para PDF

**Categoria:** Arquivos  
**Tipo:** Frontend  
**Complexidade:** Média  
**Prioridade sugerida:** Etapa 2

**Estado:** Implementada

## Descrição da tarefa

Criar uma ferramenta que permita selecionar, ordenar e transformar imagens em um PDF
único, com configuração simples de página, margens e ajuste.

## Solução proposta

- Criar a rota `/imagens-para-pdf` seguindo o design de `/juntarpdf`.
- Aceitar inicialmente JPEG, PNG e WebP.
- Usar `createImageBitmap`/Canvas para normalizar orientação e converter WebP quando
  necessário.
- Usar `pdf-lib` para incorporar JPEG/PNG e gerar o documento no navegador.
- Permitir reordenação, remoção e pré-visualização.
- Oferecer página A4 ou tamanho da imagem, orientação automática, margens e modos
  “conter” e “preencher”.
- Aplicar limites iniciais de 50 imagens e 100 MB no total.
- Gerar o arquivo com `Blob`, sem upload ou persistência no servidor.

Referência técnica: <https://pdf-lib.js.org/docs/api/classes/pdfdocument>

## Impacto no servidor

Nenhum. CPU e memória são usadas no navegador. Fotografias grandes precisam ser
redimensionadas antes de entrar no PDF para evitar travamentos e arquivos excessivos.

## Fora de escopo do MVP

- OCR, filtros, edição ou remoção de fundo.
- HEIC/HEIF.
- Histórico na conta.
- Processamento em lote no backend.

## Critérios de aceitação

- [x] JPEG, PNG e WebP válidos podem ser adicionados.
- [x] O usuário pode ordenar e remover imagens antes da geração.
- [x] A orientação visual da foto é preservada.
- [x] A configuração de página, margem e ajuste aparece no resultado.
- [x] Cada imagem gera uma página na ordem escolhida.
- [x] O PDF final pode ser aberto e baixado.
- [x] Arquivos inválidos ou acima dos limites geram mensagens claras.
- [x] Nenhuma imagem é enviada ao servidor.
- [x] URLs e bitmaps temporários são liberados após remoção e conclusão.
- [x] A rota funciona em desktop e telas móveis.

## Evidências esperadas

- Testes com imagens horizontais, verticais, transparentes e WebP.
- PDF de referência validando ordem e dimensões.
- Teste manual com fotos grandes em um dispositivo de memória limitada.
