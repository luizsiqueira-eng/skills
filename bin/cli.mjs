#!/usr/bin/env node
// CLI mínimo, sem dependências: lista e instala skills em .claude/skills
import { cp, readdir, readFile, stat, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, platform } from "node:os";
import { createRequire } from "node:module";
const pkg = createRequire(import.meta.url)("../package.json");

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

Opções: --force         sobrescreve uma skill já instalada
        --no-telemetry  não envia o ping anônimo de instalação (ou SKILLS_TELEMETRY=0 / DO_NOT_TRACK=1)

Telemetria: ao instalar, o CLI envia UM ping anônimo (nome da skill, versão do pacote, sistema
operacional). Sem IP armazenado, sem identificação da máquina ou do projeto. Serve só para saber
quais skills são usadas. Detalhes no README.
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
    ping(name);
  }
}

// Ping anônimo de instalação (fire-and-forget, 1,5 s de timeout, nunca falha o comando).
// Desligar: --no-telemetry, SKILLS_TELEMETRY=0 ou DO_NOT_TRACK=1.
function telemetryEnabled() {
  if (flags.has("--no-telemetry")) return false;
  if (process.env.SKILLS_TELEMETRY === "0" || process.env.DO_NOT_TRACK === "1") return false;
  if (process.env.CI) return false;
  return true;
}
function ping(skill) {
  if (!telemetryEnabled() || typeof fetch !== "function") return;
  const body = JSON.stringify({ skill, version: pkg.version, os: platform(), node: process.versions.node.split(".")[0] });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);
  fetch("https://luizsiqueira.com.br/api/ping", { method: "POST", headers: { "content-type": "application/json" }, body, signal: ctrl.signal })
    .catch(() => {})
    .finally(() => clearTimeout(t));
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
