#!/usr/bin/env node
// CLI mínimo, sem dependências: lista e instala skills em .claude/skills
import { cp, readdir, readFile, stat, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");
const [cmd, ...rest] = process.argv.slice(2);

const flags = new Set(rest.filter((a) => a.startsWith("--")));
const args = rest.filter((a) => !a.startsWith("--"));

function usage() {
  console.log(`
Skills para agentes de IA (Claude Code) — luizsiqueira.com.br

  npx @luizsiqueira/skills list                  lista as skills disponíveis
  npx @luizsiqueira/skills add <skill>           instala em ./.claude/skills/<skill>
  npx @luizsiqueira/skills add <skill> --global  instala em ~/.claude/skills/<skill>
  npx @luizsiqueira/skills add --all             instala todas no projeto atual

Opções: --force  sobrescreve uma skill já instalada
`);
}

async function listSkills() {
  const names = (await readdir(skillsDir, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const out = [];
  for (const name of names) {
    const md = await readFile(join(skillsDir, name, "SKILL.md"), "utf8").catch(() => "");
    const m = md.match(/^description:\s*"?([^"\n]+)"?/m);
    out.push({ name, description: m ? m[1].trim() : "" });
  }
  return out;
}

async function add(names) {
  const target = flags.has("--global")
    ? join(homedir(), ".claude", "skills")
    : join(process.cwd(), ".claude", "skills");
  await mkdir(target, { recursive: true });
  for (const name of names) {
    const src = join(skillsDir, name);
    if (!existsSync(src) || !(await stat(src)).isDirectory()) {
      console.error(`✗ skill "${name}" não existe. Use "list" para ver as disponíveis.`);
      process.exitCode = 1;
      continue;
    }
    const dest = join(target, name);
    if (existsSync(dest) && !flags.has("--force")) {
      console.error(`• ${name} já existe em ${dest} — use --force para sobrescrever`);
      continue;
    }
    await cp(src, dest, { recursive: true, force: true });
    console.log(`✓ ${name} → ${dest}`);
  }
}

switch (cmd) {
  case "list": {
    const skills = await listSkills();
    for (const s of skills) console.log(`${s.name}\n    ${s.description}\n`);
    break;
  }
  case "add": {
    const names = flags.has("--all") ? (await listSkills()).map((s) => s.name) : args;
    if (!names.length) { usage(); process.exitCode = 1; break; }
    await add(names);
    break;
  }
  default:
    usage();
}
