# Skills para agentes de IA

Fluxos de engenharia baseados em práticas de mercado (Git Flow, code review, releases), empacotados como **skills do Claude Code**
— públicas, neutras de empresa e prontas para adaptar ao seu contexto.

Uma skill é uma pasta com um `SKILL.md`: instruções que o agente carrega quando a tarefa
casa com a descrição. Instalar é copiar a pasta para `.claude/skills/` do seu projeto.

## Instalar

```bash
# ver as skills disponíveis
npx @luizsiqueira/skills list

# instalar uma skill no projeto atual (./.claude/skills/<skill>)
npx @luizsiqueira/skills add git-flow-delivery

# instalar para todos os seus projetos (~/.claude/skills/<skill>)
npx @luizsiqueira/skills add git-flow-delivery --global
```

Sem npm? Copie a pasta `skills/<skill>` para `.claude/skills/` — é só isso.

## Skills

| Skill | O que faz |
|---|---|
| [`git-flow-delivery`](skills/git-flow-delivery/SKILL.md) | Git Flow do card ao deploy: branch e commit com número do card (1 branch = 1 commit), PR para `develop` só após validação humana, code review, release `develop → main` sem squash com tag semver/rc, hotfix com PR dupla. Integração opcional com Jira via MCP. |
| [`board-workflow`](skills/board-workflow/SKILL.md) | Configura e opera o fluxo no quadro do time em **Jira ou Trello**: entrevista na primeira execução para mapear quadro, colunas, tipos de item e campos (e o momento de preencher cada um), grava em `.claude/board-workflow.md` e depois cria, refina, move e consulta cards. Sugere um quadro padrão para quem ainda não tem fluxo. |
| [`security-review`](skills/security-review/SKILL.md) | Auditoria de segurança de projetos web (Laravel/PHP, Node/JS/TS, Python) e apps com LLM/RAG/agentes: detecta a stack, roda `npm`/`composer`/`pip audit`, gitleaks e semgrep quando existem, procura padrões perigosos no código (injection, XSS, IDOR, secrets, SSRF, output de LLM executado sem validação, agente com privilégio excessivo), classifica por severidade, reporta com arquivo e linha e corrige com confirmação. Inclui o **AI Secure Coding Checklist** como referência. |
| [`second-brain`](skills/second-brain/SKILL.md) | Segundo cérebro do dia a dia em um vault Obsidian: investigações, debugs, decisões, reuniões e aprendizados registrados com data e wiki-links. Consulta **antes** de investigar ou decidir; alimenta **depois**. Na primeira execução cria o vault (estrutura, índice, templates) e oferece instalar o Obsidian. |

## Adaptando

Cada skill termina com uma seção **"Adaptando ao seu time"**: os poucos pontos que mudam
de um time para outro (prefixo do card, nome das branches, status do quadro, canal).
Troque esses e o resto do fluxo se mantém.

## Contribuindo

Abra uma issue com o caso que a skill não cobre, ou um PR seguindo — claro — o
`git-flow-delivery`.

## Publicação

Cada release no GitHub publica automaticamente no npm (`.github/workflows/publish.yml`,
via Trusted Publishing — sem tokens). Para lançar uma versão:

```bash
git tag v1.0.0 && git push --tags
gh release create v1.0.0 --generate-notes
```

A versão do `package.json` é alinhada com a tag durante o workflow.

## Licença

MIT — [Luiz Siqueira](https://luizsiqueira.com.br)
