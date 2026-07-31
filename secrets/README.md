# Segredos locais do deploy

Este diretório recebe segredos montados pelo Docker Compose e não deve conter
arquivos versionados além deste README.

Para o perfil caseiro com Cloudflare Tunnel, crie:

```text
secrets/cloudflare-tunnel-token
```

O arquivo deve conter somente o token do túnel gerenciado remotamente, em uma linha,
e usar permissão `600`. Não coloque o token no `.env`, na linha de comando, em logs
ou na documentação.

O container `cloudflared` roda com `PUID` e `PGID` definidos no `.env`. O arquivo
precisa pertencer ao mesmo usuário/grupo para continuar legível dentro do container.
Use `id -u` e `id -g` no servidor para descobrir esses dois valores.
