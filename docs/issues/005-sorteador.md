# [Produtividade] Implementar sorteador de números e itens

**Categoria:** Produtividade  
**Tipo:** Frontend  
**Complexidade:** Baixa  
**Prioridade sugerida:** Etapa 1

**Estado:** Implementada

## Descrição da tarefa

Criar uma ferramenta para sortear números ou itens de uma lista, com validação,
resultado claro e opção de repetir sem enviar dados ao servidor.

## Solução proposta

- Criar a rota `/sorteador`.
- Oferecer os modos “intervalo numérico” e “lista de itens”.
- Usar `crypto.getRandomValues()` com rejeição de viés para números e Fisher–Yates
  para listas; não usar `Math.random()` como fonte principal.
- Permitir sortear um ou vários resultados sem repetição.
- Normalizar linhas vazias e oferecer uma opção explícita para remover duplicados.
- Permitir copiar o resultado e reiniciar o sorteio.
- Manter estado somente durante a sessão da página.

## Impacto no servidor

Nenhum. A ferramenta funciona integralmente no navegador, sem API, banco ou storage.

## Fora de escopo do MVP

- Sorteios auditáveis, concursos, prêmios financeiros ou valor jurídico.
- Sincronização entre dispositivos.
- Histórico em conta ou compartilhamento em tempo real.

## Critérios de aceitação

- [x] Um número é sorteado dentro do intervalo inclusivo informado.
- [x] Intervalos inválidos ou excessivos são rejeitados com mensagem clara.
- [x] Itens vazios são ignorados.
- [x] O sorteio sem repetição nunca retorna o mesmo índice duas vezes.
- [x] A quantidade solicitada não pode exceder os itens disponíveis.
- [x] O resultado pode ser copiado.
- [x] Nenhum dado é enviado pela rede ou persistido.
- [x] A interface funciona por teclado e anuncia o resultado para leitores de tela.
- [x] Testes cobrem limites numéricos, duplicados, quantidade e ausência de repetição.
