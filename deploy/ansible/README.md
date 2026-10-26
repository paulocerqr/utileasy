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

### 4.1. Entender o caminho dos arquivos

O Ansible não busca credenciais no caseiro. Você copia do **CASEIRO para o PC**, e `configure.yml` copia do **PC para a ORACLE**. Se `.env` e token já estiverem na Oracle, pode reutilizá-los sem criar cópias locais. As configurações de backup também podem ser instaladas manualmente no destino.

| Origem no caseiro | Nome em `deploy/ansible/secrets/` no PC | Destino na Oracle |
| --- | --- | --- |
| `/home/virgilio/UtilityDev/.env` | `env` | `/home/virgilio/utileasy/.env` |
| `/home/virgilio/UtilityDev/secrets/cloudflare-tunnel-token` | `cloudflare-tunnel-token` | `/home/virgilio/utileasy/secrets/cloudflare-tunnel-token` |
| `/etc/utileazy-backup.conf` | `utileazy-backup.conf` | `/etc/utileazy-backup.conf` |
| `/etc/utileazy-restic-password` | `utileazy-restic-password` | `/etc/utileazy-restic-password` |
| `/etc/default/utileazy-alerts` | `utileazy-alerts` | `/etc/default/utileazy-alerts` |

Os dois primeiros arquivos são necessários à aplicação; os três últimos configuram backup/alertas e são copiados somente com `install_backup_config=true`. A chave privada SSH `.key` permanece no PC e não entra nesse diretório nem é enviada à Oracle.

### 4.2. Copiar ambiente e token para o PC

**No PC**, em um terminal dentro de `deploy/ansible` do checkout local:

```bash
umask 077
mkdir -p secrets
chmod 700 secrets
scp virgilio@100.65.207.104:/home/virgilio/UtilityDev/.env secrets/env
scp virgilio@100.65.207.104:/home/virgilio/UtilityDev/secrets/cloudflare-tunnel-token secrets/cloudflare-tunnel-token
chmod 600 secrets/env secrets/cloudflare-tunnel-token
```

O arquivo `.env` recebe o nome **`env`, sem ponto**, somente na pasta local. O playbook volta a usar `.env` no destino. Se seu SSH para o caseiro exigir outra identidade, acrescente `-i /caminho/da/chave-privada-do-caseiro` aos comandos `scp`; a chave Oracle não necessariamente dá acesso ao caseiro.

Esperado: os dois comandos SCP terminam sem erro. Não use `cat` para conferir credenciais; confira existência/permissões com `ls -l secrets/`.

### 4.3. Exportar e copiar configurações de backup

Os arquivos em `/etc` são protegidos e o SCP comum de virgilio não consegue lê-los diretamente. Primeiro faça uma cópia temporária privada com sudo.

**No CASEIRO**, conecte-se por `ssh virgilio@100.65.207.104` e execute:

```bash
umask 077
install -d -m 700 /home/virgilio/utileasy-migracao-segredos
sudo install -o virgilio -g virgilio -m 600 /etc/utileazy-backup.conf /home/virgilio/utileasy-migracao-segredos/utileazy-backup.conf
sudo install -o virgilio -g virgilio -m 600 /etc/utileazy-restic-password /home/virgilio/utileasy-migracao-segredos/utileazy-restic-password
sudo install -o virgilio -g virgilio -m 600 /etc/default/utileazy-alerts /home/virgilio/utileasy-migracao-segredos/utileazy-alerts
```

Digite a senha sudo interativamente. Esses comandos copiam os arquivos sem alterar os originais e sem mostrar conteúdo. Se algum comando falhar, corrija a causa antes de prosseguir; não crie arquivos vazios para substituir os ausentes.

**De volta ao PC**, no mesmo diretório `deploy/ansible` da etapa anterior:

