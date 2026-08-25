# Skills para agentes de IA

Fluxos de engenharia que uso com meus times, empacotados como **skills do Claude Code**
— públicas, neutras de empresa e prontas para adaptar ao seu contexto.

Uma skill é uma pasta com um `SKILL.md`: instruções que o agente carrega quando a tarefa
casa com a descrição. Instalar é copiar a pasta para `.claude/skills/` do seu projeto.

## Instalar

```bash
# ver as skills disponíveis
npx @luizsiqueira/skills list

# instalar uma skill no projeto atual (./.claude/skills/<skill>)
npx @luizsiqueira/skills add fluxo-de-entrega

# instalar para todos os seus projetos (~/.claude/skills/<skill>)
npx @luizsiqueira/skills add fluxo-de-entrega --global
```

Sem npm? Copie a pasta `skills/<skill>` para `.claude/skills/` — é só isso.

## Skills

| Skill | O que faz |
|---|---|
| [`fluxo-de-entrega`](skills/fluxo-de-entrega/SKILL.md) | Do card ao deploy: branch e commit com número do card e descrição em inglês (1 branch = 1 commit), PR para `develop` só após validação humana, acompanhamento do code review, release `develop → main` sem squash com tag semver/rc, hotfix a partir da `main` com PR dupla. |

## Adaptando

Cada skill termina com uma seção **"Adaptando ao seu time"**: os poucos pontos que mudam
de um time para outro (prefixo do card, nome das branches, status do quadro, canal).
Troque esses e o resto do fluxo se mantém.

## Contribuindo

Abra uma issue com o caso que a skill não cobre, ou um PR seguindo — claro — o
`fluxo-de-entrega`.

## Licença

MIT — [Luiz Siqueira](https://luizsiqueira.com.br)
