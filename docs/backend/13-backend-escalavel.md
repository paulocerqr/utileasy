# Backend configurável: casa, desenvolvimento e VPS

## Decisão arquitetural

O mesmo backend atende servidor caseiro, desenvolvimento e VPS. Os arquivos
`docker-compose.home.yml`, `docker-compose.dev.yml` e `docker-compose.vps.yml` são
overrides: devem ser combinados com `docker-compose.yml` e apenas alteram recursos,
concorrência e serviços do perfil.

## Usuários autenticados e visitantes

Usuários autenticados usam sessão Django, CSRF e `Transcricao.owner`. Eles têm
histórico e resultados persistentes por 180 dias. Visitantes também podem transcrever, mas passam
por quatro camadas:

```text
Turnstile validado no backend
limite Redis por IP: 2/minuto e 10/dia
limite Redis por cookie anônimo: 3/dia
UUID público do job + segredo X-Job-Token
```

O cookie anônimo é aleatório, HttpOnly, SameSite=Lax e salvo no banco somente como
SHA-256. O segredo do job é devolvido uma única vez e também só é armazenado como
hash. Conhecer o UUID sem esse segredo não permite consultar status nem baixar PDF.

Jobs anônimos expiram em 24 horas por padrão. A autorização deixa de funcionar no
instante da expiração e o Celery Beat apaga periodicamente job, arquivos e sessões
vazias. Se o visitante entrar antes disso, `POST .../{id}/claim/` transfere o job para
sua conta, remove o segredo temporário e define uma nova expiração em 180 dias.

O limite por IP reduz abuso comum, mas não substitui proteção de borda contra DDoS ou
botnets distribuídas. Em produção, mantenha o backend privado, exponha apenas Caddy e
Next, e combine esses controles com firewall e proteção do provedor/CDN.

O limite curto por IP é aplicado antes do CAPTCHA para proteger o endpoint de
validação. Os contadores diários por IP e cookie só são incrementados depois de um
CAPTCHA válido; token inválido, expirado ou configuração incorreta não gastam a cota
diária. No `.env` local os valores podem ser maiores para facilitar testes.

| Controle | Produção (`.env.example`) | Desenvolvimento local atual |
|---|---:|---:|
| IP, janela de 60 segundos | 2 | 10 |
| IP, janela de 24 horas | 10 | 100 |
| Cookie, janela de 24 horas | 3 | 50 |

Esses números não são obtidos de `Transcricao`: as chaves `utileazy:rate:*` nascem no
Redis quando uma requisição anônima passa por cada controle. Reiniciar containers não
zera o contador porque o Redis usa volume persistente; apagar o volume também apagaria
outros dados do broker e não deve ser usado como procedimento rotineiro.

## Cota global de créditos

`TRANSCRIPTION_DAILY_BUDGET_SECONDS` vale para usuários autenticados e anônimos. Após
o `ffprobe`, a duração é reservada atomicamente em `DailyTranscriptionBudget`. Um job
que ultrapassaria a soma `consumido + reservado` falha antes do FFmpeg e antes da
AssemblyAI. A reserva vira consumo quando o provedor conclui, ou é liberada em erro e
em deduplicação.

O padrão de 14.400 segundos corresponde a quatro horas de áudio por dia. Ajuste esse
valor ao orçamento real da conta AssemblyAI; não o confunda com quantidade de jobs.

## Deduplicação global sem cruzar propriedade

O SHA-256 é calculado sobre o MP3 canônico produzido pelo pipeline. A chave efetiva é
`(audio, configuration_hash)`, que inclui provedor, idioma, opções e versão do
pipeline. O texto reutilizável vive em `TranscriptionArtifact`; cada solicitação
continua sendo um `Transcricao` separado e autorizado pelo próprio usuário ou token.

Isso evita entregar o objeto, nome do arquivo, UUID ou metadados do job de outra
pessoa. O hash não é calculado no upload bruto: arquivos equivalentes em contêineres
diferentes só coincidem depois da normalização. Quando o último job que referencia um
artefato expira, o artefato textual e o metadado `Audio` também são apagados.

## Filas e storage

```text
media        ffprobe, FFmpeg, SHA-256 e deduplicação
provider     upload, submissão, polling ou conclusão do webhook
maintenance reconciliação, exclusão no provedor, limpeza e expiração
```

No servidor caseiro um worker `solo`, concorrência 1, consome tudo. Um Celery Beat
leve existe em todos os perfis para disparar expiração e limpeza. Na VPS um worker
`prefork` processa `media` e outro processa `provider,maintenance`. O pipeline usa
filesystem ou S3 compatível; quando necessário, materializa o objeto em diretório
temporário, portanto workers não precisam compartilhar um disco local entre hosts.

## Polling e webhook

`TRANSCRIPTION_COMPLETION_MODE=polling` é adequado para casa. Na VPS HTTPS, use
`webhook`: a AssemblyAI chama `/api/webhooks/assemblyai/{public_id}/` com segredo, e
uma reconciliação periódica recupera callbacks perdidos.

## Capacidade inicial

| Ambiente | worker media | worker provider | modo recomendado |
|---|---:|---:|---|
| i5 2c/4t, 6 GB | 1 solo | mesmo worker | polling |
| Ryzen 5600GT, 16 GB | 2 prefork | 2 prefork | polling/webhook de teste |
| VPS 2 vCPU, 8 GB | 1 prefork | 2 prefork | webhook |
| VPS 4 vCPU, 8 GB | 2 prefork | 2 prefork | webhook |

O FFmpeg usa um thread por task. Comece com esses valores, monitore memória, load,
I/O, tempo de fila e falhas, e aumente somente após medição.

## Variáveis principais

```text
TRANSCRIPTION_MAX_PENDING_JOBS
TRANSCRIPTION_MAX_PENDING_PER_USER
TRANSCRIPTION_MAX_PENDING_PER_ANON
TRANSCRIPTION_DAILY_BUDGET_SECONDS
ANONYMOUS_RESULT_TTL_HOURS
AUTHENTICATED_RESULT_TTL_DAYS
ANONYMOUS_COOKIE_NAME
ANON_IP_BURST_LIMIT
ANON_IP_DAILY_LIMIT
ANON_COOKIE_DAILY_LIMIT
TURNSTILE_ENABLED
TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
TURNSTILE_EXPECTED_HOSTNAME
TURNSTILE_EXPECTED_ACTION
TRANSCRIPTION_COMPLETION_MODE
PUBLIC_BASE_URL
ASSEMBLYAI_WEBHOOK_SECRET
MEDIA_STORAGE_BACKEND
S3_ENDPOINT_URL
S3_BUCKET_NAME
VPS_MEDIA_CONCURRENCY
VPS_PROVIDER_CONCURRENCY
```

As credenciais dummy podem omitir `action` na resposta; nesse ambiente configure
`TURNSTILE_EXPECTED_ACTION=`. Na VPS, use chaves reais, mantenha a ação
`anonymous_transcription`, defina `TURNSTILE_EXPECTED_HOSTNAME` e nunca envie a secret
key ao navegador.
