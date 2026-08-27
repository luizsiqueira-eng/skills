---
name: security-review
description: "Auditoria de segurança de projetos web (Laravel/PHP, Node/JavaScript/TypeScript, Python e apps com LLM/RAG/agentes): detecta a stack, roda os scanners disponíveis (npm/composer/pip audit, gitleaks, semgrep), procura padrões perigosos no código (SQL por concatenação, XSS, IDOR, secrets hardcoded, SSRF, path traversal, output de LLM executado sem validação, agente com privilégio excessivo), classifica por severidade, reporta com arquivo e linha e corrige com confirmação. Invocar quando pedirem para revisar a segurança de um projeto ou PR, apontar vulnerabilidades, checar OWASP, ou antes de aprovar código gerado por IA."
---

# Security Review — validar, apontar e corrigir

Premissa: **código gerado por IA é código não confiável até passar por validação, testes e
revisão de segurança.** Isso vale para o código que você está revisando e para o que você mesmo
acabou de escrever.

| Modo | Quando | Escopo |
|---|---|---|
| **Auditoria** | "revisa a segurança do projeto" | o repositório inteiro |
| **Revisão de PR** | "revisa a segurança desse PR/diff" | só o que mudou (`git diff develop...HEAD`) |
| **Correção** | "corrige o que encontrou" | os achados aprovados, um por vez |

Sempre nesta ordem: **detectar → escanear → revisar → classificar → reportar → corrigir**.
Nunca corrija antes de reportar — a pessoa decide o que entra.

A referência completa (riscos, exemplos, checklists por tema) está em `checklist.md` nesta
pasta. Este arquivo é o procedimento.

## 1. Detectar a stack e o que há disponível

```bash
ls composer.json package.json requirements.txt pyproject.toml go.mod Dockerfile .env .env.example 2>/dev/null
```

| Encontrou | Stack | Sinais de IA/LLM no projeto |
|---|---|---|
| `composer.json` | PHP — Laravel se `laravel/framework` | `openai-php`, `anthropic` |
| `package.json` | Node/JS/TS — Express, Next, Nest, Fastify | `openai`, `@anthropic-ai/sdk`, `langchain`, `@pinecone-database`, `chromadb` |
| `requirements.txt` / `pyproject.toml` | Python — Django, FastAPI, Flask | `openai`, `anthropic`, `langchain`, `llama-index` |

Se houver sinais de LLM, a seção 5 é **obrigatória**. Verifique também quais scanners estão
instalados (`which gitleaks semgrep trivy`) — use os que existirem; **não instale nada** sem
perguntar.

## 2. Escanear com as ferramentas do ecossistema

Rode o que se aplica e guarde a saída para o relatório:

| Stack | Dependências (SCA) | Secrets | Estático |
|---|---|---|---|
| Node | `npm audit --json` (ou `pnpm audit` / `yarn audit`) | `gitleaks detect --no-git -v` | `semgrep --config p/owasp-top-ten --config p/javascript` |
| PHP/Laravel | `composer audit --format=json` | idem | `semgrep --config p/php` |
| Python | `pip-audit` ou `pip audit` | idem | `semgrep --config p/python` + `bandit -r .` |
| Qualquer | — | `git log -p --all -S "sk-" \| head` (secrets no histórico) | — |

Sem gitleaks, faça a busca básica de secrets:

```bash
grep -rnE "(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|-----BEGIN (RSA |EC )?PRIVATE KEY|password\s*=\s*['\"][^'\"]{6,}|api[_-]?key\s*[:=]\s*['\"][^'\"]{10,})" \
  --include=*.{js,ts,php,py,env,json,yml,yaml} --exclude-dir={node_modules,vendor,.git,dist,build} .
```

Confira também se `.env` está no `.gitignore` **e** se nunca foi commitado
(`git log --all --oneline -- .env`).

## 3. Procurar os padrões perigosos no código

Grep é triagem, não veredito: **abra cada match e confirme** se a entrada é controlada pelo
usuário e se existe validação/escape antes. Só reporte o que confirmou.

### Injection (SQL, comando, template)

