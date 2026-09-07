"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCost, buildStats, diffStats, heroStatsAtLevel, previewSwap } from "@/lib/calc";
import type { Hero, Item, PatchManifest } from "@/lib/types";
import { CATEGORY_META, STAT_META, formatStatValue } from "@/lib/stat-meta";
import HeroSheet from "./hero-sheet";
import ItemBrowser from "./item-browser";
import StatPanel from "./stat-panel";
import Toolbar from "./toolbar";

interface Props {
  hero: Hero;
  items: Item[];
  manifest: PatchManifest;
}

const SLOTS = 6;
type SlotState = (string | null)[];
type MobileTab = "build" | "items" | "stats";

/** Últimos 6 itens únicos da sequência (build final), mantendo a ordem. */
function finalSix(ids: string[]): SlotState {
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(id);
  }
  const last = uniq.slice(-SLOTS);
  return [...Array<string | null>(SLOTS - last.length).fill(null), ...last];
}

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Builder({ hero, items, manifest }: Props) {
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [level, setLevel] = useState(hero.maxLevel);
  const [slots, setSlots] = useState<SlotState>(() => finalSix(hero.recommendedBuilds[0]?.itemIds ?? []));
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [history, setHistory] = useState<SlotState[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [buildSel, setBuildSel] = useState(hero.recommendedBuilds[0]?.id ?? "");
  const [canHover] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches,
  );

  const heroBase = useMemo(() => heroStatsAtLevel(hero, level), [hero, level]);
  const equipped = useMemo(() => slots.map((id) => (id ? itemMap.get(id) ?? null : null)), [slots, itemMap]);
  const total = useMemo(() => buildStats(heroBase, equipped), [heroBase, equipped]);
  const cost = useMemo(() => buildCost(equipped), [equipped]);
  const equippedIds = useMemo(() => new Set(slots.filter((s): s is string => !!s)), [slots]);

  /** Item fantasma: hover (desktop) tem prioridade, toque fixado (mobile) em seguida. */
  const ghostId = previewId ?? candidateId;
  const ghostItem = ghostId ? (itemMap.get(ghostId) ?? null) : null;
  const sim = useMemo(() => {
    if (!ghostItem) return null;
    return previewSwap(heroBase, equipped, selectedSlot, ghostItem);
  }, [heroBase, equipped, selectedSlot, ghostItem]);
  const currentInSlot = equipped[selectedSlot];

  /** Todos os atributos: valor padrão → valor com a build (ordem STAT_ORDER). */
  const fullStats = useMemo(() => diffStats(heroBase, total), [heroBase, total]);

  function commit(next: SlotState) {
    setHistory((h) => [...h.slice(-19), slots]);
    setSlots(next);
  }

  function equip(itemId: string, slot: number) {
    const next = [...slots];
    next[slot] = itemId;
    commit(next);
    setCandidateId(null);
    setPreviewId(null);
  }

  function handlePick(item: Item) {
    if (canHover) {
      // desktop: hover já simulou — clique confirma direto
      const empty = slots.findIndex((s) => !s);
      equip(item.id, selectedSlot ?? (empty === -1 ? 0 : empty));
      return;
    }
    // toque: 1º toque fixa preview, 2º no mesmo confirma
    if (candidateId === item.id) {
      const empty = slots.findIndex((s) => !s);
      equip(item.id, selectedSlot ?? (empty === -1 ? 0 : empty));
    } else {
      setCandidateId(item.id);
    }
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      setSlots(h[h.length - 1]);
      setCandidateId(null);
      setPreviewId(null);
      return h.slice(0, -1);
    });
  }

  function loadBuild(ids: string[], id: string) {
    commit(finalSix(ids));
    setBuildSel(id);
    setCandidateId(null);
    setPreviewId(null);
  }

  // Atalhos: 1–6 slot · Esc cancela · Ctrl+Z desfaz
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key >= "1" && e.key <= "6") {
        setSelectedSlot(Number(e.key) - 1);
        setCandidateId(null);
      } else if (e.key === "Escape") {
        if (sheetOpen) setSheetOpen(false);
        else {
          setCandidateId(null);
          setPreviewId(null);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slots, sheetOpen]);

  const patchInfo = manifest.patches.find((p) => p.patch === manifest.latest);

  const simTitle = ghostItem ? `${currentInSlot?.name ?? "Vazio"} → ${ghostItem.name}` : "";
  const simSubtitle = ghostItem
    ? `slot ${selectedSlot + 1} · ${(currentInSlot?.cost ?? 0).toLocaleString("pt-BR")}g → ${ghostItem.cost.toLocaleString("pt-BR")}g`
    : "";

  function renderSlots() {
    return (
      <div className="grid grid-cols-3 gap-1.5">
        {slots.map((id, i) => {
          const item = id ? itemMap.get(id) : undefined;
          const meta = item ? CATEGORY_META[item.category] : null;
          return (
            <button
              key={i}
              onClick={() => {
                setSelectedSlot(i);
                setCandidateId(null);
              }}
              title={item ? `${item.name} — tecla ${i + 1}` : `Slot vazio ${i + 1} — tecla ${i + 1}`}
              className={`slot-btn flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-xl bg-[#100e19] p-1.5 ${
                selectedSlot === i ? "slot-active" : ""
              }`}
            >
              <span className="text-[9px] font-bold text-zinc-500">
                {i + 1} · {item && meta ? meta.label.toUpperCase().slice(0, 3) : "—"}
              </span>
              {item && meta ? (
                <>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-black text-white ${meta.dot}`}
                  >
                    {initials(item.name)}
                  </span>
                  <span className="line-clamp-1 w-full text-center text-[10px] leading-tight font-semibold">
                    {item.name}
                  </span>
                </>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-base text-zinc-600">
                  +
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderMiniStats() {
    return (
      <div className="mt-2 rounded-xl border border-[#2b2640] bg-black/30 p-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Efeito da build</span>
          <span className="font-mono text-xs font-bold text-[#e8c96a]">{cost.toLocaleString("pt-BR")}g</span>
        </div>
        {fullStats.length === 0 ? (
          <p className="text-[11px] text-zinc-500">Sem atributos.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {fullStats.map((d) => (
              <li key={d.key} className="flex items-baseline justify-between font-mono text-[11px]">
                <span className="font-sans text-zinc-400">{STAT_META[d.key].short}</span>
                <span className="whitespace-nowrap">
                  <span className="text-zinc-500">{formatStatValue(d.key, d.before)}</span>
                  <span className="mx-1 text-zinc-700">→</span>
                  <span className={`font-bold ${d.delta !== 0 ? "text-emerald-300" : "text-zinc-300"}`}>
                    {formatStatValue(d.key, d.after)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="cockpit mx-auto w-full max-w-[1600px]">
      <Toolbar
        heroName={hero.name}
        heroCn={hero.nameCn}
        level={level}
        maxLevel={hero.maxLevel}
        onLevel={setLevel}
        gold={cost}
        canUndo={history.length > 0}
        onUndo={undo}
        onHeroInfo={() => setSheetOpen(true)}
        patch={manifest.latest}
        season={patchInfo?.season ?? ""}
      />

      {/* ============ DESKTOP: cockpit 3 colunas ============ */}
      <main className="hidden min-h-0 flex-1 gap-3 p-3 lg:grid lg:grid-cols-[280px_minmax(0,5fr)_minmax(0,6fr)]">
        <div className="col-scroll flex min-h-0 flex-col gap-2">
          <div className="panel p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-widest uppercase gold-text">Build</h2>
              <button
                onClick={() => {
                  commit(Array(SLOTS).fill(null));
                  setCandidateId(null);
                }}
                className="text-[11px] font-semibold text-zinc-500 hover:text-red-300"
              >
                Limpar
              </button>
            </div>
            {renderSlots()}
            {renderMiniStats()}
            <label className="mt-2 block">
              <span className="mb-1 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Recomendada
              </span>
              <select
                value={buildSel}
                onChange={(e) => {
                  const b = hero.recommendedBuilds.find((x) => x.id === e.target.value);
                  if (b) loadBuild(b.itemIds, b.id);
                }}
                className="w-full rounded-lg border border-[#2b2640] bg-[#100e19] px-2 py-1.5 text-xs outline-none focus:border-[#c9a227]"
              >
                {hero.recommendedBuilds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-zinc-600">
            Teclas 1–6 trocam o slot · hover simula · clique equipa · Ctrl+Z desfaz.
          </p>
        </div>

        <div className="flex min-h-0 flex-col">
          <StatPanel
            base={heroBase}
            build={total}
            overlay={sim && ghostItem ? { title: simTitle, subtitle: simSubtitle, to: sim.after } : null}
            title="Atributos"
            subtitle={`${hero.name} nv. ${level}`}
          />
        </div>

        <div className="flex min-h-0 flex-col" onMouseLeave={() => setPreviewId(null)}>
          <ItemBrowser
            items={itemMap}
            list={items}
            equippedIds={equippedIds}
            candidateId={candidateId}
            previewId={previewId}
            selectedSlot={selectedSlot}
            onPick={handlePick}
            onHover={(item) => setPreviewId(item?.id ?? null)}
          />
        </div>
      </main>

      {/* ============ MOBILE: abas ============ */}
      <main className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="col-scroll flex-1 p-2">
          {mobileTab === "build" && (
            <div className="panel p-2.5">
              {renderSlots()}
              {renderMiniStats()}
              <label className="mt-2 block">
                <span className="mb-1 block text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  Recomendada
                </span>
                <select
                  value={buildSel}
                  onChange={(e) => {
                    const b = hero.recommendedBuilds.find((x) => x.id === e.target.value);
                    if (b) loadBuild(b.itemIds, b.id);
                  }}
                  className="w-full rounded-lg border border-[#2b2640] bg-[#100e19] px-2 py-2 text-sm outline-none"
                >
                  {hero.recommendedBuilds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setMobileTab("items")}
                  className="flex-1 rounded-lg bg-[#c9a227] px-3 py-2 text-sm font-black text-black"
                >
                  Trocar item do slot {selectedSlot + 1} →
                </button>
                <button
                  onClick={() => commit(Array(SLOTS).fill(null))}
                  className="rounded-lg border border-[#2b2640] px-3 py-2 text-xs text-zinc-400"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}

          {mobileTab === "items" && (
            <div className="h-full min-h-[50dvh]">
              <ItemBrowser
                items={itemMap}
                list={items}
                equippedIds={equippedIds}
                candidateId={candidateId}
                previewId={null}
                selectedSlot={selectedSlot}
                onPick={handlePick}
                onHover={() => {}}
              />
            </div>
          )}

          {mobileTab === "stats" && (
            <div className="h-full min-h-[50dvh]">
              <StatPanel
                base={heroBase}
                build={total}
                overlay={sim && ghostItem ? { title: simTitle, subtitle: simSubtitle, to: sim.after } : null}
                title="Atributos"
                subtitle={`${hero.name} nv. ${level}`}
              />
            </div>
          )}
        </div>

        {/* barra fixa de confirmação (mobile, com preview ativo) */}
        {ghostItem && sim && (
          <div className="shrink-0 border-t border-[#c9a227]/40 bg-[#14121d] p-2">
            <p className="truncate text-center text-xs text-zinc-300">
              <span className="font-bold text-zinc-100">{currentInSlot?.name ?? "Vazio"}</span>
              <span className="mx-1">→</span>
              <span className="font-bold text-[#e8c96a]">{ghostItem.name}</span>
              <span className="ml-2 font-mono">
                {(currentInSlot?.cost ?? 0).toLocaleString("pt-BR")}g → {ghostItem.cost.toLocaleString("pt-BR")}g
              </span>
            </p>
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={() => {
                  setCandidateId(null);
                  setPreviewId(null);
                }}
                className="rounded-lg border border-[#2b2640] px-4 py-2 text-sm font-bold text-zinc-300"
              >
                ✕
              </button>
              <button
                onClick={() => {
                  equip(ghostItem.id, selectedSlot);
                  setMobileTab("build");
                }}
                className="flex-1 rounded-lg bg-[#c9a227] px-3 py-2 text-sm font-black text-black"
              >
                Equipar no slot {selectedSlot + 1}
              </button>
            </div>
          </div>
        )}

        <nav className="grid shrink-0 grid-cols-3 border-t border-[#2b2640] bg-black/50">
          {(
            [
              { id: "build", label: "Build" },
              { id: "items", label: `Itens · S${selectedSlot + 1}` },
              { id: "stats", label: "Stats" },
            ] as { id: MobileTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setMobileTab(t.id)}
              className={`py-2.5 text-sm font-bold ${
                mobileTab === t.id ? "text-[#e8c96a]" : "text-zinc-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </main>

      {sheetOpen && (
        <HeroSheet
          hero={hero}
          itemMap={itemMap}
          equippedIds={equippedIds}
          onLoadBuild={(ids) => {
            const b = hero.recommendedBuilds.find((x) => x.itemIds === ids);
            loadBuild(ids, b?.id ?? buildSel);
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
