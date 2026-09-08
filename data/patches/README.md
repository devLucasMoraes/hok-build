# data/patches — snapshots versionados por patch

`manifest.json` é o índice: `{ latest, patches: [{ season, patch, date, notes }] }`.
`latest` atual: `2026-09-07` (S14, 107 itens, 116 heróis).

## Layout por snapshot

```
<PATCH>/
  items.json          # Item[] normalizado — O QUE O APP LÊ (via lib/data-loader.ts)
  items.raw.json      # auditoria: { source, patch, items: [parsedEn, parsedPt] }
  items.diff.json     # { vs: <patch anterior>, added[], removed[], changed[] }
  heroes/<slug>.json  # um Hero por arquivo (id = slug)
  heroes.raw.json / heroes.diff.json
```

## Regras

- Nunca edite `items.json` / `heroes/*.json` à mão — regenere (`pnpm fetch-items`, `pnpm fetch-heroes`; ver `docs/data-pipeline.md`).
- Fetch só-de-itens **herda heróis por cópia** do patch anterior (só copia o ausente).
- Publicar = novo `<PATCH>/` + entrada no `manifest` + `latest` movido + `--rewire` do loader.
- Ícones em `public/items/<campId>.png` (`Item.icon`); retratos em `public/heroes/<id>.jpg`.
