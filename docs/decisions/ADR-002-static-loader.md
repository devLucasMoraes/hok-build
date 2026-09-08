# ADR-002 — Loader estático gerado

Data: 2026-09-08 · Status: implementado (Fase 2)

## Contexto

`lib/data-loader.ts` tem 123 imports manuais de `heroes/*.json`; `fetch-* --rewire` atualiza o patch por replace de string — quebra fácil e não escala.

## Decisão

`tools/gen-loader.ts` varre `data/patches/<latest>/heroes/*.json` e gera `lib/data/generated.ts` (exports `PATCH/MANIFEST/ITEMS/HEROES`); `lib/data-loader.ts` tem ~35 linhas sem imports manuais; `--rewire` dos dois fetchers chama o gerador; `scripts/weekly-items-refresh.sh` versiona o gerado.

## Consequências

- Publicar patch = fetch com `--rewire` (determinístico, sem replace de string).
- Gerado é verificável: `pnpm gen-loader -- --check` (exit 1 se obsoleto).
- Requer Node ≥22 (type-stripping do `.ts`, sem deps extras).
