# Funcionalidades e Regras de Negócio

## 1. Conversão de arquivos

Funcionalidade importante, mas complexa.

Deve ser tratada com cuidado por envolver:

```text
- upload de arquivos
- limite de tamanho
- armazenamento temporário
- segurança
- limpeza automática
- processamento pesado
- possíveis falhas na conversão
```

Funcionalidades recomendadas para começar:

```text
DOCX → PDF
PPTX → PDF
PDF → imagens
Juntar PDFs
Separar páginas de PDF
Imagens → PDF
```

Funcionalidades mais complexas para depois:

```text
PDF → DOCX
OCR em PDF escaneado
Compressão avançada
Conversão entre muitos formatos
```

A conversão deve rodar em worker, provavelmente usando LibreOffice headless em container separado.

### Fluxo de conversão de arquivo (exemplo: DOCX → PDF)

```text
1. Usuário faz upload do arquivo.
2. Backend salva o arquivo temporariamente.
3. Backend cria um FileJob com status "pending".
4. Backend envia tarefa para a fila.
5. Worker pega a tarefa.
6. Worker converte o arquivo usando LibreOffice headless.
7. Worker salva o resultado.
8. Worker atualiza o FileJob para "completed".
9. Usuário baixa o arquivo final.
10. Tarefa agendada remove arquivos antigos.
```

---

## 2. Transcrição de vídeos e áudios

Funcionalidade muito promissora porque já existe um software pessoal usando AssemblyAI.

Funções possíveis:

```text
- transcrever áudio
- transcrever vídeo
- gerar resumo
- extrair tópicos principais
- gerar ata de reunião
- exportar TXT
- exportar PDF
- exportar DOCX
- exportar legenda SRT
- identificar falantes, se disponível no plano/API
```

A transcrição deve rodar como job assíncrono.

### Fluxo de transcrição

```text
1. Usuário envia áudio/vídeo.
2. Backend salva o arquivo.
3. Backend cria um TranscriptionJob.
4. Worker envia o arquivo para AssemblyAI.
5. Worker acompanha o status ou recebe webhook.
6. Resultado é salvo no banco.
7. Usuário acessa a transcrição.
8. Usuário pode exportar em TXT/PDF/DOCX/SRT.
```

---

## 3. Sorteio de números, palavras e grupos

Funcionalidade simples, boa para o MVP.

Pode rodar direto no frontend ou no backend de forma síncrona.

Funcionalidades sugeridas:

```text
- sortear número
- sortear palavra
- sortear nomes
- sortear ordem de apresentação
- dividir pessoas em grupos
- sortear times
```

Essa funcionalidade é útil especialmente para estudantes, professores, equipes e grupos de trabalho.

---

## 4. Feed de notícias

Funcionalidade interessante, mas deve ser bem limitada no começo.

Melhor começar com nichos específicos:

```text
- tecnologia
- programação
- IA
- segurança
- Linux
- Python
- JavaScript
- GitHub
```

O n8n pode ajudar muito nessa parte (ver `05-automacao-n8n.md`).

Fluxo possível:

```text
Cron do n8n
  -> busca RSS/APIs
  -> filtra por assunto
  -> chama API do backend
  -> backend salva notícias aprovadas ou como rascunho
```

Importante: evitar publicar automaticamente conteúdo sem revisão. Melhor salvar como rascunho/sugestão no painel admin.

---

## 5. Dicas úteis para desenvolvedores

Funcionalidade muito boa para diferenciar o site.

Pode começar como conteúdo estático/cadastrado no admin e depois evoluir para busca, favoritos e categorias.

Temas sugeridos:

```text
Git
Docker
Linux
Python
Django
FastAPI
JavaScript
TypeScript
SQL
HTTP
APIs
Regex
JSON
JWT
Segurança básica
```

Exemplos de ferramentas para devs que combinam com essa área:

```text
- formatador JSON
- validador JSON
- Base64 encode/decode
- gerador UUID
- conversor timestamp Unix ↔ data
- gerador de hash
- decodificador JWT
- testador Regex
- cheatsheet de Git
- cheatsheet de Docker
- cheatsheet de Linux
- gerador de .gitignore
```

---

## 6. Funcionalidades extras sugeridas

### Ferramentas para arquivos

```text
- juntar PDFs
- separar PDFs
- comprimir PDF
- converter imagens para PDF
- extrair texto de PDF
- OCR em imagem/PDF escaneado
- redimensionar imagens
- comprimir imagens
- converter PNG/JPG/WebP
```

### Ferramentas para devs

```text
- JSON formatter
- JSON validator
- Base64 encode/decode
- UUID generator
- hash generator
- JWT decoder
- Regex tester
- timestamp converter
- .gitignore generator
- Git command generator
- Docker cheatsheet
- Linux command cheatsheet
```

### Ferramentas de produtividade

```text
- divisor de grupos
- sorteador de ordem de apresentação
- pomodoro
- checklist rápido
- gerador de QR Code
- gerador de senha segura
- conversor de unidades
- contador de palavras/caracteres
```

---

## 7. MVP definido até agora

```text
1. Login/cadastro.
2. Página inicial com cards das ferramentas.
3. Sorteador de nomes/números/grupos.
4. Ferramentas dev simples:
   - JSON formatter
   - Base64
   - UUID
   - timestamp converter
5. Dicas de Git/Linux/Docker.
6. Conversão DOCX/PPTX → PDF.
7. Juntar/separar PDFs.
8. Transcrição básica com AssemblyAI.
9. Histórico básico de jobs do usuário.
10. Download dos arquivos/resultados.
```

---

## 8. Evolução por fases

### Fase 1 — MVP simples

Objetivo: colocar algo funcional no ar.

```text
- login/cadastro
- home com cards
- sorteador
- JSON formatter
- Base64
- UUID
- timestamp converter
- dicas de Git/Linux/Docker
- upload e conversão DOCX/PPTX → PDF
- transcrição básica com AssemblyAI
```

### Fase 2 — Histórico e experiência do usuário

```text
- histórico de arquivos convertidos
- histórico de transcrições
- download dos resultados
- status dos jobs
- limite de tamanho por arquivo
- limpeza automática de arquivos antigos
- categorias nas dicas
```

### Fase 3 — Recursos mais fortes

```text
- resumo automático da transcrição
- geração de ata
- exportação DOCX/PDF/SRT
- feed personalizado por assunto
- favoritos
- busca global
- painel admin melhorado
- sistema de créditos/limites
```

### Fase 4 — Escala e isolamento

```text
- worker de conversão em container próprio
- storage S3/MinIO
- antivírus/validação de arquivos
- rate limiting
- logs estruturados
- monitoramento
- n8n em queue mode, se necessário
- separar módulo em serviço independente, se realmente precisar
```
