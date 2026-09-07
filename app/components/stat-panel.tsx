"use client";

import { useState } from "react";
import { diffStats, type StatDiff, type StatTable } from "@/lib/calc";
import { STAT_ORDER, STAT_META, formatDelta, formatStatValue } from "@/lib/stat-meta";

/** Camada de simulação (hover/toque): nunca troca o layout, só sobrepõe. */
export interface PreviewOverlay {
  title: string;
  subtitle?: string;
  to: StatTable;
}

interface Props {
  base: StatTable;
  build: StatTable;
  overlay?: PreviewOverlay | null;
  title: string;
  subtitle?: string;
}

type Verdict = "up" | "down" | "flat";

function orderRows(rows: StatDiff[]): StatDiff[] {
  const order = new Map(STAT_ORDER.map((k, i) => [k, i]));
  return [...rows].sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
}

function verdictOf(delta: number): Verdict {
  return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
}

/** Uma linha = rótulo + UM valor + UMA pílula de veredito. */
export default function StatPanel({ base, build, overlay, title, subtitle }: Props) {
  const [showAll, setShowAll] = useState(false);

  const liveRows = orderRows(diffStats(base, build));
  const simList = overlay ? diffStats(build, overlay.to) : [];
  const simMap = new Map(simList.map((d) => [d.key, d]));
  // União: linhas da build + linhas alteradas pela simulação (mesmo com delta 0 na build,
  // como Vel. de Ataque base 5% → mostra o buff do hover). before já vem = valor da build.
  const merged = [...liveRows];
  for (const d of simList) {
    if (!merged.some((r) => r.key === d.key)) merged.push(d);
  }
  const rows = orderRows(
    showAll ? merged : merged.filter((d) => d.delta !== 0 || (simMap.get(d.key)?.delta ?? 0) !== 0),
  );
  const simChanged = [...simMap.values()].filter((d) => d.delta !== 0);
  const buffs = simChanged.filter((d) => d.delta > 0).length;
  const nerfs = simChanged.filter((d) => d.delta < 0).length;

  return (
    <div className="panel flex h-full flex-col p-3 sm:p-4">
      {/* Cabeçalho fixo — nunca substituído */}
      <div className="mb-1 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase gold-text">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="accent-[#c9a227]"
          />
          Tudo
        </label>
      </div>

      {/* Linha de status de altura fixa — hint ou veredito, sem shift de layout */}
      <div className="mb-2 flex h-7 items-center overflow-hidden rounded-lg border border-white/5 bg-black/30 px-2">
        {overlay ? (
          <p className="truncate text-[11px]">
            <span className="font-bold text-zinc-100">{overlay.title}</span>
            {overlay.subtitle && <span className="ml-2 font-mono text-zinc-500">{overlay.subtitle}</span>}
            <span className="ml-2 font-mono font-bold">
              {buffs > 0 && <span className="text-emerald-300">▲ {buffs} buff{buffs > 1 ? "s" : ""}</span>}
              {buffs > 0 && nerfs > 0 && <span className="mx-1 text-zinc-600">·</span>}
              {nerfs > 0 && <span className="text-red-300">▼ {nerfs} nerf{nerfs > 1 ? "s" : ""}</span>}
              {buffs === 0 && nerfs === 0 && <span className="text-zinc-400">sem mudança numérica</span>}
            </span>
          </p>
        ) : (
          <p className="truncate text-[11px] text-zinc-600">
            Passe o mouse num item para simular a troca · clique para equipar
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">Nenhum atributo alterado.</p>
      ) : (
        <ul className="col-scroll flex flex-col gap-1 pr-1">
          {rows.map((d) => {
            const sim = simMap.get(d.key);
            const ghostDelta = sim && overlay ? sim.delta : 0;
            const hasGhost = overlay != null && ghostDelta !== 0;
            // no hover, o valor exibido É o simulado; a pílula mostra o delta da troca
            const shown = hasGhost ? sim!.after : d.after;
            const pillDelta = hasGhost ? ghostDelta : d.delta;
            const v = verdictOf(pillDelta);
            const max = Math.max(Math.abs(d.before), Math.abs(d.after), Math.abs(shown), 1);
            const buildPct = Math.min(100, (Math.abs(d.after) / max) * 100);
            const shownPct = Math.min(100, (Math.abs(shown) / max) * 100);
            const segLeft = Math.min(buildPct, shownPct);
            const segWidth = Math.abs(shownPct - buildPct);
            return (
              <li
                key={d.key}
                className={`rounded-r-lg border-l-[3px] py-0.5 pl-2 ${
                  hasGhost
                    ? v === "up"
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-red-400 bg-red-500/10"
                    : "border-transparent"
                } ${overlay && !hasGhost ? "opacity-50" : ""}`}
              >
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-zinc-300">{STAT_META[d.key].label}</span>
                  <span className="font-mono text-xs whitespace-nowrap">
                    <span
                      className={`text-sm font-black ${
                        hasGhost
                          ? v === "up"
                            ? "text-emerald-300"
                            : "text-red-300"
                          : "text-zinc-100"
                      }`}
                    >
                      {formatStatValue(d.key, shown)}
                    </span>
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-black ${
                        v === "up"
                          ? "bg-emerald-500/25 text-emerald-200"
                          : v === "down"
                            ? "bg-red-500/25 text-red-200"
                            : "bg-zinc-700/60 text-zinc-300"
                      }`}
                    >
                      {v === "up" ? "▲ " : v === "down" ? "▼ " : ""}
                      {formatDelta(d.key, pillDelta)}
                    </span>
                  </span>
                </div>
                <div className="stat-bar mt-1">
                  <div className="fill" style={{ width: `${hasGhost ? buildPct : shownPct}%` }} />
                  {hasGhost && segWidth > 0.5 && (
                    <div
                      className={`ghost-fill ${v === "up" ? "up" : "down"}`}
                      style={{ left: `${segLeft}%`, width: `${segWidth}%` }}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        ▲ buff · ▼ nerf na troca. Passivas condicionais não entram na conta.
      </p>
    </div>
  );
}
