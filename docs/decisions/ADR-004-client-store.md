# ADR-004 — Client store global (zustand + persist)

Data: 2026-09-08 · Status: aceito

## Contexto

Working state (slots, level, history, preview) vivia em `useState` local no `Builder`, resetado por `key={hero.id}` a cada troca de herói — sem persistência. Snapshot JSONs não tinham validação runtime (só tipos TS).

## Decisão

- Store único `app/stores/app-store.ts` (zustand + `persist` em `localStorage`, chave `hok-build-v1`, `version: 1`): persiste `heroId/slotsByHero/levelByHero/buildsByHero`; resto é efêmero (`partialize`).
- Reidratação validada por `PersistedStateSchema` (`merge` + `migrate`): corrompido → descarta, nunca crash.
- Schemas zod em `lib/schemas.ts` espelham `lib/types.ts`: validam snapshots no `tools/gen-loader.ts` (exit 1) e o persist no store.
- Seed a partir das props do server via `ensureHero` (só preenche ausente); catálogo manda sobre id persistido inexistente.

## Consequências

- Trocar de herói preserva a working build de cada um; reload preserva tudo persistido.
- `types.ts` ↔ `schemas.ts` precisam evoluir juntos (acordo no `AGENTS.md`); drift é pego no gen-loader.
- Requer Node ≥22 p/ rodar o gen-loader (type-stripping); `zod` entra no bundle client (~12kb) — validação de storage justifica.
