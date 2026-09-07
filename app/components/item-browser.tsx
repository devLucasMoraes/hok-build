"use client";

import { useMemo, useState } from "react";
import type { Item, ItemCategory, StatKey } from "@/lib/types";
import { CATEGORY_META, STAT_META } from "@/lib/stat-meta";

interface Props {
  items: Map<string, Item>;
  list: Item[];
  equippedIds: Set<string>;
  /** fixado pelo toque (mobile) */
  candidateId: string | null;
  /** efêmero do hover (desktop) */
  previewId: string | null;
  selectedSlot: number | null;
  onPick: (item: Item) => void;
  onHover: (item: Item | null) => void;
}

const CATS: ("all" | ItemCategory)[] = ["all", "attack", "magic", "defense", "movement", "jungle", "support"];

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function shortStat(key: StatKey, value: number): string {
  const meta = STAT_META[key];
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1);
  const signed = `${value > 0 ? "+" : ""}${n}${meta.kind === "percent" ? "%" : ""}`;
  return `${signed} ${meta.short}`;
}

export default function ItemBrowser({
  items,
  list,
  equippedIds,
  candidateId,
  previewId,
  selectedSlot,
  onPick,
  onHover,
}: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("magic");
  const [tier, setTier] = useState<"all" | 1 | 2 | 3>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const buildsIntoCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of list) for (const c of i.buildsFrom) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((i) => (cat === "all" ? true : i.category === cat))
      .filter((i) => (tier === "all" ? true : i.tier === tier))
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.tier - a.tier || b.cost - a.cost);
  }, [list, query, cat, tier]);

  return (
    <section className="panel flex h-full min-h-0 flex-col p-3">
      <div className="shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold tracking-widest uppercase gold-text">
            Itens <span className="text-zinc-500">· {filtered.length}</span>
          </h2>
          <p className="hidden text-[11px] text-zinc-500 xl:block">
            {selectedSlot !== null ? (
              <>
                Slot <span className="font-bold text-[#e8c96a]">{selectedSlot + 1}</span> · passe o mouse p/ simular,
                clique p/ equipar
              </>
            ) : (
              "Passe o mouse p/ simular · clique p/ equipar"
            )}
          </p>
        </div>
        <div className="mb-2 flex gap-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="w-full min-w-0 rounded-lg border border-[#2b2640] bg-[#0f0d18] px-2.5 py-1.5 text-sm outline-none placeholder:text-zinc-600 focus:border-[#c9a227]"
          />
          {(["all", 1, 2, 3] as const).map((t) => (
            <button
              key={String(t)}
              onClick={() => setTier(t)}
              className={`shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-bold ${
                tier === t ? "border-[#c9a227] bg-[#c9a227]/15 text-[#e8c96a]" : "border-[#2b2640] text-zinc-400"
              }`}
            >
              {t === "all" ? "T∗" : `T${t}`}
            </button>
          ))}
        </div>
        <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                cat === c ? "border-[#c9a227] bg-[#c9a227]/15 text-[#e8c96a]" : "border-[#2b2640] text-zinc-400"
              }`}
            >
              {c !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_META[c].dot}`} />}
              {c === "all" ? "Todas" : CATEGORY_META[c].label}
            </button>
          ))}
        </div>
      </div>

      <ul className="col-scroll flex flex-col gap-1 pr-0.5">
        {filtered.map((item) => {
          const meta = CATEGORY_META[item.category];
          const isEquipped = equippedIds.has(item.id);
          const isCandidate = candidateId === item.id;
          const isPreview = previewId === item.id;
          const expanded = expandedId === item.id;
          return (
            <li key={item.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onPick(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onPick(item);
                }}
                onMouseEnter={() => onHover(item)}
                onMouseLeave={() => onHover(null)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                  isCandidate
                    ? "border-[#c9a227] bg-[#c9a227]/10"
                    : isPreview
                      ? "border-[#c9a227]/60 bg-[#c9a227]/5"
                      : "border-transparent bg-white/[0.02] hover:border-[#c9a227]/40"
                } ${isEquipped ? "border-l-2 border-l-emerald-400" : ""}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white ${meta.dot}`}
                  title={`${meta.label} · Tier ${item.tier}`}
                >
                  {initials(item.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] leading-tight font-bold">
                    {item.name}
                    {isEquipped && <span className="ml-1.5 text-[9px] font-bold text-emerald-300">●</span>}
                  </span>
                  <span className="block truncate font-mono text-[10px] leading-tight text-zinc-400">
                    {item.stats.length === 0
                      ? "—"
                      : item.stats
                          .slice(0, 3)
                          .map((s) => shortStat(s.key, s.value))
                          .join(" · ")}
                    {item.stats.length > 3 && ` · +${item.stats.length - 3}`}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[#e8c96a]">
                  {item.cost.toLocaleString("pt-BR")}g
                </span>
                {item.abilities.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(expanded ? null : item.id);
                    }}
                    aria-label={expanded ? "Ocultar efeitos" : "Ver efeitos"}
                    className="shrink-0 rounded px-1 text-xs text-violet-300 hover:bg-white/10"
                  >
                    {expanded ? "▾" : "▸"}
                  </button>
                )}
              </div>
              {expanded && (
                <div className="mt-0.5 mb-1 ml-10 rounded-lg border border-[#2b2640] bg-[#100e19] p-2">
                  <ul className="flex flex-col gap-1">
                    {item.abilities.map((a) => (
                      <li key={a.name} className="text-[11px] leading-snug text-zinc-400">
                        <span className={`font-bold ${a.kind === "active" ? "text-amber-300" : "text-sky-300"}`}>
                          {a.kind === "active" ? "Ativa" : "Passiva"} — {a.name}
                          {a.cooldownSec ? ` (${a.cooldownSec}s)` : ""}:
                        </span>{" "}
                        {a.text}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {item.buildsFrom.length > 0 ? (
                      <>Feito de: {item.buildsFrom.map((id) => items.get(id)?.name ?? id).join(" + ")}</>
                    ) : (
                      <>Básico{(buildsIntoCount.get(item.id) ?? 0) > 0 && <> · compõe {buildsIntoCount.get(item.id)}</>}</>
                    )}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Nenhum item encontrado.</p>}
    </section>
  );
}
