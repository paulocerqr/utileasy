# Fase 6: publicação gradual

Esta fase mantém o site protegido pelo Cloudflare Access enquanto o servidor passa por uma
janela de observação de 24 a 48 horas. Durante essa janela, mantenha
`TRANSCRIPTION_COMPLETION_MODE=polling` e não abra o aplicativo ao público.

## 1. Instalar o monitor de estabilização

No servidor, a partir da raiz do repositório:

```bash
sudo install -o root -g root -m 0750 \
  deploy/phase6/utileazy-soak-snapshot \
  /usr/local/sbin/utileazy-soak-snapshot
sudo install -o root -g root -m 0644 \
  deploy/phase6/utileazy-soak-monitor.default \
  /etc/default/utileazy-soak-monitor
sudo install -o root -g root -m 0644 \
  deploy/phase6/utileazy-soak-check.service \
  /etc/systemd/system/utileazy-soak-check.service
sudo install -o root -g root -m 0644 \
  deploy/phase6/utileazy-soak-check.timer \
  /etc/systemd/system/utileazy-soak-check.timer
sudo systemctl daemon-reload
sudo systemctl enable --now utileazy-soak-check.timer
sudo systemctl start utileazy-soak-check.service
```

O monitor não lê o `.env` e não registra segredos. Ele coleta uso de memória, swap, disco,
temperaturas expostas pelo kernel, estado e consumo dos oito containers, comprimentos das
filas Celery e uma requisição interna ao Caddy.

Confira a primeira coleta e o agendamento:

```bash
sudo journalctl -u utileazy-soak-check.service -n 100 --no-pager
systemctl list-timers --all --no-pager utileazy-soak-check.timer
```

Para acompanhar somente avisos:

```bash
sudo journalctl -u utileazy-soak-check.service --since '24 hours ago' \
  --no-pager | grep -E 'warning=|snapshot_status=WARN'
```

## 2. Testes funcionais restritos

Execute pelo endereço `https://utileasy.com.br`, ainda autenticado pelo Access:

1. Login e logout com um usuário normal.
2. Recuperação de senha, caso o envio de e-mail já esteja configurado.
3. Upload anônimo com Turnstile válido e tentativa com token ausente ou expirado.
4. Upload autenticado de um arquivo pequeno.
5. Acompanhar a transcrição até a conclusão por polling.
6. Abrir o resultado e gerar ou baixar o PDF.
7. Repetir uma transcrição para conferir deduplicação e filas.
8. Testar um arquivo WAV pouco abaixo de 95 MiB.

Durante um upload, acompanhe os snapshots e os logs do worker sem imprimir variáveis de
ambiente:

```bash
sudo journalctl -fu utileazy-soak-check.service
./deploy/compose-home-tunnel.sh logs --since=10m -f worker backend caddy
```

Não use `docker compose down -v`. O sufixo `-v` remove os dados persistentes.

## 3. Critérios para encerrar a janela

Avance somente depois de pelo menos 24 horas, preferencialmente 48, com todos os itens:

- os oito containers permanecem em execução e os que possuem healthcheck ficam saudáveis;
- nenhuma contagem de reinício cresce sem uma intervenção planejada;
- o Caddy responde `200` internamente e o Tunnel permanece saudável;
- o disco raiz permanece abaixo de 80%;
- a memória disponível não permanece abaixo de 512 MiB;
- o uso de swap não permanece acima de 1 GiB nem cresce continuamente;
- as filas `media`, `provider` e `maintenance` voltam a zero depois dos trabalhos;
- a temperatura não permanece acima de 85 °C;
- upload, polling, resultado e PDF funcionam sem erros recorrentes;
- não há sequência recorrente de respostas 5xx nos logs.

Um aviso isolado durante reinício planejado não reprova a janela. Registre a causa e
confirme a recuperação no snapshot seguinte.

## 4. Webhook depois da estabilização

O webhook não deve ser ativado durante a janela inicial. O Access aplicado ao domínio raiz
também protege `/api/webhooks/assemblyai/<id>/`, impedindo a chamada da AssemblyAI.

Quando os critérios anteriores forem atendidos:

1. Crie um segundo aplicativo Access mais específico para o hostname
   `utileasy.com.br` e o caminho `/api/webhooks/assemblyai/*`.
2. Nesse aplicativo, use uma política `Bypass` para `Everyone`. Não remova ainda a
   proteção do restante do site.
3. Confirme que o segredo longo de webhook está configurado nos dois lados. Nunca o mostre
   em logs ou comandos de diagnóstico.
4. Teste segredo ausente, incorreto e correto antes de alterar o modo.
5. Avalie o Bot Fight Mode: no plano gratuito ele não pode ser ignorado por regra WAF e
   pode bloquear callbacks automatizados. Mantenha polling se não houver entrega confiável.
6. Somente então altere `TRANSCRIPTION_COMPLETION_MODE=webhook`, recrie backend, worker e
   beat e execute uma transcrição controlada.
7. Mantenha a reconciliação de trabalhos pendentes como recuperação para callbacks
   perdidos.

A política `Bypass` desativa os controles e os logs do Access apenas nesse caminho; por isso
ele deve permanecer estreito e o segredo da aplicação continua obrigatório.

## 5. Abertura pública

A remoção da política Access do site principal acontece somente depois da janela de
observação, do teste de carga controlado e dos testes de segurança da Fase 7. O endpoint de
webhook, caso ativado, continua limitado ao caminho específico e protegido pelo segredo.
