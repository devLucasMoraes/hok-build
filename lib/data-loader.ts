import type { Hero, Item, PatchManifest } from "./types";
import { HEROES, ITEMS, MANIFEST } from "./data/generated";

// Snapshot JSON versionado por patch — imports em ./data/generated.ts,
// gerados por tools/gen-loader.ts (pnpm gen-loader). Não edite o gerado.
// (Futuro backend: trocar o corpo destas funções por fetch()
// para GET /api/patches/:patch/items — os tipos não mudam.)

export function getManifest(): PatchManifest {
  return MANIFEST;
}

export function getPatch(): string {
  return MANIFEST.latest;
}

export function getItems(): Item[] {
  return ITEMS;
}

export function getItemMap(): Map<string, Item> {
  return new Map(ITEMS.map((i) => [i.id, i]));
}

export function getHero(id: string): Hero {
  const hero = HEROES[id];
  if (!hero) throw new Error(`Herói desconhecido: ${id}`);
  return hero;
}

export function getHeroes(): Hero[] {
  return Object.values(HEROES);
}

/** Deriva buildsInto (quem usa este item como componente). */
export function getBuildsInto(itemId: string): Item[] {
  return ITEMS.filter((i) => i.buildsFrom.includes(itemId));
}
