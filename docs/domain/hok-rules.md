# HoK rules — regras de domínio para builds

> Curadoria acionável de `items-db.md` + `lib/item-effects.ts`. Quando esta regra mudar, atualizar fetcher/engine junto.

## Conflitos de passivas (mesmo nome não acumula)

| Passiva | Itens | Efeito |
|---|---|---|
| `Imperil` (corta-cura) | Mortal Punisher, Blazing Cape, Venomous Staff | −35% cura/roubo de vida inimigo por 2,5s |
| `Sunder` (perf. física) | Starbreaker (+30%), Daybreaker's Virtue (+15%, dobrada p/ atiradores) | Só um conta |
| `Swift` (botas) | todas as Boots | +50 mov. flat (Deftness +70); engine soma via `ITEM_EFFECTS` |
| `Moonguard` (stasis) | Splendor (ativa), Enigma - Moon Goddess | imunidade 1,5s, impede mover/atacar/castar (Recarga 75s) |
| Ativas em geral | Splendor, Amble-Winter, Spikemail, Blood Rage, Haste-Sunpool… | 1 botão de ativa por vez — nunca sugerir 2 ativas juntas |

Suporte (Crimson Shadow / Guardian, variantes Radiance/Redemption/Starspring): ativas compartilham recarga com o time todo + troca rápida entre si (300s).

## Exceções numéricas da engine (`lib/item-effects.ts`)

Incondicionais que moram no texto e o parser não extrai — entram na conta:

- `savants-wrath` (Doom): `magicAttack ×1.3` **após** a soma.
- `void-staff` (Devastation): `+45 magicPiercePct`.
- `starbreaker`: `+30 physPiercePct` · `daybreakers-virtue`: `+15` (valor base; dobra p/ atiradores fora da conta).
- `eternity-blade` (Relentless): `+20 critDamagePct` base.
- Botas Dexterity/Fortitude/Resistance/Arcane/Tranquility: `+50 moveSpeedFlat` · Deftness: `+70`.

Condicionais (stack, HP perdido, alvo, doubles p/ ranged) ficam **fora** da conta → badge na UI via `note`.

## Heurísticas de build (do tutorial oficial)

- 6 slots; 2–3 itens core de dano/defesa + resto situacional.
- Muita armadura/resistência → perfuração (Axe of Torment, Starbreaker, Daybreaker's Virtue / Void Staff, Breakthrough Robe, Twilight Stream).
- Burst inimigo → Splendor / Enigma-Moon Goddess.
- Cura inimiga → Imperil (Mortal Punisher, Blazing Cape, Venomous Staff).
- Dano físico predominante → defesa física; mágico → defesa mágica.
- Selva (Giant's Grip, Rapacious Bite, Runeblade): só com Smite (`requiresSmite`); −25% dano a tropas antes dos 10min.

## Categorias (filtros do site = `ItemCategory`)

attack (32) · magic (25) · defense (26) · movement/botas (7, base Lightfoot Shoes) · jungle (7) · support/Type 7 (10 — o site exibe o rótulo bruto "Type 7").

Total: **107 itens**.
