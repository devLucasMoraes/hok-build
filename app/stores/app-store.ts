"use client";

/** Store global do app (zustand + persist em localStorage).
 *
 *  Persiste (bloco user): heroId atual, working slots/level por herói e
 *  builds nomeadas por herói. Efêmero (fora do persist): seleção, preview,
 *  history de undo e estado de UI (tabs, modais).
 *  Reidratação validada por PersistedStateSchema — storage corrompido é
 *  descartado sem crash (ver lib/schemas.ts).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PersistedStateSchema, type StoredBuild } from "@/lib/schemas";

export const STORAGE_KEY = "hok-build-v1";
const STORE_VERSION = 1;
const HISTORY_LIMIT = 20;

export type SlotState = (string | null)[];
export type MobileTab = "build" | "items" | "stats";

export function emptySlots(): SlotState {
  return Array<string | null>(6).fill(null);
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

interface PersistedSlice {
  heroId: string;
  slotsByHero: Record<string, SlotState>;
  levelByHero: Record<string, number>;
  buildsByHero: Record<string, StoredBuild[]>;
}

interface AppState extends PersistedSlice {
  selectedSlot: number;
  candidateId: string | null;
  previewId: string | null;
  history: SlotState[];
  mobileTab: MobileTab;
  sheetOpen: boolean;
  pickerOpen: boolean;
  buildSel: string;
  _hydrated: boolean;
  setHero: (id: string) => void;
  /** Semeia working state do herói a partir das props do server (só se ausente — persistido vence). */
  ensureHero: (heroId: string, seed: { slots: SlotState; level: number }) => void;
  setLevel: (heroId: string, level: number) => void;
  /** Troca os slots inteiros (empilha undo). */
  commitSlots: (heroId: string, next: SlotState) => void;
  equip: (heroId: string, slot: number, itemId: string) => void;
  clearSlots: (heroId: string) => void;
  undo: (heroId: string) => void;
  selectSlot: (slot: number) => void;
  setCandidate: (id: string | null) => void;
  setPreview: (id: string | null) => void;
  clearPreview: () => void;
  setMobileTab: (tab: MobileTab) => void;
  setSheetOpen: (open: boolean) => void;
  setPickerOpen: (open: boolean) => void;
  setBuildSel: (id: string) => void;
  saveBuild: (input: { heroId: string; name: string; patch: string; level: number; slots: SlotState }) => StoredBuild;
  loadBuild: (heroId: string, id: string) => StoredBuild | undefined;
  deleteBuild: (heroId: string, id: string) => void;
  renameBuild: (heroId: string, id: string, name: string) => void;
}

const seedState: PersistedSlice = {
  heroId: "angela",
  slotsByHero: {},
  levelByHero: {},
  buildsByHero: {},
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seedState,
      selectedSlot: 0,
      candidateId: null,
      previewId: null,
      history: [],
      mobileTab: "build",
      sheetOpen: false,
      pickerOpen: false,
      buildSel: "",
      _hydrated: false,

      setHero: (id) =>
        set({
          heroId: id,
          selectedSlot: 0,
          candidateId: null,
          previewId: null,
          history: [],
          buildSel: "",
        }),

      ensureHero: (heroId, seed) =>
        set((s) => ({
          slotsByHero: s.slotsByHero[heroId] ? s.slotsByHero : { ...s.slotsByHero, [heroId]: seed.slots },
          levelByHero: heroId in s.levelByHero ? s.levelByHero : { ...s.levelByHero, [heroId]: seed.level },
        })),

      setLevel: (heroId, level) => set((s) => ({ levelByHero: { ...s.levelByHero, [heroId]: level } })),

      commitSlots: (heroId, next) =>
        set((s) => ({
          history: [...s.history.slice(-(HISTORY_LIMIT - 1)), s.slotsByHero[heroId] ?? emptySlots()],
          slotsByHero: { ...s.slotsByHero, [heroId]: next },
        })),

      equip: (heroId, slot, itemId) => {
        const current = get().slotsByHero[heroId] ?? emptySlots();
        const next = [...current];
        next[slot] = itemId;
        get().commitSlots(heroId, next);
        set({ candidateId: null, previewId: null });
      },

      clearSlots: (heroId) => {
        get().commitSlots(heroId, emptySlots());
        set({ candidateId: null, previewId: null });
      },

      undo: (heroId) =>
        set((s) => {
          if (s.history.length === 0) return s;
          return {
            slotsByHero: { ...s.slotsByHero, [heroId]: s.history[s.history.length - 1] },
            history: s.history.slice(0, -1),
            candidateId: null,
            previewId: null,
          };
        }),

      selectSlot: (slot) => set({ selectedSlot: slot, candidateId: null }),
      setCandidate: (id) => set({ candidateId: id }),
      setPreview: (id) => set({ previewId: id }),
      clearPreview: () => set({ candidateId: null, previewId: null }),
      setMobileTab: (tab) => set({ mobileTab: tab }),
      setSheetOpen: (open) => set({ sheetOpen: open }),
      setPickerOpen: (open) => set({ pickerOpen: open }),
      setBuildSel: (id) => set({ buildSel: id }),

      saveBuild: ({ heroId, name, patch, level, slots }) => {
        const build: StoredBuild = {
          version: 1,
          id: newId(),
          name: name.trim().slice(0, 60),
          heroId,
          patch,
          level,
          slots: [...slots],
          updatedAt: Date.now(),
        };
        set((s) => ({
          buildsByHero: { ...s.buildsByHero, [heroId]: [...(s.buildsByHero[heroId] ?? []), build] },
        }));
        return build;
      },

      loadBuild: (heroId, id) => {
        const found = (get().buildsByHero[heroId] ?? []).find((b) => b.id === id);
        if (found) get().commitSlots(heroId, [...found.slots]);
        return found;
      },

      deleteBuild: (heroId, id) =>
        set((s) => ({
          buildsByHero: { ...s.buildsByHero, [heroId]: (s.buildsByHero[heroId] ?? []).filter((b) => b.id !== id) },
        })),

      renameBuild: (heroId, id, name) =>
        set((s) => ({
          buildsByHero: {
            ...s.buildsByHero,
            [heroId]: (s.buildsByHero[heroId] ?? []).map((b) =>
              b.id === id ? { ...b, name: name.trim().slice(0, 60), updatedAt: Date.now() } : b,
            ),
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        version: 1,
        heroId: s.heroId,
        slotsByHero: s.slotsByHero,
        levelByHero: s.levelByHero,
        buildsByHero: s.buildsByHero,
      }),
      /** Storage corrompido/versão desconhecida → descarta e segue com defaults. */
      merge: (persisted, current) => {
        const r = PersistedStateSchema.safeParse(persisted);
        if (!r.success) return { ...current };
        return { ...current, ...r.data };
      },
      migrate: (persisted) => {
        const r = PersistedStateSchema.safeParse(persisted);
        if (!r.success) return { ...seedState, version: 1 };
        return r.data;
      },
      /** Dispara com sucesso OU falha (storage corrompido) — nunca trava o seeding. */
      onRehydrateStorage: () => () => {
        useAppStore.setState({ _hydrated: true });
      },
    },
  ),
);
