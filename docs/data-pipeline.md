# Data pipeline — camp → snapshot → loader

> Como os dados chegam ao app. Nunca edite `data/patches/*/items.json` à mão — regenere.

## Fontes

1. **Primária (oficial):** `POST https://api-camp.honorofkings.com`
   - `/api/herowiki/getallherobriefinfo` (lista) → `/api/herowiki/getherodataall {heroId}` (detalhe, inclui `SuitStrategy.equips[]`).
   - Exige headers `specialencodeparam` + `traceparent` do `camp-security`. Sem token → 4xx → cai para o espelho.
2. **Espelho (fallback real):** `hokstats.gg/items[/<campId>/]` — declara fonte `camp.honorofkings.com`, espelha IDs 1:1 (`/items/<campId>/`, `/items/<campId>.png`). Parseável sem token, EN + PT-BR.

Detalhes de mapeamento (equipType→categoria, rótulos EN/PT→StatKey, regex de parse): ver cabeçalho de `scripts/fetch-items-from-camp.mjs`.

## Scripts

```bash
pnpm fetch-items  # node scripts/fetch-items-from-camp.mjs
pnpm fetch-heroes # node scripts/fetch-heroes-from-camp.mjs
# flags: --source=auto|camp|hokstats --patch=YYYY-MM-DD --season=S14
#        --langs=en,pt-BR --images --delay-ms=200 --limit=5
#        --dry-run --camp-param=XXX --rewire
```

- `--dry-run`: parseia e imprime diff sem escrever.
- `--rewire`: chama `tools/gen-loader.ts --patch=<PATCH>` para regenerar
  `lib/data/generated.ts` (obrigatório p/ o app consumir dados novos).
- `pnpm gen-loader [--patch=...] [--check]`: regenera (ou só verifica) o
  gerado a partir de `manifest.latest`. Requer Node ≥22 (type-stripping do `.ts`).
- `scripts/weekly-items-refresh.sh`: wrapper do refresh semanal.
- `scripts/parse-md-to-json.mjs`: legado da conversão dos MDs raiz → JSON.

## Snapshot layout

```
data/patches/manifest.json          # { latest: "2026-09-07", patches: [{season,patch,date,notes}] }
data/patches/<PATCH>/
  items.json                        # Item[] normalizado (o que o app lê)
  items.raw.json                    # { source, patch, items: parsedEn/parsedPt } (auditoria)
  items.diff.json                   # { vs, added[], removed[], changed[] }
  heroes/<slug>.json                # Hero[] (116 arquivos em 2026-09-07)
  heroes.raw.json / heroes.diff.json
public/items/<campId>.png           # ícones baixados (--images)
```

Heróis são **herdados por cópia** do patch anterior quando o fetch é só de itens (`copyFileSync` se destino ausente). `latest` em 2026-09-07: 107 itens, S14.

## Loader (`lib/data-loader.ts` + `lib/data/generated.ts`)

`lib/data/generated.ts` é **gerado** por `tools/gen-loader.ts` (116 imports de
`heroes/*.json` + `items.json` + `manifest.json`, exportando `PATCH/MANIFEST/ITEMS/HEROES`).
O gerador valida tudo com os schemas zod de `lib/schemas.ts` antes de escrever —
snapshot inválido aborta com exit 1 e o campo problemático (gate de runtime;
`pnpm build` segue o gate de tipos).
`lib/data-loader.ts` (~35 linhas) só expõe `getManifest/getPatch/getItems/getItemMap/getHero(id)/getHeroes/getBuildsInto` sobre o gerado.
`app/page.tsx` chama `getHeroes/getItems/getManifest` no server e injeta em `AppShell`.

Contrato: `lib/types.ts` (`Item.stats: StatValue[]` é a única verdade numérica; `abilities` é display + `ITEM_EFFECTS`; `buildsFrom: string[]` slugs, `buildsInto` derivado; `campId` espelha hokstats).

## Histórico (débito resolvido na Fase 2)

`--rewire` era replace de string do patch (`fetch-items`) ou reescrita integral
do loader (`fetch-heroes`) — ambos frágeis. Agora os dois chamam o gerador.
