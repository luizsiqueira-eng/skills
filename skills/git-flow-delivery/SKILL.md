---
name: git-flow-delivery
description: "Git Flow do card ao deploy em projetos com develop/main: branch e commit com número do card e descrição em inglês, regra 1 branch = 1 commit, PR para develop só depois da validação humana, acompanhamento do code review, release develop → main sem squash com tag semver/rc, hotfix a partir da main com PR dupla, e integração opcional com Jira via MCP. Invocar sempre que for criar branch, commitar, abrir PR, gerar release ou hotfix."
---

# Git Flow Delivery — do card ao deploy

Fluxo baseado no Git Flow, padrão de mercado, para levar um card do quadro até produção com
rastreabilidade total: **todo commit, branch e PR carrega o número do card**, e o
histórico do repositório conta a mesma história que o quadro de tarefas.

Ferramenta-agnóstico: funciona com Jira, Linear, GitHub Issues, Azure Boards etc.
Onde aparecer `ABC-123`, leia "o identificador do card no seu tracker".

> **Se existir `.claude/jira-workflow.md`** (criado pela skill `jira-workflow`), ele é a
> **fonte da verdade** para nomes de status, ids de campo e o momento de preencher cada um:
> leia esse arquivo e use o que está lá em vez de perguntar de novo ou supor nomes. As duas
> skills se dividem assim — `jira-workflow` cuida do board e dos campos; esta cuida de
> branch, commit, PR, release e hotfix; e o card acompanha o trabalho nos dois pontos de
> contato abaixo.

## Mapa de ambientes

| Branch | Ambiente | Quem mergeia |
|---|---|---|
| `develop` | Desenvolvimento / homologação (HML) | O time, após code review |
| `main` | Produção | O time, via PR de **release** ou **hotfix** |

Toda branch de trabalho nasce de `develop`. Só hotfix nasce de `main`.

## 1. Branch

```
tipo/ABC-123-short-description-in-english
```

- `tipo` ∈ `feat` · `fix` · `chore` · `refactor` · `docs` · `test`
- Criada a partir de `develop` atualizada: `git checkout develop && git pull && git checkout -b feat/ABC-123-...`
- Nome **em inglês**, kebab-case, curto. O card já tem o título completo em português.

**Ao criar a branch, mova o card para o status de desenvolvimento** — o status do card sempre
reflete a etapa real do trabalho. Preencha antes os campos daquele momento (ex.: assignee,
estimativa, data de entrega) e só então transicione; ver a seção de integração com Jira.
Card parado atrás da realidade é erro, não detalhe.

## 2. Commit

```
tipo(ABC-123) - Description in English
```

Exemplo: `fix(ABC-123) - Browser tab title shows wrong page name`

Regras que não se negociam:

- **Inglês.** Português fica no card; a mensagem de commit é para o histórico do repositório.
- **Número do card entre parênteses**, sem `:` depois. Nunca `tipo(escopo):`.
- **1 branch = 1 commit — sempre.** Qualquer ajuste depois do primeiro commit (correção
  de review, typo, lint) entra via amend, nunca como commit novo:

  ```bash
  git add -A
  git commit --amend --no-edit
  git push --force-with-lease
  ```

  Antes de qualquer push, confira que há exatamente 1 commit:
  `git log --oneline develop..HEAD`

## 3. Definição de pronto → abrir o PR

> ⚠️ **O PR só é aberto DEPOIS de um humano validar.** Não abra PR nem mova o card
> para "Revisão de Código" antes do OK explícito.

1. Terminar o trabalho do card com testes verdes; commit no padrão; `git push -u origin <branch>`.
2. Sinalizar que está pronto para validação e **esperar o OK**. Se vierem ajustes, iterar
   (via amend) — sem abrir PR nesse vai-e-volta.
3. Com o OK, abrir o PR para `develop`:

   ```bash
   gh pr create --base develop \
     --title "tipo(ABC-123) - Description in English" \
     --body "$(cat <<'EOF'
   Card: <link do card>

   - O que foi feito, em bullets técnicos
   - Decisões relevantes e por quê
   - Como testar
   EOF
   )"
   ```

   - **Título do PR = mensagem do commit.**
   - **Body em português**, com o link do card e bullets técnicos.
   - Labels quando existirem no repo: `Bug fixes` · `Improvements` · `Breaking Changes`.

