# ADR-003 — Engine pura, condicional vira badge

Data: 2026-09-08 · Status: aceito

## Contexto

Textos de habilidade misturam bônus incondicionais (ex: Doom +30%) com condicionais (stacks, HP, alvo, ativas) que o parser não extrai sozinho.

## Decisão

`lib/calc.ts` + `lib/item-effects.ts` são puros (sem `fs`/React). Só `Item.stats` + `ITEM_EFFECTS.grants/multiply` entram na conta; todo condicional aparece só como badge/`note` na UI.

## Consequências

- Números da UI sempre rastreáveis até `stats` ou `ITEM_EFFECTS`.
- Dobros situacionais (ex: Sunder p/ atiradores) usam o valor base — documentado em `docs/domain/hok-rules.md`.
