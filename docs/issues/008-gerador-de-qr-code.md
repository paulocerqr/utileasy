# [Produtividade] Implementar gerador de QR Code

**Categoria:** Produtividade  
**Tipo:** Frontend  
**Complexidade:** Média  
**Prioridade sugerida:** Etapa 1

## Descrição da tarefa

Criar QR Codes para texto, URL, rede Wi-Fi e contato, com pré-visualização e download
em PNG e SVG.

## Solução proposta

- Criar a rota `/qr-code`.
- Usar a biblioteca `qrcode` no navegador.
- Implementar tipos:
  - texto livre;
  - URL;
  - Wi-Fi com SSID, segurança, senha e rede oculta;
  - contato vCard básico.
- Gerar o payload com funções próprias e testes, sem concatenar HTML.
- Permitir tamanho, margem, nível de correção e cores com contraste mínimo.
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

- [ ] Texto e URLs geram QR Codes legíveis.
- [ ] Wi-Fi escapa corretamente caracteres especiais de SSID e senha.
- [ ] vCard inclui apenas campos preenchidos e usa formato válido.
- [ ] O usuário pode baixar PNG e SVG.
- [ ] Tamanho, margem e correção alteram a saída.
- [ ] Combinações de cores sem contraste suficiente geram aviso.
- [ ] Conteúdo excessivo ou inválido é rejeitado com mensagem clara.
- [ ] Nenhum payload é executado, aberto automaticamente, enviado ou persistido.
- [ ] Testes decodificam amostras geradas e comparam o conteúdo esperado.

