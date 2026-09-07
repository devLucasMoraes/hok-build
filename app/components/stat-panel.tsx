"use client";

import { useState } from "react";
import { diffStats, type StatDiff, type StatTable } from "@/lib/calc";
import { STAT_ORDER, STAT_META, formatDelta, formatStatValue } from "@/lib/stat-meta";

export interface PreviewInfo {
  title: string;
  subtitle?: string;
  to: StatTable;
}

interface Props {
  base: StatTable;
  build: StatTable;
  preview?: PreviewInfo | null;
  title: string;
  subtitle?: string;
}

function orderRows(rows: StatDiff[]): StatDiff[] {
  const order = new Map(STAT_ORDER.map((k, i) => [k, i]));
  return [...rows].sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
}

/** Painel de atributos. Com preview ativo, vira modo simulação (build → simulação). */
export default function StatPanel({ base, build, preview, title, subtitle }: Props) {
  const [showAll, setShowAll] = useState(false);

  const liveRows = orderRows(diffStats(base, build));
  const simRows = preview ? orderRows(diffStats(build, preview.to)) : [];
  const simChanged = simRows.filter((d) => d.delta !== 0);
  const shownSim = showAll ? simRows : simChanged;
  const shownLive = showAll ? liveRows : liveRows.filter((d) => d.delta !== 0);

  return (
    <div className="panel flex h-full flex-col p-3 sm:p-4">
      {preview ? (
        <div className="mb-2 rounded-lg border border-[#c9a227]/50 bg-[#c9a227]/10 p-2">
          <p className="text-xs font-bold text-[#e8c96a]">{preview.title}</p>
          {preview.subtitle && <p className="font-mono text-[11px] text-zinc-300">{preview.subtitle}</p>}
          {simChanged.length > 0 && (
            <p className="mt-0.5 text-[11px] text-zinc-300">
              {simChanged
                .slice()
                .sort((a, b) => Math.abs(b.after - b.before) / Math.max(1, Math.abs(b.before)) - Math.abs(a.after - a.before) / Math.max(1, Math.abs(a.before)))
                .slice(0, 3)
                .map((d) => formatDelta(d.key, d.delta))
                .join(" · ")}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-2 flex items-center justify-between gap-2">
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
      )}

      {preview && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] text-zinc-400">Build atual → simulação</p>
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-300">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="accent-[#c9a227]"
            />
            Mostrar tudo
          </label>
        </div>
      )}

      {(preview ? shownSim : showAll ? liveRows : liveRows.length > 0 ? shownLive : liveRows).length === 0 ? (
        <p className="text-sm text-zinc-400">
          {preview ? "Nenhuma diferença numérica — compare as passivas nos itens." : "Nenhum atributo alterado."}
        </p>
      ) : (
        <ul className="col-scroll flex flex-col gap-2 pr-1">
          {(preview ? shownSim : shownLive).map((d) => {
            const max = Math.max(Math.abs(d.before), Math.abs(d.after), 1);
            const fillPct = Math.min(100, (Math.abs(d.after) / max) * 100);
            const tickPct = Math.min(100, (Math.abs(d.before) / max) * 100);
            const positive = d.delta > 0;
            const neutral = d.delta === 0;
            return (
              <li key={d.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-zinc-300">{STAT_META[d.key].label}</span>
                  <span className={`font-mono text-xs whitespace-nowrap ${preview ? "ghost" : ""}`}>
                    <span className={preview ? "text-zinc-400 not-italic" : "text-zinc-500"}>
                      {formatStatValue(d.key, d.before)}
                    </span>
                    <span className="mx-1 text-zinc-600">→</span>
                    <span className={`font-bold ${preview ? "" : "text-zinc-100"}`}>
                      {formatStatValue(d.key, d.after)}
                    </span>
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold not-italic ${
                        neutral
                          ? "bg-zinc-700/60 text-zinc-300"
                          : positive
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {formatDelta(d.key, d.delta)}
                    </span>
                  </span>
                </div>
                <div className="stat-bar mt-1">
                  <div className="fill" style={{ width: `${fillPct}%` }} />
                  <div className="tick" style={{ left: `calc(${tickPct}% - 1px)` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!preview && (
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Traço branco = base · barra = com itens. Passivas condicionais não entram na conta.
        </p>
      )}
    </div>
  );
}
