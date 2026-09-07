/** Converte itens_honor_of_kings.md + heroi_angela.md em JSON versionado.
 *  Uso: node scripts/parse-md-to-json.mjs
 *  Saída: data/patches/<PATCH>/items.json, heroes/angela.json, manifest.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATCH = "2026-04-29";
const SEASON = "S14";

const warnings = [];
const warn = (msg) => warnings.push(msg);

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function num(str) {
  return parseFloat(String(str).replace(",", "."));
}

// ---------------- ITENS ----------------

const CATEGORY_BY_SECTION = {
  Ataque: "attack",
  Magia: "magic",
  Defesa: "defense",
  Movimento: "movement",
  Selva: "jungle",
  "Type 7 (Suporte)": "support",
};

const STAT_LABEL_MAP = {
  "ataque físico": "physicalAttack",
  "ataque mágico": "magicAttack",
  vida: "maxHealth",
  mana: "maxMana",
  "defesa física": "physicalDefense",
  "defesa mágica": "magicDefense",
  "velocidade de ataque": "attackSpeedPct",
  "taxa crítica": "critRatePct",
  "roubo de vida físico": "physLifestealPct",
  "roubo de vida mágico": "magicLifestealPct",
  "redução de recarga": "cdrPct",
};

function parseItemStats(cell) {
  const t = cell.trim();
  if (t === "—" || t === "") return [];
  return t.split(";").map((part) => {
    const m = part.trim().match(/^(.+?)\s*\+([\d.,]+)(%)?\s*$/);
    if (!m) throw new Error(`Atributo não parseável: "${part.trim()}"`);
    const label = m[1].trim().toLowerCase();
    const value = num(m[2]);
    const isPct = !!m[3];
    let key = STAT_LABEL_MAP[label];
    if (!key) {
      if (label === "velocidade de movimento") {
        key = isPct ? "moveSpeedPct" : "moveSpeedFlat";
      } else {
        throw new Error(`Rótulo de atributo desconhecido: "${m[1].trim()}"`);
      }
    }
    return { key, value };
  });
}

function parseAbilities(cell) {
  const t = cell.trim();
  if (t === "—" || t === "") return { abilities: [], requiresSmite: false };
  let requiresSmite = false;
  let text = t;
  if (text.includes("Requer Smite")) {
    requiresSmite = true;
    text = text.replace(/\*\*Requer Smite\.\*\*\s*/g, "");
  }
  const headerRe = /\*\*(Passiva|Ativa)\s*-\s*(.+?):\*\*\s*/g;
  const headers = [...text.matchAll(headerRe)];
  const abilities = [];
  if (headers.length === 0) {
    // texto livre (ex: Knowledge Gem, Lightfoot Shoes) → habilidade genérica
    abilities.push({ kind: "passive", name: "Efeito", text: text.replace(/\*/g, "").trim(), cooldownSec: null });
  } else {
    headers.forEach((h, i) => {
      const start = h.index + h[0].length;
      const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
      const body = text.slice(start, end).trim();
      const cd = body.match(/\(Recarga:\s*([\d.,]+)\s*s\)/);
      abilities.push({
        kind: h[1] === "Ativa" ? "active" : "passive",
        name: h[2].trim(),
        text: body,
        cooldownSec: cd ? num(cd[1]) : null,
      });
    });
  }
  return { abilities, requiresSmite };
}

