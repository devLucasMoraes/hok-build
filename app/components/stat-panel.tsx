"use client";

import { useState } from "react";
import { diffStats, type StatTable } from "@/lib/calc";
import { STAT_META, formatDelta, formatStatValue } from "@/lib/stat-meta";

interface Props {
  from: StatTable;
  to: StatTable;
  title: string;
  subtitle?: string;
  emptyHint?: string;
}

/** Painel de atributos com barra base → total e deltas verde/vermelho. */
export default function StatPanel({ from, to, title, subtitle, emptyHint }: Props) {
  const [onlyChanged, setOnlyChanged] = useState(false);
  const diffs = diffStats(from, to);
  const rows = onlyChanged ? diffs.filter((d) => d.delta !== 0) : diffs;

  return (
    <div className="panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase gold-text">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={onlyChanged}
            onChange={(e) => setOnlyChanged(e.target.checked)}
            className="accent-[#c9a227]"
          />
          Só mudanças
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyHint ?? "Nenhum atributo alterado."}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rows.map((d) => {
            const max = Math.max(Math.abs(d.before), Math.abs(d.after), 1);
            const fillPct = Math.min(100, (Math.abs(d.after) / max) * 100);
            const tickPct = Math.min(100, (Math.abs(d.before) / max) * 100);
            const positive = d.delta > 0;
            const neutral = d.delta === 0;
            return (
              <li key={d.key}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-zinc-300">{STAT_META[d.key].label}</span>
                  <span className="font-mono text-xs whitespace-nowrap">
                    <span className="text-zinc-500">{formatStatValue(d.key, d.before)}</span>
                    <span className="mx-1 text-zinc-600">→</span>
                    <span className="font-bold text-zinc-100">{formatStatValue(d.key, d.after)}</span>
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
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
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        Barra dourada = valor final · traço branco = valor base. Passivas condicionais, acúmulos e
        ativos aparecem nos cards dos itens e não entram na conta.
      </p>
    </div>
  );
}
