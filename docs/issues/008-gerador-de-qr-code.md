# [Produtividade] Implementar gerador de QR Code

**Categoria:** Produtividade  
**Tipo:** Frontend  
**Complexidade:** Média  
**Prioridade sugerida:** Etapa 1

**Estado:** Implementada

## Descrição da tarefa

Criar QR Codes para URL e rede Wi-Fi, com pré-visualização e download em PNG e SVG.

## Solução proposta

- Criar a rota `/qr-code`.
- Usar a biblioteca `qrcode` no navegador.
- Implementar tipos:
  - URL;
  - Wi-Fi com SSID, segurança, senha e rede oculta.
- Gerar o payload com funções próprias e testes, sem concatenar HTML.
- Usar um padrão fixo de alta legibilidade para tamanho, margem, correção e cores.
- Atualizar a prévia localmente e permitir download em PNG/SVG.
- Não enviar nem persistir o conteúdo.

Referência técnica: <https://github.com/soldair/node-qrcode>

## Impacto no servidor

Nenhum. Apenas JavaScript e geração de imagem no navegador.

## Fora de escopo do MVP

- QR dinâmico/redirecionável, analytics ou URL curta.
- Logos no centro, templates avançados ou armazenamento em conta.
- Validação de que o destino é seguro.

## Critérios de aceitação

- [x] URLs geram QR Codes legíveis.
- [x] Wi-Fi escapa corretamente caracteres especiais de SSID e senha.
- [x] O usuário pode baixar PNG e SVG.
- [x] A saída usa um padrão fixo com tamanho, margem, correção e cores adequados.
- [x] Conteúdo excessivo ou inválido é rejeitado com mensagem clara.
- [x] Nenhum payload é executado, aberto automaticamente, enviado ou persistido.
- [x] Testes decodificam amostras geradas e comparam o conteúdo esperado.
