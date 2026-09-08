"use client";

import { useState } from "react";

/** Retrato do herói servido de public/heroes/<slug>.jpg (ver fetch-heroes). */
export function heroPortrait(id: string): string {
  return `/heroes/${id}.jpg`;
}

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Props {
  /** URL do ícone (item.icon ou heroPortrait). Sem src cai direto no fallback. */
  src?: string | null;
  alt: string;
  /** nome usado nas iniciais do fallback */
  name: string;
  className?: string;
  /** classe de cor de fundo do fallback (ex: meta.dot da categoria) */
  fallbackClassName?: string;
  loading?: "lazy" | "eager";
}

/** Ícone do jogo com fallback para iniciais quando a imagem falta/falha. */
export default function GameIcon({ src, alt, name, className, fallbackClassName, loading }: Props) {
  const [failed, setFailed] = useState(false);
  const cls = className ?? "h-8 w-8 rounded-md";
  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`flex shrink-0 items-center justify-center text-[10px] font-black text-white ${fallbackClassName ?? "bg-zinc-700"} ${cls}`}
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={loading ?? "lazy"}
      draggable={false}
      onError={() => setFailed(true)}
      className={`shrink-0 object-cover ${cls}`}
    />
  );
}
