# Capacidade dos ambientes

## Servidor caseiro atual

```text
CPU             i5-3337U, 2 núcleos/4 threads
GPU             GT 625M, não usada pelo pipeline
RAM             6 GB DDR3L
armazenamento   HD mecânico de 1 TB
```

Gargalos em ordem prática:

1. HD: Docker, PostgreSQL, Redis, uploads e FFmpeg fazem I/O simultâneo.
2. CPU: FFmpeg pode ocupar um núcleo por bastante tempo.
3. RAM/swap: 6 GB atendem o perfil limitado, mas swap no HD degrada muito.
4. Upload da internet: o MP3 canônico ainda precisa chegar à AssemblyAI.

O perfil `docker-compose.home.yml` mantém:

```text
worker solo
concorrência 1
FFmpeg com um thread
polling
filesystem local
limites de CPU e memória por serviço
```

Um SSD SATA continua sendo o upgrade de maior impacto geral. Depois, aumentar para
8 GB ou mais reduz pressão de memória.

## Computador de desenvolvimento

```text
CPU             Ryzen 5600GT
RAM             16 GB
armazenamento   NVMe 512 GB
```

`docker-compose.dev.yml` usa prefork com concorrência 2 e publica PostgreSQL/backend
somente em loopback. Isso é suficiente para testes paralelos sem consumir todos os
recursos da estação. Webhook pode ser testado com túnel HTTPS, mas polling é o padrão.

## VPS

Alvo:

```text
2–4 vCPU
8 GB RAM
100 GB de armazenamento
```

Para 2 vCPU:

```dotenv
VPS_MEDIA_CONCURRENCY=1
VPS_PROVIDER_CONCURRENCY=2
```

Para 4 vCPU:

```dotenv
VPS_MEDIA_CONCURRENCY=2
VPS_PROVIDER_CONCURRENCY=2
```

O perfil VPS separa FFmpeg da fila de rede. Isso impede que o upload para a AssemblyAI
ocupe uma vaga destinada a CPU. Webhook remove o polling frequente do provider;
Celery Beat mantém apenas reconciliação de segurança.

Filesystem é aceitável em uma VPS única. S3 compatível é recomendado quando houver
necessidade de storage fora do host, restauração independente ou múltiplos nós.

## Monitoramento antes de aumentar concorrência

Medir:

```text
CPU e load average durante dois FFmpeg
pico de RAM dos workers prefork
espaço de uploads e canônicos
tempo de upload à AssemblyAI
tamanho e idade das filas Redis
jobs processing sem atualização
conexões PostgreSQL
limites da conta AssemblyAI
```

Uma VPS de 4 vCPU não deve usar concorrência ilimitada. Começar com dois processos
de mídia preserva CPU para Django, Next, PostgreSQL, Redis, Caddy e sistema operacional.

## Limites de acesso não dependem do hardware

Mais CPU e RAM permitem aumentar a concorrência de mídia, mas não justificam aumentar
automaticamente cotas anônimas ou créditos. Na VPS, comece com 2/minuto e 10/24h por
IP, 3/24h por cookie e 14.400 segundos globais por dia local. Ajuste após observar
uso legítimo, tentativas bloqueadas e consumo real da AssemblyAI.

No computador de desenvolvimento os valores 10/minuto, 100/24h e 50/24h evitam que
testes manuais bloqueiem o desenvolvedor. Eles pertencem ao `.env` local e não ao
perfil de produção.
