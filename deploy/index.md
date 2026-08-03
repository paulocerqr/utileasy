A arquitetura recomendada é publicar o Utileazy exclusivamente pelo Cloudflare Tunnel, sem
  encaminhar nenhuma porta no roteador. O Caddy continuará como reverse proxy, mas ficará
  acessível apenas dentro da rede Docker.

  Internet
     |
  Cloudflare: DNS, TLS, WAF e proteção
     |
  Cloudflare Tunnel — conexão iniciada pelo servidor
     |
  cloudflared (Docker)
     |
  Caddy HTTP interno
     |
  Next.js
     |
  Django → PostgreSQL / Redis / Celery

  PostgreSQL, Redis, Django, Next e Caddy não terão portas públicas. SSH ficará restrito à
  rede administrativa ou Tailscale.

  ## Fase 1 — Preparação e correções obrigatórias

  Antes de conectar o domínio:

  1. Atualizar as dependências vulneráveis do frontend e refazer a auditoria.
  2. Rotacionar a chave AssemblyAI mencionada no documento de publicação.
  3. Alterar o .gitignore para cobrir .env.*, preservando .env.example.
  4. Aplicar permissão 600 ao .env.
  5. Configurar:

  DJANGO_DEBUG=0
  DJANGO_SECURE_COOKIES=1
  DJANGO_ALLOWED_HOSTS=backend
  DJANGO_CSRF_TRUSTED_ORIGINS=https://dominio
  DJANGO_CORS_ALLOWED_ORIGINS=https://dominio
  PUBLIC_BASE_URL=https://dominio

  6. Usar chaves reais do Turnstile, restringindo hostname e ação.
  7. Fazer backup do PostgreSQL e dos arquivos de configuração antes de qualquer alteração.
  8. Confirmar espaço livre, memória, swap, temperatura e integridade do disco.

  Critério de conclusão: testes do backend, TypeScript, build do frontend e auditoria de
  dependências aprovados.

  ## Fase 2 — Adequar o Docker para servidor caseiro com Tunnel

  Não utilizaremos diretamente o perfil VPS atual, pois ele publica portas 80 e 443. A ideia
  é criar um override específico, por exemplo:

  docker-compose.home-tunnel.yml

  Alterações planejadas:

  - Remover a publicação da porta 3000 do frontend.
  - Adicionar Caddy sem ports, apenas disponível nas redes Docker.
  - Adicionar cloudflared, também sem portas publicadas.
  - Fazer o Tunnel apontar para http://caddy:8080.
  - Fazer o Caddy encaminhar para http://frontend:3000.
  - Não expor 8000, 5432 ou 6379.
  - Manter worker solo, concorrência 1 e FFmpeg com um thread.
  - Adicionar health checks e rotação dos logs Docker.
  - Fixar versões testadas das imagens Caddy e cloudflared, em vez de depender
    indefinidamente de tags flutuantes.

  - Armazenar o token do Tunnel em arquivo secreto. Um token de túnel permite que qualquer
    pessoa que o possua execute o conector, portanto precisa ser tratado como senha. O
    cloudflared atual aceita token por arquivo. Cloudflare Tunnel tokens
    (https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/)

  Limites iniciais aproximados:

   Serviço             Memória
  ━━━━━━━━━━━━━━━  ━━━━━━━━━━━━
   PostgreSQL           768 MB
  ───────────────  ────────────
   Redis                160 MB
  ───────────────  ────────────
   Django               768 MB
  ───────────────  ────────────
   Celery worker        1,5 GB
  ───────────────  ────────────
   Celery Beat          192 MB
  ───────────────  ────────────
   Next.js              768 MB
  ───────────────  ────────────
   Caddy            128–256 MB
  ───────────────  ────────────
   cloudflared      128–256 MB

  Isso preserva aproximadamente 1–1,5 GB para sistema operacional, cache e picos.
  Precisaremos validar sob carga real.

  ## Fase 3 — Configurar Caddy e IP real

  O Caddy não precisará obter certificado público: o HTTPS termina na Cloudflare, o túnel é
  criptografado até o cloudflared e o salto Caddy–Next acontece dentro do mesmo host Docker.

  O Caddy deverá:

  - Escutar somente na rede Docker.
  - Encaminhar todo o site para o frontend.
  - Ter timeouts compatíveis com uploads.
  - Preservar corretamente host, protocolo e IP do visitante.
  - Produzir logs com rotação e sem credenciais.

  Há uma correção obrigatória no projeto: atualmente o Django utiliza o primeiro endereço de
  X-Forwarded-For, enquanto o proxy Next copia os headers recebidos. Isso pode permitir
  falsificação do IP e comprometer os rate limits.

  Precisaremos normalizar o IP na borda confiável usando CF-Connecting-IP e impedir que um
  valor enviado pelo próprio visitante seja aceito. A Cloudflare recomenda CF-Connecting-IP
  para recuperar o endereço original, e o Caddy recomenda proxies confiáveis com parsing
  estrito quando existe CDN à frente. Headers da Cloudflare
  (https://developers.cloudflare.com/fundamentals/reference/http-headers/), trusted_proxies
  do Caddy (https://caddyserver.com/docs/caddyfile/options)

  Critério de conclusão: tentativas de forjar X-Forwarded-For não alteram o IP reconhecido
  pelo backend.

  ## Fase 4 — Configurar Cloudflare Tunnel

  1. Colocar o domínio na Cloudflare.
  2. Criar um túnel nomeado e gerenciado remotamente.
  3. Criar somente um hostname público inicial.
  4. Apontar esse hostname para:

  http://caddy:8080

  5. Executar cloudflared pelo Compose usando token em arquivo.
  6. Permitir saída TCP e UDP na porta 7844; o Tunnel não precisa de nenhuma porta de
     entrada. Firewall do Cloudflare Tunnel
     (https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/)

  7. Habilitar proteção da Cloudflare, desafio para tráfego suspeito e uma regra de rate
     limit para endpoints sensíveis.

  8. Manter Django Admin fora do túnel. Administração será feita por LAN confiável ou
     Tailscale.

  9. Durante o primeiro período de testes, proteger o site inteiro com Cloudflare Access e
     liberar apenas nossa conta. Depois, remover essa barreira das páginas públicas.
     Cloudflare Access pode proteger domínios ou caminhos específicos. Cloudflare Access
     (https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)

  ### Limitação importante de upload

  O projeto aceita atualmente até 500 MB, mas a Cloudflare limita o corpo da requisição
  conforme o plano:

  - Free/Pro: 100 MB
  - Business: 200 MB
  - Enterprise: 500 MB

  Limites de requisição da Cloudflare
  (https://developers.cloudflare.com/workers/platform/limits/)

  Para o plano gratuito, recomendo reduzir o limite do frontend e backend para
  aproximadamente 95 MB, deixando margem para o envelope multipart. Essa decisão precisa
  acontecer antes da abertura pública.

  ## Fase 5 — Firewall e proteção da rede doméstica

  ### Roteador

  - Remover qualquer redirecionamento de portas para o servidor.
  - Desativar UPnP/NAT-PMP, administração remota e WPS.
  - Reservar um IP DHCP para o servidor.
  - Atualizar firmware e senha administrativa.
  - Idealmente criar uma VLAN/DMZ exclusiva para o servidor.
  - Bloquear tráfego iniciado pelo servidor em direção à LAN principal.
  - Permitir administração a partir de um dispositivo ou VLAN específica.

  A segmentação é a camada mais importante: se o servidor for comprometido, um firewall
  apenas no próprio servidor não garante que ele não tente acessar outros equipamentos da
  casa. Para um isolamento realmente forte, a regra precisa existir também no roteador ou
  switch.

  ### Firewall do host

  A ferramenta dependerá do sistema operacional: UFW em Ubuntu/Debian, firewalld em outras
  distribuições ou regras nftables diretamente.

  Política aplicada no servidor Ubuntu:

  - Entrada: negar por padrão.
  - Encaminhamento: negar por padrão, exceto regras necessárias às redes Docker.
  - SSH: permitir somente pela interface Tailscale ou pelo IP/sub-rede administrativa.
  - Não permitir entrada em 80, 443, 3000, 8000, 5432 ou 6379.
  - Saída para a Internet: permitir por padrão durante a estabilização, preservando DNS,
    NTP, HTTPS, Tailscale e Cloudflare Tunnel.
  - Manter tráfego estabelecido/relacionado.
  - Bloquear tráfego lateral do servidor e dos containers para as demais redes privadas, com
    exceções explícitas.

  Docker e UFW exigem cuidado: portas publicadas pelo Docker podem ser desviadas antes das
  regras normais do UFW. Por isso, a principal defesa é não publicar portas e complementar
  com regras na cadeia `DOCKER-USER`. Docker e firewalls
  (https://docs.docker.com/engine/network/packet-filtering-firewalls/)

  Também foram aplicados:

  - SSH somente por chave.
  - PermitRootLogin no.
  - PasswordAuthentication no.
  - Usuário administrativo sem login direto como root.
  - Atualizações automáticas apenas de segurança, com janela controlada.
  - Nenhum container com Docker socket, modo privilegiado ou network_mode: host.

  A instalação, persistência, verificação e recuperação dessas regras estão documentadas em
  `deploy/host-firewall/README.md`. A validação incluiu reboot completo, recuperação dos oito
  containers, Tunnel saudável e Caddy respondendo HTTP 200 internamente.

  Permanecem dependentes do provedor: remover ou justificar regras de encaminhamento do
  equipamento gerenciado, reservar o endereço DHCP, corrigir SNTP e implementar uma VLAN ou
  ACL que isole o servidor da rede principal. O bloqueio no host é uma defesa adicional, não
  substitui segmentação no roteador ou switch.

  ## Fase 6 — Publicação gradual

  1. Subir o sistema apenas na LAN/Tailscale.
  2. Testar upload, polling, PDF, login e Turnstile.
  3. Subir Caddy internamente.
  4. Ativar Tunnel com Cloudflare Access restrito.
  5. Operar por 24–48 horas observando CPU, RAM, temperatura, disco e filas.
  6. Testar upload próximo do limite permitido.
  7. Inicialmente manter polling.
  8. Depois de estabilizar o túnel, mudar para webhook, que reduz consultas à AssemblyAI.
  9. Liberar o site publicamente.
  10. Nunca usar docker compose down -v durante atualização.

  ## Fase 7 — Testes de segurança obrigatórios

  Antes da abertura:

  - Escanear o IP residencial de uma rede externa: nenhuma porta deve responder.
  - Escanear o servidor pela LAN: somente SSH administrativo, se permitido.
  - Conferir ss -lntup e as portas publicadas pelo Docker.
  - Confirmar que banco, Redis, Django e Next não são acessíveis diretamente.
  - Tentar forjar X-Forwarded-For e CF-Connecting-IP.
  - Testar rate limit usando duas conexões externas diferentes.
  - Testar CAPTCHA inválido, expirado e válido.
  - Testar webhook com segredo incorreto.
  - Confirmar cookies Secure, HttpOnly e SameSite.
  - Reiniciar o servidor e verificar recuperação automática.
  - Desligar o Tunnel e confirmar que não existe caminho alternativo até a aplicação.
  - Executar uma transcrição longa e observar memória, swap, load e I/O.
  - Restaurar um backup de teste do PostgreSQL.

  ## Fase 8 — Operação contínua

  - Backup diário com pg_dump, criptografado e armazenado fora do servidor.
  - Teste periódico de restauração.
  - Limite e rotação dos logs Docker.
  - Alertas para disco, containers parados e Tunnel desconectado.
  - Atualização mensal das imagens e dependências.
  - Revisão dos eventos da Cloudflare, Django e Caddy.
  - Manutenção dos limites anônimos e da cota AssemblyAI.
  - Considerar um nobreak, especialmente se PostgreSQL estiver em HD mecânico.

  Para iniciarmos a implementação, os primeiros dados necessários são: distribuição e versão
  do Linux, modelo do roteador, possibilidade de VLAN/rede de convidados, domínio que será
  usado e se o acesso administrativo continuará pelo Tailscale.
