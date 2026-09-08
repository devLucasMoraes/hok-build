# Architecture — hok-build

> Fonte de verdade para onde cada código novo vai. `AGENTS.md` é o índice; este arquivo é o mapa.

## Stack

Next.js 16 (App Router) + React 19 + Tailwind v4 + pnpm 10. `pnpm build` é o typecheck (tsc + rotas). Sem suite de testes.

## Folder map (atual)

```
app/
  layout.tsx, page.tsx (server: carrega snapshot, renderiza AppShell)
  globals.css (@import "tailwindcss", tokens .panel/.slot-btn/.stat-bar/.cockpit)
  components/              # client components do cockpit
    app-shell.tsx          # heroId do store + picker modal (sem key-reset)
    builder.tsx            # state via useAppStore; UI desktop/mobile (split pendente)
    hero-picker.tsx, hero-sheet.tsx, item-browser.tsx
    stat-panel.tsx, toolbar.tsx, game-icon.tsx
  stores/app-store.ts      # zustand global + persist (ver "Client store")
lib/
  types.ts                 # CONTRATO TS: Item/Hero/StatKey ↔ JSON ↔ UI
  schemas.ts               # CONTRATO runtime (zod): espelha types.ts campo a campo
  calc.ts                  # engine pura: heroStatsAtLevel/buildStats/diffStats/previewSwap
  stat-meta.ts             # labels PT-BR, ordem, formato, cores de categoria
  item-effects.ts          # exceções numéricas incondicionais (Doom, Sunder, boots)
  data-loader.ts           # ~35 linhas: getters sobre ./data/generated (não edite o gerado)
  data/generated.ts        # GERADO por tools/gen-loader.ts (116 imports + HEROES)
tools/
  gen-loader.ts            # pnpm gen-loader: gera lib/data/generated.ts do snapshot
data/patches/
  manifest.json            # { latest, patches[] }
  <YYYY-MM-DD>/items.json, items.raw.json, items.diff.json
  <YYYY-MM-DD>/heroes/*.json, heroes.diff.json, heroes.raw.json
scripts/
  fetch-items-from-camp.mjs, fetch-heroes-from-camp.mjs
  parse-md-to-json.mjs, weekly-items-refresh.sh
public/items/<campId>.png  # 107 ícones — `Item.icon = /items/<campId>.png`
public/heroes/<id>.jpg
docs/, .opencode/skills/   # conhecimento do agente (este ciclo)
```

## Import rules

```
app/components/*  →  lib/calc, lib/stat-meta, lib/types, lib/data-loader, app/stores/app-store
app/stores/*       →  lib/schemas (validação do persist), lib/types (tipos)
lib/schemas        →  zod (runtime); espelha lib/types — trocar junto (ver AGENTS.md)
lib/calc          →  lib/item-effects, lib/types, lib/stat-meta (STAT_ORDER)
lib/data-loader   →  ./data/generated (gerado) + ./types
tools/gen-loader  →  nada de lib/ ou app/ (lê data/patches via fs, roda em node puro)
scripts/*         →  nada de lib/ ou app/ (independentes, rodam em node puro)
```

Engine (`calc.ts`, `item-effects.ts`) é pura: sem `fs`, sem React, sem `fetch`.
`stat-meta.ts` é display-only: nunca entra na conta.

## Target (Fases 2–4, ainda NÃO executado)

```
app/features/builder/       # extração de app/components/ (hooks + UI)
lib/domain/                 # types.ts + stat-meta.ts
lib/engine/                 # calc.ts + item-effects.ts
lib/data/                   # loader.ts + patches.ts (gerado, não manual)
tools/                      # scripts/*.mjs migrados p/ TS tipado
```

## Client store (zustand + persist)

`app/stores/app-store.ts` — store global único (`useAppStore`, `STORAGE_KEY = "hok-build-v1"`).
Persiste: `heroId`, `slotsByHero`, `levelByHero`, `buildsByHero` (nomeadas, sem UI própria por enquanto).
Efêmero: `selectedSlot`, `candidate/previewId`, `history` (undo ≤20), `mobileTab`, `sheetOpen`, `pickerOpen`, `buildSel`.
Reidratação validada por `PersistedStateSchema` (`merge` + `migrate`): storage corrompido/versão desconhecida → descarta e segue com defaults.
Seed: server props via `ensureHero` (só preenche chave ausente — persistido vence, sem flash).
Catálogo manda: id persistido fora do snapshot cai para `initialHeroId` (AppShell).

## Débito conhecido

1. ~~`lib/data-loader.ts`: 123 imports manuais~~ — **resolvido Fase 2**: `tools/gen-loader.ts` gera `lib/data/generated.ts`; `--rewire` chama o gerador (ver ADR-002).
2. `app/components/builder.tsx`: layout desktop/mobile + render helpers misturados (state já extraído p/ store). Plano restante: extrair `renderSlots/renderMiniStats` → componentes.
3. `scripts/*.mjs`: parse + normalize + snapshot + manifest no mesmo arquivo, sem tipos.
4. Snapshots duplicam `heroes/*.json` entre patches (herança por cópia).

## Onde colocar código novo

| Preciso... | Colocar em |
|---|---|
| Novo cálculo de atributo | `lib/calc.ts` + exceção em `lib/item-effects.ts` (com `note`) |
| Novo label/formato | `lib/stat-meta.ts` |
| Novo campo Item/Hero | `lib/types.ts` + `lib/schemas.ts` + fetcher + `docs/data-pipeline.md` |
| Novo estado client (persistido ou não) | `app/stores/app-store.ts` (persist só via `partialize`; validar no schema) |
| Novo componente UI | `app/components/` (nomear `*-panel`, `*-browser`, `*-sheet`) |
| Novo fetcher | `scripts/` + documentar flags em `.opencode/skills/hok-data/SKILL.md` |
| Regra de domínio HoK | `docs/domain/hok-rules.md` (nunca só em comentário) |
