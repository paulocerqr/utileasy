# Segurança e Cuidados Importantes

Pontos importantes definidos:

```text
- não passar arquivos grandes diretamente pelo n8n
- backend deve controlar uploads
- passar para o n8n apenas IDs, metadados ou URLs temporárias
- proteger webhooks com autenticação
- usar Header Auth/JWT nos webhooks
- separar banco do n8n do banco principal
- limitar tamanho dos arquivos
- limpar arquivos temporários automaticamente
- validar extensão e tipo MIME dos arquivos
- evitar publicar notícias/dicas automaticamente sem revisão
- logs para falhas de conversão/transcrição
- rate limiting em endpoints sensíveis
```
