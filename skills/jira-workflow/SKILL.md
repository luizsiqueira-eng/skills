---
name: jira-workflow
description: "Configura e opera o fluxo de trabalho no Jira de qualquer time: na primeira execução entrevista a pessoa para mapear projeto, board, colunas/status, tipos de issue, campos customizados e em que momento cada campo é preenchido, e grava o mapa em .claude/jira-workflow.md; depois usa esse mapa para criar, refinar, mover, comentar e consultar cards via MCP do Atlassian. Para quem ainda não tem fluxo definido, sugere um quadro padrão (Backlog → Refinamento → Desenvolvimento → Code Review → Qualidade → Validação → Pronto). Invocar quando pedirem para configurar o Jira, criar/mover/atualizar/comentar card, ver o que está em cada coluna do board, ou quando não souberem qual fluxo adotar."
---

# Fluxo de trabalho no Jira

Esta skill não presume o board de ninguém. Ela **aprende o fluxo do time uma vez**, grava e
depois opera em cima disso.

| Modo | Quando | O que faz |
|---|---|---|
| **Setup** | não existe `.claude/jira-workflow.md` (ou pediram para reconfigurar) | entrevista + descoberta pela API, grava o mapa |
| **Operação** | o arquivo existe | criar, refinar, mover, comentar e consultar cards seguindo o mapa |

**Primeira coisa, sempre:** leia `.claude/jira-workflow.md`. Se existir, não repita a
entrevista — opere. Se faltar só um dado, pergunte apenas aquele e acrescente ao arquivo.

## Pré-requisitos

- **MCP do Atlassian conectado** (ferramentas `jira_*`). Confirme que elas existem antes de
  prometer qualquer coisa; se não existirem, diga o que falta conectar e pare.
- **Nunca** peça, imprima ou passe token/senha em prompt ou em `curl`. Sem MCP, oriente a
  pessoa a conectar — não improvise autenticação.

---

# Modo Setup — a entrevista

## Regra: descubra antes de perguntar

Cada pergunta que a API já responde é uma pergunta a menos. Antes de abrir a boca:

| Descobrir | Ferramenta |
|---|---|
| Projetos disponíveis | `jira_get_all_projects` |
| Boards | `jira_get_agile_boards` |
| Tipos de issue do projeto | `jira_get_project_issue_types` |
| Campos existentes e seus ids | `jira_search_fields` |
| Campos da tela de criação (e obrigatórios) | `jira_get_create_fields` |
| Status e transições reais do workflow | `jira_get_transitions` (num card existente) |
| Sprints, se houver | `jira_get_sprints_from_board` |

Traga listas prontas para a pessoa escolher ("achei 3 projetos: A, B, C — qual?"), em vez de
pedir para ela digitar nomes.

## Blocos de pergunta (poucos por vez, com sugestão)

**1. Onde** — projeto e board. Se houver mais de um board no projeto, qual é o do time.

**2. O fluxo (colunas)** — liste os status reais encontrados e pergunte o que cada etapa
significa para o time: onde o card nasce, onde entra em desenvolvimento, onde vai depois do
PR aberto, onde o QA atua, onde encerra. Se a pessoa **não tiver fluxo definido**, ofereça o
quadro padrão da seção abaixo.

**3. Tipos de issue** — quais o time usa de verdade (ex.: Tarefa, Bug, História, Épico) e
quando usar cada um. Se há épico pai obrigatório.

**4. Campos customizados — e o momento de cada um.** Esta é a parte que mais evita retrabalho.
Liste os campos que existem (`jira_get_create_fields`) e, para cada um que o time usa,
registre **id, obrigatoriedade e em que momento é preenchido**:

| Campo | Id | Obrigatório? | Momento |
|---|---|---|---|
| Critério de aceitação | `customfield_…` | sim | no refinamento |
| Plano de teste | `customfield_…` | sim | antes de ir para desenvolvimento |
| Solução técnica | `customfield_…` | não | no refinamento |
| Tamanho / estimativa | `customfield_…` | sim | no refinamento |
| Data de entrega | `customfield_…` | sim | **antes** de mover para desenvolvimento |
| Link do PR | `customfield_…` ou comentário | sim | ao abrir o PR |

Pergunte explicitamente: **"algum campo é exigido por uma transição específica?"** — é a causa
mais comum de erro (ver Regras de ouro).

**5. Convenções de escrita** — idioma do card (o corpo costuma ser no idioma do produto,
enquanto commit/PR ficam em inglês), template de descrição, labels obrigatórias, quem é
reporter/assignee por padrão, e se cards feitos com apoio de agente levam alguma label de
origem.

