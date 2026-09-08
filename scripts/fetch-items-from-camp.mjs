/** Captura de itens com fonte primária camp.honorofkings.com (estratégia híbrida).
 *
 *  Fonte direta (oficial): POST https://api-camp.honorofkings.com
 *    - /api/herowiki/getallherobriefinfo            (lista de heróis)
 *    - /api/herowiki/getherodataall {heroId}        (detalhes; inclui SuitStrategy.equips[] no model Equip:
 *      equipId, equipName, equipIcon, preEquipIds, equipDesc, equipPrice, equipType,
 *      equipLevel, equipEffects, equipSkills, passiveSkills)
 *    Exige headers dinâmicos `specialencodeparam` + `traceparent` gerados pelo
 *    `camp-security` (ver hok-camp-api/SSL-ACTX no GitHub). Sem token válido a
 *    API responde 4xx — nesse caso o script cai para o espelho abaixo.
 *
 *  Espelho (fallback): hokstats.gg/items — declara "Item data sourced from
 *    camp.honorofkings.com" e espelha 1:1 os IDs do camp (/items/<campId>/,
 *    /items/<campId>.png). É parseável sem token.
 *
 *  Uso:
 *    node scripts/fetch-items-from-camp.mjs [--source=auto|camp|hokstats]
 *      [--patch=YYYY-MM-DD] [--season=S14] [--langs=en,pt-BR] [--images]
 *      [--delay-ms=200] [--limit=5] [--dry-run] [--camp-param=XXX] [--rewire]
 *
 *  --rewire regenera lib/data/generated.ts via tools/gen-loader.ts para o
 *  snapshot recém-gerado (passo necessário para o app consumir os dados novos).
 *  Sem efeito com --dry-run.
 *
 *  Saída: data/patches/<PATCH>/items.json (+ items.raw.json, items.diff.json),
 *    public/items/<campId>.png, manifest.json atualizado.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (X11; Linux x86_64) hok-build-item-fetcher";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : ["_", a];
  }),
);

const SOURCE = String(args.source ?? "auto"); // auto | camp | hokstats
const PATCH = String(args.patch ?? new Date().toISOString().slice(0, 10));
const SEASON = args.season ? String(args.season) : null;
const LANGS = String(args.langs ?? "en,pt-BR").split(",");
const WITH_IMAGES = args.images !== undefined ? args.images !== "false" : true;
const DELAY_MS = Number(args["delay-ms"] ?? 200);
const LIMIT = args.limit ? Number(args.limit) : 0;
const DRY_RUN = args["dry-run"] === true || args["dry-run"] === "true";
const REWIRE = args.rewire === true || args.rewire === "true";
const CAMP_PARAM = args["camp-param"] ? String(args["camp-param"]) : null;

const warnings = [];
const warn = (msg) => warnings.push(msg);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) =>
  s
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const num = (str) => parseFloat(String(str).replace(/,/g, "").replace("–", "."));

async function fetchText(url, { retries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
}

// ---------------- Fonte direta: camp.honorofkings.com ----------------

const CAMP_BASE = "https://api-camp.honorofkings.com";
const CAMP_HEADERS = {
  accept: "application/json, text/plain, */*",
  "camp-language": "en",
  "camp-region": "608",
  campsource: "HOK-CAMP",
  "content-type": "application/json",
  gameid: "29134",
  origin: "https://camp.honorofkings.com",
  referer: "https://camp.honorofkings.com/",
  "User-Agent": UA,
};

/** Mapeamento provisório equipType (camp) -> categoria. Confirmar contra payload real. */
const CAMP_TYPE_MAP = { 1: "attack", 2: "magic", 3: "defense", 4: "movement", 5: "jungle", 7: "support" };