```bash
scp virgilio@100.65.207.104:/home/virgilio/utileasy-migracao-segredos/utileazy-backup.conf secrets/utileazy-backup.conf
scp virgilio@100.65.207.104:/home/virgilio/utileasy-migracao-segredos/utileazy-restic-password secrets/utileazy-restic-password
scp virgilio@100.65.207.104:/home/virgilio/utileasy-migracao-segredos/utileazy-alerts secrets/utileazy-alerts
chmod 600 secrets/utileazy-backup.conf secrets/utileazy-restic-password secrets/utileazy-alerts
```

Confirme que os cinco arquivos são não vazios, sem imprimir seus valores:

```bash
for name in env cloudflare-tunnel-token utileazy-backup.conf utileazy-restic-password utileazy-alerts; do
  if test -s "secrets/$name"; then
    printf 'OK: %s\n' "$name"
  else
    printf 'AUSENTE OU VAZIO: %s\n' "$name"
  fi
done
```

Esperado: cinco linhas `OK`. Se você optou por não copiar configurações de backup agora, confira apenas os dois arquivos da aplicação e não use `install_backup_config=true`.

### 4.4. Aplicar na Oracle pelo Ansible

**No PC**, dentro de `deploy/ansible`, com o ambiente Python da etapa 1 ativo, execute uma das opções:

```bash
# Aplicacao e units; reutiliza configuracoes de backup ja presentes no destino.
ansible-playbook configure.yml -K
```

Ou, para copiar também os três arquivos de backup/alertas:

```bash
ansible-playbook configure.yml -K -e install_backup_config=true
```

Se usa `inventory.local.yml`, acrescente `-i inventory.local.yml`. A senha solicitada por `-K` é a de sudo na **Oracle**, não a do caseiro nem a senha Restic.

O playbook instala o override e Caddyfile Oracle sem docs, ajusta PUID/PGID aos IDs reais e protege `.env`/token. Preserva os demais valores do `.env`; revise que domínio, polling, cookies seguros, Turnstile e segredos estão corretos. Cria `reverse_proxy`, instala scripts/units existentes e configura três workers/quatro filas no monitor. Não inicia aplicação nem habilita timers novos; também não desabilita timers que você já ativou anteriormente.

Com `install_backup_config=true`, reutiliza a senha e o repositório Restic existentes e corrige caminhos de `UtilityDev` para `utileasy`. Não inicializa Restic nem gera senha nova. Revise também caminhos opcionais em `BACKUP_HOST_PATHS`.

**Na ORACLE**, confira somente metadados:

```bash
stat -c '%a %U:%G %n' /home/virgilio/utileasy/.env /home/virgilio/utileasy/secrets/cloudflare-tunnel-token
sudo stat -c '%a %U:%G %n' /etc/utileazy-backup.conf /etc/utileazy-restic-password /etc/default/utileazy-alerts
```

Esperado: modo `600` em todos; dono `virgilio:virgilio` nos dois arquivos da aplicação e `root:root` nos três arquivos de host. A segunda consulta só se aplica se essas configurações foram instaladas.

### 4.5. Proteger as cópias

`secrets/` é ignorado pelo Git, mas isso não criptografa os arquivos. Quando os arquivos locais existem, são a fonte para a próxima execução e sobrescrevem os correspondentes no destino; mantenha-os atualizados. Arquivos criptografados por Ansible Vault também podem ser usados pelo módulo `copy`, acrescentando `--ask-vault-pass`.

Após validar a instalação e garantir uma cópia de recuperação segura, remova as cópias temporárias de `/home/virgilio/utileasy-migracao-segredos` no caseiro. No PC, mantenha os segredos protegidos ou criptografe-os; não apague sua única cópia da senha Restic. Não remova os originais de `/etc` ou do checkout caseiro durante essa limpeza.

Tarefas que manipulam segredos usam `no_log` e não exibem diff; não use depuração que imprima seu conteúdo. Os comandos desta seção não copiam banco de dados, volume n8n ou credenciais/arquivos do Radar: esses dados seguem a migração própria de cada serviço.

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
