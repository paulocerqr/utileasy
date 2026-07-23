# [Mídia] Avaliar e implementar download autorizado de vídeos do YouTube

**Categoria:** Mídia e vídeos  
**Tipo:** Decisão jurídica, backend, worker e frontend  
**Complexidade:** Muito alta  
**Prioridade sugerida:** Etapa 5  
**Estado inicial recomendado:** Bloqueada até decisão de produto

## Descrição da tarefa

Permitir o download de vídeos somente quando o usuário tiver autorização sobre o
conteúdo, com limites técnicos fortes, limpeza rápida e uma decisão explícita sobre
os termos da plataforma e os riscos do serviço.

## Contexto e condição de início

Um aviso de “uso responsável” não elimina os riscos de direitos autorais nem torna o
serviço compatível automaticamente com os termos do YouTube. Antes da implementação,
deve existir uma decisão registrada de `go/no-go`. Se não houver base segura, a
feature deve ser removida da home ou substituída por download de mídia própria.

## Solução proposta caso aprovada

- Criar `/baixar-video` e manter a feature desativada por padrão com
  `YOUTUBE_DOWNLOAD_ENABLED=0`.
- Aceitar apenas URLs HTTPS de hosts explicitamente permitidos do YouTube; não expor
  um downloader genérico de URLs.
- Usar a API Python do `yt-dlp`, nunca concatenar entrada do usuário em shell.
- Consultar metadados antes de criar o job e apresentar título, duração, formatos e
  tamanho estimado.
- Executar downloads em uma fila Celery `downloads`, concorrência 1.
- Preferir download/remux direto. Transcodificação deve ser evitada no MVP.
- Usar FFmpeg somente quando necessário para juntar áudio e vídeo.
- Reutilizar CAPTCHA, limites por IP/cookie e uma cota global específica de banda.
- Armazenar o resultado temporariamente e apagá-lo pouco depois do download.
- Não fornecer cookies do servidor, login em conta Google ou meios de contornar DRM,
  bloqueios regionais, conteúdo privado ou restrições de idade.
- Registrar apenas métricas técnicas; não manter uma biblioteca de vídeos.

Referência técnica: <https://github.com/yt-dlp/yt-dlp>

## Impacto no servidor

Muito alto em transferência e disco; moderado/alto em CPU quando houver FFmpeg. Uma
VPS de 100 GB pode ser preenchida rapidamente e o tráfego pode gerar custo ou
bloqueio do provedor.

Limites iniciais sugeridos:

- até 30 minutos;
- até 500 MB estimados;
- um download ativo por ator;
- concorrência global 1;
- expiração em até 1 hora;
- orçamento diário global de bytes.

## Fora de escopo do MVP

- Playlists, lives, Shorts em lote ou canais completos.
- Vídeos privados, pagos, com DRM, login ou cookies.
- Conversão para diversos codecs e resoluções arbitrárias.
- Persistência no histórico da conta.
- Suporte a sites genéricos.

## Critérios de aceitação

- [ ] Existe uma decisão `go/no-go` registrada antes do desenvolvimento.
- [ ] A feature permanece desabilitada quando a variável não está ativa.
- [ ] Somente hosts permitidos são aceitos e URLs internas/privadas são rejeitadas.
- [ ] Conteúdo privado, protegido, ao vivo ou acima dos limites não é baixado.
- [ ] O usuário confirma possuir autorização antes de iniciar.
- [ ] O processamento ocorre em fila isolada com concorrência e orçamento global.
- [ ] Nenhuma entrada do usuário é interpolada em comandos shell.
- [ ] Arquivos são removidos após download, falha ou expiração.
- [ ] Rate limit e CAPTCHA protegem o endpoint anônimo.
- [ ] Testes não baixam conteúdo real protegido; usam mocks ou mídia própria.

## Riscos

- Mudanças frequentes do YouTube exigem atualizações do `yt-dlp`.
- Bloqueio do IP da VPS.
- Abuso de banda, storage e CPU.
- Responsabilidade jurídica e violação de termos.

