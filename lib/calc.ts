import { ITEM_EFFECTS } from "./item-effects";
import type { Hero, Item, StatKey } from "./types";
import { STAT_ORDER } from "./stat-meta";

export type StatTable = Record<StatKey, number>;

export function emptyStats(): StatTable {
  return Object.fromEntries(STAT_ORDER.map((k) => [k, 0])) as StatTable;
}

/** Atributos do herói em um nível: base + crescimento * (L - 1). */
export function heroStatsAtLevel(hero: Hero, level: number): StatTable {
  const t = emptyStats();
  const lvl = Math.min(Math.max(1, Math.round(level)), hero.maxLevel);
  for (const k of STAT_ORDER) {
    t[k] = hero.baseStats[k] ?? 0;
  }
  for (const g of hero.growth) {
    t[g.stat] += g.perLevel * (lvl - 1);
  }
  return t;
}

/** Soma herói + itens (ordem: soma tudo, depois multiplicadores). */
export function buildStats(heroBase: StatTable, items: (Item | null | undefined)[]): StatTable {
  const t = { ...heroBase };
  const equipped = items.filter((i): i is Item => !!i);
  for (const item of equipped) {
    for (const s of item.stats) t[s.key] += s.value;
    for (const g of ITEM_EFFECTS[item.id]?.grants ?? []) t[g.key] += g.value;
  }
  for (const item of equipped) {
    for (const m of ITEM_EFFECTS[item.id]?.multiply ?? []) t[m.stat] *= m.ratio;
  }
  // arredonda para 1 casa (evita 210.00000001)
  for (const k of STAT_ORDER) t[k] = Math.round(t[k] * 10) / 10;
  return t;
}

export interface StatDiff {
  key: StatKey;
  before: number;
  after: number;
  delta: number;
}

/** Diferença entre duas tabelas (troca de item ou de build).
 *  `includeZeros` retorna as 21 linhas em STAT_ORDER, inclusive 0→0
 *  (visão "como na API"); default filtra duplo-zero. */
export function diffStats(before: StatTable, after: StatTable, opts?: { includeZeros?: boolean }): StatDiff[] {
  const rows = STAT_ORDER.map((key) => ({
    key,
    before: before[key],
    after: after[key],
    delta: Math.round((after[key] - before[key]) * 10) / 10,
  }));
  if (opts?.includeZeros) return rows;
  return rows.filter((d) => d.before !== 0 || d.after !== 0);
}

export function buildCost(items: (Item | null | undefined)[]): number {
  return items.reduce((acc, i) => acc + (i?.cost ?? 0), 0);
}

/** Troca o item de um slot e devolve as duas tabelas p/ preview A vs B. */
export function previewSwap(
  heroBase: StatTable,
  equipped: (Item | null | undefined)[],
  slot: number,
  candidate: Item | null,
): { before: StatTable; after: StatTable } {
  const before = buildStats(heroBase, equipped);
  const next = [...equipped];
  next[slot] = candidate;
  return { before, after: buildStats(heroBase, next) };
}
