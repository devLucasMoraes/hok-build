# hok-engine skill — cálculo de builds

> Como a matemática de atributos funciona e o que pode entrar nela.

## Quando usar

- Alterar cálculo de stats, adicionar exceção de item, exibir atributo novo, sugerir builds.

## Núcleo (`lib/calc.ts`, puro — sem `fs`/React)

```ts
heroStatsAtLevel(hero, level) // base + growth.perLevel × (L − 1), clamp 1..maxLevel
buildStats(heroBase, items)   // 1) soma Item.stats + ITEM_EFFECTS.grants
                              // 2) aplica ITEM_EFFECTS.multiply (ex: Doom ×1.3)
                              // 3) round 1 casa
diffStats(before, after)      // STAT_ORDER, filtra zerados
previewSwap(base, equipped, slot, candidate) // { before, after } p/ ghost preview
buildCost(items)              // soma cost
```

## O que entra na conta

1. `Item.stats: StatValue[]` (flat ou % — número puro).
2. `ITEM_EFFECTS` (`lib/item-effects.ts`): só incondicionais — Doom, Devastation +45, Sunder +30/+15, Relentless +20, botas Swift +50/+70.

## O que fica FORA (badge na UI via `note`)

Stacks, condicionais de HP/alvo, dobros p/ atiradores/ranged, ativas, auras de suporte. Ver `docs/domain/hok-rules.md` (Imperil/Sunder/Swift/Moonguard, recarga compartilhada de suporte, `requiresSmite`).

## Regras

1. Novo número na conta? Só via `stats` ou `ITEM_EFFECTS` com `note` explicando.
2. Novo label/formato/ordem → `lib/stat-meta.ts` (display-only, nunca na conta).
3. Novo campo de dado → `lib/types.ts` + loader + fetcher + `docs/data-pipeline.md` juntos.
4. `pnpm build` é o typecheck — rodar após qualquer mudança na engine.
