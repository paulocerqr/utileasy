# Conversão de documentos PDF e DOCX

## Escopo entregue

A rota `/pdf-docx` usa processamento assíncrono real para:

- PDF textual para DOCX com `pdf2docx` e PyMuPDF;
- DOCX para PDF com LibreOffice Writer em modo headless.

A conversão preserva texto, imagens e tabelas simples quando possível. Fidelidade
pixel a pixel não é garantida. PDF digitalizado sem texto selecionável, PDF ou DOCX
protegido, macro, arquivo `.doc` antigo e documento corrompido ficam fora do MVP.

## Modelo e acesso

O app `apps.documents` mantém `DocumentConversion` com UUID público, operação,
status, nomes, tamanhos, contagem de páginas, chaves privadas de storage, erro,
expiração e timestamps.

Cada job pertence exclusivamente a:

- um usuário autenticado; ou
- uma `AnonymousSession` com o hash SHA-256 de um token secreto.

O banco aplica essa exclusividade por constraint. Um visitante recebe o token somente
na criação e precisa enviá-lo em `X-Job-Token` para consultar ou baixar. O endpoint
de claim troca a sessão anônima pelo usuário autenticado e invalida o token.

## API

```text
GET  /api/documents/                    histórico autenticado
POST /api/documents/                    upload e criação do job
GET  /api/documents/<uuid>/             status e progresso
GET  /api/documents/<uuid>/download/    download privado
POST /api/documents/<uuid>/claim/       reivindicação após login
```

O upload é `multipart/form-data` com `file`, `target_format` opcional e
`captcha_token` para visitantes. PDF define destino DOCX; DOCX define destino PDF.
A criação responde `202 Accepted` e o frontend consulta o status por polling.

A resposta nunca expõe chaves de storage nem o hash do token. Jobs de outro usuário,
tokens ausentes ou inválidos e jobs expirados retornam a mesma resposta 404.

## Estados

```text
queued -> validating -> converting -> completed
                                  \-> failed
```

O progresso exposto pela API é uma representação dos estados: 10, 30, 70 e 100 por
cento. Não é uma estimativa por página.

## Validação e isolamento

Antes da conversão, o worker verifica:

- assinatura e extensão PDF ou DOCX;
- limite de 50 MB no upload;
- PDF válido, sem senha, com até 200 páginas e texto selecionável;
- estrutura ZIP/OpenXML do DOCX;
- ausência de entrada criptografada e de `vbaProject.bin`;
- limite de 250 MB após descompactação.

Cada conversor roda em subprocesso com grupo próprio, timeout, limite de espaço de
endereçamento e limite de CPU. Bibliotecas numéricas usam uma thread. Em timeout, o
grupo inteiro é encerrado. A saída de erro do processo fica apenas encadeada na
exceção interna e não é enviada ao cliente.

O LibreOffice recebe perfil temporário isolado, backend visual `svp` e parâmetros
headless. O PDF para DOCX roda em um processo Python separado para aplicar os mesmos
limites.

## Storage e ciclo de vida

A entrada é materializada em diretório temporário para funcionar com filesystem e
S3. Depois da conversão, somente o resultado é salvo em
`documents/results/<uuid>.<extensão>`; a entrada e o diretório temporário são
apagados.

Falha, validação inválida e timeout removem entrada e eventual saída parcial. O Beat
executa limpeza defensiva de órfãos e expiração. Resultados anônimos duram 24 horas;
resultados autenticados ou reivindicados duram 180 dias.

## Fila e capacidade

A task `apps.documents.tasks.process_document_conversion` é roteada para a fila
`documents`. Limpeza e expiração usam `maintenance`.

O perfil caseiro usa um worker solo e processa as filas sequencialmente. A VPS usa
`worker-documents` dedicado, com concorrência inicial 1, limite de container de
2 GB e limite de 1536 MB no subprocesso. A concorrência só deve aumentar após medir
tempo e pico de RAM no hardware de destino.

Variáveis principais:

```text
DOCUMENT_MAX_FILE_SIZE=52428800
DOCUMENT_MAX_PAGES=200
DOCUMENT_MAX_UNCOMPRESSED_SIZE=262144000
DOCUMENT_MAX_PENDING_JOBS=3
DOCUMENT_MAX_PENDING_PER_USER=1
DOCUMENT_MAX_PENDING_PER_ANON=1
DOCUMENT_CONVERSION_TIMEOUT_SECONDS=600
DOCUMENT_CONVERSION_MEMORY_LIMIT_MB=1536
DOCUMENT_TURNSTILE_EXPECTED_ACTION=anonymous_document_conversion
VPS_DOCUMENT_CONCURRENCY=1
```

## Dependências

As versões ficam fixadas em `backend/requirements.txt`:

```text
pdf2docx==0.5.13
PyMuPDF==1.28.0
python-docx==1.2.0
```

O `pdf2docx` não é mantido ativamente; por isso a atualização deve ser deliberada e
precedida pelos testes de regressão. A imagem instala `libreoffice-writer`, fontes
Liberation e DejaVu para reduzir diferenças de substituição tipográfica.

## Validação

Os testes de integração constroem documentos pequenos em tempo de execução, com
texto, imagem e tabela. Eles abrem a saída novamente para conferir estrutura e
conteúdo nos dois sentidos. A suíte também cobre autorização, token e claim
anônimos, limites, PDF sem texto, PDF protegido, falha e limpeza.

Comandos de validação:

```bash
docker compose build backend
docker compose run --rm backend python manage.py check
docker compose run --rm backend python manage.py makemigrations --check --dry-run
docker compose run --rm backend python manage.py test apps.accounts apps.transcriptions apps.documents
docker compose run --rm frontend-check pnpm test
docker compose build frontend
```

A medição de pico de RAM e tempo deve ser repetida no servidor caseiro e na VPS antes
de alterar concorrência, limites ou versões dos conversores.
