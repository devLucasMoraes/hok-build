"use client";

import { useMemo } from "react";
import type { Hero, Item, PatchManifest } from "@/lib/types";
import { useAppStore } from "../stores/app-store";
import Builder from "./builder";
import HeroPicker from "./hero-picker";

interface Props {
  heroes: Hero[];
  items: Item[];
  manifest: PatchManifest;
  initialHeroId: string;
}

/** Shell: herói selecionado vive no store (persiste); sem key-reset — o working state é por herói. */
export default function AppShell({ heroes, items, manifest, initialHeroId }: Props) {
  const storedId = useAppStore((s) => s.heroId);
  const pickerOpen = useAppStore((s) => s.pickerOpen);
  // Catálogo manda: id persistido que saiu do snapshot cai para o inicial.
  const heroId = heroes.some((h) => h.id === storedId) ? storedId : initialHeroId;
  const hero = useMemo(() => heroes.find((h) => h.id === heroId) ?? heroes[0], [heroes, heroId]);

  return (
    <>
      <Builder hero={hero} items={items} manifest={manifest} onSwitchHero={() => useAppStore.getState().setPickerOpen(true)} />
      {pickerOpen && (
        <HeroPicker
          heroes={heroes}
          selectedId={hero.id}
          onPick={(id) => {
            const st = useAppStore.getState();
            st.setHero(id);
            st.setPickerOpen(false);
          }}
          onClose={() => useAppStore.getState().setPickerOpen(false)}
        />
      )}
    </>
  );
}