async function tryCampDirect() {
  if (!CAMP_PARAM) throw new Error("sem token camp-security (--camp-param ausente)");
  const headers = { ...CAMP_HEADERS, specialencodeparam: CAMP_PARAM };
  const post = async (endpoint, data) => {
    const res = await fetch(CAMP_BASE + endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(data ?? {}),
    });
    if (!res.ok) throw new Error(`camp ${endpoint} -> HTTP ${res.status}`);
    return res.json();
  };
  const brief = await post("/api/herowiki/getallherobriefinfo");
  const heroes = brief?.data?.heroList ?? [];
  if (!heroes.length) throw new Error("camp: heroList vazio");
  const equips = new Map();
  for (const h of heroes) {
    const id = h.heroId ?? h.id;
    const detail = await post("/api/herowiki/getherodataall", { heroId: id });
    const suits = detail?.data?.heroStrategyData?.suitStrategy ?? detail?.data?.suitStrategy ?? [];
    for (const s of suits) for (const e of s.equips ?? []) equips.set(e.equipId, e);
    await sleep(DELAY_MS);
  }
  return [...equips.values()].map((e) => ({
    campId: String(e.equipId),
    name: e.equipName,
    cost: Number(e.equipPrice),
    tier: Number(e.equipLevel),
    category: CAMP_TYPE_MAP[e.equipType] ?? warn(`camp equipType desconhecido: ${e.equipType}`) ?? "attack",
    preEquipIds: (e.preEquipIds ?? []).map(String),
    desc: e.equipDesc ?? "",
    effects: e.equipEffects ?? [],
    skills: [...(e.equipSkills ?? []), ...(e.passiveSkills ?? [])],
    icon: e.equipIcon ?? "",
  }));
}

// ---------------- Espelho: hokstats.gg (dados do camp) ----------------

const HS = "https://hokstats.gg";
const CATEGORY_EN = { Attack: "attack", Magic: "magic", Defense: "defense", Movement: "movement", Jungle: "jungle", Support: "support" };
const CATEGORY_PT = { Ataque: "attack", Magia: "magic", Mágica: "magic", Defesa: "defense", Movimento: "movement", Selva: "jungle", Suporte: "support" };

const STAT_LABEL = {
  // EN (hokstats)
  "physical attack": "physicalAttack",
  "magical attack": "magicAttack",
  health: "maxHealth",
  mana: "maxMana",
  "physical defense": "physicalDefense",
  "magical defense": "magicDefense",
  "attack speed": "attackSpeedPct",
  "critical rate": "critRatePct",
  "critical damage": "critDamagePct",
  "physical lifesteal": "physLifestealPct",
  "magical lifesteal": "magicLifestealPct",
  "cooldown reduction": "cdrPct",
  // PT-BR (hokstats /pt-br)
  "ataque físico": "physicalAttack",
  "ataque mágico": "magicAttack",
  vida: "maxHealth",
  "defesa física": "physicalDefense",
  "defesa mágica": "magicDefense",
  "velocidade de ataque": "attackSpeedPct",
  "taxa crítica": "critRatePct",
  "dano crítico": "critDamagePct",
  "roubo de vida físico": "physLifestealPct",
  "roubo de vida mágico": "magicLifestealPct",
  "redução de recarga": "cdrPct",
};

function mapStat(label, valueRaw) {
  const norm = label.trim().toLowerCase();
  if (norm === "velocidade de movimento" || norm === "movement speed") {
    return { key: valueRaw.includes("%") ? "moveSpeedPct" : "moveSpeedFlat", value: num(valueRaw.replace("+", "")) };
  }
  const key = STAT_LABEL[norm];
  if (!key) return null;
  return { key, value: num(valueRaw.replace("+", "")) };
}