function parseItems(md) {
  const items = [];
  const sections = md.split(/^## /m).slice(1);
  for (const sec of sections) {
    const title = sec.split("\n")[0].trim();
    const category = CATEGORY_BY_SECTION[title];
    if (!category) continue;
    const rows = sec.split("\n").filter((l) => l.startsWith("| **"));
    for (const row of rows) {
      const cols = row.split("|").map((c) => c.trim());
      // ["", item, custo, atributos, habilidades, build, ""]
      const [, rawName, rawCost, rawAttrs, rawAbilities, rawBuild] = cols;
      const name = rawName.replace(/\*\*/g, "").trim();
      const costM = rawCost.match(/([\d.,]+)\s*\(Tier\s*(\d)\)/);
      if (!costM) throw new Error(`Custo/tier inválido em "${name}": ${rawCost}`);
      const { abilities, requiresSmite } = parseAbilities(rawAbilities);
      items.push({
        id: slugify(name),
        name,
        category,
        tier: Number(costM[2]),
        cost: num(costM[1]),
        stats: parseItemStats(rawAttrs),
        abilities,
        buildsFromRaw: rawBuild.trim(),
        buildsFrom: [],
        ...(requiresSmite ? { requiresSmite: true } : {}),
        patch: PATCH,
      });
    }
  }
  // 2º passo: resolve referências de build
  const byName = new Map(items.map((i) => [slugify(i.name), i]));
  for (const item of items) {
    const raw = item.buildsFromRaw;
    delete item.buildsFromRaw;
    if (/item básico/i.test(raw)) continue;
    const refs = [...raw.matchAll(/([A-Za-zÀ-ÿ'’.\- ]+?)\s*\((\d+)\)/g)];
    if (refs.length === 0) warn(`Build não resolvido p/ ${item.name}: "${raw}"`);
    for (const r of refs) {
      const refName = r[1].trim();
      const target = byName.get(slugify(refName));
      if (!target) {
        warn(`Componente desconhecido "${refName}" em ${item.name}`);
        continue;
      }
      item.buildsFrom.push(target.id);
    }
  }
  return items;
}

// ---------------- HERÓI ----------------

const HERO_STAT_MAP = {
  vida: "maxHealth",
  mana: "maxMana",
  "ataque físico": "physicalAttack",
  "ataque mágico": "magicAttack",
  "defesa física": "physicalDefense",
  "defesa mágica": "magicDefense",
  "velocidade de movimento": "moveSpeedFlat",
  "bônus de velocidade de ataque": "attackSpeedPct",
  "taxa crítica": "critRatePct",
  "dano crítico": "critDamagePct",
  "roubo de vida físico": "physLifestealPct",
  "roubo de vida mágico": "magicLifestealPct",
  "redução de recarga": "cdrPct",
  "penetração física": "physPierceFlat",
  "penetração mágica": "magicPierceFlat",
  resistência: "tenacityPct",
  "regeneração de vida / 5s": "hp5",
  "regeneração de mana / 5s": "mp5",
};

function tableRows(md, heading) {
  const sec = md.split(`## ${heading}`)[1]?.split(/^## /m)[0] ?? "";
  return sec.split("\n").filter((l) => l.startsWith("| ") && !l.includes("---") && !l.startsWith("| Atributo") && !l.startsWith("| Tipo") && !l.startsWith("| Métrica") && !l.startsWith("| Temporada"));
}

function parseHero(md, items) {
  const byName = new Map(items.map((i) => [slugify(i.name), i]));
  const resolve = (name, ctx) => {
    const item = byName.get(slugify(name));
    if (!item) warn(`Item "${name}" (${ctx}) não existe na base`);
    return item?.id;
  };

  const name = md.match(/^#\s*(.+?)\s*[—–-]/m)[1].trim();
  const baseStats = {};
  let attackRange = "ranged";
  for (const row of tableRows(md, "Atributos Base")) {
    const [, k, v] = row.split("|").map((c) => c.trim());
    const key = k.toLowerCase();
    if (key === "alcance de ataque") {
      attackRange = /distância|ranged/i.test(v) ? "ranged" : "melee";
      continue;
    }
    const mapped = HERO_STAT_MAP[key];
    if (!mapped) throw new Error(`Atributo de herói desconhecido: "${k}"`);
    baseStats[mapped] = num(v.replace("%", ""));
  }

  const rates = {};
  for (const row of tableRows(md, "Taxas do patch atual")) {
    const [, k, v] = row.split("|").map((c) => c.trim());
    rates[k.toLowerCase()] = num(v.replace("%", ""));
  }

  // builds recomendadas
  const buildsSec = md.split("## Builds recomendadas")[1]?.split("## Habilidades")[0] ?? "";
  const recommendedBuilds = [];
  const buildBlocks = buildsSec.split(/^### /m).slice(1);
  buildBlocks.forEach((b, i) => {
    const titleLine = b.split("\n")[0].trim();
    if (!/^build \d/i.test(titleLine)) return;
    const title = titleLine.replace(/^Build \d+\s*[—–-]\s*/i, "").trim();
    const seqLine = b.split("\n").find((l) => l.includes("→")) ?? "";
    const names = seqLine.split("→").map((s) => s.replace(/\*/g, "").trim()).filter(Boolean);
    const itemIds = names.map((n) => resolve(n, `build ${i + 1}`)).filter(Boolean);
    const ctxM = b.match(/^\*(.+)\*$/m);
    recommendedBuilds.push({
      id: `build-${recommendedBuilds.length + 1}`,
      title: title || `Build ${recommendedBuilds.length + 1}`,
      context: ctxM ? ctxM[1].trim() : "",
      itemIds,
    });
  });

  const skills = tableRows(md, "Habilidades").map((row) => {
    const [, tipo, nome, efeito] = row.split("|").map((c) => c.trim());
    const slot = /suprema/i.test(tipo) ? "ult" : /habilidade 1/i.test(tipo) ? "s1" : /habilidade 2/i.test(tipo) ? "s2" : "passive";
    return { slot, name: nome.replace(/\*\*/g, ""), text: efeito };
  });

  const getList = (label) => {
    const m = md.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
    return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
  };

  const arcanaSec = md.split("### Arcana recomendada")[1]?.split("###")[0] ?? "";
  const arcana = [...arcanaSec.matchAll(/-\s*\*\*(.+?)\*\*/g)].map((m) => m[1].trim());
  const spellM = md.match(/### Feitiço do invocador\s*\n\s*-\s*\*\*(.+?)\*\*/);

  const patchHistory = tableRows(md, "Histórico de Atualizações").map((row) => {
    const [, season, date, tipo, resumo] = row.split("|").map((c) => c.trim());
    const type = /enfraquecido|nerf/i.test(tipo) ? "nerf" : /fortalecido|buff/i.test(tipo) ? "buff" : "adjust";
    return { season, date, type, summary: resumo.replace(/\*"/g, "“").replace(/"\*/g, "”") };
  });

  const lane = (md.match(/-\s*\*\*Rota:\*\*\s*(.+)/) || [])[1]?.trim() ?? "";
  const heroClass = (md.match(/-\s*\*\*Especialidade:\*\*\s*(.+)/) || [])[1]?.trim() ?? "";
  const difficulty = (md.match(/-\s*\*\*Dificuldade:\*\*\s*(.+)/) || [])[1]?.trim() ?? "";
  const nameCn = (md.match(/chinês.*?:\*\*\s*(.+)/) || [])[1]?.trim() ?? "";

  return {
    id: slugify(name),
    name,
    nameCn,
    lane,
    class: heroClass,
    difficulty,
    baseStats,
    attackRange,
    growth: [],
    growthEstimated: true,
    maxLevel: 15,
    skills,
    recommendedBuilds,
    counters: {
      strongAgainst: getList("Forte contra"),
      weakAgainst: getList("Fraco contra"),
      synergies: getList("Melhores aliados"),
    },
    arcana,
    spell: spellM ? spellM[1].trim() : "",
    rates: {
      winRate: rates["taxa de vitória"] ?? 0,
      pickRate: rates["taxa de escolha"] ?? 0,
      banRate: rates["taxa de ban"] ?? 0,
      patch: PATCH,
    },
    patchHistory,
    patch: PATCH,
  };
}

// ---------------- MAIN ----------------

const itemsMd = readFileSync(join(ROOT, "itens_honor_of_kings.md"), "utf8");
const heroMd = readFileSync(join(ROOT, "heroi_angela.md"), "utf8");

const items = parseItems(itemsMd);
const hero = parseHero(heroMd, items);

const outDir = join(ROOT, "data", "patches", PATCH);
mkdirSync(join(outDir, "heroes"), { recursive: true });
writeFileSync(join(outDir, "items.json"), JSON.stringify(items, null, 2) + "\n");
writeFileSync(join(outDir, "heroes", "angela.json"), JSON.stringify(hero, null, 2) + "\n");
writeFileSync(
  join(ROOT, "data", "patches", "manifest.json"),
  JSON.stringify(
    {
      latest: PATCH,
      patches: [{ season: SEASON, patch: PATCH, date: PATCH, notes: "Snapshot inicial: 107 itens + Angela (fonte hokstats.gg, patch 2026/04/29)" }],
    },
    null,
    2,
  ) + "\n",
);

console.log(`Itens: ${items.length} | Habilidades: ${items.reduce((a, i) => a + i.abilities.length, 0)} | Builds Angela: ${hero.recommendedBuilds.length}`);
if (warnings.length) {
  console.log(`AVISOS (${warnings.length}):`);
  for (const w of warnings) console.log(" - " + w);
  process.exitCode = 1;
} else {
  console.log("OK sem avisos.");
}
