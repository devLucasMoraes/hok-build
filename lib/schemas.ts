/** Schemas zod — validação runtime do contrato lib/types.ts.
 *
 *  `types.ts` segue a fonte dos tipos TS; estes schemas espelham campo a
 *  campo e validam em runtime em dois pontos (trocar junto, ver AGENTS.md):
 *  1. tools/gen-loader.ts — gate dos snapshots (items/heróis/manifest);
 *  2. app/stores/app-store.ts — reidratação do localStorage (storage).
 */
import { z } from "zod";

export const StatKeySchema = z.enum([
  "physicalAttack",
  "magicAttack",
  "maxHealth",
  "maxMana",
  "physicalDefense",
  "magicDefense",
  "moveSpeedFlat",
  "moveSpeedPct",
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
  "tenacityPct",
  "hp5",
  "mp5",
]);

export const StatValueSchema = z.object({
  key: StatKeySchema,
  value: z.number(),
});

export const ItemCategorySchema = z.enum(["attack", "magic", "defense", "movement", "jungle", "support"]);

export const ItemAbilitySchema = z.object({
  kind: z.enum(["passive", "active"]),
  name: z.string(),
  text: z.string(),
  cooldownSec: z.number().nullable().optional(),
});

export const ItemSchema = z.object({
  id: z.string().min(1),
  campId: z.string().min(1),
  name: z.string().min(1),
  namePt: z.string().optional(),
  icon: z.string().optional(),
  category: ItemCategorySchema,
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  cost: z.number(),
  stats: z.array(StatValueSchema),
  abilities: z.array(ItemAbilitySchema),
  buildsFrom: z.array(z.string()),
  requiresSmite: z.boolean().optional(),
  patch: z.string().min(1),
});

export const HeroGrowthSchema = z.object({
  stat: StatKeySchema,
  perLevel: z.number(),
});

export const HeroSkillSchema = z.object({
  slot: z.enum(["passive", "s1", "s2", "ult"]),
  name: z.string(),
  text: z.string(),
});

export const RecommendedBuildSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  context: z.string(),
  itemIds: z.array(z.string()),
});

export const HeroPatchDeltaSchema = z.object({
  season: z.string(),
  date: z.string(),
  type: z.enum(["buff", "nerf", "adjust"]),
  summary: z.string(),
});

export const HeroRatesSchema = z.object({
  winRate: z.number(),
  pickRate: z.number(),
  banRate: z.number(),
  patch: z.string(),
});

export const HeroSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameCn: z.string().optional(),
  lane: z.string(),
  class: z.string(),
  difficulty: z.string(),
  baseStats: z.partialRecord(StatKeySchema, z.number()),
  resource: z.object({ name: z.string(), value: z.number() }).optional(),
  attackRange: z.enum(["melee", "ranged"]),
  growth: z.array(HeroGrowthSchema),
  growthEstimated: z.boolean(),
  maxLevel: z.number().int().min(1),
  skills: z.array(HeroSkillSchema),
  recommendedBuilds: z.array(RecommendedBuildSchema),
  counters: z.object({
    strongAgainst: z.array(z.string()),
    weakAgainst: z.array(z.string()),
    synergies: z.array(z.string()),
  }),
  arcana: z.array(z.string()),
  spell: z.string(),
  rates: HeroRatesSchema,
  patchHistory: z.array(HeroPatchDeltaSchema),
  patch: z.string().min(1),
});

export const PatchInfoSchema = z.object({
  season: z.string(),
  patch: z.string(),
  date: z.string(),
  notes: z.string(),
});

export const PatchManifestSchema = z.object({
  latest: z.string().min(1),
  patches: z.array(PatchInfoSchema),
});

/** 6 slots de build: itemId ou null (slot vazio). */
export const SlotStateSchema = z.array(z.string().nullable()).length(6);

/** Build nomeada do usuário (sem UI própria por enquanto — só store). */
export const StoredBuildSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  heroId: z.string().min(1),
  patch: z.string().min(1),
  level: z.number().int().min(1),
  slots: SlotStateSchema,
  updatedAt: z.number().int(),
});

export type StoredBuild = z.infer<typeof StoredBuildSchema>;

/** Bloco persistido no localStorage (nada efêmero aqui). */
export const PersistedStateSchema = z.object({
  version: z.literal(1),
  heroId: z.string(),
  slotsByHero: z.record(z.string(), SlotStateSchema),
  levelByHero: z.record(z.string(), z.number()),
  buildsByHero: z.record(z.string(), z.array(StoredBuildSchema)),
});

export type PersistedState = z.infer<typeof PersistedStateSchema>;
