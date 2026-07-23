# [Produtividade] Implementar divisor aleatório de grupos

**Categoria:** Produtividade  
**Tipo:** Frontend  
**Complexidade:** Baixa/Média  
**Prioridade sugerida:** Etapa 1

**Estado:** Implementada

## Descrição da tarefa

Criar uma ferramenta que distribua participantes aleatoriamente em grupos
equilibrados, escolhendo a quantidade de grupos ou o tamanho máximo de cada grupo.

## Solução proposta

- Criar a rota `/divisor-de-grupos`.
- Receber um participante por linha e validar duplicados.
- Oferecer dois modos mutuamente exclusivos:
  - quantidade de grupos;
  - tamanho máximo por grupo.
- Embaralhar com Fisher–Yates e `crypto.getRandomValues()`.
- Distribuir os participantes em round-robin para que a diferença entre grupos seja
  no máximo uma pessoa quando o modo permitir.
- Permitir renomear grupos, refazer a divisão, copiar todos e copiar um grupo.
- Manter tudo no navegador.

## Impacto no servidor

Nenhum.

## Fora de escopo do MVP

- Balanceamento por habilidade, gênero, função ou qualquer dado sensível.
- Restrições como “duas pessoas não podem ficar juntas”.
- Histórico, login ou colaboração em tempo real.

## Critérios de aceitação

- [x] Cada participante aparece em exatamente um grupo.
- [x] Nenhum participante é perdido ou duplicado.
- [x] No modo por quantidade, a diferença entre grupos é no máximo uma pessoa.
- [x] No modo por tamanho, nenhum grupo excede o tamanho configurado.
- [x] Quantidades impossíveis ou inválidas geram mensagem clara.
- [x] O usuário pode refazer, copiar tudo ou copiar um grupo.
- [x] Os nomes não saem do navegador.
- [x] A interface funciona em telas móveis.
- [x] Testes cobrem divisões exatas, restos e limites.
