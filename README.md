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
| [`jira-workflow`](skills/jira-workflow/SKILL.md) | Configura e opera o fluxo no Jira do seu time: entrevista na primeira execução para mapear board, colunas, tipos de issue e campos customizados (e o momento de preencher cada um), grava em `.claude/jira-workflow.md` e depois cria, refina, move e consulta cards. Sugere um quadro padrão para quem ainda não tem fluxo. |

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
