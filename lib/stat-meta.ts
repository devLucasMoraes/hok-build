import type { ItemCategory, StatKey } from "./types";

/** Metadados de exibição: rótulo PT-BR, natureza e ordem no painel. */
export const STAT_META: Record<StatKey, { label: string; short: string; kind: "flat" | "percent" }> = {
  physicalAttack: { label: "Ataque Físico", short: "Atq. Fís.", kind: "flat" },
  magicAttack: { label: "Ataque Mágico", short: "Atq. Mág.", kind: "flat" },
  maxHealth: { label: "Vida Máx.", short: "Vida", kind: "flat" },
  maxMana: { label: "Mana Máx.", short: "Mana", kind: "flat" },
  physicalDefense: { label: "Defesa Física", short: "Def. Fís.", kind: "flat" },
  magicDefense: { label: "Defesa Mágica", short: "Def. Mág.", kind: "flat" },
  moveSpeedFlat: { label: "Vel. Movimento", short: "Vel. Mov.", kind: "flat" },
  moveSpeedPct: { label: "Vel. Movimento %", short: "Vel. Mov. %", kind: "percent" },
  attackSpeedPct: { label: "Vel. de Ataque", short: "Vel. Atq.", kind: "percent" },
  critRatePct: { label: "Taxa Crítica", short: "Crítico", kind: "percent" },
  critDamagePct: { label: "Dano Crítico", short: "Dano Crit", kind: "percent" },
  physLifestealPct: { label: "Roubo de Vida Fís.", short: "Roubo Fís.", kind: "percent" },
  magicLifestealPct: { label: "Roubo de Vida Mág.", short: "Roubo Mág.", kind: "percent" },
  cdrPct: { label: "Redução de Recarga", short: "CDR", kind: "percent" },
  physPierceFlat: { label: "Perfuração Física", short: "Perf. Fís.", kind: "flat" },
  physPiercePct: { label: "Perfuração Física %", short: "Perf. Fís. %", kind: "percent" },
  magicPierceFlat: { label: "Perfuração Mágica", short: "Perf. Mág.", kind: "flat" },
  magicPiercePct: { label: "Perfuração Mágica %", short: "Perf. Mág. %", kind: "percent" },
  tenacityPct: { label: "Resistência", short: "Resist.", kind: "percent" },
  hp5: { label: "Regen. Vida / 5s", short: "HP/5s", kind: "flat" },
  mp5: { label: "Regen. Mana / 5s", short: "MP/5s", kind: "flat" },
};

/** Ordem de exibição no painel de atributos. */
export const STAT_ORDER: StatKey[] = [
  "physicalAttack",
  "magicAttack",
  "maxHealth",
  "maxMana",
  "physicalDefense",
  "magicDefense",
  "attackSpeedPct",
  "critRatePct",
  "critDamagePct",
  "physLifestealPct",
  "magicLifestealPct",
  "cdrPct",
  "physPierceFlat",
  "physPiercePct",
  "magicPierceFlat",
  "magicPiercePct",
  "moveSpeedFlat",
  "moveSpeedPct",
  "tenacityPct",
  "hp5",
  "mp5",
];

export const CATEGORY_META: Record<ItemCategory, { label: string; color: string; dot: string }> = {
  attack: { label: "Ataque", color: "text-red-300", dot: "bg-red-500" },
  magic: { label: "Magia", color: "text-violet-300", dot: "bg-violet-500" },
  defense: { label: "Defesa", color: "text-sky-300", dot: "bg-sky-500" },
  movement: { label: "Movimento", color: "text-emerald-300", dot: "bg-emerald-500" },
  jungle: { label: "Selva", color: "text-lime-300", dot: "bg-lime-500" },
  support: { label: "Suporte", color: "text-amber-300", dot: "bg-amber-500" },
};

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatStatValue(key: StatKey, value: number): string {
  const signed = `${value > 0 ? "+" : ""}${trimNum(value)}`;
  return STAT_META[key].kind === "percent" ? `${signed}%` : signed;
}

export function formatDelta(key: StatKey, delta: number): string {
  if (delta === 0) return "±0";
  return formatStatValue(key, delta);
}
