# ADR-001 — Snapshot por patch (não live API)

Data: 2026-09-08 · Status: aceito

## Contexto

Dados vêm de `camp.honorofkings.com` (com token) ou do espelho `hokstats.gg` (sem token), ambos instáveis como dependência de runtime.

## Decisão

Versionar tudo em `data/patches/<YYYY-MM-DD>/` + `manifest.json` com `latest`; o app importa o snapshot estático.

## Consequências

- Build reprodutível e diff auditável (`*.diff.json`, `*.raw.json`).
- Heróis duplicados entre patches (herança por cópia) — custo aceito por simplicidade.
- Publicar patch novo exige `--rewire` do loader (frágil; ver ADR-002).
