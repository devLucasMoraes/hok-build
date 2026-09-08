import type { ItemCategory, StatKey } from "./types";

/** Metadados de exibição: rótulo PT-BR fiel ao vocabulário da API
 *  (hokstats: coluna de stats EN + tradução PT oficial) e natureza flat/percent.
 *  Sem campo `short` — todas as superfícies usam o nome cheio.
 */
export const STAT_META: Record<StatKey, { label: string; kind: "flat" | "percent" }> = {
  physicalAttack: { label: "Ataque Físico", kind: "flat" },
  magicAttack: { label: "Ataque Mágico", kind: "flat" },
  maxHealth: { label: "Vida", kind: "flat" },
  maxMana: { label: "Mana", kind: "flat" },
  physicalDefense: { label: "Defesa Física", kind: "flat" },
  magicDefense: { label: "Defesa Mágica", kind: "flat" },
  moveSpeedFlat: { label: "Velocidade de Movimento", kind: "flat" },
  moveSpeedPct: { label: "Velocidade de Movimento %", kind: "percent" },
  attackSpeedPct: { label: "Velocidade de Ataque", kind: "percent" },
  critRatePct: { label: "Taxa Crítica", kind: "percent" },
  critDamagePct: { label: "Dano Crítico", kind: "percent" },
  physLifestealPct: { label: "Roubo de Vida Físico", kind: "percent" },
  magicLifestealPct: { label: "Roubo de Vida Mágico", kind: "percent" },
  cdrPct: { label: "Redução de Recarga", kind: "percent" },
  physPierceFlat: { label: "Perfuração Física", kind: "flat" },
  physPiercePct: { label: "Perfuração Física %", kind: "percent" },
  magicPierceFlat: { label: "Perfuração Mágica", kind: "flat" },
  magicPiercePct: { label: "Perfuração Mágica %", kind: "percent" },
  tenacityPct: { label: "Resistência", kind: "percent" },
  hp5: { label: "Regeneração de Vida / 5s", kind: "flat" },
  mp5: { label: "Regeneração de Mana / 5s", kind: "flat" },
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