## 4. Pós-PR — nesta ordem

1. **Registrar o link do PR no card** (campo/comentário de "PRs" do seu tracker), no formato:

   ```
   tipo(ABC-123) - Título
   PR #N → https://github.com/<org>/<repo>/pull/N
   ```

2. **Mover o card para "Revisão de Código"** (ou o status equivalente do seu quadro).

3. **Acompanhar o code review** (bot e/ou humanos). Se o repo tem review automático,
   aguardar **no máximo 1 minuto** — nunca em loop além disso. Para cada thread aberto:

   | Comentário | Ação |
   |---|---|
   | Procedente | Corrigir → incorporar ao commit único (amend + `--force-with-lease`) → **responder no thread** dizendo o que foi feito → *Resolve conversation* |
   | Não procedente | **Responder no thread** com a justificativa técnica → *Resolve conversation* |

   - **Sempre responder antes de resolver.** Nunca feche um thread mudo.
   - Com revisor humano, o reply é diálogo: pode-se discordar com respeito e alinhar antes
     de mexer no código. Em dúvida se o ajuste estoura o escopo do card, pergunte.
   - Se corrigiu e o bot re-revisou, repetir **no máximo mais 1 vez**. Persistindo, parar e
     reportar — não entrar em ciclo infinito de correção.

   ```bash
   # threads abertos
   gh api graphql -f owner=<org> -f repo=<repo> -F pr=<N> -f query='
     query($owner:String!,$repo:String!,$pr:Int!){ repository(owner:$owner,name:$repo){
       pullRequest(number:$pr){ reviewThreads(first:50){ nodes{
         id isResolved comments(first:10){ nodes{ databaseId path body } } } } } } }'
   # responder num comentário
   gh api repos/<org>/<repo>/pulls/<N>/comments -f body='...' -F in_reply_to=<databaseId>
   # resolver o thread (id do THREAD, não do comentário)
   gh api graphql -f id=<threadId> -f query='
     mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread{ isResolved } } }'
   ```

4. **Notificar o time** no canal (Slack, Discord, Teams…) — **sempre com confirmação
   explícita, pedida depois das etapas 1–3**. Autorização antecipada ("já pode avisar")
   dada antes do PR existir **não vale**: complete as etapas, pergunte, e só envie com o
   "sim" na resposta seguinte. Formato:

   ```
   @<papel-do-time>
   PR: <url do PR>
   Card: <url do card>
   ```

## 5. Release — develop → main

A branch `release` é **descartável**: existe só para levar o estado da `develop` até um
PR contra `main`.

```bash
git checkout develop && git pull
git checkout -B release                     # -B recria se já existir
git push -u origin release
gh pr create --base main --head release --title "Release" --body "Release"
git checkout develop && git branch -D release   # a remota o GitHub apaga no merge
```

Regras:

- **Título e body: `Release`**, sem número de versão. A versão vive na **tag/release do
  GitHub** (`vX.Y.Z`), não no título do PR.
- **NUNCA squash/rebase no merge** — release preserva o histórico da `develop` (merge commit).
- PR de release **não tem card**: as etapas de tracker da seção 4 não se aplicam. Só a
  notificação, com o mesmo pedido de confirmação:

  ```
  @<papel-do-time>
  Release 📢
  <url do PR>
  ```

- Após o merge, publicar a release final `vX.Y.Z` (sem `-rc`, apontando para `main`).
  Se o deploy de produção dispara pelo evento de release, **conferir que todos os
  workflows rodaram** (`gh run list --workflow <arquivo>`). Se um não disparou, deletar e
  recriar a release na mesma tag re-dispara o evento.

### Versionamento (semver + release candidates)

| Situação | Ação | Exemplo |
|---|---|---|
| Nova feature em `develop` | Incrementa **minor**, abre `rc.1` | `1.1.0 → 1.2.0-rc.1` |
| Nova RC em `develop` | Incrementa o número da RC | `1.2.0-rc.1 → 1.2.0-rc.2` |
| Release para `main` | Remove o sufixo `-rc` da última RC | `1.2.0-rc.3 → 1.2.0` |
| Hotfix em `main` | Incrementa **patch** | `1.2.0 → 1.2.1-rc.1` |
| Feature após RC parcial lançada | Nova minor com `rc.1` | `1.2.0-rc.5 → 1.3.0-rc.1` |

