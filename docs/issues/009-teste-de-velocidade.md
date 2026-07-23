# [Devs] Implementar teste de velocidade da conexão

**Categoria:** Devs  
**Tipo:** Frontend e serviço dedicado  
**Complexidade:** Alta  
**Prioridade sugerida:** Etapa 4

## Descrição da tarefa

Medir latência, jitter, download e upload entre o navegador do usuário e um servidor
de teste explicitamente identificado, com proteção contra abuso de banda.

## Contexto

Um teste hospedado na VPS mede o caminho até aquela VPS, não a “velocidade universal”
da conexão. Implementar download/upload no Django ou através do Next ocuparia workers
da aplicação e misturaria tráfego de teste com APIs de negócio.

## Solução proposta

- Fazer um spike com LibreSpeed em um container dedicado.
- Publicar seus endpoints pelo Caddy em uma rota/subdomínio próprio, sem passar por
  Next.js ou Django.
- Criar `/teste-de-velocidade` com interface Utileazy consumindo a API escolhida ou
  integrar a interface suportada pelo serviço.
- Mostrar antes do início que o teste transfere uma quantidade relevante de dados.
- Exigir ação explícita do usuário; nunca iniciar automaticamente.
- Exibir servidor utilizado, ping, jitter, download e upload.
- Desabilitar telemetria e persistência de IP/resultados no MVP.
- Adicionar rate limit na borda e um limite global de testes/banda.
- Permitir desativação por ambiente. No servidor caseiro, a feature deve vir
  desativada por padrão para não saturar o link residencial.

Referência técnica: <https://github.com/librespeed/speedtest>

## Impacto no servidor

Baixo/moderado em CPU, mas muito alto em banda. Testes simultâneos podem saturar a
interface de rede e prejudicar transcrições, downloads e o próprio site.

Antes de implementar, definir:

- franquia e custo de transferência da VPS;
- tamanho/duração máximos de cada teste;
- concorrência global;
- rate limit por IP/cookie;
- comportamento em casa, desenvolvimento e VPS.

## Fora de escopo do MVP

- Ranking de provedores, escolha automática entre vários continentes ou mapa.
- Armazenamento de IP, ISP, localização ou resultados históricos.
- Garantia de precisão equivalente a laboratórios ou provedores especializados.
- Execução automática em segundo plano.

## Critérios de aceitação

- [ ] O teste só inicia após confirmação explícita.
- [ ] A interface identifica o servidor e explica o que está sendo medido.
- [ ] Ping, jitter, download e upload são exibidos com unidades corretas.
- [ ] Django e Next não transportam os corpos grandes do teste.
- [ ] Não há armazenamento de IP ou resultados no MVP.
- [ ] Rate limit e concorrência global impedem testes ilimitados.
- [ ] A feature pode ser desativada por variável de ambiente.
- [ ] O perfil caseiro vem desativado por padrão.
- [ ] Cancelar ou fechar a página interrompe as transferências.
- [ ] Testes de carga demonstram que o site continua responsivo durante um teste.

## Evidências esperadas

- Medição de banda consumida por execução.
- Teste com duas execuções concorrentes.
- Comparação aproximada com outro serviço, documentando que resultados podem variar.

