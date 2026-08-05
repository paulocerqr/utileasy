# Fase 8: operação contínua

Esta fase transforma as verificações manuais das fases anteriores em uma rotina permanente.
Ela adiciona backup externo criptografado, restauração semanal isolada, retenção, alertas e
um roteiro controlado de atualização. A aplicação continua publicada somente pelo
Cloudflare Tunnel e permanece em `polling` até uma decisão separada sobre webhook.

## 1. Destino externo: Cloudflare R2

O backup usa Restic sobre a API S3 do Cloudflare R2. A criptografia acontece no servidor
antes do envio e a senha do repositório não é armazenada junto dos dados. O bucket definido
para o MVP é `utileazy-backups`, privado, classe `Standard` e sem acesso público.

Crie um Account API Token com `Object Read & Write`, limitado exclusivamente a esse bucket.
Não use token administrativo e não configure regras Lifecycle: o Restic controla a remoção
dos próprios objetos e exclusões independentes podem tornar o repositório irrecuperável.

Formato esperado:

```text
RESTIC_REPOSITORY=s3:https://ACCOUNT_ID.r2.cloudflarestorage.com/utileazy-backups
AWS_ACCESS_KEY_ID=<R2 Access Key ID>
AWS_SECRET_ACCESS_KEY=<R2 Secret Access Key>
AWS_DEFAULT_REGION=auto
```

Um HD conectado permanentemente ao mesmo servidor não é um backup externo. Um NAS na mesma
casa é melhor que o mesmo disco, mas ainda compartilha riscos físicos e elétricos.

## 2. Instalar as ferramentas e a configuração

No Ubuntu Server, a partir da raiz do repositório:

```bash
sudo apt update
sudo apt install --yes restic curl python3

sudo install -d -o root -g root -m 0700 \
  /var/cache/utileazy-restic \
  /var/lib/utileazy-backup \
  /var/lib/utileazy-alerts

sudo install -o root -g root -m 0750 \
  deploy/phase8/utileazy-backup \
  /usr/local/sbin/utileazy-backup
sudo install -o root -g root -m 0750 \
  deploy/phase8/utileazy-backup-restore-test \
  /usr/local/sbin/utileazy-backup-restore-test
sudo install -o root -g root -m 0750 \
  deploy/phase8/utileazy-backup-maintenance \
  /usr/local/sbin/utileazy-backup-maintenance
sudo install -o root -g root -m 0750 \
  deploy/phase8/utileazy-send-alert \
  /usr/local/sbin/utileazy-send-alert

if ! sudo test -e /etc/utileazy-backup.conf; then
  sudo install -o root -g root -m 0600 \
    deploy/phase8/utileazy-backup.conf.example \
    /etc/utileazy-backup.conf
fi
if ! sudo test -e /etc/default/utileazy-alerts; then
  sudo install -o root -g root -m 0600 \
    deploy/phase8/utileazy-alerts.default \
    /etc/default/utileazy-alerts
fi
```

Edite `/etc/utileazy-backup.conf`, substitua `ACCOUNT_ID`,
`CONFIGURE_R2_ACCESS_KEY_ID` e `CONFIGURE_R2_SECRET_ACCESS_KEY` pelos valores mostrados uma
única vez ao criar o token. Use o endpoint exibido no painel se ele diferir do padrão.
Depois confirme `root:root`, modo `0600` e ausência de marcadores pendentes:

```bash
sudo chown root:root /etc/utileazy-backup.conf
sudo chmod 600 /etc/utileazy-backup.conf
sudo grep -n 'CONFIGURE\|ACCOUNT_ID' /etc/utileazy-backup.conf || \
  echo 'Configuração R2 preenchida'
```

Gere uma senha longa para o repositório:

```bash
sudo openssl rand -base64 -out /etc/utileazy-restic-password 48
sudo chown root:root /etc/utileazy-restic-password
sudo chmod 600 /etc/utileazy-restic-password
```