**6. Autonomia** — o que o agente pode fazer sozinho e o que exige confirmação. Padrão seguro
e recomendado: **criar/mover/atualizar um card = pode; criar em lote, comentar e concluir card
= só com confirmação explícita.**

## Gravar o mapa

Escreva em `.claude/jira-workflow.md` (versione junto com o projeto — o time todo passa a usar
o mesmo mapa). Formato:

```markdown
# Fluxo de trabalho no Jira — <time/projeto>

## Onde
- Projeto: <CHAVE> · Board: <nome> (id <n>) · Site: <sua-instancia>.atlassian.net

## Fluxo (status reais, em ordem)
Backlog → Refinamento → Desenvolvimento → Code Review → Qualidade → Validação → Pronto

| Etapa | Status no Jira | Entra quando | Sai quando | Quem age |
|---|---|---|---|---|

## Tipos de issue
| Tipo | Id | Usar para |

## Campos
| Campo | Id | Obrigatório | Momento de preencher | Exigido por transição? |

## Convenções
- Idioma do card: … · Template de descrição: … · Labels: … · Estimativa: …

## Autonomia do agente
- Pode sem perguntar: …
- Exige confirmação: …
```

Ao final, mostre um resumo do que entendeu e confirme antes de gravar. Mudou o fluxo depois?
Atualize o arquivo — ele é a fonte da verdade, não a memória da conversa.

---

# Quadro padrão sugerido (para quem não tem fluxo)

Sete colunas, do backlog ao pronto. Cada uma com critério claro de entrada e saída — coluna
sem critério vira estacionamento de card.

| # | Coluna | Significa | Sai quando |
|---|---|---|---|
| 1 | **Backlog** | Demanda registrada, ainda não priorizada | Foi priorizada e alguém vai refinar |
| 2 | **Refinamento** | Entendendo o problema: critério de aceitação, solução técnica, estimativa | Está claro o suficiente para alguém começar sem perguntar |
| 3 | **Desenvolvimento** | Alguém está codando (assignee definido) | Código pronto, testado localmente, PR aberto |
| 4 | **Code Review** | PR aberto aguardando revisão | PR aprovado e mergeado |
| 5 | **Qualidade** | QA validando em ambiente de teste | Cenários do plano de teste passaram |
| 6 | **Validação** | Quem pediu confere o resultado (produto/negócio) | Aprovado por quem pediu |
| 7 | **Pronto** | Entregue e validado | — |

Como montar no Jira: crie um board **Kanban** e mapeie uma coluna por status; se não puder
criar status novos, use os que existem e registre no mapa qual status representa cada etapa.
Recomendações: **limite de WIP** em Desenvolvimento e Code Review (ex.: 2 por pessoa), e
**Refinamento como porta de entrada** — nada entra em Desenvolvimento sem passar por lá.

Times menores podem juntar **Qualidade + Validação**; nunca junte Desenvolvimento com Code
Review (é onde o gargalo aparece, e juntar esconde o problema).

---

# Modo Operação

## Criar card

1. Confirme o épico pai, se o mapa exigir.
2. Preencha **todos** os campos cujo momento é "na criação".
3. Título **autoexplicativo na daily**: verbo de ação + resultado concreto, em linguagem de
   produto ("Bloquear acesso após 5 tentativas erradas"), sem jargão de implementação e sem
   códigos internos.
4. Descrição com **Contexto** (o que e por quê, 2–5 frases, legível por quem não é técnico) e
   **Objetivo** (resultado esperado).
5. Critério de aceitação em **linguagem de produto** — resultados observáveis, sem termos
   técnicos. Solução técnica, sim, pode ser bem técnica. Plano de teste **inclui cenários de
   erro**, não só o caminho feliz.
6. **Criar em lote exige preview + OK:** mostre a lista (títulos, tamanho, tipo) e espere o sim.
7. Antes de criar, cheque se já existe card equivalente — duplicata custa mais que a busca.

## Mover card pelo fluxo

**O status do card sempre reflete a etapa real do trabalho.** Card atrás da realidade é erro.

```
1. jira_get_transitions no card            → ver o que está disponível AGORA
2. jira_update_issue                        → preencher os campos daquele momento
3. jira_transition_issue                    → mover, uma transição por vez
```

- **Nunca chumbe id de transição** — muda por workflow e por status de origem.
- **Preencha os campos antes de transicionar.** Muitos workflows recusam campo setado dentro da
  transição (*"cannot be set / not on the appropriate screen"*). Atualiza, depois move.
