# [Produtividade] Implementar divisor aleatório de grupos

**Categoria:** Produtividade  
**Tipo:** Frontend  
**Complexidade:** Baixa/Média  
**Prioridade sugerida:** Etapa 1

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

- [ ] Cada participante aparece em exatamente um grupo.
- [ ] Nenhum participante é perdido ou duplicado.
- [ ] No modo por quantidade, a diferença entre grupos é no máximo uma pessoa.
- [ ] No modo por tamanho, nenhum grupo excede o tamanho configurado.
- [ ] Quantidades impossíveis ou inválidas geram mensagem clara.
- [ ] O usuário pode refazer, copiar tudo ou copiar um grupo.
- [ ] Os nomes não saem do navegador.
- [ ] A interface funciona em telas móveis.
- [ ] Testes cobrem divisões exatas, restos e limites.