Guarde em um gerenciador de senhas ou mídia offline a senha, o endereço do repositório e a
credencial necessária para alcançá-lo. Sem esse pequeno kit de recuperação, o backup não
pode ser acessado depois da perda total do servidor. Não envie a senha, a configuração ou
URLs de webhook ao Git. A configuração é incluída de forma criptografada no backup para
facilitar recuperações parciais, mas isso não substitui o kit externo.

## 3. Configurar uma saída de alerta

Edite `/etc/default/utileazy-alerts` e configure ao menos uma opção:

- `ALERT_NTFY_URL`: URL completa de um tópico ntfy longo e secreto;
- `ALERT_WEBHOOK_URL`: webhook JSON compatível com Slack ou Discord; ajuste
  `ALERT_WEBHOOK_FORMAT` para `slack` ou `discord`.

URLs de webhook são credenciais e o arquivo deve permanecer `root:root` com modo `0600`.
Teste sem interromper a aplicação:

```bash
sudo /usr/local/sbin/utileazy-send-alert phase8_delivery_test
```

O resultado esperado é `alert_status=SENT`. `JOURNAL_ONLY` significa que o evento ficou
apenas no journal e que o alerta remoto ainda não está concluído. Eventos idênticos são
suprimidos durante uma hora para evitar uma mensagem a cada coleta de cinco minutos.

## 4. Inicializar e validar o primeiro backup

Inicialize uma única vez o repositório vazio:

```bash
sudo /usr/local/sbin/utileazy-backup init
```

Se o destino já contiver um repositório Restic do Utileasy, não execute `init`; confirme a
senha com `sudo /usr/local/sbin/utileazy-backup snapshots`.

Faça o primeiro backup manual:

```bash
sudo /usr/local/sbin/utileazy-backup backup
sudo /usr/local/sbin/utileazy-backup snapshots
```

O processo cria:

- um snapshot `database` com `pg_dump --format=custom`;
- um snapshot `files` com `.env`, token do Tunnel e configurações selecionadas do host.

O `pg_dump` mantém uma visão consistente enquanto a aplicação continua ativa. O volume de
mídia é deliberadamente excluído: ele contém uploads originais e MP3 processados apenas
durante o pipeline, e arquivá-los prolongaria a retenção de conteúdo que a aplicação apaga
depois do envio ao provedor. Uma tarefa em andamento durante uma perda total precisará ser
reenviada pelo usuário.

Atualmente o único conteúdo persistente dos usuários autenticados é o texto da transcrição
no PostgreSQL, com expiração automática em 180 dias. Resultados anônimos expiram em 24
horas. Após o texto ou erro terminal ser salvo localmente, uma tarefa exclui a transcrição
e o upload associado da AssemblyAI; falhas são repetidas e reconciliadas a cada hora. O PDF
de uma transcrição é gerado em memória a partir desse texto; juntar PDFs e converter imagens
para PDF acontece inteiramente no navegador. A tela PDF/DOCX é apenas uma simulação e não
envia o documento ao servidor.

Se o produto passar a oferecer armazenamento de documentos, use um bucket privado separado,
URLs assinadas curtas, exclusão do original após processamento e quota explícita por usuário.
Esses objetos não devem ser misturados ao volume transitório nem incluídos automaticamente
no backup do host.

Antes de agendar, restaure o dump obtido do destino externo:

```bash
sudo /usr/local/sbin/utileazy-backup-restore-test
```

O teste executa `restic check`, baixa o dump mais recente, cria um PostgreSQL 16 temporário
sem rede e em `tmpfs`, restaura com `--exit-on-error`, valida tabelas e migrações e remove o
container. O esperado é `restore_backup_test_status=OK`.

## 5. Instalar e ativar os timers

Somente depois do primeiro backup e da restauração aprovados:

