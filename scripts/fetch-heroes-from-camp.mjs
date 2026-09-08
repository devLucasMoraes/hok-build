/** Captura de heróis com fonte primária camp.honorofkings.com (estratégia híbrida).
 *
 *  Fonte direta (oficial): POST https://api-camp.honorofkings.com
 *    - /api/herowiki/getallherobriefinfo  (lista de heróis)
 *    - /api/herowiki/getherodataall {heroId} (detalhes: atributos, skills,
 *      SuitStrategy.equips[], rates, counters)
 *    Exige headers dinâmicos `specialencodeparam` gerados pelo `camp-security`
 *    (ver hok-camp-api/SSL-ACTX no GitHub). Sem token válido a API responde
 *    4xx — nesse caso o script cai para o espelho abaixo.
 *
 *  Espelho (fallback): hokstats.gg/heroes — declara dados do
 *    camp.honorofkings.com e espelha 1:1 thumbs do camp
 *    (game.gtimg.cn/.../heroimg/<heroId>/<heroId>.jpg). É parseável sem token.
 *    Páginas Astro estáticas, sem __NEXT_DATA__ (ver mapeamento em docs).
 *
 *  Uso:
 *    node scripts/fetch-heroes-from-camp.mjs [--source=auto|camp|hokstats]
 *      [--patch=YYYY-MM-DD] [--heroes=angela,daji] [--limit=5]
 *      [--langs=en,pt-BR] [--images] [--delay-ms=200] [--dry-run]
 *      [--camp-param=XXX] [--rewire]
 *
 *  Sem --patch, usa manifest.latest (enriquece o snapshot atual sem criar
 *  diretório novo — ideal para o piloto). Com --patch novo, herda items.json
 *  do snapshot anterior e registra entrada no manifest.
 *
 *  --rewire regenera lib/data/generated.ts via tools/gen-loader.ts para os
 *  heroes/*.json do snapshot alvo. Sem efeito com --dry-run.
 *
 *  Saída: data/patches/<PATCH>/heroes/<slug>.json (+ heroes.raw.json,
 *    heroes.diff.json), public/heroes/<slug>.jpg, manifest.json atualizado.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (X11; Linux x86_64) hok-build-hero-fetcher";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : ["_", a];
  }),
);

const SOURCE = String(args.source ?? "auto"); // auto | camp | hokstats
const LANGS = String(args.langs ?? "en,pt-BR").split(",");
const WITH_IMAGES = args.images !== undefined ? args.images !== "false" : true;
const DELAY_MS = Number(args["delay-ms"] ?? 200);
const LIMIT = args.limit ? Number(args.limit) : 0;
const DRY_RUN = args["dry-run"] === true || args["dry-run"] === "true";
const REWIRE = args.rewire === true || args.rewire === "true";
const CAMP_PARAM = args["camp-param"] ? String(args["camp-param"]) : null;
const HEROES_ARG = args.heroes ? String(args.heroes).split(",").map((s) => s.trim()).filter(Boolean) : null;

const manifestPath = join(ROOT, "data", "patches", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const PATCH = args.patch ? String(args.patch) : manifest.latest;

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
const stripTags = (s) => decode(s.replace(/<[^>]+>/g, "").replace(/\s+/g, " "));
const num = (str) => parseFloat(String(str).replace(/,/g, "").replace("%", "").trim());

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

// ---------------- Fonte direta: camp (documentada, exige token) ----------------

async function tryCampDirect() {
  if (!CAMP_PARAM) throw new Error("sem token camp-security (--camp-param ausente)");
  // Caminho oficial; normalização camp->Hero pendente de amostra real.
  throw new Error("normalização camp->Hero pendente de amostra real; usando espelho");
}

// ---------------- Espelho: hokstats.gg ----------------

const HS = "https://hokstats.gg";

const BASE_STAT_LABEL = {
  "max hp": "maxHealth",
  "max mana": "maxMana",
  "phys atk": "physicalAttack",
  "physical atk": "physicalAttack",
  "mag atk": "magicAttack",
  "magical atk": "magicAttack",
  "phys def": "physicalDefense",
  "physical def": "physicalDefense",
  "mag def": "magicDefense",
  "magical def": "magicDefense",
  "move speed": "moveSpeedFlat",
  "atk speed": "attackSpeedPct",
  "attack speed": "attackSpeedPct",
  "crit rate": "critRatePct",
  "crit dmg": "critDamagePct",
  "crit damage": "critDamagePct",
  "phys lifesteal": "physLifestealPct",
  "mag lifesteal": "magicLifestealPct",
  "cooldown reduction": "cdrPct",
  "cdr": "cdrPct",
  "hp/5s": "hp5",
  "mana/5s": "mp5",
  "range": "attackRange",
};

function section(html, headingRe, nextH2 = true) {
  const parts = html.split(headingRe);
  if (parts.length < 2) return "";
  let tail = parts.slice(1).join(" ");
  if (nextH2) tail = tail.split(/<h2[^>]*>/)[0];
  return tail;
}

function parseHeroPage(html, slug, warnEnabled = true) {
  const w = (msg) => { if (warnEnabled) warn(msg); };
  const nameM = html.match(/<h1[^>]*class="[^"]*font-display[^"]*"[^>]*>([^<]+)<\/h1>/);
  const name = nameM ? decode(nameM[1]) : null;
  const cnM =
    html.match(/<h1[^>]*>[\s\S]{0,300}?\(?(<span[^>]*>)?([^<>]{1,12})<\/(span|h1)>/) ||
    html.match(/Chinese name is ([^.<]+)[.<]/) ||
    html.match(/<p[^>]*>([^<>]{1,12})<\/p>\s*<\/div>\s*<div[^>]*>\s*<span[^>]*tier-badge/);
  // Chinês: span ao lado do h1, ou seção "Also known as"
  let nameCn = null;
  const cnAfterH1 = html.match(/<\/h1>\s*<span[^>]*>\s*\(?([^()<>\s][^()<>]{0,12})\)?\s*<\/span>/);
  if (cnAfterH1 && /[\u4e00-\u9fff]/.test(cnAfterH1[1])) nameCn = decode(cnAfterH1[1]).replace(/[()]/g, "");
  if (!nameCn) {
    const aka = html.match(/Also known as<\/h2>[\s\S]{0,800}?([\u4e00-\u9fff]{2,8})/);
    if (aka) nameCn = aka[1];
  }
  if (!nameCn) {
    const ld = html.match(/"alternateName":\s*\["([^"]+)"\]/);
    if (ld) nameCn = decode(ld[1]);
  }

  const tierM = html.match(/class="tier-badge[^"]*">\s*([SABCD])\s*</);
  const laneM = html.match(/class="role-badge[^"]*"[^>]*>\s*([^<]+?)\s*</);
  // classe ("Mage"): <p> fica ~2.3k chars após role-badge (bloco SVG de
  // dificuldade no meio), então busca numa janela ampla a partir do h1.
  const h1idx = html.search(/<h1[^>]*class="[^"]*font-display/);
  const headSec = h1idx >= 0 ? html.slice(h1idx, h1idx + 8000) : html.slice(0, 20000);
  const classM = headSec.match(/<p[^>]*class="text-xs md:text-sm text-text-secondary"[^>]*>([^<]+)<\/p>/);
  const clsTags = [...html.matchAll(/aria-label="In-game classification"[^>]*>([\s\S]*?)<\/div>/g)].flatMap((m) =>
    [...m[1].matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map((s) => decode(s[1])),
  );
  let difficulty = null;
  const diffM = html.match(/aria-label="Difficulty (\d) of 5"/);
  const lastTag = clsTags[clsTags.length - 1];
  if (lastTag && /^(Easy|Medium|Hard|Very Hard)$/i.test(lastTag)) difficulty = lastTag;
  else if (diffM) {
    const n = Number(diffM[1]);
    difficulty = n <= 1 ? "Easy" : n === 2 ? "Medium" : n === 3 ? "Hard" : "Very Hard";
  }
  let heroClass = classM ? decode(classM[1]) : null;
  if (heroClass && clsTags.length) {
    const tagsNoDiff = difficulty && clsTags[clsTags.length - 1] === difficulty ? clsTags.slice(0, -1) : clsTags;
    if (tagsNoDiff.length) heroClass = `${heroClass} — ${tagsNoDiff.join(" / ")}`;
  }

  const portraitM = html.match(/heroimg\/(\d+)\/\d+\.jpg/);

  // Base stats
  const statsSec = section(html, /<h2[^>]*>Base Stats<\/h2>/);
  const baseStats = {};
  let attackRange = "ranged";
  let resource = null;
  for (const m of statsSec.matchAll(/<div[^>]*class="[^"]*data-num[^"]*"[^>]*>([^<]+)<\/div>\s*<div[^>]*>([^<]+)<\/div>/g)) {
    const rawVal = decode(m[1]);
    const label = decode(m[2]).toLowerCase();
    if (label === "range") {
      attackRange = /melee/i.test(rawVal) ? "melee" : "ranged";
      continue;
    }
    const key = BASE_STAT_LABEL[label];
    if (!key) {
      // Recurso alternativo à mana (Energy, Fury, Heat, ...): valor numérico
      // puro vira Hero.resource; qualquer outro rótulo é warning real.
      if (/^[\d.,]+$/.test(rawVal.trim())) {
        if (!resource) resource = { name: decode(m[2]), value: num(rawVal) };
        else w(`recurso extra "${m[2]}=${rawVal}" ignorado em ${slug}`);
        continue;
      }
      w(`stat base desconhecido "${m[2]}=${rawVal}" em ${slug}`);
      continue;
    }
    baseStats[key] = num(rawVal);
  }

  // Skills
  const skillsSec = section(html, /<h2[^>]*>Skills<\/h2>/);
  const SLOT_MAP = { passive: "passive", skill1: "s1", skill2: "s2", ultimate: "ult" };
  const skills = [...skillsSec.matchAll(/<span[^>]*>\s*(passive|skill1|skill2|ultimate)\s*<\/span>\s*<span[^>]*font-bold[^>]*>([^<]+)<\/span>\s*(?:<\/div>)?\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => ({
    slot: SLOT_MAP[m[1]],
    name: decode(m[2]),
    text: stripTags(m[3]),
  }));

  // Builds
  const buildsSec = section(html, /<h2[^>]*>Builds?<\/h2>/);
  const recommendedBuilds = [];
  const blocks = buildsSec.split(/<h3[^>]*>/).slice(1);
  for (const b of blocks) {
    const titleM = b.match(/^([^<]+)<\/h3>/);
    if (!titleM) continue;
    const title = decode(titleM[1]);
    if (/recommended build/i.test(title)) continue; // bloco de arcana/spell, não build de itens
    const body = b.split(/<h3[^>]*>/)[0];
    const badges = [...body.matchAll(/<span[^>]*>(Safe default|Anti-tank|Position \d+|[^<>]{1,40})<\/span>/g)]
      .map((m) => decode(m[1]))
      .filter((t) => /safe default|anti-tank|position \d/i.test(t));
    const campIds = [...body.matchAll(/href="\/items\/(\d+)\/"/g)].map((m) => m[1]);
    if (!campIds.length) continue;
    // ordem DOM, dedupe mantendo ordem
    const ordered = [...new Set(campIds)];
    recommendedBuilds.push({ title, context: badges.join(" · "), campIds: ordered });
  }

  // Arcana + spell (bloco Recommended Build)
  const recSec = buildsSec.split(/Recommended Build/)[1] ?? "";
  const arcana = [...recSec.matchAll(/href="\/arcana\/#rune-\d+"[^>]*title="Lvl \d+: ([^"]+)"/g)].map((m) => decode(m[1]));
  const arcanaFb = arcana.length ? [] : [...recSec.matchAll(/href="\/arcana\/#rune-\d+"[^>]*>[\s\S]{0,300}?<span[^>]*>([^<]+)<\/span>/g)].map((m) => decode(m[1]));
  const spellM = recSec.match(/<span[^>]*title="([A-Za-z ]+)"[^>]*>\s*<img[^>]*summoner[^>]*>/) || html.match(/<span[^>]*title="(Flash|Flicker|Smite|Execute|Stun|Purify|Heal|Sprint|Retribution)"[^>]*>\s*<img[^>]*summoner/);
  void cnM;

  // Counters (sidebar <!-- Counters --><div>...<h2>Matchups</h2>; NB: "Matchups"
  // também aparece no JSON-LD do FAQ antes — por isso o split é pelo <h2>).
  const matchParts = html.split(/<h2[^>]*>Matchups<\/h2>/);
  const matchSec = matchParts.length > 1 ? matchParts.slice(1).join(" ").split(/<h2[^>]*>/)[0] : "";
  if (!matchSec) w(`seção Matchups ausente p/ ${slug}`);
  const pickNames = (markerRe) => {
    const tail = matchSec.split(markerRe)[1]?.split(/<p[^>]*>(Strong vs|Struggles against|Partners|Best allies|Synergies)/)[0] ?? "";
    return [...tail.matchAll(/href="\/heroes\/[a-z0-9-]+\/"[^>]*>[\s\S]{0,2000}?<span[^>]*>([^<]+)<\/span>/g)].map((m) => decode(m[1]));
  };
  const strongAgainst = pickNames(/Strong vs/);
  const weakAgainst = pickNames(/Struggles against/);
  const synergies = pickNames(/Partners/);

  // Rates
  const ratesSec = section(html, /Current patch rates/);
  const rate = (label) => {
    const m = ratesSec.match(new RegExp(label + "</dt>\\s*<dd[^>]*>([\\d.,]+)%?</dd>", "i"));
    return m ? num(m[1]) : null;
  };
  const winRate = rate("Win rate");
  const pickRate = rate("Pick rate");
  const banRate = rate("Ban rate");

  // Patch history
  const histSec = section(html, /<h2[^>]*>Patch History<\/h2>/);
  const patchHistory = [...histSec.matchAll(/<span[^>]*>\s*(S\d+)\s*<\/span>\s*<span[^>]*>\s*([^<]+?)\s*<\/span>\s*<span[^>]*>\s*([^<]+?)\s*<\/span>\s*(?:<\/div>)?\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => {
    const typeRaw = decode(m[3]);
    const type = /nerf/i.test(typeRaw) ? "nerf" : /buff/i.test(typeRaw) ? "buff" : "adjust";
    return { season: decode(m[1]), date: decode(m[2]), type, summary: stripTags(m[4]) };
  });

  return {
    name,
    nameCn,
    tier: tierM ? tierM[1] : null,
    lane: laneM ? decode(laneM[1]) : null,
    heroClass,
    difficulty,
    portraitHeroId: portraitM ? portraitM[1] : null,
    baseStats,
    resource,
    attackRange,
    skills,
    builds: recommendedBuilds,
    arcana: arcana.length ? arcana : arcanaFb,
    spell: spellM ? decode(spellM[1]) : "",
    strongAgainst,
    weakAgainst,
    synergies,
    winRate,
    pickRate,
    banRate,
    patchHistory,
    histSecHasSeason: /S\d+/.test(histSec),
  };
}

function normalizeHero(slug, parsed, itemByCamp, ptParsed) {
  if (!parsed.name) {
    warn(`parse incompleto (sem nome) p/ ${slug}`);
    return null;
  }
  if (!parsed.lane) warn(`lane ausente p/ ${slug}`);
  if (!parsed.heroClass) warn(`classe ausente p/ ${slug}`);
  if (!parsed.skills.length) warn(`skills vazias p/ ${slug}`);
  if (!parsed.builds.length) warn(`builds vazias p/ ${slug}`);
  if (!parsed.patchHistory.length && parsed.histSecHasSeason) warn(`patchHistory vazio p/ ${slug}`);
  if (!parsed.strongAgainst.length && !parsed.weakAgainst.length && !parsed.synergies.length) {
    warn(`counters vazios p/ ${slug} (sem seção Matchups na fonte?)`);
  }
  if (ptParsed && ptParsed.name && ptParsed.name !== parsed.name) {
    // nomes próprios costumam ser iguais; diverge só se localização traduzir
    warn(`nome PT diverge em ${slug}: EN "${parsed.name}" vs PT "${ptParsed.name}"`);
  }

  const itemIdsResolve = (campIds, ctx) => {
    const out = [];
    for (const c of campIds) {
      const id = itemByCamp.get(c);
      if (!id) {
        warn(`item campId ${c} (${ctx}) não existe na base`);
        continue;
      }
      out.push(id);
    }
    return out;
  };

  const recommendedBuilds = parsed.builds.map((b, i) => ({
    id: `build-${i + 1}`,
    title: b.title,
    context: b.context,
    itemIds: itemIdsResolve(b.campIds, `${slug} build ${i + 1}`),
  }));

  return {
    id: slug,
    name: parsed.name,
    ...(parsed.nameCn ? { nameCn: parsed.nameCn } : {}),
    lane: parsed.lane ?? "",
    class: parsed.heroClass ?? "",
    difficulty: parsed.difficulty ?? "",
    baseStats: parsed.baseStats,
    ...(parsed.resource ? { resource: parsed.resource } : {}),
    attackRange: parsed.attackRange,
    growth: [],
    growthEstimated: true,
    maxLevel: 15,
    skills: parsed.skills,
    recommendedBuilds,
    counters: {
      strongAgainst: parsed.strongAgainst,
      weakAgainst: parsed.weakAgainst,
      synergies: parsed.synergies,
    },
    arcana: parsed.arcana,
    spell: parsed.spell,
    rates: {
      winRate: parsed.winRate ?? 0,
      pickRate: parsed.pickRate ?? 0,
      banRate: parsed.banRate ?? 0,
      patch: PATCH,
    },
    patchHistory: parsed.patchHistory,
    patch: PATCH,
  };
}

async function fetchHeroSlugs() {
  if (HEROES_ARG?.length) return HEROES_ARG;
  const listHtml = await fetchText(`${HS}/heroes/`);
  const slugs = [...new Set([...listHtml.matchAll(/href="\/heroes\/([a-z0-9-]+)\/"/g)].map((m) => m[1]))];
  if (!slugs.length) throw new Error("lista de heróis vazia em hokstats.gg/heroes/");
  return LIMIT ? slugs.slice(0, LIMIT) : slugs;
}

async function downloadPortraits(heroes, parsedBySlug) {
  if (!WITH_IMAGES || DRY_RUN) return;
  const dir = join(ROOT, "public", "heroes");
  mkdirSync(dir, { recursive: true });
  for (const h of heroes) {
    const dest = join(dir, `${h.id}.jpg`);
    if (existsSync(dest)) continue;
    const heroId = parsedBySlug.get(h.id)?.portraitHeroId;
    const urls = heroId ? [`https://game.gtimg.cn/images/yxzj/img201606/heroimg/${heroId}/${heroId}.jpg`] : [];
    urls.push(`${HS}/heroes-splash/${h.id}.jpg`);
    let ok = false;
    for (const u of urls) {
      try {
        const res = await fetch(u, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
        ok = true;
        await sleep(DELAY_MS);
        break;
      } catch {
        continue;
      }
    }
    if (!ok) warn(`retrato ${h.id} falhou`);
  }
}

function diffHeroes(prev, next) {
  const pm = new Map(prev.map((h) => [h.id, h]));
  const nm = new Map(next.map((h) => [h.id, h]));
  const added = [...nm.keys()].filter((k) => !pm.has(k));
  const removed = [...pm.keys()].filter((k) => !nm.has(k));
  const changed = [...nm.keys()]
    .filter((k) => pm.has(k) && JSON.stringify({ ...pm.get(k), patch: "" }) !== JSON.stringify({ ...nm.get(k), patch: "" }))
    .map((k) => k);
  return { added, removed, changed };
}

// ---------------- main ----------------

let sourceUsed = SOURCE;
if (SOURCE === "camp" || SOURCE === "auto") {
  try {
    await tryCampDirect();
    sourceUsed = "camp-direct";
  } catch (e) {
    console.log(`fonte direta camp indisponível (${e.message}); caindo para hokstats.gg`);
    if (SOURCE === "camp") process.exitCode = 1;
    sourceUsed = "hokstats-mirror";
  }
}

const latestPatch = manifest.latest;
const prevHeroesDir = join(ROOT, "data", "patches", latestPatch, "heroes");
const prevHeroes = [];
try {
  for (const f of readdirSync(prevHeroesDir)) {
    if (!f.endsWith(".json")) continue;
    prevHeroes.push(JSON.parse(readFileSync(join(prevHeroesDir, f), "utf8")));
  }
} catch {
  warn(`heroes anteriores ilegíveis em ${latestPatch}`);
}

// items da base atual (para resolver builds): prefere snapshot alvo se existir
let itemsBase = [];
try {
  const p = existsSync(join(ROOT, "data", "patches", PATCH, "items.json"))
    ? join(ROOT, "data", "patches", PATCH, "items.json")
    : join(ROOT, "data", "patches", latestPatch, "items.json");
  itemsBase = JSON.parse(readFileSync(p, "utf8"));
} catch {
  warn("items.json ilegível; builds não serão resolvidas");
}
const itemByCamp = new Map(itemsBase.map((i) => [String(i.campId), i.id]));

const slugs = await fetchHeroSlugs();
console.log(`Heróis alvo: ${slugs.length} (${slugs.join(", ")}) [fonte: ${sourceUsed}]`);

const raws = [];
for (const [idx, slug] of slugs.entries()) {
  const en = await fetchText(`${HS}/heroes/${slug}/`);
  await sleep(DELAY_MS);
  let pt = null;
  if (LANGS.includes("pt-BR") || LANGS.includes("pt-br")) {
    try {
      pt = await fetchText(`${HS}/pt-br/heroes/${slug}/`);
      await sleep(DELAY_MS);
    } catch (e) {
      warn(`PT ausente p/ ${slug}: ${e.message}`);
    }
  }
  raws.push({ slug, en, pt });
  console.log(`ok ${slug} (${idx + 1}/${slugs.length})`);
}

const parsedBySlug = new Map();
const heroes = [];
const rawDump = [];
for (const { slug, en, pt } of raws) {
  const p = parseHeroPage(en, slug, true);
  const pp = pt ? parseHeroPage(pt, slug, false) : null;
  parsedBySlug.set(slug, p);
  rawDump.push({ slug, urlEn: `${HS}/heroes/${slug}/`, urlPt: pt ? `${HS}/pt-br/heroes/${slug}/` : null, parsedEn: p, parsedPt: pp });
  const h = normalizeHero(slug, p, itemByCamp, pp);
  if (h) heroes.push(h);
}

console.log(`Heróis normalizados: ${heroes.length} (fonte: ${sourceUsed})`);
await downloadPortraits(heroes, parsedBySlug);

// diff apenas no subconjunto capturado vs anterior
const nextMerged = new Map(prevHeroes.map((h) => [h.id, h]));
for (const h of heroes) nextMerged.set(h.id, h);
const diff = diffHeroes(prevHeroes, [...nextMerged.values()]);
console.log(`Diff vs ${latestPatch}: +${diff.added.length} -${diff.removed.length} ~${diff.changed.length}`);
if (diff.added.length) console.log("  added:", diff.added.join(", "));
if (diff.removed.length) console.log("  removed:", diff.removed.join(", "));
if (diff.changed.length) console.log("  changed:", diff.changed.join(", "));

if (!DRY_RUN) {
  const isNewPatch = PATCH !== latestPatch;
  const outDir = join(ROOT, "data", "patches", PATCH);
  mkdirSync(join(outDir, "heroes"), { recursive: true });
  if (isNewPatch) {
    // herda itens + heróis do snapshot anterior
    const prevItems = join(ROOT, "data", "patches", latestPatch, "items.json");
    if (!existsSync(join(outDir, "items.json")) && existsSync(prevItems)) {
      const { copyFileSync } = await import("node:fs");
      copyFileSync(prevItems, join(outDir, "items.json"));
    }
    for (const f of readdirSync(prevHeroesDir)) {
      const dst = join(outDir, "heroes", f);
      if (!existsSync(dst)) {
        const { copyFileSync } = await import("node:fs");
        copyFileSync(join(prevHeroesDir, f), dst);
      }
    }
  }
  for (const h of heroes) {
    writeFileSync(join(outDir, "heroes", `${h.id}.json`), JSON.stringify(h, null, 2) + "\n");
  }
  writeFileSync(join(outDir, "heroes.raw.json"), JSON.stringify({ source: sourceUsed, patch: PATCH, heroes: rawDump }, null, 2) + "\n");
  writeFileSync(join(outDir, "heroes.diff.json"), JSON.stringify({ vs: latestPatch, ...diff }, null, 2) + "\n");
  if (isNewPatch && !manifest.patches.some((p) => p.patch === PATCH)) {
    const season = manifest.patches.find((p) => p.patch === latestPatch)?.season ?? "S14";
    manifest.patches.push({
      season,
      patch: PATCH,
      date: PATCH,
      notes: `Heróis via ${sourceUsed} (camp.honorofkings.com através do espelho hokstats.gg): ${heroes.length} heróis EN+PT-BR + retratos`,
    });
  }
  if (isNewPatch) manifest.latest = PATCH;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Snapshot escrito em data/patches/${PATCH}/heroes/`);
  if (REWIRE) rewireDataLoader(PATCH);
}

function rewireDataLoader(patch) {
  const r = spawnSync(process.execPath, [join(ROOT, "tools", "gen-loader.ts"), `--patch=${patch}`], {
    stdio: "inherit",
  });
  if (r.status !== 0) console.log(`rewire: gen-loader falhou (exit ${r.status})`);
}

if (warnings.length) {
  console.log(`AVISOS (${warnings.length}):`);
  for (const w of [...new Set(warnings)].slice(0, 40)) console.log(" - " + w);
  process.exitCode = 1;
} else {
  console.log("OK sem avisos.");
}
