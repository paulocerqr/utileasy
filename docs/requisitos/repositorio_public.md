## O que está seguro atualmente

  A auditoria local confirmou:

  - .env está ignorado.
  - .env nunca apareceu no histórico Git disponível.
  - Nenhuma credencial conhecida, private key, dump, upload ou banco foi encontrado nas branches locais/remotas.
  - .env.example contém somente placeholders.
  - Credenciais da AssemblyAI, S3, PostgreSQL e Turnstile não são enviadas ao frontend.
  - Backend, PostgreSQL e Redis ficam privados nos perfis de produção.

  Portanto, deixar o código público não publica automaticamente os arquivos .env do computador ou servidor.

  ## O que corrigir antes

  1. Atualizar dependências do frontend — concluído em 29/07/2026

  O frontend foi atualizado para Next.js 16.2.12, `sharp` 0.35.0 e `postcss`
  8.5.24. A CLI `shadcn`, que não era usada pelo runtime ou scripts do projeto,
  foi removida das dependências instaladas.

  `pnpm audit` e `pnpm audit --prod` passaram sem vulnerabilidades conhecidas
  depois da atualização.

  2. Rotacionar a chave AssemblyAI

  Ela não está no Git, mas apareceu anteriormente na saída de uma ferramenta nesta conversa. Eu a revogaria e geraria outra antes do deploy público.

  3. Proteger melhor arquivos de ambiente — concluído no repositório local

  O `.gitignore` agora cobre:

  .env
  .env.*
  !.env.example

  O `.env` local passou a usar:

  chmod 600 .env

  4. Revisar os e-mails dos commits

  O histórico possui dois e-mails comuns e a configuração atual também usa e-mail comum. Eles ficarão visíveis publicamente. Para commits futuros, você pode usar o endereço noreply do GitHub;
  mudar a configuração não altera commits antigos. Documentação do GitHub
  (https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address?platform=linux).

  5. Adicionar arquivos de projeto público

  Atualmente não há:

  - LICENSE
  - SECURITY.md
  - workflow de CI em .github/workflows

  Sem licença, o repositório pode ser visualizado, mas as regras padrão de copyright continuam valendo. Se quiser permitir estudo e reutilização, MIT é uma opção comum. Documentação sobre
  licenças (https://docs.github.com/en/enterprise-cloud%40latest/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

  6. Ativar segurança do GitHub

  Depois de torná-lo público:

  - Ative Dependabot.
  - Ative push protection.
  - Confira a aba Security antes de divulgar.

  Repositórios públicos recebem secret scanning gratuitamente, e a push protection ajuda a impedir novos vazamentos. Secret scanning
  (https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning), push protection
  (https://docs.github.com/en/code-security/concepts/secret-security/push-protection).

  ## Para valorizar no currículo

  Eu publicaria depois de:

  - Adicionar CI rodando backend, TypeScript e build.
  - Melhorar a página inicial do README com arquitetura, screenshots, URL da demonstração e decisões técnicas.
  - Incluir política de privacidade simples, explicando que áudios são enviados à AssemblyAI, resultados anônimos expiram e resultados autenticados são persistidos.
  - Mesclar server-main na branch principal por PR, mostrando um fluxo profissional.

  Minha conclusão: as dependências e o tratamento local de `.env` foram
  corrigidos. A chave AssemblyAI que apareceu fora do Git ainda deve ser
  rotacionada antes de abrir e divulgar o deploy.
