"use client";

import { useMemo, useState } from "react";
import type { Item, ItemCategory } from "@/lib/types";
import { CATEGORY_META, formatStatValue } from "@/lib/stat-meta";

interface Props {
  items: Map<string, Item>;
  list: Item[];
  equippedIds: Set<string>;
  candidateId: string | null;
  selectedSlot: number | null;
  onPick: (item: Item) => void;
}

const CATS: ("all" | ItemCategory)[] = ["all", "attack", "magic", "defense", "movement", "jungle", "support"];

export default function ItemBrowser({ items, list, equippedIds, candidateId, selectedSlot, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("magic");
  const [tier, setTier] = useState<"all" | 1 | 2 | 3>("all");

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
    <section className="panel p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-widest uppercase gold-text">
          Itens <span className="text-zinc-500">· {filtered.length}/{list.length}</span>
        </h2>
        {selectedSlot !== null ? (
          <p className="text-xs text-zinc-300">
            Slot <span className="font-bold text-[#e8c96a]">{selectedSlot + 1}</span> selecionado — clique
            num item para simular a troca
          </p>
        ) : (
          <p className="text-xs text-zinc-500">Selecione um slot acima ou clique num item para equipar</p>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-2 lg:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar item… (ex: void, savant)"
          className="w-full rounded-lg border border-[#2b2640] bg-[#0f0d18] px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-[#c9a227]"
        />
        <div className="flex gap-1.5">
          {(["all", 1, 2, 3] as const).map((t) => (
            <button
              key={String(t)}
              onClick={() => setTier(t)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                tier === t ? "border-[#c9a227] bg-[#c9a227]/15 text-[#e8c96a]" : "border-[#2b2640] text-zinc-400"
              }`}
            >
              {t === "all" ? "Todos" : `T${t}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              cat === c ? "border-[#c9a227] bg-[#c9a227]/15 text-[#e8c96a]" : "border-[#2b2640] text-zinc-400"
            }`}
          >
            {c !== "all" && <span className={`h-2 w-2 rounded-full ${CATEGORY_META[c].dot}`} />}
            {c === "all" ? "Todas" : CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => {
          const meta = CATEGORY_META[item.category];
          const isEquipped = equippedIds.has(item.id);
          const isCandidate = candidateId === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => onPick(item)}
                className={`w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${
                  isCandidate
                    ? "border-[#c9a227] bg-[#c9a227]/10 shadow-[0_0_0_1px_#c9a227]"
                    : "border-[#2b2640] bg-[#100e19] hover:border-[#c9a227]/60"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-1.5 text-[11px] font-bold uppercase ${meta.color}`}>
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.label} · T{item.tier}
                  </span>
                  <span className="font-mono text-[11px] text-[#e8c96a]">{item.cost.toLocaleString("pt-BR")}g</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{item.name}</p>
                  {isEquipped && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      EQUIPADO
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.stats.length === 0 && <span className="text-[11px] text-zinc-500">Sem atributos base</span>}
                  {item.stats.map((s) => (
                    <span key={s.key} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                      {formatStatValue(s.key, s.value)}
                    </span>
                  ))}
                </div>
                {item.abilities.length > 0 && (
                  <details className="item-abilities mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <summary className="text-[11px] font-semibold text-violet-300">
                      {item.abilities.length} {item.abilities.length === 1 ? "efeito" : "efeitos"} ▸
                    </summary>
                    <ul className="mt-1 flex flex-col gap-1">
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
                  </details>
                )}
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  {item.buildsFrom.length > 0 ? (
                    <>Feito de: {item.buildsFrom.map((id) => items.get(id)?.name ?? id).join(" + ")}</>
                  ) : (
                    <>Item básico{(buildsIntoCount.get(item.id) ?? 0) > 0 && <> · compõe {buildsIntoCount.get(item.id)} itens</>}</>
                  )}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Nenhum item encontrado.</p>}
    </section>
  );
}
