/** 13 magias definitivas (aprendidas e aprimoradas com a bruxa) e 13 combos de ataque físico */
export type SpellKind = "homing" | "fan" | "chain" | "nova" | "dash" | "heal" | "ward" | "haste" | "drain" | "quake" | "meteor" | "screen" | "ice";
export type SpellDef = { id: number; name: string; color: string; kind: SpellKind; cd: number; power: number; price: number; text: string; tag: string };

export const SPELLS: SpellDef[] = [
  { id: 0, name: "Agulha de Tinta", color: "#8f7bff", kind: "homing", cd: 1.2, power: 3.2, price: 90, tag: "Unitário", text: "Agulha negra que persegue o alvo mais próximo." },
  { id: 1, name: "Leque de Navalhas", color: "#e8e8f0", kind: "fan", cd: 2.0, power: 1.5, price: 140, tag: "Cone", text: "Cinco lâminas em leque à frente." },
  { id: 2, name: "Corrente Violeta", color: "#b36aff", kind: "chain", cd: 3.0, power: 2.4, price: 220, tag: "Cadeia", text: "Raio que salta entre até 5 monstros." },
  { id: 3, name: "Sopro Glacial", color: "#a8e6ff", kind: "ice", cd: 3.4, power: 2.0, price: 260, tag: "Área", text: "Rajada gelada em volta; empurra e fere." },
  { id: 4, name: "Brasa Rastejante", color: "#ff7a2a", kind: "homing", cd: 2.2, power: 5.2, price: 320, tag: "Unitário", text: "Bola de fogo pesada que caça o inimigo." },
  { id: 5, name: "Salto Sombrio", color: "#6a5a8a", kind: "dash", cd: 2.6, power: 3.6, price: 380, tag: "Investida", text: "Atravessa o espaço em sombra e corta um alvo." },
  { id: 6, name: "Cura do Sino", color: "#7affb0", kind: "heal", cd: 14, power: 3, price: 450, tag: "Cura", text: "Um badalar que cura corações." },
  { id: 7, name: "Véu de Cinzas", color: "#c0b8b0", kind: "ward", cd: 20, power: 2, price: 520, tag: "Defesa", text: "Imunidade breve; cinzas desviam golpes." },
  { id: 8, name: "Pressa do Corvo", color: "#4a4a6a", kind: "haste", cd: 22, power: 8, price: 600, tag: "Impulso", text: "Velocidade e cadência aumentadas." },
  { id: 9, name: "Sede de Sangue", color: "#d01a3a", kind: "drain", cd: 6, power: 3.4, price: 700, tag: "Dreno", text: "Fere em volta e rouba vida do que atingir." },
  { id: 10, name: "Tremor Antigo", color: "#a08a60", kind: "quake", cd: 7, power: 4.4, price: 820, tag: "Área", text: "O chão racha: dano grande e empurrão forte." },
  { id: 11, name: "Chuva de Meteoros", color: "#ff5a1a", kind: "meteor", cd: 16, power: 6.5, price: 1000, tag: "Super área", text: "Meteoros caem sobre até 5 monstros." },
  { id: 12, name: "Sentença Final", color: "#ffffff", kind: "screen", cd: 28, power: 10, price: 1400, tag: "Super área", text: "Dano enorme em todos os monstros visíveis." },
];
export const SPELL_MAX_LV = 5;
export const spellUpCost = (sp: SpellDef, lv: number) => Math.round(sp.price * 0.7 * lv);

export type ComboDef = { name: string; dmg: number; reach: number; hits: number; knock: number };
export const COMBOS: ComboDef[] = [
  { name: "Golpe Seco", dmg: 1.0, reach: 1.0, hits: 0, knock: 1 },
  { name: "Revés", dmg: 1.1, reach: 1.05, hits: 0, knock: 1.1 },
  { name: "Estocada", dmg: 1.25, reach: 1.2, hits: 0, knock: 1 },
  { name: "Giro de Palco", dmg: 1.3, reach: 1.1, hits: 2, knock: 1.2 },
  { name: "Corte Cruzado", dmg: 1.45, reach: 1.15, hits: 1, knock: 1.1 },
  { name: "Martelada", dmg: 1.7, reach: 1.0, hits: 0, knock: 2 },
  { name: "Dança das Lâminas", dmg: 1.5, reach: 1.2, hits: 3, knock: 1.2 },
  { name: "Arranque", dmg: 1.7, reach: 1.4, hits: 1, knock: 1.4 },
  { name: "Tempestade de Aço", dmg: 1.9, reach: 1.3, hits: 4, knock: 1.3 },
  { name: "Quebra-Escudo", dmg: 2.3, reach: 1.1, hits: 1, knock: 1.8 },
  { name: "Vendaval Rubro", dmg: 2.2, reach: 1.5, hits: 5, knock: 1.5 },
  { name: "Golpe do Carrasco", dmg: 3.0, reach: 1.2, hits: 2, knock: 2.2 },
  { name: "Final de Contrato", dmg: 3.8, reach: 1.6, hits: 8, knock: 2.5 },
];
/** quantos combos o jogador conhece: 3 no início, +1 a cada 3 níveis (todos no nível 31) */
export const combosKnown = (level: number) => Math.min(COMBOS.length, 3 + Math.floor((level - 1) / 3));
