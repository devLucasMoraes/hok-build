/** HoK Build — modelo de dados central.
 *  Estes tipos são o contrato entre o JSON versionado por patch
 *  (data/patches/...) e a UI. Quando houver backend, a API deve
 *  devolver exatamente estes shapes (ver lib/data-loader.ts).
 */

export type StatKey =
  | "physicalAttack"
  | "magicAttack"
  | "maxHealth"
  | "maxMana"
  | "physicalDefense"
  | "magicDefense"
  | "moveSpeedFlat"
  | "moveSpeedPct"
  | "attackSpeedPct"
  | "critRatePct"
  | "critDamagePct"
  | "physLifestealPct"
  | "magicLifestealPct"
  | "cdrPct"
  | "physPierceFlat"
  | "physPiercePct"
  | "magicPierceFlat"
  | "magicPiercePct"
  | "tenacityPct"
  | "hp5"
  | "mp5";

export interface StatValue {
  key: StatKey;
  /** flat (ex: +80) ou percentual (ex: 10 = +10%). Sempre número. */
  value: number;
}

export type ItemCategory =
  | "attack"
  | "magic"
  | "defense"
  | "movement"
  | "jungle"
  | "support";

export interface ItemAbility {
  kind: "passive" | "active";
  name: string;
  text: string;
  cooldownSec?: number | null;
}

export interface Item {
  /** slug estável entre patches: "savants-wrath" */
  id: string;
  /** ID numérico oficial do camp.honorofkings.com (espelhado em hokstats.gg/items/<campId>/) */
  campId: string;
  name: string;
  /** nome PT-BR quando diferente do EN (nomes próprios costumam ser iguais) */
  namePt?: string;
  /** ícone em public/items/<campId>.png */
  icon?: string;
  category: ItemCategory;
  tier: 1 | 2 | 3;
  /** custo de compra do item pronto (ouro) */
  cost: number;
  /** atributos somáveis — única fonte de verdade numérica da engine */
  stats: StatValue[];
  /** passivas/ativas: exibição + tooltip. Só entram na conta via lib/item-effects.ts */
  abilities: ItemAbility[];
  /** ids dos componentes (DAG de build). `buildsInto` é derivado. */
  buildsFrom: string[];
  requiresSmite?: boolean;
  /** patch de origem destes dados, ex: "2026-04-29" */
  patch: string;
}

export interface HeroGrowth {
  stat: StatKey;
  perLevel: number;
}

export interface HeroSkill {
  slot: "passive" | "s1" | "s2" | "ult";
  name: string;
  text: string;
}

export interface RecommendedBuild {
  id: string;
  title: string;
  context: string;
  itemIds: string[];
}

export type PatchChangeType = "buff" | "nerf" | "adjust";

export interface HeroPatchDelta {
  season: string;
  date: string;
  type: PatchChangeType;
  summary: string;
}

export interface HeroRates {
  winRate: number;
  pickRate: number;
  banRate: number;
  patch: string;
}

export interface Hero {
  id: string;
  name: string;
  nameCn?: string;
  lane: string;
  class: string;
  difficulty: string;
  /** atributos no nível 1 (ou nível de referência do snapshot) */
  baseStats: Partial<Record<StatKey, number>>;
  /** recurso alternativo à mana (ex: Energy, Fury, Heat): barra própria do herói */
  resource?: { name: string; value: number };
  attackRange: "melee" | "ranged";
  /** escala por nível: stat(L) = base + perLevel * (L - 1) */
  growth: HeroGrowth[];
  /** true enquanto o crescimento for placeholder (dado ausente na fonte) */
  growthEstimated: boolean;
  maxLevel: number;
  skills: HeroSkill[];
  recommendedBuilds: RecommendedBuild[];
  counters: {
    strongAgainst: string[];
    weakAgainst: string[];
    synergies: string[];
  };
  arcana: string[];
  spell: string;
  rates: HeroRates;
  patchHistory: HeroPatchDelta[];
  patch: string;
}

export interface PatchInfo {
  season: string;
  patch: string;
  date: string;
  notes: string;
}

export interface PatchManifest {
  latest: string;
  patches: PatchInfo[];
}
