import type { StatKey, StatValue } from "./types";

/**
 * Efeitos numéricos incondicionais que moram no texto da habilidade
 * (não na coluna "Atributos Básicos") e portanto o parser não extrai
 * sozinho. Tudo que é condicional / por acúmulo / com range / ativo
 * fica FORA da conta e aparece só como badge na UI — ver campo `note`.
 *
 * grants: somado ao total. multiply: aplicado após a soma (ratio ex: 1.3).
 */
export interface ItemEffect {
  grants?: StatValue[];
  multiply?: { stat: StatKey; ratio: number }[];
  note?: string;
}

export const ITEM_EFFECTS: Record<string, ItemEffect> = {
  // Doom: +30% Ataque Mágico (multiplicativo sobre o total)
  "savants-wrath": {
    multiply: [{ stat: "magicAttack", ratio: 1.3 }],
    note: "Passiva Doom: +30% Atq. Mágico aplicada no total",
  },
  // Devastation: +45% Perfuração Mágica incondicional
  "void-staff": { grants: [{ key: "magicPiercePct", value: 45 }] },
  // Sunder: +30% Perfuração Física incondicional
  starbreaker: { grants: [{ key: "physPiercePct", value: 30 }] },
  // Sunder: +15% Perfuração Física (dobra p/ atiradores — usamos o valor base)
  "daybreakers-virtue": { grants: [{ key: "physPiercePct", value: 15 }] },
  // Relentless: +20% Dano Crítico base
  "eternity-blade": { grants: [{ key: "critDamagePct", value: 20 }] },
  // Botas: bônus flat de Vel. Movimento descrito no texto "Swift"
  "boots-of-dexterity": { grants: [{ key: "moveSpeedFlat", value: 50 }] },
  "boots-of-fortitude": { grants: [{ key: "moveSpeedFlat", value: 50 }] },
  "boots-of-resistance": { grants: [{ key: "moveSpeedFlat", value: 50 }] },
  "boots-of-the-arcane": { grants: [{ key: "moveSpeedFlat", value: 50 }] },
  "boots-of-tranquility": { grants: [{ key: "moveSpeedFlat", value: 50 }] },
  "boots-of-deftness": { grants: [{ key: "moveSpeedFlat", value: 70 }] },
};
