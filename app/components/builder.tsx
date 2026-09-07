"use client";

import { useMemo, useState } from "react";
import { buildCost, buildStats, diffStats, heroStatsAtLevel, previewSwap } from "@/lib/calc";
import type { Hero, Item, PatchManifest } from "@/lib/types";
import { CATEGORY_META, STAT_META, formatStatValue } from "@/lib/stat-meta";
import ItemBrowser from "./item-browser";
import StatPanel from "./stat-panel";

interface Props {
  hero: Hero;
  items: Item[];
  manifest: PatchManifest;
}

const SLOTS = 6;

/** Últimos 6 itens únicos da sequência (build final), mantendo a ordem. */
function finalSix(ids: string[]): (string | null)[] {
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
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    finalSix(hero.recommendedBuilds[0]?.itemIds ?? []),
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const heroBase = useMemo(() => heroStatsAtLevel(hero, level), [hero, level]);
  const equipped = useMemo(() => slots.map((id) => (id ? itemMap.get(id) ?? null : null)), [slots, itemMap]);
  const total = useMemo(() => buildStats(heroBase, equipped), [heroBase, equipped]);
  const cost = useMemo(() => buildCost(equipped), [equipped]);
  const equippedIds = useMemo(() => new Set(slots.filter((s): s is string => !!s)), [slots]);

  const candidate = candidateId ? (itemMap.get(candidateId) ?? null) : null;
  const preview = useMemo(() => {
    if (selectedSlot === null || !candidate) return null;
    return previewSwap(heroBase, equipped, selectedSlot, candidate);
  }, [heroBase, equipped, selectedSlot, candidate]);

  const currentInSlot = selectedSlot !== null ? equipped[selectedSlot] : null;

  function handlePick(item: Item) {
    if (selectedSlot === null) {
      // sem slot selecionado: equipa no primeiro vazio
      const empty = slots.findIndex((s) => !s);
      if (empty === -1) {
        setSelectedSlot(0);
        setCandidateId(item.id);
      } else {
        const next = [...slots];
        next[empty] = item.id;
        setSlots(next);
      }
      return;
    }
    setCandidateId(item.id);
  }

  function applyCandidate() {
    if (selectedSlot === null || !candidateId) return;
    const next = [...slots];
    next[selectedSlot] = candidateId;
    setSlots(next);
    setCandidateId(null);
  }

  function clearSlot() {
    if (selectedSlot === null) return;
    const next = [...slots];
    next[selectedSlot] = null;
    setSlots(next);
    setCandidateId(null);
  }

  function loadBuild(ids: string[]) {
    setSlots(finalSix(ids));
    setSelectedSlot(null);
    setCandidateId(null);
  }

  const patchInfo = manifest.patches.find((p) => p.patch === manifest.latest);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-6 sm:px-5">
      {/* HEADER */}
      <header className="panel overflow-hidden">
        <div className="border-b border-[#2b2640] bg-gradient-to-r from-[#c9a227]/10 via-transparent to-[#ff5a3c]/10 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.25em] text-[#e8c96a] uppercase">
                Honor of Kings · Builder
              </p>
              <h1 className="text-3xl font-black tracking-tight">
                {hero.name}{" "}
                {hero.nameCn && <span className="text-lg font-semibold text-zinc-400">{hero.nameCn}</span>}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                {hero.lane} · {hero.class} · Dificuldade {hero.difficulty} · Alcance{" "}
                {hero.attackRange === "ranged" ? "à distância" : "corpo a corpo"}
              </p>
            </div>
            <div className="flex gap-4 text-center">
              {[
                { label: "Win", value: `${hero.rates.winRate.toLocaleString("pt-BR")}%` },
                { label: "Pick", value: `${hero.rates.pickRate.toLocaleString("pt-BR")}%` },
                { label: "Ban", value: `${hero.rates.banRate.toLocaleString("pt-BR")}%` },
              ].map((r) => (
                <div key={r.label} className="rounded-lg border border-[#2b2640] bg-black/30 px-3 py-1.5">
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase">{r.label}</p>
                  <p className="font-mono text-sm font-bold text-[#e8c96a]">{r.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              Nível
              <input
                type="range"
                min={1}
                max={hero.maxLevel}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-36"
              />
              <span className="w-8 rounded bg-white/5 px-1.5 py-0.5 text-center font-mono font-bold">{level}</span>
            </label>
            {hero.growthEstimated && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                Escala por nível pendente na fonte — valores de nível usam só a base
              </span>
            )}
            {patchInfo && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
                Patch {patchInfo.patch} · {patchInfo.season}
              </span>
            )}
          </div>
        </div>

        {/* SLOTS */}
        <div className="p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-widest uppercase gold-text">Build atual</h2>
            <p className="font-mono text-sm text-[#e8c96a]">{cost.toLocaleString("pt-BR")} ouro</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
                  className={`slot-btn flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl bg-[#100e19] p-2 ${
                    selectedSlot === i ? "slot-active" : ""
                  }`}
                >
                  <span className="text-[10px] font-bold text-zinc-500">SLOT {i + 1}</span>
                  {item && meta ? (
                    <>
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-black text-white ${meta.dot}`}
                      >
                        {initials(item.name)}
                      </span>
                      <span className="line-clamp-2 text-center text-[11px] leading-tight font-semibold">
                        {item.name}
                      </span>
                      <span className="font-mono text-[10px] text-[#e8c96a]">{item.cost.toLocaleString("pt-BR")}g</span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-lg text-zinc-600">
                        +
                      </span>
                      <span className="text-[11px] text-zinc-600">Vazio</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setSlots(Array(SLOTS).fill(null));
                setSelectedSlot(null);
                setCandidateId(null);
              }}
              className="rounded-lg border border-[#2b2640] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:border-red-400 hover:text-red-300"
            >
              Limpar build
            </button>
            {selectedSlot !== null && (
              <button
                onClick={clearSlot}
                className="rounded-lg border border-[#2b2640] px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:border-red-400 hover:text-red-300"
              >
                Remover item do slot {selectedSlot + 1}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* STATS + COMPARADOR */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatPanel
          from={heroBase}
          to={total}
          title="Atributos com a build"
          subtitle={`${hero.name} nv. ${level} · base → com itens`}
        />
        <div className="panel p-4 sm:p-5">
          <h2 className="text-sm font-bold tracking-widest uppercase gold-text">Comparar troca (A → B)</h2>
          {preview && candidate ? (
            <>
              <p className="mt-1 text-xs text-zinc-400">
                Slot {selectedSlot! + 1}:{" "}
                <span className="font-bold text-zinc-200">{currentInSlot?.name ?? "Vazio"}</span>
                <span className="mx-1">→</span>
                <span className="font-bold text-[#e8c96a]">{candidate.name}</span>
                <span className="ml-2 font-mono">
                  {(currentInSlot?.cost ?? 0).toLocaleString("pt-BR")}g → {candidate.cost.toLocaleString("pt-BR")}g
                </span>
              </p>
              {(() => {
                const changed = diffStats(preview.before, preview.after).filter((d) => d.delta !== 0);
                return changed.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-400">
                    Nenhuma diferença numérica — compare as passivas/ativas nos cards dos itens.
                  </p>
                ) : (
                  <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                    {changed.map((d) => (
                      <li key={d.key} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-zinc-300">{STAT_META[d.key].label}</span>
                        <span className="font-mono text-xs whitespace-nowrap">
                          <span className="text-zinc-500">{formatStatValue(d.key, d.before)}</span>
                          <span className="mx-1 text-zinc-600">→</span>
                          <span className="font-bold">{formatStatValue(d.key, d.after)}</span>
                          <span
                            className={`ml-1.5 rounded-full px-1.5 py-0.5 font-bold ${
                              d.delta > 0
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-red-500/15 text-red-300"
                            }`}
                          >
                            {formatStatValue(d.key, d.delta)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
              <button
                onClick={applyCandidate}
                className="mt-3 w-full rounded-lg bg-[#c9a227] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#e8c96a]"
              >
                Equipar {candidate.name} no slot {selectedSlot! + 1}
              </button>
            </>
          ) : (
            <div className="mt-2 text-sm leading-relaxed text-zinc-400">
              <p>
                1. Clique num <span className="font-bold text-zinc-200">slot da build</span> acima.
              </p>
              <p>
                2. Clique num <span className="font-bold text-zinc-200">item candidato</span> na lista abaixo.
              </p>
              <p>3. Veja aqui exatamente o que muda antes de confirmar a troca.</p>
            </div>
          )}
        </div>
      </div>

      {/* BROWSER */}
      <ItemBrowser
        items={itemMap}
        list={items}
        equippedIds={equippedIds}
        candidateId={candidateId}
        selectedSlot={selectedSlot}
        onPick={handlePick}
      />

      {/* BUILDS + PATCHES */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="panel p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold tracking-widest uppercase gold-text">Builds recomendadas</h2>
          <ul className="flex flex-col gap-2.5">
            {hero.recommendedBuilds.map((b) => (
              <li key={b.id} className="rounded-xl border border-[#2b2640] bg-[#100e19] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{b.title}</p>
                    {b.context && <p className="text-xs text-zinc-500 italic">{b.context}</p>}
                  </div>
                  <button
                    onClick={() => loadBuild(b.itemIds)}
                    className="shrink-0 rounded-lg border border-[#c9a227]/60 px-2.5 py-1 text-xs font-bold text-[#e8c96a] hover:bg-[#c9a227]/15"
                  >
                    Carregar
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  {b.itemIds.map((id, i) => (
                    <span key={`${id}-${i}`}>
                      {i > 0 && <span className="mx-1 text-zinc-600">→</span>}
                      <span className={equippedIds.has(id) ? "font-semibold text-emerald-300" : ""}>
                        {itemMap.get(id)?.name ?? id}
                      </span>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-[#2b2640] pt-3 text-xs text-zinc-400">
            <p className="mb-1 font-bold text-zinc-300">
              Arcana: {hero.arcana.join(" · ")} · Feitiço: {hero.spell}
            </p>
            <p>Forte contra: {hero.counters.strongAgainst.join(", ") || "—"}</p>
            <p>Fraco contra: {hero.counters.weakAgainst.join(", ") || "—"}</p>
            <p>Aliados: {hero.counters.synergies.join(", ") || "—"}</p>
          </div>
        </section>

        <section className="panel p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold tracking-widest uppercase gold-text">
            Histórico de balanceamento
          </h2>
          <ol className="relative flex flex-col gap-3 border-l border-[#2b2640] pl-4">
            {hero.patchHistory.map((p) => (
              <li key={p.season} className="relative">
                <span
                  className={`absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full ${
                    p.type === "buff" ? "bg-emerald-400" : p.type === "nerf" ? "bg-red-400" : "bg-sky-400"
                  }`}
                />
                <p className="text-xs font-bold">
                  {p.season} · {p.date}{" "}
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] uppercase ${
                      p.type === "buff"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : p.type === "nerf"
                          ? "bg-red-500/15 text-red-300"
                          : "bg-sky-500/15 text-sky-300"
                    }`}
                  >
                    {p.type === "buff" ? "Buff" : p.type === "nerf" ? "Nerf" : "Ajuste"}
                  </span>
                </p>
                <p className="text-xs leading-relaxed text-zinc-400">{p.summary}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-[#2b2640] pt-3">
            <h3 className="mb-2 text-xs font-bold tracking-widest text-zinc-300 uppercase">Habilidades</h3>
            <ul className="flex flex-col gap-1.5">
              {hero.skills.map((s) => (
                <li key={s.slot} className="text-xs text-zinc-400">
                  <span className="font-bold text-zinc-200">{s.name}</span>
                  <span className="ml-1 text-zinc-500">
                    ({s.slot === "passive" ? "Passiva" : s.slot === "ult" ? "Suprema" : s.slot.toUpperCase()})
                  </span>{" "}
                  — {s.text}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <footer className="pb-4 text-center text-[11px] text-zinc-600">
        HoK Build · dados de hokstats.gg (patch {manifest.latest}) · valores de passivas condicionais não entram
        na conta — leia os efeitos nos cards
      </footer>
    </div>
  );
}
