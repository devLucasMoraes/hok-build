/** Gera lib/data/generated.ts a partir do snapshot versionado por patch.
 *
 *  Fonte de verdade: data/patches/manifest.json (latest) +
 *  data/patches/<patch>/items.json + data/patches/<patch>/heroes/*.json.
 *  Elimina os imports manuais de heróis — rode após cada fetch:
 *
 *    node tools/gen-loader.ts [--patch=YYYY-MM-DD] [--check]
 *    pnpm gen-loader
 *
 *  --patch: gera para um snapshot específico (default: manifest.latest).
 *  --check: só verifica se o gerado está atualizado (exit 1 se obsoleto).
 *    Não escreve nada; ideal para CI ou checagem do agente.
 *
 *  Chamado automaticamente pelos fetchers com --rewire.
 *
 *  Gate de runtime: manifest, items.json e cada heroes/*.json são validados
 *  com os schemas zod de lib/schemas.ts — falha com exit 1 e o campo
 *  problemático antes de gerar qualquer saída.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ZodType } from "zod";
import { HeroSchema, ItemSchema, PatchManifestSchema } from "../lib/schemas.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib", "data", "generated.ts");

const args: Record<string, string | boolean> = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : ["_", a];
  }),
);

const manifest = JSON.parse(readFileSync(join(ROOT, "data", "patches", "manifest.json"), "utf8"));
const PATCH = args.patch ? String(args.patch) : String(manifest.latest);
const CHECK = args.check === true || args.check === "true";

/** Valida e aborta com os campos problemáticos (máx. 20) em caso de erro. */
function assertValid(schema: ZodType, data: unknown, label: string): void {
  const r = schema.safeParse(data);
  if (r.success) return;
  console.error(`gen-loader: schema inválido em ${label}:`);
  for (const iss of r.error.issues.slice(0, 20)) {
    console.error(` - ${iss.path.join(".") || "(raiz)"}: ${iss.message}`);
  }
  if (r.error.issues.length > 20) console.error(` ... +${r.error.issues.length - 20} erros`);
  process.exit(1);
}

function readJson(path: string, label: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`gen-loader: JSON ilegível em ${label}: ${(e as Error).message}`);
    process.exit(1);
  }
}

assertValid(PatchManifestSchema, manifest, "manifest.json");

const itemsPath = join(ROOT, "data", "patches", PATCH, "items.json");
const heroesDir = join(ROOT, "data", "patches", PATCH, "heroes");

if (!existsSync(itemsPath)) {
  console.error(`gen-loader: items.json ausente em data/patches/${PATCH}/`);
  process.exit(1);
}
if (!existsSync(heroesDir)) {
  console.error(`gen-loader: diretório heroes/ ausente em data/patches/${PATCH}/`);
  process.exit(1);
}

const ids = readdirSync(heroesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

if (ids.length === 0) {
  console.error(`gen-loader: nenhum herói em data/patches/${PATCH}/heroes/`);
  process.exit(1);
}

const items = readJson(itemsPath, `data/patches/${PATCH}/items.json`);
if (!Array.isArray(items)) {
  console.error(`gen-loader: items.json não é um array em data/patches/${PATCH}/`);
  process.exit(1);
}
items.forEach((it, i) => assertValid(ItemSchema, it, `items.json[${i}]`));
for (const id of ids) {
  const file = join(heroesDir, `${id}.json`);
  assertValid(HeroSchema, readJson(file, `heroes/${id}.json`), `heroes/${id}.json`);
}
console.log(`gen-loader: schemas OK (${items.length} itens, ${ids.length} heróis).`);

function varName(id: string): string {
  const v = id.replace(/[^a-zA-Z0-9_$]/g, "_");
  return /^[a-zA-Z_$]/.test(v) ? v : `_${v}`;
}

const seen = new Map<string, string>();
for (const id of ids) {
  const v = varName(id);
  if (seen.has(v)) {
    console.error(`gen-loader: colisão de variável: "${seen.get(v)}" e "${id}" viram "${v}"`);
    process.exit(1);
  }
  seen.set(v, id);
}

const imports = ids
  .map((id) => `import ${varName(id)}Json from "@/data/patches/${PATCH}/heroes/${id}.json";`)
  .join("\n");
const entries = ids
  .map((id) => `  ${JSON.stringify(id)}: ${varName(id)}Json as Hero,`)
  .join("\n");

const content = `// GERADO por tools/gen-loader.ts — não edite à mão.
// Regenere com: pnpm gen-loader [--patch=${PATCH}]
// Snapshot: data/patches/${PATCH}/ (${ids.length} heróis)
import type { Hero, Item, PatchManifest } from "../types";
import manifest from "@/data/patches/manifest.json";
import itemsJson from "@/data/patches/${PATCH}/items.json";
${imports}

export const PATCH = ${JSON.stringify(PATCH)};
export const MANIFEST = manifest as PatchManifest;
export const ITEMS = itemsJson as Item[];
export const HEROES: Record<string, Hero> = {
${entries}
};
`;

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== content) {
    console.error(`gen-loader --check: lib/data/generated.ts obsoleto para o patch ${PATCH}. Rode: pnpm gen-loader`);
    process.exit(1);
  }
  console.log(`gen-loader --check: atualizado (${ids.length} heróis, patch ${PATCH}).`);
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, content);
  console.log(`gen-loader: lib/data/generated.ts escrito com ${ids.length} heróis (patch ${PATCH}).`);
}
