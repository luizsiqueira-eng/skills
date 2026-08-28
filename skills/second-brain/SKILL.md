---
name: second-brain
description: "Segundo cérebro do projeto em um vault Obsidian (markdown com wiki-links) versionado junto com o código: CONSULTAR antes de investigar, debugar ou decidir arquitetura (casos passados, problemas conhecidos, gotchas de integração, decisões) e ALIMENTAR ao fechar uma investigação, diagnóstico ou decisão, com data e links. Na primeira execução cria o vault (estrutura, índice, templates) e oferece instalar o Obsidian. Invocar ao iniciar debug/investigação, ao encontrar comportamento estranho já visto, ao fechar um diagnóstico, ao tomar decisão de arquitetura, ou quando pedirem para 'registrar no cérebro', 'anotar isso', 'consultar o cérebro', 'o que já sabemos sobre X'."
---

# Second Brain — memória viva do projeto

Um vault Obsidian dentro do repositório: markdown puro, wiki-links `[[Nome da nota]]`, versionado
com o código. **O agente lê e escreve os arquivos direto; o Obsidian é só o visualizador** — o
grafo, a busca e a navegação. Sem Obsidian instalado, a skill funciona igual.

A tese: **toda descoberta relevante (fluxo, problema, decisão, gotcha) entra com data**, para que
qualquer sessão futura — sua, de um colega ou do agente — recupere o contexto em minutos, não em
horas de re-investigação.

| Modo | Quando |
|---|---|
| **Setup** | não existe `.claude/second-brain.md` |
| **Consultar** | antes de investigar, debugar ou decidir |
| **Alimentar** | ao fechar investigação, diagnóstico ou decisão |

**Primeira coisa, sempre:** leia `.claude/second-brain.md`. Ele diz onde o vault está.

---

# Setup (primeira vez)

1. **Onde fica o vault.** Sugira `./segundo-cerebro/` na raiz do repositório e pergunte. Um
   repositório = um vault; monorepo ou time com vários repos pode ter o vault num repo próprio
   e apontar para ele.
2. **Crie a estrutura** copiando os templates desta skill (pasta `templates/`):

   ```
   segundo-cerebro/
   ├── 00 Índice.md            ← mapa de tudo; ponto de entrada
   ├── Casos/                  ← investigações datadas (AAAA-MM-DD <resumo>.md)
   ├── Problemas conhecidos/   ← padrões de bug e comportamentos não óbvios
   ├── Decisões/               ← decisões de arquitetura e produto, com o porquê
   ├── Sistemas/               ← como cada sistema/módulo funciona de verdade
   ├── Integrações/            ← endpoints, gotchas, onde mora a credencial (nunca a credencial)
   └── .obsidian/app.json      ← `{}` basta; o Obsidian preenche o resto
   ```

   Pastas são sugestão — pergunte se o time quer outras (ex.: `Runbooks/`, `Reuniões/`).
3. **Grave `.claude/second-brain.md`** e versione:

   ```markdown
   # Second brain
   - Vault: ./segundo-cerebro
   - Idioma das notas: pt-BR
   - Pastas: Casos, Problemas conhecidos, Decisões, Sistemas, Integrações
   - Fontes de verdade fora do vault: README e docs/ dos repos, ADRs em docs/adr/ (o vault aponta, não copia)
   ```
4. **Obsidian.** Verifique se está instalado (`ls /Applications/Obsidian.app`, `which obsidian`,
   `flatpak list | grep -i obsidian`). Se não estiver, **ofereça instalar e espere o sim** —
   instalar software é decisão da pessoa:

   | Sistema | Comando |
   |---|---|
   | macOS | `brew install --cask obsidian` |
   | Windows | `winget install Obsidian.Obsidian` |
   | Linux | `flatpak install flathub md.obsidian.Obsidian` ou `snap install obsidian --classic` |

   Depois abra o vault: macOS `open -a Obsidian "<caminho do vault>"`; qualquer sistema
   `obsidian://open?path=<caminho absoluto, URL-encoded>`. Na primeira abertura o Obsidian
   pede para confiar no vault — normal.
5. **Primeira nota útil na hora.** Um vault vazio morre. Pergunte: "qual foi a última coisa que
   custou horas para descobrir neste projeto?" e registre como o primeiro caso ou problema
   conhecido. Depois adicione a linha no índice.

---

# Consultar (antes de resolver)

Antes de investigar qualquer comportamento, integração ou decisão de arquitetura:

1. Ler `00 Índice.md` e abrir as notas do tema.
2. Checar **`Problemas conhecidos/`** — o sintoma pode já ter diagnóstico pronto.
3. Checar **`Casos/`** — investigação passada parecida economiza horas (busque por sintoma,
   sistema, código de erro: `grep -ril "<termo>" segundo-cerebro/`).
