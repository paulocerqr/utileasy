# Fase 7: testes de segurança obrigatórios

Execute estes testes somente contra o servidor, os endereços e a conta Cloudflare sob seu
controle. Mantenha o Cloudflare Access ativo e o modo de transcrição em `polling` durante
toda a fase. A observação da Fase 6 pode continuar em paralelo.

Registre data, origem do teste, comando, resultado esperado e resultado obtido. Não copie
tokens, cookies, chaves, `.env` ou dumps do banco para o relatório.

## 1. Testes automatizados do aplicativo

No servidor, a partir da raiz do repositório:

```bash
./deploy/compose-home-tunnel.sh run --rm --no-deps backend \
  python manage.py test apps.accounts apps.transcriptions --verbosity 2

./deploy/compose-home-tunnel.sh run --rm --no-deps frontend-check pnpm test
```

Esses testes cobrem, entre outros controles, CSRF, isolamento entre usuários, Turnstile,
headers de proxy, limites de upload, tokens anônimos e segredo do webhook. Eles usam um banco
de teste separado e não devem alterar os registros da aplicação.

## 2. Auditoria do host e dos containers

Instale e execute o coletor somente leitura:

```bash
sudo install -o root -g root -m 0750 \
  deploy/phase7/utileazy-security-audit \
  /usr/local/sbin/utileazy-security-audit

sudo utileazy-security-audit | tee /tmp/utileazy-security-audit.txt
```

O resultado esperado termina em `audit_status=OK`. Revise manualmente a seção
`listening_sockets`: o SSH pode escutar no host, mas o UFW deve aceitá-lo somente pela
interface `tailscale0`. Nenhum container pode publicar portas, usar rede ou PID do host,
executar privilegiado ou montar `/var/run/docker.sock`.

## 3. Varredura pela LAN

Execute no computador CachyOS, não no servidor. Confira primeiro os endereços atuais do
servidor; no ambiente inicial eram `192.168.1.115` e `192.168.1.116`:

```bash
nmap -Pn -sT --reason \
  -p 22,80,443,2019,3000,5432,6379,8000,8080 \
  192.168.1.115 192.168.1.116

sudo nmap -Pn -sS --top-ports 1000 --reason \
  192.168.1.115 192.168.1.116
```

Como o SSH foi limitado ao Tailscale, o resultado esperado é nenhuma porta `open` pela LAN.
Estados `filtered` indicam que o firewall descartou ou rejeitou as sondagens. Se um endereço
não estiver mais associado ao servidor, remova-o do teste.

## 4. Varredura por uma rede externa

O IPv4 WAN observado no ZTE pertence ao intervalo CGNAT `100.64.0.0/10`; não faça uma
varredura do IPv4 público compartilhado do provedor. Teste os endereços IPv6 globais atuais
do servidor a partir de outra conexão, como um notebook conectado ao hotspot do celular:

```bash
# No servidor: apenas identificar os endereços sob seu controle.
ip -6 -brief address show scope global

# Na rede externa: substitua pelo IPv6 global atual do servidor.
nmap -6 -Pn -sT --reason \
  -p 22,80,443,2019,3000,5432,6379,8000,8080 \
  <ipv6-global-do-servidor>
```

O resultado esperado é nenhuma porta `open`. Execute o teste para cada interface física
ativa do servidor. Não escaneie endereços de terceiros.

## 5. Headers forjados e rate limit

Os testes automatizados confirmam que o Next remove headers não confiáveis e que o backend
usa somente `X-Real-IP` normalizado. O Caddy substitui esse valor pelo `CF-Connecting-IP`
recebido no caminho confiável do Tunnel.

Para validar o caminho real, faça logout do Utileasy, mas permaneça autenticado no Access.
Depois abra as ferramentas de desenvolvedor do navegador e execute no console:

```javascript
await fetch("/api/anonymous/session", { cache: "no-store" })

async function phase7Attempt(fakeIp) {
  const response = await fetch("/api/transcriptions", {
    method: "POST",
    headers: {
      "CF-Connecting-IP": fakeIp,
      "X-Forwarded-For": fakeIp,
      "X-Real-IP": fakeIp,
    },
    body: new FormData(),
  })
  return { status: response.status, body: await response.json() }
}

await phase7Attempt("192.0.2.10")
await phase7Attempt("198.51.100.20")
await phase7Attempt("203.0.113.30")
```

