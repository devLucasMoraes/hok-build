import type { Hero, Item, PatchManifest } from "./types";

// Hoje: importa o snapshot JSON versionado por patch.
// Amanhã (backend): trocar o corpo destas funções por fetch()
// para GET /api/patches/:patch/items — os tipos não mudam.
import manifest from "@/data/patches/manifest.json";
import itemsJson from "@/data/patches/2026-04-29/items.json";
import angelaJson from "@/data/patches/2026-04-29/heroes/angela.json";

const HEROES: Record<string, Hero> = {
  angela: angelaJson as Hero,
};

export function getManifest(): PatchManifest {
  return manifest as PatchManifest;
}

export function getPatch(): string {
  return (manifest as PatchManifest).latest;
}

export function getItems(): Item[] {
  return itemsJson as Item[];
}

export function getItemMap(): Map<string, Item> {
  return new Map(getItems().map((i) => [i.id, i]));
}

export function getHero(id: string): Hero {
  const hero = HEROES[id];
  if (!hero) throw new Error(`Herói desconhecido: ${id}`);
  return hero;
}

/** Deriva buildsInto (quem usa este item como componente). */
export function getBuildsInto(itemId: string): Item[] {
  return getItems().filter((i) => i.buildsFrom.includes(itemId));
}