4. Checar **`Decisões/`** antes de propor mudança de arquitetura — pode já ter sido decidido, e
   com motivo.
5. Só então ir para banco, logs e código.

Ao responder, **cite a nota** (`[[Nome]]`) que embasou — a pessoa precisa saber que aquilo veio
da memória do time e de quando. Se a nota estiver desatualizada em relação ao que você
descobriu agora, **corrija no mesmo turno** (ver Higiene).

O cérebro complementa a documentação, não a substitui: README e `docs/` dizem como o sistema
**deveria** funcionar; o cérebro guarda como ele **de fato** se comportou e o que se aprendeu.

---

# Alimentar (manter vivo)

Registrar **no final** de toda investigação, debug relevante ou decisão — não durante.

## Critério de entrada

Só entra o que ajuda o projeto no futuro: investigação ligada a card, cliente, incidente ou
decisão. **Consulta rápida e curiosidade não entram.** Se a curiosidade revelou um comportamento
genérico e reutilizável do sistema, registre só o comportamento na nota do tema, sem o caso.
Na dúvida, **pergunte** antes de criar a nota.

## Onde registrar

| O que aconteceu | Onde |
|---|---|
| Investigação relevante concluída (mesmo sem solução) | nota nova em `Casos/AAAA-MM-DD <resumo curto>.md` |
| Padrão de bug ou comportamento não óbvio confirmado | nota nova ou update em `Problemas conhecidos/` |
| Decisão de arquitetura/produto tomada | nota nova em `Decisões/AAAA-MM-DD <decisão>.md` com contexto, opções e o porquê |
| Detalhe novo de integração (endpoint, limite, gotcha, onde mora a credencial) | update na nota em `Integrações/` |
| Entendimento novo de como um sistema funciona | update em `Sistemas/` |
| Nota nova de qualquer tipo | **+ uma linha em `00 Índice.md`** |

Templates prontos em `templates/` (caso, problema, decisão, sistema/integração).

## Regras de escrita

- **Frontmatter** com `tags` e data: `data: AAAA-MM-DD` em casos e decisões, `atualizado:
  AAAA-MM-DD` nas notas vivas.
- **Wiki-links** `[[...]]` para as notas relacionadas — o valor do cérebro está no grafo. Nota
  sem link é nota perdida.
- **Fatos e datas, não prosa.** Enxuto, linguagem simples, sem adjetivo. O que foi observado,
  o que foi confirmado (e como), o que ficou em aberto.
- **Uma fonte de verdade por assunto.** Se a decisão vive em `docs/adr/`, a nota do vault
  aponta e resume — não duplica. Doc de projeto fica no projeto; o vault é síntese, ligação e
  memória de investigação. Nada de copiar ou symlinkar docs de repo para dentro do vault.
- **Nunca gravar segredo** (senha, token, chave, connection string). Registre **onde a
  credencial mora** (`secret manager X`, `.env do serviço Y`), nunca o valor.
- **Dado pessoal de cliente** (CPF, e-mail, telefone) só se for indispensável ao caso; prefira
  o id interno ou o número do card, que leva ao dado sem copiá-lo.

## Higiene

- Nota que se provou **errada**: corrigir na hora. Conhecimento venenoso custa mais que ausência.
- Consultou uma nota e descobriu algo que a contradiz: **atualizar no mesmo turno**, com a data.
- Caso que virou padrão recorrente: promova para `Problemas conhecidos/` e deixe o caso apontando.
- Uma vez por mês (ou ao fechar um projeto): passar o índice, arquivar o que morreu, ligar o
  que ficou solto.

---

## Checklist rápido

- [ ] `.claude/second-brain.md` lido; vault localizado
- [ ] **Antes** de investigar: índice, problemas conhecidos, casos e decisões consultados; nota citada na resposta
- [ ] **Depois**: passou no critério de entrada? Se sim, nota no lugar certo com frontmatter, data e wiki-links
- [ ] Nota nova → linha no `00 Índice.md`
- [ ] Nenhum segredo, nenhum dado pessoal desnecessário
- [ ] Nota desatualizada encontrada → corrigida no mesmo turno

## Adaptando ao seu time

| O que | Aqui | No seu time |
|---|---|---|
| Local do vault | `./segundo-cerebro/` | qualquer caminho em `.claude/second-brain.md` |
| Pastas | Casos, Problemas conhecidos, Decisões, Sistemas, Integrações | acrescente (Runbooks, Reuniões, Pessoas…) e registre no índice |
| Idioma | pt-BR | o do time |
| Fontes de verdade externas | README, docs/, ADRs | wiki, Confluence, Notion — o vault aponta |
| Visualizador | Obsidian | qualquer editor de markdown; Logseq e Foam leem wiki-links também |