Com o limite atual de duas tentativas por minuto, os resultados esperados são `400`, `400`
e `429`, mesmo usando três valores forjados. Espere mais de 60 segundos antes de repetir.
Depois, repita em uma segunda conexão externa autorizada; a primeira tentativa deve voltar a
`400`, demonstrando que outro IP possui um contador independente. Esses pedidos não possuem
arquivo nem CAPTCHA válido e não enviam conteúdo à AssemblyAI.

## 6. Turnstile e cookies

No fluxo anônimo, confirme:

- token ausente: resposta `400`;
- token inválido ou expirado: resposta `400`;
- token válido, hostname e ação corretos: upload aceito;
- reutilização de token: rejeitada, pois tokens Turnstile são de uso único.

No painel Network/Storage do navegador, confira:

- `sessionid`: `Secure`, `HttpOnly` e `SameSite=Lax`;
- `utileasy_anon`: `Secure`, `HttpOnly` e `SameSite=Lax`;
- `csrftoken`: `Secure` e `SameSite=Lax`. Ele não é o cookie de autenticação e não
  precisa ser `HttpOnly` neste projeto.

Nunca publique os valores desses cookies.

## 7. Webhook sem expor o segredo

Com o site ainda em polling e protegido pelo Access, teste o caminho interno completo usando
um UUID inexistente. O segredo correto é lido dentro do container e não aparece no histórico:

```bash
docker exec utilitydev-backend python -c '
import os
import requests

url = "http://caddy:8080/api/webhooks/assemblyai/00000000-0000-0000-0000-000000000000/"
payload = {"transcript_id": "phase7-security-test"}
base_headers = {"Host": "utileasy.com.br"}

invalid = requests.post(
    url,
    json=payload,
    headers={**base_headers, "X-AssemblyAI-Webhook-Secret": "invalid"},
    timeout=10,
)
valid = requests.post(
    url,
    json=payload,
    headers={
        **base_headers,
        "X-AssemblyAI-Webhook-Secret": os.environ["ASSEMBLYAI_WEBHOOK_SECRET"],
    },
    timeout=10,
)
print("invalid_status=", invalid.status_code)
print("valid_unknown_job_status=", valid.status_code)
'
```

O esperado é `invalid_status=401` e `valid_unknown_job_status=404`. Nenhum trabalho é
criado ou alterado. O Caddy remove esse header dos logs.

## 8. Restauração isolada do PostgreSQL

O teste cria um PostgreSQL 16 temporário em `tmpfs`, com rede desativada e sem portas ou
volumes. O dump passa por pipe entre os containers, as quantidades de tabelas e migrações
são comparadas e o container temporário é removido mesmo em caso de falha:

```bash
deploy/phase7/test-postgres-restore
```

O resultado esperado termina em `restore_test_status=OK`. O teste valida restauração, mas
não substitui o backup externo e criptografado da Fase 8.

## 9. Falha do Tunnel e recuperação

Mantenha uma sessão SSH pelo Tailscale aberta. Pare somente o conector:

```bash
docker stop utilitydev-cloudflared
```

O domínio deve ficar indisponível na Internet. Pela LAN, as varreduras anteriores devem
continuar sem portas abertas, comprovando que não existe caminho alternativo. Recupere:

```bash
docker start utilitydev-cloudflared
docker inspect utilitydev-cloudflared \
  --format 'status={{.State.Status}} health={{.State.Health.Status}}'
```

Aguarde `health=healthy` e confirme `https://utileasy.com.br`. Depois execute um reboot
controlado e valide UFW, SSH, guard, timer, oito containers e Caddy como nas Fases 5 e 6.

## 10. Teste longo e critério de conclusão

Execute uma transcrição longa ou próxima de 95 MiB enquanto acompanha o monitor da Fase 6.
As filas devem voltar a zero e não pode haver crescimento sustentado de swap, temperatura,
reinícios ou respostas 5xx.

A Fase 7 termina somente quando todos os testes aplicáveis estiverem registrados como
aprovados. Qualquer porta aberta, bypass de limite, cookie inseguro, falha de restauração ou
caminho alternativo exige correção e repetição antes da abertura pública.
