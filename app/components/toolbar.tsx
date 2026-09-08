"use client";

import GameIcon from "./game-icon";

interface Props {
  heroName: string;
  heroCn?: string;
  heroPortrait: string;
  level: number;
  maxLevel: number;
  onLevel: (level: number) => void;
  gold: number;
  canUndo: boolean;
  onUndo: () => void;
  onHeroInfo: () => void;
  onSwitchHero: () => void;
  patch: string;
  season: string;
}

/** Barra única do cockpit: herói · nível · ouro · undo · info. */
export default function Toolbar({
  heroName,
  heroCn,
  heroPortrait,
  level,
  maxLevel,
  onLevel,
  gold,
  canUndo,
  onUndo,
  onHeroInfo,
  onSwitchHero,
  patch,
  season,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[#2b2640] bg-black/40 px-3 py-2 sm:gap-3 sm:px-4">
      <button onClick={onHeroInfo} className="flex min-w-0 items-center gap-2 text-left" title="Ver dados do herói">
        <GameIcon src={heroPortrait} alt={heroName} name={heroName} className="h-8 w-8 rounded-lg" />
        <span className="min-w-0">
          <span className="block truncate text-sm leading-tight font-black">
            {heroName} <span className="hidden font-semibold text-zinc-500 sm:inline">{heroCn}</span>
          </span>
          <span className="block text-[10px] leading-tight text-zinc-500">
            Patch {patch} · {season}
          </span>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-[#2b2640] bg-[#100e19] px-1.5 py-1">
          <button
            onClick={() => onLevel(Math.max(1, level - 1))}
            className="rounded px-1.5 font-mono text-sm font-bold text-zinc-400 hover:text-white"
            aria-label="Diminuir nível"
          >
            −
          </button>
          <span className="min-w-12 text-center text-xs text-zinc-400">
            nv. <span className="font-mono text-sm font-bold text-white">{level}</span>
          </span>
          <button
            onClick={() => onLevel(Math.min(maxLevel, level + 1))}
            className="rounded px-1.5 font-mono text-sm font-bold text-zinc-400 hover:text-white"
            aria-label="Aumentar nível"
          >
            +
          </button>
        </div>

        <span className="hidden rounded-lg border border-[#2b2640] bg-[#100e19] px-2.5 py-1.5 font-mono text-sm font-bold text-[#e8c96a] sm:block">
          {gold.toLocaleString("pt-BR")}g
        </span>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Desfazer (Ctrl+Z)"
          className="rounded-lg border border-[#2b2640] px-2.5 py-1.5 text-sm font-bold text-zinc-300 hover:border-[#c9a227] hover:text-white disabled:opacity-30"
        >
          ↩
        </button>
        <button
          onClick={onHeroInfo}
          className="rounded-lg border border-[#2b2640] px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:border-[#c9a227] hover:text-white"
        >
          Herói
        </button>
        <button
          onClick={onSwitchHero}
          className="rounded-lg border border-[#c9a227]/60 px-2.5 py-1.5 text-xs font-bold text-[#e8c96a] hover:bg-[#c9a227]/15"
        >
          Trocar
        </button>
      </div>
    </div>
  );
}