```bash
sudo install -o root -g root -m 0644 \
  deploy/phase8/utileazy-backup.service \
  deploy/phase8/utileazy-backup.timer \
  deploy/phase8/utileazy-backup-restore-test.service \
  deploy/phase8/utileazy-backup-restore-test.timer \
  deploy/phase8/utileazy-backup-maintenance.service \
  deploy/phase8/utileazy-backup-maintenance.timer \
  deploy/phase8/utileazy-alert@.service \
  /etc/systemd/system/

sudo install -d -o root -g root -m 0755 \
  /etc/systemd/system/utileazy-soak-check.service.d
sudo install -o root -g root -m 0644 \
  deploy/phase8/utileazy-soak-check.override.conf \
  /etc/systemd/system/utileazy-soak-check.service.d/phase8.conf

# Reinstala a versão do monitor que verifica idade do backup e chama o alerta.
sudo install -o root -g root -m 0750 \
  deploy/phase6/utileazy-soak-snapshot \
  /usr/local/sbin/utileazy-soak-snapshot

sudo systemctl daemon-reload
sudo systemctl enable --now \
  utileazy-backup.timer \
  utileazy-backup-restore-test.timer \
  utileazy-backup-maintenance.timer
sudo systemctl start utileazy-soak-check.service
```

Horários no fuso do servidor:

- backup diário: 02:30, com atraso aleatório de até 15 minutos;
- restauração: domingo às 03:15;
- retenção, poda e verificação: primeiro domingo do mês às 01:30.

Esses horários não conflitam com as atualizações APT configuradas para depois das 04:00.
As unidades usam prioridade reduzida de CPU e I/O para o hardware limitado.

Confira:

```bash
systemctl list-timers --all --no-pager \
  utileazy-backup.timer \
  utileazy-backup-restore-test.timer \
  utileazy-backup-maintenance.timer

sudo systemctl start utileazy-backup.service
sudo journalctl -u utileazy-backup.service -n 100 --no-pager
sudo journalctl -u utileazy-soak-check.service -n 100 --no-pager
```

O monitor passa a emitir `encrypted_backup_age_seconds` e alerta quando não existe backup
bem-sucedido há mais de 36 horas. Falhas dos serviços de backup, restauração ou manutenção
também acionam `utileazy-alert@.service`.

## 6. Retenção e recuperação

### Dados da aplicação

`AUTHENTICATED_RESULT_TTL_DAYS=180` controla a retenção do texto para contas. O padrão já
é 180 caso a variável não exista no `.env`; mantenha-a explícita no servidor. A migration
`0005_authenticated_result_expiration` atribui aos jobs autenticados existentes uma data
igual à criação mais 180 dias. Portanto, resultados que já ultrapassaram esse prazo ficam
indisponíveis assim que a versão é implantada.

O Celery Beat executa a limpeza a cada hora. Ela apaga jobs vencidos e remove o artefato
textual e o metadado do áudio somente quando nenhum outro job ainda os referencia. O upload
original e o MP3 canônico continuam temporários. Depois de persistir um resultado terminal,
outra tarefa exclui a transcrição e o upload associado na AssemblyAI, com tentativas e
reconciliação horária.

Para aplicar no servidor após o pull:

```bash
grep -q '^AUTHENTICATED_RESULT_TTL_DAYS=' .env || \
  printf '%s\n' 'AUTHENTICATED_RESULT_TTL_DAYS=180' >> .env
./deploy/compose-home-tunnel.sh build backend worker beat frontend
./deploy/compose-home-tunnel.sh up -d --wait backend worker beat frontend
```

O comando do backend executa a migration antes de iniciar o Gunicorn. Confirme depois:

```bash
./deploy/compose-home-tunnel.sh exec backend python manage.py showmigrations transcriptions
./deploy/compose-home-tunnel.sh exec backend python manage.py shell -c \
  'from django.conf import settings; print(settings.AUTHENTICATED_RESULT_TTL_DAYS)'
```

Snapshots criptografados do PostgreSQL ainda podem conter cópias históricas até serem
removidos pela política Restic abaixo. A expiração impede acesso pela aplicação, inclusive
se um snapshot antigo for restaurado, mas não apaga retroativamente snapshots externos.
Se a política de privacidade exigir destruição também das cópias de recuperação em prazo
fixo, reduza a retenção Restic e declare separadamente esse intervalo.

### Backups