function parseItemPage(html) {
  const crumb = html.match(/<span class="text-text-primary font-medium">([^<]+)<\/span>/);
  const name = crumb ? decode(crumb[1]) : null;
  const costM = html.match(/<span class="data-num text-gold font-bold text-base">([\d,]+)\s*(gold|ouro)/);
  const catM = html.match(/<span class="text-text-secondary">(Attack|Magic|Defense|Movement|Jungle|Support|Ataque|Magia|Mágica|Defesa|Movimento|Selva|Suporte)<\/span>/);
  const tierM = html.match(/<span class="text-text-secondary">Tier (\d)<\/span>/);
  const stats = [...html.matchAll(/<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/g)].map((m) => ({
    label: decode(m[1]),
    value: decode(m[2]),
  }));
  const skills = [
    ...html.matchAll(
      /data-skill-kind="(active|passive)"[^>]*><p[^>]*>[^<]*<\/p><p[^>]*class="[^"]*whitespace-pre-line"[^>]*>([\s\S]*?)<\/p>/g,
    ),
  ].map((m) => ({ kind: m[1], text: decode(m[2].replace(/<[^>]+>/g, "")) }));
  // Fallback PT: mesmo bloco, rótulo traduzido (Passiva/Ativa) — data-skill-kind não muda.
  const buildSec =
    html.split(/<h2[^>]*>(?:Build Path|Caminho de Build)<\/h2>/)[1]?.split(/<h2[^>]*>/)[0] ?? "";
  // Só "Built from" (componentes). "Upgrades into"/"Evolui para" lista quem usa este item (derivado via getBuildsInto).
  const builtFromSec = buildSec.split(/Upgrades into|Evolui para/)[0];
  const buildsFrom = [...builtFromSec.matchAll(/href="\/items\/(\d+)\/"/g)].map((m) => m[1]);
  return { name, cost: costM ? num(costM[1]) : null, categoryLabel: catM?.[1] ?? null, tier: tierM ? Number(tierM[1]) : null, stats, skills, buildsFrom };
}

function toAbilities(skillsEn) {
  return skillsEn.map((s) => {
    const text = s.text.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
    // "Requires Smite to purchase. ..." não é nome de habilidade (vira flag requiresSmite); mantém o texto.
    const clean = text.replace(/^Requires Smite to purchase\.\s*/i, "");
    // Nome = 1-2 palavras capitalizadas iniciais se o restante começa com maiúscula
    // ("Hunter When...", "Swift II Grants..."). Caso contrário é texto livre
    // ("Can switch...") -> habilidade genérica.
    const m = clean.match(
      /^((?:[A-Z][A-Za-z'’\-]*|[IVX]{2,})(?:\s+(?:[A-Z][A-Za-z'’\-]*|[IVX]{2,})){0,1})\s+([A-Z].{10,})$/,
    );
    const cd = text.match(/\((?:Cooldown|Recarga):\s*([\d.,]+)\s*s\)/);
    if (!m) {
      return { kind: s.kind === "active" ? "active" : "passive", name: "Effect", text, cooldownSec: cd ? num(cd[1]) : null };
    }
    return {
      kind: s.kind === "active" ? "active" : "passive",
      name: m[1],
      text: m[2],
      cooldownSec: cd ? num(cd[1]) : null,
    };
  });
}

