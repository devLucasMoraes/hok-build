<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# hok-build — Next.js 16 + React 19 + Tailwind v4 (pnpm)

- Package manager is pnpm (`packageManager: pnpm@10.26.2`). Use `pnpm dev|build|start`, `pnpm dlx ...`. Don't use npm/yarn.
- Commands: `pnpm dev` (localhost:3000), `pnpm build` then `pnpm start` to verify prod, `pnpm lint`. No test/typecheck/format scripts — `pnpm build` (tsc + routes) is the typecheck.
- App Router only: entrypoints `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (`@import "tailwindcss"` v4 syntax). Path alias `@/*` maps to repo root (`./`), not `src/`.
- Next 16 breaking changes: read `node_modules/next/dist/docs/` before writing App Router code; e.g. `LayoutProps<"/">` typing in `layout.tsx` is intentional. Heed deprecations.
- `next-env.d.ts` is generated — never edit; `next.config.ts` is intentionally empty.