- Transição indisponível = avise e pare. Não invente caminho alternativo pelo fluxo.

## Registrar o PR

No campo que o mapa indicar (ou em comentário, se não houver campo):

```
tipo(ABC-123) - Título
PR #N → https://github.com/<org>/<repo>/pull/N
```

**Leia antes de escrever** (`jira_get_issue`): acrescente ao conteúdo existente, nunca
sobrescreva. Hotfix registra os dois PRs (produção e integração).

## Comentar

Redija, **mostre o rascunho e só poste depois do OK**. Menção real usa o formato de accountId
da instância — descubra o id via `jira_get_user_profile`; texto solto com `@Nome` não notifica
ninguém.

## Consultar o board

JQL a partir do mapa (troque `<PROJ>` e o nome do status):

| Pergunta | JQL |
|---|---|
| O que está para revisar | `project = <PROJ> AND status = "Code Review" ORDER BY priority DESC` |
| O que está em desenvolvimento | `project = <PROJ> AND status = "Desenvolvimento"` |
| O que é meu | `project = <PROJ> AND assignee = currentUser() AND status != "Pronto"` |
| Urgente parado | `project = <PROJ> AND priority = Highest AND status NOT IN ("Pronto")` |
| Sem movimento há 5 dias | `project = <PROJ> AND status != "Pronto" AND updated <= -5d` |

Responda agrupado por coluna, da mais urgente para a menos, omitindo colunas vazias.

## Estimativa (se o time usa tamanho)

Rubrica em **esforço humano**, não em tokens ou volume mecânico:

| Tamanho | Dias úteis |
|---|---|
| PP | 1 a 3 |
| P | 3 a 5 |
| M | 5 a 8 |
| G | 8 a 12 |
| acima de G | **quebrar em cards menores** |

Mover 200 arquivos é PP se for mecânico. O que conta é dificuldade, risco e tempo para uma pessoa.

## Integração com o fluxo de entrega (`git-flow-delivery`)

Se as duas skills estiverem instaladas, a divisão é esta — e o `.claude/jira-workflow.md` é a
fonte da verdade para as duas:

| Quem | Cuida de |
|---|---|
| `jira-workflow` (esta) | board, colunas, campos, transições, criação e consulta de cards |
| `git-flow-delivery` | branch, commit, PR, code review, release e hotfix |

Pontos de contato, na ordem em que acontecem:

| Momento no código | O que acontece no card |
|---|---|
| Branch criada, começou a codar | move para o status de **desenvolvimento** (campos daquele momento preenchidos antes) |
| PR aberto | registra o link do PR no campo mapeado **e** move para **code review** |
| PR aprovado e mergeado | move conforme o mapa (em geral **qualidade**) |
| Release publicada | PR de release não tem card — nenhuma etapa de tracker se aplica |

Sem a `git-flow-delivery` instalada, esses movimentos continuam valendo: quem avisa é a pessoa
("abri o PR"), e você move o card do mesmo jeito.

## Regras de ouro

- **Sem card, não começa o código.** Se perceber que está codando sem card: pare, crie e mova
  até o status correto.
- **Ler antes de escrever** em qualquer campo de texto acumulativo.
- **Uma transição por vez**, sempre depois de consultar as disponíveis.
- **Confirmação humana** para: criação em lote, comentário, conclusão de card e qualquer
  exclusão. Autorização dada antes do fato não vale para o fato.
- Em dúvida se o ajuste estoura o escopo do card, **pergunte** em vez de decidir.

## Checklist rápido

- [ ] `.claude/jira-workflow.md` lido (ou criado, se era a primeira vez)
- [ ] Campos do momento atual preenchidos **antes** da transição
- [ ] Transição obtida via `jira_get_transitions`, nunca chumbada
- [ ] Critério de aceitação em linguagem de produto; plano de teste com cenários de erro
- [ ] Link do PR registrado sem sobrescrever o conteúdo anterior
- [ ] Status do card = etapa real do trabalho
- [ ] Comentário/lote/conclusão só após OK explícito

## Adaptando ao seu time

| O que | Onde ajustar |
|---|---|
| Projeto, board, instância | `## Onde` no mapa |
| Nomes das colunas e status | `## Fluxo` — a skill não presume nome nenhum |
| Campos e o momento de cada um | `## Campos` |
| Idioma, template, labels | `## Convenções` |
| O que o agente faz sozinho | `## Autonomia do agente` |

Trocou de tracker (Linear, Azure Boards, GitHub Projects)? O fluxo e os momentos de campo
continuam valendo — só as ferramentas mudam.