A política padrão mantém 14 diários, 8 semanais, 12 mensais e 2 anuais para cada conjunto
de snapshots. A manutenção mensal aplica `forget --prune` e depois `restic check`. A poda
pode demorar e bloqueia temporariamente outras operações do mesmo repositório.

Para inspecionar e recuperar arquivos sem sobrescrever o servidor:

```bash
sudo /usr/local/sbin/utileazy-backup snapshots
sudo install -d -o root -g root -m 0700 /var/lib/utileazy-backup/manual-restore
sudo sh -c 'set -a; . /etc/utileazy-backup.conf; set +a; restic restore latest --path "$UTILITYDEV_DIR/.env" --target /var/lib/utileazy-backup/manual-restore'
```

Revise o conteúdo restaurado antes de copiar qualquer arquivo ao local original. A
restauração do banco de produção é uma operação destrutiva e deve usar uma janela de
manutenção, backup novo e procedimento separado; o teste automático nunca altera o banco
real.

## 7. Logs e alertas operacionais

O override `docker-compose.home-tunnel.yml` já limita todos os logs `json-file` a três
arquivos de 10 MiB. Confirme depois de recriar os containers:

```bash
docker inspect $(docker ps -q) \
  --format '{{.Name}} driver={{.HostConfig.LogConfig.Type}} config={{json .HostConfig.LogConfig.Config}}'
```

O esperado para os oito containers é `driver=json-file` e configuração com `max-size=10m`
e `max-file=3`. O monitor de cinco minutos cobre disco, memória, swap, temperatura,
containers, saúde do Tunnel, filas Celery, Caddy e idade do backup.

Revise diariamente os alertas e, ao menos semanalmente:

```bash
sudo journalctl -u utileazy-soak-check.service --since '7 days ago' --no-pager \
  | grep -E 'warning=|snapshot_status=WARN'
sudo journalctl -u utileazy-backup.service --since '7 days ago' --no-pager
sudo journalctl -u utileazy-backup-restore-test.service --since '30 days ago' --no-pager
```

## 8. Atualização mensal controlada

Não atualize imagens e dependências automaticamente. Uma vez por mês, em uma janela de
baixo uso:

1. confira o changelog e avisos de segurança das versões novas;
2. execute um backup e o teste de restauração;
3. registre as imagens atuais com `docker images --digests`;
4. atualize o repositório com avanço rápido e revise o diff;
5. execute testes de backend e frontend da Fase 7;
6. puxe imagens e reconstrua os serviços;
7. aplique com `./deploy/compose-home-tunnel.sh up -d --wait`;
8. repita a auditoria da Fase 7, o HTTP 200 interno e uma transcrição controlada;
9. observe o monitor por algumas horas.

Nunca use `docker compose down -v`. Atualize as tags fixadas de Caddy e cloudflared somente
depois de revisar notas de versão. PostgreSQL deve permanecer na mesma versão principal até
existir um plano específico de migração.

Também faça uma revisão mensal de:

- eventos de segurança, WAF, rate limiting, Access e Tunnel na Cloudflare;
- respostas 4xx/5xx do Caddy e erros do Django/Celery;
- usuários permitidos no Access e chaves/tokens ainda necessários;
- consumo e cota da AssemblyAI;
- limites anônimos, taxa de CAPTCHA e falsos positivos;
- uso do disco, crescimento do volume de mídia e capacidade do destino de backup;
- atualizações que exigem reboot e estado da bateria do notebook servidor.

Mantenha HSTS desativado até a abertura e estabilização pública. Um nobreak continua
recomendado; a bateria do notebook ajuda em quedas curtas, mas não protege roteador/ONU nem
substitui proteção elétrica adequada.

## 9. Critério de conclusão

A Fase 8 está operacional quando:

- o destino fica fora do servidor e recebe snapshots criptografados;
- a senha está guardada fora do host;
- primeiro backup e primeira restauração terminam em `OK`;
- os três timers estão ativos e com próximo disparo;
- um alerta remoto de teste foi recebido;
- backup com mais de 36 horas gera alerta;
- logs dos oito containers têm rotação limitada;
- existe uma rotina mensal registrada para atualizações e revisão de eventos/cotas.