| Stack | Padrão suspeito | Seguro |
|---|---|---|
| Node | `` query(`...${ `` · `query("..." + ` | placeholders `?` / `$1`, query builder com bindings |
| Laravel | `DB::raw(`, `whereRaw(`, `selectRaw(`, `DB::statement(` com variável | `where('col', $v)`, `whereRaw('col = ?', [$v])` |
| Python | `f"SELECT ... {`, `"..." % (`, `.format(` em SQL | parâmetros do driver, ORM |
| Qualquer | `exec(`, `spawn(` com shell, `shell_exec(`, `system(`, `passthru(`, `subprocess(..., shell=True)` | lista de argumentos sem shell; allowlist do comando |
| Qualquer | `eval(`, `new Function(`, `unserialize(`, `pickle.loads(` em dado externo | não usar; JSON com schema |

### XSS e saída para o navegador

| Padrão suspeito | Seguro |
|---|---|
| `innerHTML =`, `outerHTML =`, `document.write(`, `insertAdjacentHTML(` com dado externo | `textContent`; sanitizar com DOMPurify se HTML for inevitável |
| React `dangerouslySetInnerHTML` | idem |
| Blade `{!! $x !!}` | `{{ $x }}` (escapado) |
| Django/Jinja `\|safe`, `mark_safe(`, `{% autoescape off %}` | escape padrão |
| `res.send(` / `echo` de entrada sem escape em HTML | template com escape; `Content-Type` correto |

### Autorização, IDOR e acesso

- Rota que recebe `id` na URL e busca direto (`find($id)`, `findById(req.params.id)`) **sem
  checar o dono** (`where user_id = auth()`, policy, guard) → IDOR.
- Laravel: `$request->all()` em `create`/`update` sem `$fillable`/`$guarded` → mass assignment.
- Middleware de auth ausente em rota que muda estado; checagem só no front-end.
- Multi-tenant: consulta sem filtro de `tenant_id`.

### Upload, arquivos e rede

- Path traversal: caminho montado com entrada do usuário (`path.join(base, req.query.file)`,
  `storage_path($name)`) sem normalizar e conferir que ficou dentro da base.
- Upload: extensão/MIME não validados, arquivo servido do mesmo domínio, nome original mantido.
- SSRF: `fetch(url)`, `axios.get(url)`, `Http::get($url)`, `file_get_contents($url)`,
  `requests.get(url)` com URL vinda do usuário, sem allowlist de domínio e bloqueio de IP privado.
- CORS `*` com credenciais; cookies sem `HttpOnly`/`Secure`/`SameSite`.
- Redirect com destino vindo da query (`redirect($request->url)`) sem allowlist.

### Inclusão de arquivos (LFI / RFI)

- `include`/`require`/`include_once` com caminho vindo de entrada (`include($_GET['page'])`,
  `require "pages/$name.php"`) → LFI; com `allow_url_include=On`, vira RFI (código remoto).
- Node: `require(userInput)`, `import(userInput)`, `res.render(req.query.view)`; Python:
  `__import__(name)`, `importlib.import_module(user)`, `open(path)` com caminho externo.
- Seguro: **allowlist** de nomes válidos (`['home','about']`), nunca o caminho; `allow_url_include=Off`.

### CSRF e clickjacking

| Padrão suspeito | Seguro |
|---|---|
| Laravel: rota em `web.php` fora do middleware `web`, ou `$except` no `VerifyCsrfToken` com rotas de estado | manter `@csrf` nos forms e o middleware ativo; exceções só para webhooks com assinatura própria |
| Node: `POST/PUT/DELETE` com sessão por cookie e sem token CSRF (`csurf`/`csrf-csrf`/double-submit) | token por sessão ou `SameSite=Lax/Strict` **e** checagem de `Origin` |
| Django: `@csrf_exempt` em view que muda estado; `CsrfViewMiddleware` removido | manter o middleware; exemption só com justificativa |
| Estado mudado via `GET` (`/delete?id=`) | mutação só em `POST/PUT/DELETE` |
| Sem `X-Frame-Options` nem `Content-Security-Policy: frame-ancestors` | `frame-ancestors 'self'` (ou `'none'`) — clickjacking; `helmet` no Node, `SecurityHeaders`/middleware no Laravel |
| Sem `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` | headers de segurança no servidor ou no middleware |

### Autenticação, sessão e bypass

- **Bypass:** rota que muda estado sem middleware de auth; auth checada só no front; `if (user)`
  onde `user` pode vir do cliente (header/cookie forjável, `X-User-Id`); endpoint de debug/admin
  esquecido (`/debug`, `/admin` sem guard); ordem errada de middleware (handler antes do auth).
- **JWT:** sem expiração; sem verificar assinatura (`alg: none`, `verify: false`, `decode()` em vez de
  `verify()`); segredo fraco/hardcoded; aceitar token de outro emissor/audience; sem revogação.
- **Brute force:** sem rate limit em login/reset/OTP/2FA; sem bloqueio ou atraso progressivo após
  tentativas; enumeração de usuário por mensagem diferente ("senha errada" vs "usuário não existe").
- **Session fixation:** id de sessão não regenerado no login (`session()->regenerate()`,
  `req.session.regenerate()`, `request.session.cycle_key()`); id aceito pela URL ou por cookie
  pré-existente.
- **Session hijacking:** cookie sem `HttpOnly`/`Secure`/`SameSite`; sessão sem expiração ou sem
  invalidação no logout e na troca de senha; token de sessão em URL, log ou `localStorage` exposto a XSS.
- Comparação de token/hash com `==` em vez de comparação em tempo constante.
- Senha com hash fraco (MD5/SHA1) ou sem salt; `bcrypt`/`argon2` é o esperado.

### Condições de corrida (race condition)

- Padrão **ler → decidir → gravar** sem lock ou transação em recurso disputado: saldo, estoque,
  cupom de uso único, "já votou?", limite de uso — permite gastar/usar duas vezes com requisições
  simultâneas.
- Seguro: `SELECT ... FOR UPDATE` / `lockForUpdate()` dentro de transação; `UPDATE ... WHERE saldo >= ?`
  atômico; constraint `UNIQUE` para "uma vez só"; chave de idempotência em operações de pagamento.
- Teste negativo: disparar N requisições em paralelo e conferir que só uma passa.

### Exposição de dados sensíveis, erros e logs

- Stack trace, query ou payload retornados ao cliente (`APP_DEBUG=true` em produção,
  `app.use(errorHandler)` que vaza `err.stack`).
- Dado pessoal, token ou senha em log, em URL (`?token=`) ou em resposta de API além do necessário
  (serializar o model inteiro: `return $user`, `res.json(user)` com hash/e-mail/documento).
- Tráfego sem TLS; `.git/`, `.env`, backups ou `phpinfo` servidos publicamente; listagem de diretório.
- Dado sensível armazenado em claro quando deveria ser hash ou cifrado; sem mascaramento em telas/logs.

## 4. Dependências e supply chain

Além do `audit`: versões fixadas e **lockfile versionado**; pacotes com nome parecido com o de
uma lib conhecida (typosquatting); dependência adicionada só para uma função trivial;
implementação própria de cripto/auth onde existe solução consolidada; imagem Docker
`latest` ou sem scan (`trivy image` se houver).

## 5. Se o projeto usa LLM, RAG ou agentes

Trate como **fronteira de confiança nova** — o modelo não é camada de segurança.

| Risco | Como identificar | Como corrigir |
|---|---|---|
| **Insecure output handling** | saída do modelo vai para `query(`, `exec(`, `eval(`, `innerHTML`, `fetch(url)` sem passar por validação | schema (JSON Schema/zod/Pydantic) → validação → **autorização no código** → execução controlada |
| **Prompt injection** | entrada do usuário ou documento do RAG concatenado ao system prompt; ações disparadas só pelo conteúdo recuperado | separar instrução de dado; tratar RAG como não confiável; decisão de ação fora do LLM |
| **Excessive agency** | tool `executar_sql`, credencial admin, tool de deleção sem confirmação, sem limite de chamadas | menor privilégio por tool; autorização própria em cada tool; human-in-the-loop em ação destrutiva; limite de iterações |
| **Vazamento via RAG** | vector DB compartilhado sem filtro de `tenant_id`/`user_id` **no retrieval** | filtrar **antes** de recuperar; metadados de acesso por documento; remover embeddings de documento excluído |
| **Vazamento em logs** | prompt/resposta com PII, token ou documento privado gravados | logar id da requisição, usuário, tool, decisão de autorização, resultado — não o conteúdo |
| **Secrets no prompt** | chave/senha dentro de prompt ou system prompt | secret manager / variável de ambiente |
| **SSRF via tool** | tool HTTP com URL controlada pelo modelo/usuário | allowlist de domínio, bloqueio de IP privado, timeout, limite de resposta |

Regra de arquitetura a cobrar: `INPUT → VALIDATE → AUTHENTICATE → AUTHORIZE → LLM → VALIDATE
OUTPUT → BUSINESS RULES → EXECUTE → AUDIT`. Nunca `INPUT → LLM → EXECUTE`.

## 6. Classificar

| Nível | Critério | Exemplos |
|---|---|---|
| 🔴 **Crítica** | explorável remotamente sem autenticação, ou vaza/destrói dados de terceiros | SQL injection, RCE, secret válido no repo, IDOR em dado de outro usuário, output de LLM executado direto |
| 🟠 **Alta** | explorável por usuário autenticado ou com pré-condição plausível | XSS armazenado, SSRF interno, mass assignment em campo sensível, JWT sem expiração |
| 🟡 **Média** | reduz defesa ou exige cadeia de falhas | CORS permissivo, sem rate limit, cookie sem flags, dependência com CVE sem caminho claro de exploração |
| 🔵 **Baixa** | higiene e boas práticas | log verboso, header de segurança ausente, versão desatualizada sem CVE |

Falso positivo confirmado **não entra** no relatório. Achado que você não conseguiu confirmar
entra como "a verificar", separado.

## 7. Reportar

Sempre antes de corrigir. Formato:

```
## Security Review — <projeto ou PR #N>
Stack: Laravel 11 · Node 20 (front) · usa OpenAI SDK
Ferramentas: composer audit ✓ · npm audit ✓ · gitleaks ✗ (não instalado) · semgrep ✗

### Resumo
🔴 2 · 🟠 3 · 🟡 4 · 🔵 2 · a verificar: 1

### Achados
🔴 SQL injection — app/Http/Controllers/ReportController.php:48
   `DB::select("... WHERE status = '$status'")` com $status vindo da query string.
   Correção: binding `DB::select('... WHERE status = ?', [$status])`.

🟠 IDOR — routes/api.php:31 + OrderController@show
   `Order::findOrFail($id)` sem checar o dono. Correção: `auth()->user()->orders()->findOrFail($id)` ou Policy.
…

### Dependências
composer audit: 1 pacote com CVE (…) · npm audit: 3 high, 12 moderate

### Recomendação
Bloquear merge até resolver as 🔴. As 🟠 entram no mesmo PR ou em card próprio, à escolha do time.
```

Cada achado tem **arquivo:linha, o que é, por que é explorável e a correção proposta**. Sem
os quatro, não é achado — é palpite.

## 8. Corrigir (só depois do OK)

- **Um achado por vez**, começando pelas 🔴. Peça confirmação antes de mexer em autenticação,
  autorização ou cripto — são as mudanças com mais efeito colateral.
- Corrija a **causa**, não o sintoma: placeholder em vez de escapar a string; policy em vez de
  `if` solto na rota; schema de saída em vez de regex na resposta do LLM.
- **Escreva o teste negativo** junto com a correção (a entrada maliciosa deve falhar) — é o que
  impede a regressão.
- Secret encontrado no repositório: **rotacione primeiro**, depois remova do código e do
  histórico. Remover sem rotacionar não resolve nada.
- Não "arrume" desabilitando a proteção (CSRF off, `verify: false`, `rejectUnauthorized: false`,
  `eslint-disable` em regra de segurança). Isso é achado novo, não correção.
- Se o projeto usa a skill `git-flow-delivery`, a correção segue o fluxo dela (branch, commit
  com o card, PR). Secret exposto e 🔴 explorável em produção são **hotfix**.

## Mapa de cobertura (Pentest Web)

Para conferir que a revisão não deixou buraco — cada item e onde ele é tratado neste arquivo:

| Vulnerabilidade | Seção |
|---|---|
| SQL Injection | Injection |
| Cross-Site Scripting (XSS) | XSS e saída para o navegador |
| Cross-Site Request Forgery (CSRF) | CSRF e clickjacking |
| Broken Access Control · IDOR | Autorização, IDOR e acesso |
| Authentication Bypass · Brute Force · JWT Misconfiguration | Autenticação, sessão e bypass |
| Session Fixation · Session Hijacking | Autenticação, sessão e bypass |
| CORS Misconfiguration · Open Redirect | Upload, arquivos e rede |
| Sensitive Data Exposure | Exposição de dados sensíveis, erros e logs |
| SSRF · Path Traversal | Upload, arquivos e rede |
| Local / Remote File Inclusion | Inclusão de arquivos (LFI / RFI) |
| File Upload · Unrestricted File Upload | Upload, arquivos e rede |
| Clickjacking | CSRF e clickjacking |
| Race Condition | Condições de corrida |
| Prompt Injection · Excessive Agency · Insecure Output · RAG | Se o projeto usa LLM, RAG ou agentes |

## Checklist rápido

- [ ] Stack detectada; sinais de LLM verificados
- [ ] `audit` de dependências rodado; secrets procurados (código **e** histórico)
- [ ] Todas as linhas do **mapa de cobertura** revisadas — matches **confirmados**
- [ ] Se há LLM: output handling, prompt injection, agency, RAG e logs checados
- [ ] Cada achado com arquivo:linha, exploração e correção; severidade atribuída
- [ ] Relatório entregue **antes** de qualquer alteração
- [ ] Correções aprovadas, uma por vez, com teste negativo; secrets rotacionados

## Adaptando ao seu time

| O que | Aqui | No seu time |
|---|---|---|
| Ferramentas | gitleaks, semgrep, trivy se existirem | as que o CI já roda (Snyk, SonarQube, CodeQL…) |
| Severidade | 4 níveis acima | o esquema do seu programa de segurança (CVSS, etc.) |
| Política de merge | bloquear com 🔴 | o acordo do time |
| Regras extras de domínio | — | ex.: idempotência em cobranças, mascaramento de documentos, LGPD/GDPR |
| Onde registrar | relatório no PR/card | ferramenta de vulnerabilidades do time |
