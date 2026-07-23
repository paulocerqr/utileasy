# [Produtividade] Implementar sorteio de ordem de apresentação

**Categoria:** Produtividade  
**Tipo:** Frontend  
**Complexidade:** Baixa  
**Prioridade sugerida:** Etapa 1

## Descrição da tarefa

Criar uma ferramenta dedicada a receber participantes ou equipes e produzir uma ordem
aleatória numerada para apresentações.

## Solução proposta

- Criar a rota `/ordem-de-apresentacao`.
- Receber um participante/equipe por linha.
- Validar, aparar espaços e sinalizar nomes repetidos.
- Embaralhar com Fisher–Yates usando `crypto.getRandomValues()`.
- Exibir uma lista numerada com opção de novo sorteio.
- Permitir copiar como texto e baixar `.txt`.
- Exibir aviso de que um novo sorteio substitui a ordem atual.

## Impacto no servidor

Nenhum. Todo o processamento ocorre no navegador.

## Fora de escopo do MVP

- Horários, duração de cada apresentação ou agenda.
- Bloquear participantes em posições específicas.
- Colaboração ao vivo e histórico.
- Sorteio com validade jurídica.

## Critérios de aceitação

- [ ] A ferramenta exige pelo menos dois participantes válidos.
- [ ] Cada participante aparece exatamente uma vez no resultado.
- [ ] A lista final é numerada a partir de 1.
- [ ] Um novo sorteio pode produzir outra ordem após confirmação.
- [ ] O resultado pode ser copiado e baixado em TXT.
- [ ] Entradas duplicadas são claramente tratadas antes do sorteio.
- [ ] Nenhum nome é enviado ou persistido.
- [ ] A interface é utilizável por teclado e em telas móveis.
- [ ] Testes garantem preservação dos participantes e ausência de repetição.

