<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# hok-build — Next.js 16 + React 19 + Tailwind v4 (pnpm)

- Runtime deps: `zustand` (client store + localStorage persist), `zod` (runtime schemas em `lib/schemas.ts`).

- Package manager is pnpm (`packageManager: pnpm@10.26.2`). Use `pnpm dev|build|start`, `pnpm dlx ...`. Don't use npm/yarn.
- Commands: `pnpm dev` (localhost:3000), `pnpm build` then `pnpm start` to verify prod, `pnpm lint`. No test/typecheck/format scripts — `pnpm build` (tsc + routes) is the typecheck.
- App Router only: entrypoints `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (`@import "tailwindcss"` v4 syntax). Path alias `@/*` maps to repo root (`./`), not `src/`.
- Next 16 breaking changes: read `node_modules/next/dist/docs/` before writing App Router code; e.g. `LayoutProps<"/">` typing in `layout.tsx` is intentional. Heed deprecations.
- `next-env.d.ts` is generated — never edit; `next.config.ts` is intentionally empty.

## Knowledge index (start here)

- `docs/architecture.md` — folder map, import rules, where new code goes.
- `docs/data-pipeline.md` — camp → hokstats mirror → `data/patches/<date>/` → `lib/data-loader.ts`.
- `docs/domain/hok-rules.md` — item conflict rules (Imperil/Sunder/Swift/Moonguard/Smite) + build heuristics.
- `docs/domain/items-db.md` — full 107-item reference (moved from root).
- `docs/domain/heroes-angela.md` — worked hero example (moved from root).
- `docs/decisions/` — ADRs (snapshot-per-patch, static loader, engine purity, client store).
- `data/patches/README.md` — manifest + snapshot layout.
- Skills: `.opencode/skills/hok-data/SKILL.md`, `.opencode/skills/hok-engine/SKILL.md`.

## Working agreements

- Docs-first for domain knowledge; code comments stay concise.
- `lib/types.ts` is the TS contract between JSON snapshots and UI; `lib/schemas.ts` is the runtime mirror (zod) — change types + schemas + loader + fetcher together.
- Client state lives in `app/stores/app-store.ts` (persisted: heroId/slots/level/named builds; ephemeral: selection/preview/history/UI). Never `useState` for cross-hero working state.
- Engine (`lib/calc.ts`, `lib/item-effects.ts`) is pure: no `fs`, no React. Only `Item.stats` + `ITEM_EFFECTS` enter the math; conditionals stay as UI badges.
- Don't hand-edit `data/patches/*/items.json` or `lib/data/generated.ts` — regenerate via `pnpm gen-loader` / fetchers with `--rewire` (see `docs/data-pipeline.md`).
