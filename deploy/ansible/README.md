# Ansible para preparar e operar a Oracle

Execute os playbooks no seu PC. Eles acessam somente o grupo `oracle`; o caseiro não está no inventário. Criar estes arquivos não executa a migração.

O pacote usa módulos do `ansible-core`, sem roles externas ou coleção Docker. Os comandos Compose chamam o mesmo wrapper usado na operação manual. Os builds e testes não mudam a arquitetura para amd64.

## 1. Instalar no PC

Na raiz do repositório:

```bash
python3 -m venv /tmp/utileasy-ansible
/tmp/utileasy-ansible/bin/pip install 'ansible-core>=2.18,<2.20'
. /tmp/utileasy-ansible/bin/activate
cd deploy/ansible
```

O ambiente em `/tmp` é descartável. Depois de um reboot, recrie-o se necessário. Não instale Ansible no servidor só para executar estes arquivos.

## 2. Conferir inventário e acesso

`inventory.yml` aponta para a Oracle conhecida, como `virgilio`, usando a chave privada no seu PC. Ajuste o caminho caso use outro computador. Prefira trocar o endereço pelo IP Tailscale depois de testar esse acesso.

Para manter ajustes locais sem versioná-los:

```bash
cp inventory.yml inventory.local.yml
nano inventory.local.yml
ansible -i inventory.local.yml oracle -m ansible.builtin.ping
```

Adicione `-i inventory.local.yml` também aos comandos seguintes se usar essa cópia. A verificação de identidade SSH permanece habilitada; conecte-se primeiro por SSH e confira a identidade do host. A chave privada fica somente no PC.

Todos os playbooks usam sudo; `-K` pede a senha interativamente. Não grave senha no inventário. Se precisar preparar a conta por `ubuntu`, use `-e ansible_user=ubuntu` apenas em `prepare.yml`; o usuário de aplicação continua `virgilio`.

Uma chave pública adicional é opcional. Para obtê-la, no PC:

```bash
ssh-keygen -y -f /home/paulocerqueira/.ssh/ssh-keyServerMain.key > /tmp/oracle-admin.pub
```

Informe `-e ssh_public_key_file=/tmp/oracle-admin.pub` na preparação. Nunca forneça o arquivo privado `.key` nessa variável. O playbook adiciona a chave sem remover as existentes. Computadores diferentes podem ter chaves diferentes, cada pública em sua linha no servidor.

## 3. Preparar host

```bash
ansible-playbook prepare.yml -K
```

Instala ferramentas, Docker oficial, Tailscale e Restic ARM64 `0.18.1`; mantém o UID/GID existente, configura logs e limita o journal. O download Restic é conferido contra o checksum da release oficial via HTTPS.

O playbook preserva as demais opções de `/etc/docker/daemon.json`. Se a nova configuração exigir reinício e já houver containers ativos, ele para antes de escrevê-la. Quando você deliberadamente agendar a interrupção:

```bash
ansible-playbook prepare.yml -K -e docker_restart_permitted=true
```

Entre novamente por SSH depois de adicionar o grupo Docker. Os outros playbooks usam sudo e não dependem de uma sessão antiga receber o grupo novo.

Autenticação Tailscale é interativa: no servidor, execute `sudo tailscale up`. Teste uma nova sessão privada antes de fechar a entrada pública 22 no painel. Este playbook não altera sshd, firewall OCI, Security Lists, swap, distribuição Ubuntu ou autenticação da tailnet. Essas decisões continuam no [guia manual](../../GUIA_MIGRACAO_VPS.md).

## 4. Configurar checkout e segredos

O checkout `/home/virgilio/utileasy` deve existir e estar no commit aprovado. O Ansible não faz pull, reset ou upload da árvore inteira: atualizar código é uma ação separada do operador.

Pode reutilizar `.env` e token já existentes na Oracle, ou fornecer os arquivos no PC:

```text
deploy/ansible/secrets/
  env
  cloudflare-tunnel-token
```

Esse diretório é ignorado pelo Git. Crie-o com modo `700` e mantenha arquivos em `600`. Não copie segredos para os exemplos versionados. Quando os arquivos locais existem, são a fonte para a próxima execução e sobrescrevem os correspondentes no destino; mantenha-os atualizados. Arquivos criptografados por Ansible Vault também podem ser usados pelo módulo `copy`, acrescentando `--ask-vault-pass`.

```bash
ansible-playbook configure.yml -K
```

Instala o override e Caddyfile Oracle sem docs, ajusta PUID/PGID aos IDs reais e protege `.env`/token. Preserva os demais valores do `.env`; revise que domínio, polling, cookies seguros, Turnstile e segredos estão corretos. Cria `reverse_proxy`, instala scripts/units existentes e configura três workers/quatro filas no monitor. Não inicia aplicação nem habilita timers novos; também não desabilita timers que você já ativou anteriormente.

Para copiar configurações de backup antigas, coloque também em `secrets/`:

```text
utileazy-backup.conf
utileazy-restic-password
utileazy-alerts
```

