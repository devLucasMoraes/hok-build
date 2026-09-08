# hok-data skill — pipeline de dados do HoK Build

> Como capturar, auditar e publicar snapshots de itens/heróis.

## Quando usar

- Atualizar `data/patches/` para um patch novo; investigar diff de itens; regredir `lib/data-loader.ts` após fetch.

## Comandos

```bash
pnpm fetch-items -- --patch=YYYY-MM-DD --season=S14 --dry-run   # audita sem escrever
pnpm fetch-items -- --patch=YYYY-MM-DD --season=S14 --rewire     # publica + regenera loader
pnpm fetch-heroes -- --patch=YYYY-MM-DD --dry-run
pnpm gen-loader -- --check   # verifica se lib/data/generated.ts está atualizado
```

Flags: `--source=auto|camp|hokstats` (auto tenta camp direto com `--camp-param`, cai p/ espelho), `--langs`, `--images`, `--delay-ms`, `--limit=N` (amostra), `--dry-run`, `--rewire`.

## Contrato de saída

- `data/patches/<PATCH>/items.json` (`Item[]` — o que o app lê), `items.raw.json` (auditoria EN/PT), `items.diff.json` (`{vs, added, removed, changed}`); mesmo trio p/ heroes.
- Heróis herdados por cópia do patch anterior em fetch só-de-itens.
- `manifest.json`: adiciona `{season, patch, date, notes}`, move `latest`.
- Ícones → `public/items/<campId>.png`; `Item.icon = /items/<campId>.png`.

## Regras

1. Nunca edite `items.json` à mão — regenere via script.
2. Sempre confira `items.diff.json` + `git diff lib/data/generated.ts` após `--rewire` (`--rewire` chama `tools/gen-loader.ts`; o gerado nunca é editado à mão).
3. `Item.stats` é a única verdade numérica; texto de habilidade → `abilities[]`, nunca stat inventado.
4. `buildsFrom` guarda slugs; `buildsInto` é derivado (`getBuildsInto`). Componente com campId não resolvido = warning, não erro fatal.
5. Mudou `lib/types.ts`? Atualizar `lib/schemas.ts` + fetcher + loader + este SKILL juntos.
6. Snapshot inválido (campo fora do schema) aborta o gen-loader com exit 1 — corrigir na fonte (fetcher), nunca no JSON.

Referência: `docs/data-pipeline.md`. Parse fino: cabeçalho de `scripts/fetch-items-from-camp.mjs`.
