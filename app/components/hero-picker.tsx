"use client";

import { useMemo, useState } from "react";
import type { Hero } from "@/lib/types";
import GameIcon, { heroPortrait } from "./game-icon";

interface Props {
  heroes: Hero[];
  selectedId: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

const LANE_ORDER = ["Clash Lane", "Jungle", "Mid", "Farm", "Roam"];

/** Herói com página incompleta na fonte (sem builds ou sem counters). */
export function isPartialHero(h: Hero): boolean {
  return (
    h.recommendedBuilds.length === 0 ||
    (h.counters.strongAgainst.length === 0 &&
      h.counters.weakAgainst.length === 0 &&
      h.counters.synergies.length === 0)
  );
}

export default function HeroPicker({ heroes, selectedId, onPick, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [lane, setLane] = useState<string>("all");

  const lanes = useMemo(() => LANE_ORDER.filter((l) => heroes.some((h) => h.lane === l)), [heroes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return heroes
      .filter((h) => (lane === "all" ? true : h.lane === lane))
      .filter((h) => (q ? h.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [heroes, query, lane]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="panel relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none sm:rounded-b-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-[#2b2640] p-4">
          <div>
            <h2 className="text-lg font-black">Escolher herói</h2>
            <p className="text-xs text-zinc-400">
              {filtered.length} de {heroes.length} · trocar zera a build atual
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2b2640] px-3 py-1.5 text-sm font-bold text-zinc-300 hover:border-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 gap-1.5 p-3 pb-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar herói…"
            autoFocus
            className="w-full min-w-0 rounded-lg border border-[#2b2640] bg-[#0f0d18] px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-600 focus:border-[#c9a227]"
          />
        </div>
        <div className="flex shrink-0 gap-1 overflow-x-auto p-3 pb-1">
          {["all", ...lanes].map((l) => (
            <button
              key={l}
              onClick={() => setLane(l)}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                lane === l ? "border-[#c9a227] bg-[#c9a227]/15 text-[#e8c96a]" : "border-[#2b2640] text-zinc-400"
              }`}
            >
              {l === "all" ? "Todas as rotas" : l}
            </button>
          ))}
        </div>

        <ul className="col-scroll grid grid-cols-3 gap-1.5 overflow-y-auto p-3 sm:grid-cols-4">
          {filtered.map((h) => {
            const active = h.id === selectedId;
            const partial = isPartialHero(h);
            return (
              <li key={h.id}>
                <button
                  onClick={() => {
                    onPick(h.id);
                    onClose();
                  }}
                  title={`${h.name} · ${h.lane}${partial ? " · dados parciais na fonte" : ""}`}
                  className={`flex w-full flex-col items-center gap-1 rounded-xl border p-2 transition-colors ${
                    active
                      ? "border-[#c9a227] bg-[#c9a227]/10"
                      : "border-transparent bg-white/[0.02] hover:border-[#c9a227]/40"
                  }`}
                >
                  <GameIcon
                    src={heroPortrait(h.id)}
                    alt={h.name}
                    name={h.name}
                    className="h-12 w-12 rounded-lg"
                  />
                  <span className="line-clamp-1 w-full text-center text-[11px] leading-tight font-bold">
                    {h.name}
                    {active && <span className="ml-1 text-[9px] text-emerald-300">●</span>}
                  </span>
                  <span className="text-[9px] leading-tight text-zinc-500">
                    {h.lane}
                    {partial && <span className="ml-1 text-amber-300/80" title="Página incompleta na fonte">◐</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Nenhum herói encontrado.</p>}
      </div>
    </div>
  );
}
