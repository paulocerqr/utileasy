# Firewall do servidor caseiro

Este procedimento protege o host Ubuntu usado pelo perfil
`docker-compose.home-tunnel.yml`. Ele pressupõe que:

- a aplicação é publicada exclusivamente pelo Cloudflare Tunnel;
- nenhuma porta Docker é publicada no host;
- o acesso administrativo acontece pelo Tailscale;
- uma chave SSH foi testada em uma segunda sessão antes de desativar senhas;
- o administrador tem acesso físico de recuperação ao servidor.

Mantenha uma sessão SSH aberta durante cada alteração. Não use este roteiro sem adaptar
interfaces, sub-redes e prefixos ao servidor real.

## UFW

A política inicial é negar entrada e encaminhamento, permitir saída e liberar somente SSH
pela interface Tailscale e o transporte WireGuard do Tailscale:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw default deny routed
sudo ufw allow in on tailscale0 to any port 22 proto tcp comment 'SSH via Tailscale'
sudo ufw allow 41641/udp comment 'Tailscale transport'
sudo ufw logging low
sudo ufw --force enable
```

Para impedir que processos do host iniciem conexões contra a LAN, primeiro permita o
transporte direto do Tailscale e depois negue o restante. Repita para cada interface física:

```bash
sudo ufw allow out on <interface> proto udp to <lan-cidr> port 41641 \
  comment 'Tailscale direct LAN'
sudo ufw deny out on <interface> to <lan-cidr> comment 'Block host lateral LAN'
```

Se a LAN usar IPv6, repita as duas regras com o prefixo IPv6 conectado. Prefixos delegados
pelo provedor podem mudar; confira-os depois de reconexões ou alterações no roteador.

## SSH

Crie `/etc/ssh/sshd_config.d/00-utileazy-hardening.conf` somente depois de validar o acesso
por chave:

```text
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
```

Valide antes de recarregar:

```bash
sudo sshd -t
sudo systemctl reload ssh
```

O cliente deve usar a chave esperada explicitamente, por exemplo com `IdentityFile` e
`IdentitiesOnly yes` no arquivo `~/.ssh/config`.

## Isolamento da saída dos containers

O Docker processa tráfego encaminhado antes das regras normais do UFW. O script deste
diretório instala regras idempotentes na cadeia `DOCKER-USER`, bloqueando conexões iniciadas
pelas redes Docker contra a LAN.

Confira os valores antes da instalação:

```bash
docker network inspect $(docker network ls -q) \
  --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}} {{end}}'
```

Edite `utileazy-docker-lan-guard.default` se os valores forem diferentes. Depois instale:

```bash
sudo install -o root -g root -m 0750 \
  deploy/host-firewall/utileazy-docker-lan-guard \
  /usr/local/sbin/utileazy-docker-lan-guard
sudo install -o root -g root -m 0644 \
  deploy/host-firewall/utileazy-docker-lan-guard.default \
  /etc/default/utileazy-docker-lan-guard
sudo install -o root -g root -m 0644 \
  deploy/host-firewall/utileazy-docker-lan-guard.service \
  /etc/systemd/system/utileazy-docker-lan-guard.service
sudo systemctl daemon-reload
sudo systemctl enable --now utileazy-docker-lan-guard.service
```

O serviço falha de forma visível se o Docker não fornecer a cadeia `DOCKER-USER`. Ele não
deve criar a cadeia nem modificar regras gerenciadas pelo Docker.

## Atualizações automáticas de segurança

O arquivo `52utileazy-security` habilita a atualização diária sem permitir reboot
automático. Antes de instalá-lo, confirme que `-updates`, `-proposed` e `-backports` não estão
habilitados em `Unattended-Upgrade::Allowed-Origins`.

```bash
sudo install -o root -g root -m 0644 \
  deploy/host-firewall/52utileazy-security \
  /etc/apt/apt.conf.d/52utileazy-security
sudo install -d -m 0755 \
  /etc/systemd/system/apt-daily.timer.d \
  /etc/systemd/system/apt-daily-upgrade.timer.d
sudo install -o root -g root -m 0644 \
  deploy/host-firewall/apt-daily.override.conf \
  /etc/systemd/system/apt-daily.timer.d/override.conf
sudo install -o root -g root -m 0644 \
  deploy/host-firewall/apt-daily-upgrade.override.conf \
  /etc/systemd/system/apt-daily-upgrade.timer.d/override.conf
sudo systemctl daemon-reload
sudo systemctl restart apt-daily.timer apt-daily-upgrade.timer
sudo unattended-upgrade --dry-run
```

Os timers usam o fuso do host: atualização das listas entre 04:00 e 04:15 e instalação
entre 04:30 e 04:45. Reinicializações exigidas por kernel continuam manuais.

## Verificação

```bash
sudo ufw status verbose
sudo sshd -T | grep -e '^permitrootlogin ' -e '^passwordauthentication '
sudo iptables -L DOCKER-USER -n -v --line-numbers
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Um container deve continuar alcançando a Internet, mas não um equipamento da LAN. Depois
dos testes, reinicie o servidor e repita as verificações. O resultado esperado é:

- UFW, SSH, Docker, Tailscale e o guard ativos;
- apenas SSH pela `tailscale0` como entrada administrativa;
- nenhuma porta Docker publicada;
- uma regra `DOCKER-USER` por sub-rede Docker;
- Caddy e Cloudflare Tunnel saudáveis;
- todos os serviços da aplicação recuperados automaticamente.

## Limitações e manutenção

- A segmentação no host reduz movimento lateral, mas não substitui uma VLAN ou ACL no
  roteador/switch.
- Revise `LAN_CIDR`, `DOCKER_SUBNETS`, interfaces e prefixo IPv6 depois de mudanças de rede.
- Não desative a criação de regras `iptables` pelo Docker; isso pode quebrar a rede dos
  containers.
- Nunca publique banco, Redis, backend, frontend ou Caddy diretamente no host.
- Não use `docker compose down -v` em atualizações.