async function fetchHokstatsMirror() {
  const listHtml = await fetchText(`${HS}/items/`);
  const campIds = [...new Set([...listHtml.matchAll(/href="\/items\/(\d+)\//g)].map((m) => m[1]))];
  if (!campIds.length) throw new Error("lista de itens vazia em hokstats.gg/items/");
  const ids = LIMIT ? campIds.slice(0, LIMIT) : campIds;
  const raws = [];
  for (const campId of ids) {
    const en = await fetchText(`${HS}/items/${campId}/`);
    await sleep(DELAY_MS);
    let pt = null;
    if (LANGS.includes("pt-BR") || LANGS.includes("pt-br")) {
      try {
        pt = await fetchText(`${HS}/pt-br/items/${campId}/`);
        await sleep(DELAY_MS);
      } catch (e) {
        warn(`PT ausente p/ campId ${campId}: ${e.message}`);
      }
    }
    raws.push({ campId, en, pt });
    console.log(`ok ${campId} (${raws.length}/${ids.length})`);
  }
  return { campIds: ids, raws };
}

function normalizeMirror(raws) {
  const byCampId = new Map();
  for (const { campId, en, pt } of raws) {
    const p = parseItemPage(en);
    if (!p.name || p.cost == null || !p.categoryLabel || !p.tier) {
      warn(`parse incompleto p/ campId ${campId}: ${JSON.stringify({ n: p.name, c: p.cost, cat: p.categoryLabel, t: p.tier })}`);
      continue;
    }
    const category = CATEGORY_EN[p.categoryLabel];
    if (!category) {
      warn(`categoria EN desconhecida "${p.categoryLabel}" em ${p.name}`);
      continue;
    }
    let namePt = null;
    if (pt) {
      const pp = parseItemPage(pt);
      namePt = pp.name;
      const catPt = pp.categoryLabel ? (CATEGORY_PT[pp.categoryLabel] ?? CATEGORY_EN[pp.categoryLabel]) : null;
      if (catPt && catPt !== category) warn(`categoria PT diverge em ${p.name}: ${pp.categoryLabel}`);
    }
    const stats = [];
    for (const s of p.stats) {
      const mapped = mapStat(s.label, s.value);
      if (!mapped) {
        warn(`stat desconhecido "${s.label}=${s.value}" em ${p.name}`);
        continue;
      }
      stats.push(mapped);
    }
    const text = p.skills.map((s) => s.text).join(" ");
    const requiresSmite = /requires smite/i.test(text);
    byCampId.set(campId, {
      id: slugify(p.name),
      campId,
      name: p.name,
      ...(namePt && namePt !== p.name ? { namePt } : {}),
      icon: `/items/${campId}.png`,
      category,
      tier: p.tier,
      cost: p.cost,
      stats,
      abilities: toAbilities(p.skills),
      buildsFromCampIds: p.buildsFrom.filter((c) => c !== campId),
      ...(requiresSmite ? { requiresSmite: true } : {}),
      patch: PATCH,
    });
  }
  // resolve buildsFrom campId -> slug
  const slugByCamp = new Map([...byCampId].map(([c, it]) => [c, it.id]));
  const items = [];
  for (const [, it] of byCampId) {
    const buildsFrom = [];
    for (const c of it.buildsFromCampIds) {
      const slug = slugByCamp.get(c);
      if (!slug) {
        warn(`componente campId ${c} de ${it.name} não resolvido`);
        continue;
      }
      buildsFrom.push(slug);
    }
    delete it.buildsFromCampIds;
    items.push({ ...it, buildsFrom });
  }
  return items;
}

// ---------------- snapshot ----------------

async function downloadImages(items) {
  if (!WITH_IMAGES || DRY_RUN) return;
  const dir = join(ROOT, "public", "items");
  mkdirSync(dir, { recursive: true });
  for (const it of items) {
    const dest = join(dir, `${it.campId}.png`);
    if (existsSync(dest)) continue;
    try {
      const res = await fetch(`${HS}/items/${it.campId}.png`, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      await sleep(DELAY_MS);
    } catch (e) {
      warn(`imagem ${it.campId} falhou: ${e.message}`);
    }
  }
}

function diffItems(prev, next) {
  const pm = new Map(prev.map((i) => [i.id, i]));
  const nm = new Map(next.map((i) => [i.id, i]));
  const added = [...nm.keys()].filter((k) => !pm.has(k));
  const removed = [...pm.keys()].filter((k) => !nm.has(k));
  const changed = [...nm.keys()]
    .filter((k) => pm.has(k) && JSON.stringify({ ...pm.get(k), patch: "" }) !== JSON.stringify({ ...nm.get(k), patch: "" }))
    .map((k) => k);
  return { added, removed, changed };
}

// ---------------- main ----------------

let items = [];
let sourceUsed = SOURCE;
let rawDump = [];

if (SOURCE === "camp" || SOURCE === "auto") {
  try {
    const campEquips = await tryCampDirect();
    sourceUsed = "camp-direct";
    console.log(`camp direto: ${campEquips.length} equips`);
    // Normalização camp->Item reaproveita o shape do espelho (stats via equipEffects).
    // Sem token em mãos, este ramo fica como caminho oficial documentado; o fallback cobre a captura.
    throw new Error("normalização camp->Item pendente de amostra real; usando espelho");
  } catch (e) {
    console.log(`fonte direta camp indisponível (${e.message}); caindo para hokstats.gg`);
    if (SOURCE === "camp") process.exitCode = 1;
    sourceUsed = "hokstats-mirror";
  }
}

if (sourceUsed !== "camp-direct") {
  const { raws } = await fetchHokstatsMirror();
  rawDump = raws.map(({ campId, en, pt }) => ({
    campId,
    urlEn: `${HS}/items/${campId}/`,
    urlPt: pt ? `${HS}/pt-br/items/${campId}/` : null,
    parsedEn: parseItemPage(en),
    parsedPt: pt ? parseItemPage(pt) : null,
  }));
  items = normalizeMirror(raws);
}

console.log(`Itens normalizados: ${items.length} (fonte: ${sourceUsed})`);
await downloadImages(items);

const manifestPath = join(ROOT, "data", "patches", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const prevPatch = manifest.latest;
const season = SEASON ?? manifest.patches.find((p) => p.patch === prevPatch)?.season ?? "S14";
let prevItems = [];
try {
  prevItems = JSON.parse(readFileSync(join(ROOT, "data", "patches", prevPatch, "items.json"), "utf8"));
} catch {
  warn(`snapshot anterior ${prevPatch} ilegível p/ diff`);
}
const diff = diffItems(prevItems, items);
console.log(`Diff vs ${prevPatch}: +${diff.added.length} -${diff.removed.length} ~${diff.changed.length}`);
if (diff.added.length) console.log("  added:", diff.added.join(", "));
if (diff.removed.length) console.log("  removed:", diff.removed.join(", "));
if (diff.changed.length) console.log("  changed:", diff.changed.join(", "));

if (!DRY_RUN) {
  const outDir = join(ROOT, "data", "patches", PATCH);
  mkdirSync(join(outDir, "heroes"), { recursive: true });
  writeFileSync(join(outDir, "items.json"), JSON.stringify(items, null, 2) + "\n");
  writeFileSync(join(outDir, "items.raw.json"), JSON.stringify({ source: sourceUsed, patch: PATCH, items: rawDump }, null, 2) + "\n");
  writeFileSync(join(outDir, "items.diff.json"), JSON.stringify({ vs: prevPatch, ...diff }, null, 2) + "\n");
  // heróis: herda snapshot anterior (sem alteração de herói nesta captura)
  const prevHeroes = join(ROOT, "data", "patches", prevPatch, "heroes");
  try {
    const { readdirSync } = await import("node:fs");
    for (const f of readdirSync(prevHeroes)) {
      const dst = join(outDir, "heroes", f);
      if (!existsSync(dst)) copyFileSync(join(prevHeroes, f), dst);
    }
  } catch (e) {
    warn(`heróis não herdados: ${e.message}`);
  }
  if (!manifest.patches.some((p) => p.patch === PATCH)) {
    manifest.patches.push({
      season,
      patch: PATCH,
      date: PATCH,
      notes: `Itens via ${sourceUsed} (camp.honorofkings.com${sourceUsed === "hokstats-mirror" ? " através do espelho hokstats.gg" : ""}): ${items.length} itens EN+PT-BR + ícones`,
    });
  }
  manifest.latest = PATCH;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Snapshot escrito em data/patches/${PATCH}/`);
  if (REWIRE && PATCH !== prevPatch) rewireDataLoader(PATCH);
}

function rewireDataLoader(patch) {
  const r = spawnSync(process.execPath, [join(ROOT, "tools", "gen-loader.ts"), `--patch=${patch}`], {
    stdio: "inherit",
  });
  if (r.status !== 0) warn(`rewire: gen-loader falhou (exit ${r.status})`);
}

if (warnings.length) {
  console.log(`AVISOS (${warnings.length}):`);
  for (const w of [...new Set(warnings)].slice(0, 40)) console.log(" - " + w);
  process.exitCode = 1;
} else {
  console.log("OK sem avisos.");
}
