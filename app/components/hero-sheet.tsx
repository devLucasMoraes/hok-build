"use client";

import type { Hero, Item } from "@/lib/types";
import { heroStatsAtLevel } from "@/lib/calc";
import { STAT_META, STAT_ORDER, formatStatValue } from "@/lib/stat-meta";
import GameIcon, { heroPortrait } from "./game-icon";

interface Props {
  hero: Hero;
  itemMap: Map<string, Item>;
  equippedIds: Set<string>;
  level: number;
  onLoadBuild: (ids: string[]) => void;
  onClose: () => void;
}

/** Diálogo com tudo que saiu do primeiro viewport: rates, builds, skills, counters, timeline. */
export default function HeroSheet({ hero, itemMap, equippedIds, level, onLoadBuild, onClose }: Props) {
  const base = heroStatsAtLevel(hero, level);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="panel relative max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-b-none sm:rounded-b-2xl">
        <div className="flex items-center justify-between border-b border-[#2b2640] p-4">
          <div className="flex min-w-0 items-center gap-3">
            <GameIcon
              src={heroPortrait(hero.id)}
              alt={hero.name}
              name={hero.name}
              className="h-12 w-12 rounded-xl"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-black">
                {hero.name} {hero.nameCn && <span className="text-sm font-semibold text-zinc-400">{hero.nameCn}</span>}
              </h2>
              <p className="text-xs text-zinc-400">
                {hero.lane} · {hero.class} · Dificuldade {hero.difficulty} ·{" "}
                {hero.attackRange === "ranged" ? "à distância" : "corpo a corpo"} · Win{" "}
                {hero.rates.winRate.toLocaleString("pt-BR")}% · Pick {hero.rates.pickRate.toLocaleString("pt-BR")}% ·
                Ban {hero.rates.banRate.toLocaleString("pt-BR")}%
                {hero.resource && (
                  <> · Recurso: {hero.resource.name} {hero.resource.value.toLocaleString("pt-BR")}</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#2b2640] px-3 py-1.5 text-sm font-bold text-zinc-300 hover:border-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>

        <div className="col-scroll grid grid-cols-1 gap-4 p-4 sm:grid-cols-2" style={{ maxHeight: "calc(88dvh - 89px)" }}>
          <section>
            <h3 className="mb-2 text-xs font-bold tracking-widest uppercase gold-text">Builds recomendadas</h3>
            <ul className="flex flex-col gap-2">
              {hero.recommendedBuilds.map((b) => (
                <li key={b.id} className="rounded-xl border border-[#2b2640] bg-[#100e19] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold">{b.title}</p>
                    <button
                      onClick={() => {
                        onLoadBuild(b.itemIds);
                        onClose();
                      }}
                      className="shrink-0 rounded-lg border border-[#c9a227]/60 px-2 py-0.5 text-[11px] font-bold text-[#e8c96a] hover:bg-[#c9a227]/15"
                    >
                      Carregar
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    {b.itemIds.map((id, i) => {
                      const item = itemMap.get(id);
                      return (
                        <span key={`${id}-${i}`} className="mr-1 inline-flex items-center gap-0.5 align-middle">
                          {i > 0 && <span className="mr-1 text-zinc-600">→</span>}
                          <GameIcon
                            src={item?.icon}
                            alt={item?.name ?? id}
                            name={item?.name ?? id}
                            className="h-5 w-5 rounded"
                          />
                          <span className={equippedIds.has(id) ? "font-semibold text-emerald-300" : ""}>
                            {item?.name ?? id}
                          </span>
                        </span>
                      );
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[11px] text-zinc-400">
              <p className="font-bold text-zinc-300">
                Arcana: {hero.arcana.join(" · ")} · Feitiço: {hero.spell}
              </p>
              <p className="mt-1">Forte contra: {hero.counters.strongAgainst.join(", ") || "—"}</p>
              <p>Fraco contra: {hero.counters.weakAgainst.join(", ") || "—"}</p>
              <p>Aliados: {hero.counters.synergies.join(", ") || "—"}</p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold tracking-widest uppercase gold-text">Habilidades</h3>
            <ul className="mb-4 flex flex-col gap-1.5">
              {hero.skills.map((s) => (
                <li key={s.slot} className="text-[11px] text-zinc-400">
                  <span className="font-bold text-zinc-200">{s.name}</span> — {s.text}
                </li>
              ))}
            </ul>
            <h3 className="mb-2 text-xs font-bold tracking-widest uppercase gold-text">Balanceamento</h3>
            <ol className="relative flex flex-col gap-2.5 border-l border-[#2b2640] pl-4">
              {hero.patchHistory.map((p) => (
                <li key={p.season} className="relative">
                  <span
                    className={`absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full ${
                      p.type === "buff" ? "bg-emerald-400" : p.type === "nerf" ? "bg-red-400" : "bg-sky-400"
                    }`}
                  />
                  <p className="text-[11px] font-bold">
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
                  <p className="text-[11px] leading-relaxed text-zinc-400">{p.summary}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="border-t border-[#2b2640] px-4 py-3">
          <h3 className="mb-2 text-xs font-bold tracking-widest uppercase gold-text">
            Atributos base · nv. {level}
          </h3>
          <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {STAT_ORDER.map((key) => (
              <li key={key} className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
                <span className="font-sans text-zinc-400">{STAT_META[key].label}</span>
                <span className="shrink-0 font-bold text-zinc-200">{formatStatValue(key, base[key])}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