Depois:

```bash
ansible-playbook configure.yml -K -e install_backup_config=true
```

Reutiliza a senha e o repositório existentes e corrige caminhos de `UtilityDev` para `utileasy`. Não inicializa Restic nem gera senha nova. Revise também caminhos opcionais em `BACKUP_HOST_PATHS`. Tarefas que manipulam segredos usam `no_log` e não exibem diff; não use depuração que imprima seu conteúdo.

## 5. Validar ARM64 sem iniciar produção

```bash
ansible-playbook validate.yml -K
```

Exige ARM64 e pelo menos 10 GiB livres no filesystem do checkout, faz pull nativo das imagens de runtime, constrói as imagens da aplicação e executa:

- Imports Python e `pip check`.
- DOCX → PDF → DOCX com texto e tamanho verificados.
- Geração de áudio MP3 pelo ffmpeg.
- Validação do Caddyfile e presença de curl para o healthcheck.
- TypeScript e testes frontend.

São containers descartáveis com `--no-deps`. Nenhum worker Celery, beat ou conector é iniciado por este playbook; ele não conecta registros históricos ao provedor. Builds podem consumir CPU, disco e rede: rode antes do corte. Não execute `validate.yml` durante produção sem planejar a carga e possíveis alterações de tags locais.

Este teste não comprova login público, AssemblyAI, carga real ou a fidelidade de todo documento. Os testes backend com banco e os testes de n8n/Radar permanecem no guia. Em caso de erro, não retire versões fixadas nem use emulação para fazer a etapa passar.

## 6. Iniciar bancos para ensaio

```bash
ansible-playbook stage.yml -K
```

Inicia somente db/Redis; não para serviços que já estejam ativos. Use apenas no destino em preparação. Faça o restore de ensaio manualmente conforme o guia, com escritores parados. Não use este comando como garantia de isolamento de uma máquina que já entrou em produção.

## 7. Conduzir corte manual e ativar

Siga o [guia manual, etapas 14–15](../../GUIA_MIGRACAO_VPS.md): separar docs, bloquear novas entradas, drenar jobs, parar escritores, fazer dumps/tar consistentes, transferir, conferir hashes e restaurar o estado final. Garanta que não sobrou fila de teste na Oracle e que os bancos corretos estão ativos.

Pare o conector antigo e confira no painel que ele desconectou. Só então:

```bash
ansible-playbook activate.yml -K -e migration_ready=true
```

O playbook exige essa variável antes de iniciar aplicação/consumidores e depois o tunnel. Não constrói nem puxa novas imagens nessa etapa. `migration_ready=true` é sua declaração de que as verificações manuais terminaram, não uma checagem automática do caseiro ou do painel Cloudflare.

n8n, Radar, docs e TrendLens não são iniciados/parados por esses playbooks. São projetos externos a este repositório; seus próprios Compose, locks, credenciais e persistência seguem o guia. O Caddy Oracle tem a rota de n8n: ela só funcionará quando esse serviço estiver na rede `reverse_proxy`.

## 8. Validar produção e ativar rotina

Teste HTTPS, login/logout, Turnstile, transcrição/polling, PDF e conversões. Depois:

```bash
ansible-playbook operations.yml -K -e production_verified=true
```

Executa backup e restore-test em sequência. Se qualquer um falhar, não habilita os timers seguintes. Ambos usam o lock existente e falham caso outra operação de backup esteja em andamento; aguarde, não apague o lock. Após sucesso, habilita os quatro timers de backup/monitoramento e executa o monitor. Timers `Persistent=true` podem disparar imediatamente ao serem habilitados; confira os logs.

Esse playbook cobre somente o backup Utileasy existente. Backup/restore de n8n e Radar e desativação dos produtores antigos são obrigatórios, mas continuam no procedimento manual. Os alertas reais de falha já associados aos units podem enviar notificações; nenhum envio de teste é feito pelo Ansible.

## Verificação local e limites

No PC, dentro de `deploy/ansible`:

```bash
for play in prepare configure validate stage activate operations; do
  ansible-playbook "$play.yml" --syntax-check || break
done
python3 -m unittest discover -s tests -p 'test_*.py'
```

O teste local usa `docker compose config`, sem daemon, rede ou segredos reais. Confere que o merge não publica portas, remove a rede docs, preserva volumes `utilitydev` e mantém filas/health dependencies/logging dos workers. Não é teste de execução dos playbooks no host.

Não há `site.yml` que execute tudo: preparação, restore, conexão do tunnel e rotina têm momentos diferentes. `--syntax-check` é seguro localmente; `--check` não substitui execução e não é suportado como ensaio completo de instalação/build, porque comandos dependem de pacotes e arquivos criados nas etapas anteriores.

Nenhum playbook apaga volumes, restaura banco, drena o caseiro, altera rotas Cloudflare, fecha SSH ou faz rollback automático. Isso preserva a migração manual solicitada e evita repetir operações de dados ao reaplicar configuração.