Durante um hotfix podem coexistir `main: 1.2.1-rc.1` e `develop: 1.3.0-rc.1`.
Conferir a última tag: `git tag --sort=-creatordate | head -5`.

## 6. Hotfix — direto em produção

Hotfix é a **única** branch que nasce de `main`.

```bash
git checkout main && git pull
git checkout -b fix/ABC-123-short-description
# ... corrigir, commit no padrão (1 commit), push ...
gh pr create --base main    --title "fix(ABC-123) - Description" --body "..."
gh pr create --base develop --title "fix(ABC-123) - Description" --body "..."
```

- **Duas PRs, sempre**: uma para `main` (vai para produção) e outra para `develop`
  (para a correção não se perder na próxima release). Registrar **os dois links** no card.
- Versão: patch com `rc` (`1.2.0 → 1.2.1-rc.1`), release final após o merge em `main`.


## Integração com Jira (opcional, via MCP do Atlassian)

Se o projeto tem o MCP do Atlassian conectado (ferramentas `jira_*`), as etapas de card da
seção 4 podem ser feitas pelo agente. Sem MCP, faça-as manualmente ou via REST — nunca com
credenciais no prompt.

| Etapa | Ferramenta MCP | Observação |
|---|---|---|
| Ler o card (título, status, campos) | `jira_get_issue` | Confirme que o card existe antes de criar a branch |
| Mover para **desenvolvimento** ao criar a branch | `jira_update_issue` (campos do momento) + `jira_transition_issue` | O card entra em dev quando o trabalho começa, não quando termina |
| Registrar o link do PR | `jira_update_issue` (campo de "PRs") **ou** `jira_add_comment` | O nome do campo varia por instância — veja "Adaptando ao seu time" |
| Descobrir as transições disponíveis | `jira_get_transitions` | Os IDs mudam por workflow; nunca chumbe um número |
| Mover para "Revisão de Código" | `jira_transition_issue` | Se a transição não estiver disponível, avise — não force outro caminho |

Regras:

- **Preencher campos antes de transicionar.** Alguns workflows rejeitam campos setados
  dentro da transição ("not on the appropriate screen"): atualize o card primeiro, depois mova.
- **Ler antes de escrever.** Sempre `jira_get_issue` antes de `jira_update_issue`, para não
  sobrescrever conteúdo existente no campo de PRs — acrescente, não substitua.
- **Marcar a origem.** Se o time usa uma label para o que o agente toca (ex.: `ai`), some-a
  às labels existentes.
- Hotfix registra **os dois** links de PR (`main` e `develop`) no mesmo card.

## Checklist rápido

- [ ] Branch `tipo/ABC-123-english-name`, criada de `develop` (de `main` só se hotfix)
- [ ] Commit `tipo(ABC-123) - Description in English` — e **só um** commit
- [ ] Card movido para desenvolvimento ao criar a branch
- [ ] Humano validou **antes** do PR
- [ ] PR para `develop`, título = commit, body em português com link do card
- [ ] Link do PR registrado no card; card em "Revisão de Código"
- [ ] Threads de review: respondidos **e** resolvidos; correções via amend
- [ ] Notificação ao time só depois de perguntar e receber "sim"
- [ ] Release: título `Release`, sem squash, tag `vX.Y.Z`
- [ ] Hotfix: PR para `main` **e** para `develop`, versão patch

## Adaptando ao seu time

Troque estes pontos e o resto do fluxo se mantém:

| O que | Aqui | No seu time |
|---|---|---|
| Prefixo do card | `ABC-123` | ex.: `PROJ-42`, `#1234` |
| Branch de integração / produção | `develop` / `main` | ex.: `dev` / `master` |
| Status pós-PR | "Revisão de Código" | o nome da coluna no seu quadro |
| Canal do time | Slack / Discord / Teams | webhook ou menção que o time usa |
| Campo de PRs no Jira | campo de texto "PRs" ou comentário | o `customfield_*` da sua instância, ou comentário |
| Mapa do board e dos campos | perguntar ao time | `.claude/jira-workflow.md` (skill `jira-workflow`) |
| Label de origem | — | ex.: `ai`, `claude`, se o time quiser rastrear |
| Tipos de commit | feat, fix, chore, refactor, docs, test | acrescente `perf`, `ci`… se usar |
