# Status Atual e Próximos Passos

## 1. Status atual do projeto

O projeto saiu da fase puramente conceitual e já tem uma base inicial implementada.

Já existe código para:

```text
- Docker Compose inicial
- PostgreSQL em container
- backend Django/DRF em container
- frontend Next.js em container
- endpoint de health check no backend
- consumo do health check pelo frontend
- estrutura inicial do app de transcrições
- provider inicial para AssemblyAI
- template visual da home com cards de ferramentas
```

Estado funcional atual:

```text
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- Health check: GET http://localhost:8000/api/health/
- Integração frontend-backend validada pelo card de status na home
```

---

## 2. Limitações atuais

```text
- Login/cadastro ainda não foi implementado.
- Redis/Celery ainda não estão conectados no Docker Compose atual.
- Os cards de ferramentas ainda não abrem ferramentas funcionais.
- O app de transcrições ainda não tem endpoints públicos em urls.py.
- Conversão de arquivos ainda não foi implementada.
- n8n ainda não está configurado no compose.
```

---

## 3. Próximos passos naturais

```text
1. Implementar autenticação de usuários.
2. Criar endpoints reais para as primeiras ferramentas simples.
3. Conectar os cards do frontend a rotas reais do Next.js.
4. Implementar o sorteador como primeira ferramenta funcional.
5. Implementar ferramentas dev simples como JSON formatter, Base64, UUID e timestamp.
6. Adicionar Redis e Celery ao Docker Compose.
7. Criar endpoints públicos para transcrição.
8. Implementar upload, status de job e histórico básico.
9. Depois implementar conversão de arquivos e integração mais completa com AssemblyAI.
```

---

## 4. Deploy — status

Ver detalhes completos em `07-deploy.md`. Resumo: deploy via Tailscale já validado, com build de produção (Next.js + Gunicorn), WhiteNoise para estáticos, e apenas a porta do frontend exposta na rede Tailscale.
