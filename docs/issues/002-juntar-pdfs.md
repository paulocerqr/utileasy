# [Arquivos] Implementar a mesclagem real de PDFs

**Categoria:** Arquivos  
**Tipo:** Frontend  
**Complexidade:** Média  
**Prioridade sugerida:** Etapa 2

## Descrição da tarefa

Concluir `/juntarpdf`, gerando no navegador um único PDF com todos os documentos na
ordem definida pelo usuário e oferecendo o download imediato do resultado.

## Contexto atual

Seleção múltipla, drag-and-drop, validação, prévia da primeira página, remoção,
reordenação e limite acumulado de 100 MB já existem. O botão final ainda não produz o
arquivo. A home diz “juntar e separar”, mas esta issue cobre somente a mesclagem.

## Solução proposta

- Adicionar `pdf-lib` ao frontend.
- Ler cada arquivo com `arrayBuffer()`.
- Carregar os documentos, copiar todas as páginas na ordem atual e gerar o PDF final.
- Executar o trabalho depois de uma ação explícita, mostrar progresso por arquivo e
  impedir cliques duplicados.
- Gerar o download com `Blob` e revogar a URL temporária depois do uso.
- Manter todo o conteúdo no navegador; nenhum PDF será enviado ao backend.
- Alterar temporariamente os textos da home e da navegação para “Juntar PDFs”. A
  separação de páginas deverá ter uma issue própria.

Referência técnica: <https://pdf-lib.js.org/>

## Impacto no servidor

Nenhum processamento, upload ou storage. O impacto é exclusivamente na memória e CPU
do dispositivo do usuário. O limite atual de 100 MB deve ser reavaliado em celulares,
pois a mesclagem pode usar várias vezes o tamanho dos arquivos em RAM.

## Fora de escopo do MVP

- Separar, rotacionar, excluir ou editar páginas individualmente.
- PDFs protegidos por senha.
- OCR, compressão ou otimização do resultado.
- Histórico sincronizado com a conta.

## Critérios de aceitação

- [ ] Dois ou mais PDFs válidos podem ser unidos.
- [ ] A ordem das páginas segue exatamente a ordem visual dos arquivos.
- [ ] Todas as páginas de cada arquivo são preservadas.
- [ ] O resultado é um PDF válido com nome previsível e download imediato.
- [ ] Nenhum conteúdo é enviado pela rede.
- [ ] PDFs protegidos, inválidos ou corrompidos são rejeitados sem quebrar a página.
- [ ] O botão mostra processamento e não inicia duas mesclagens simultâneas.
- [ ] Objetos, documentos e URLs temporárias são liberados depois do uso.
- [ ] A cópia da home não promete separação de páginas enquanto ela não existir.
- [ ] Testes cobrem ordem, quantidade de páginas, erro e limite acumulado.

## Evidências esperadas

- Teste automatizado com PDFs pequenos de quantidades de páginas diferentes.
- Verificação manual em desktop e dispositivo móvel.
- Medição aproximada de memória com arquivos próximos ao limite.

