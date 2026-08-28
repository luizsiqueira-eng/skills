# Telemetria de instalação (Worker)

Recebe o ping anônimo do CLI (`npx @luizsiqueira/skills add <skill>`) e registra o evento
`skill_install` no GA4. O `api_secret` do Measurement Protocol fica como secret do Worker.

## Publicar (uma vez)

```bash
cd telemetry-worker
npx wrangler login                       # abre o navegador na conta Cloudflare do domínio
npx wrangler secret put GA_API_SECRET    # cole a chave: GA4 → fluxo Web → Chaves secretas da API do Measurement Protocol → Criar
npx wrangler deploy
```

Teste:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://luizsiqueira.com.br/api/ping \
  -H 'content-type: application/json' -d '{"skill":"git-flow-delivery","version":"test","os":"darwin","node":"22"}'
# 204 = evento enviado ao GA (aparece em Tempo real como skill_install)
```
