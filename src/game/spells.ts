/** 13 magias definitivas (aprendidas e aprimoradas com a bruxa) e 13 combos de ataque físico */
export type SpellKind = "raise" | "bulwark" | "nova2" | "homing" | "fan" | "chain" | "nova" | "dash" | "heal" | "ward" | "haste" | "drain" | "quake" | "meteor" | "screen" | "ice";
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

/** classe de cada herói e seu kit de 4 poderes (cada classe luta de um jeito: dreno, cadeia, cone, servos, meteoros, escudo…) */
export const HERO_CLASS: Record<string, string> = { ivo: "Guerreiro", lena: "Assassina", osso: "Necromante", syl: "Caçadora", tito: "Mago de Fogo", mari: "Bruxa da Maré", pia: "Guardião", lumen: "Tecnomante", kael: "Paladino", nyx: "Ceifadora", brann: "Xamã do Gelo", skadi: "Valquíria" };
const K = (id: number, name: string, color: string, kind: SpellKind, cd: number, power: number, tag: string, icon: string, text: string): SpellDef & { icon: string } => ({ id, name, color, kind, cd, power, price: 0, tag, text, icon });
export const HERO_KITS: Record<string, (SpellDef & { icon: string })[]> = {
  ivo: [K(100, "Lança de Prata", "#d8dce8", "homing", 1.4, 3.6, "Unitário", "🗡️", "Lança pesada que persegue o alvo."), K(101, "Garra do Lobo", "#e0b15a", "dash", 2.2, 3.4, "Investida", "🐺", "Investida que rasga um alvo."), K(102, "Pisão da Alcateia", "#e0803a", "quake", 3.6, 3.4, "Área física", "💥", "O chão racha: dano e empurrão forte em volta."), K(103, "Noite de Lua Cheia", "#f4e4c8", "screen", 18, 8.5, "Super área", "🌕", "Uivo que fere todos os monstros visíveis.")],
  lena: [K(110, "Facas de Tinta", "#ff3a4a", "fan", 1.6, 1.7, "Cone", "🔪", "Cinco lâminas em leque."), K(111, "Mordida Sombria", "#c4373a", "dash", 2.0, 4.6, "Execução", "🦇", "Salto em sombra com golpe fatal."), K(112, "Sede de Sangue", "#b06ad0", "drain", 4.0, 3.0, "Dreno", "🩸", "Fere em volta e rouba vida."), K(113, "Eclipse Carmesim", "#ff2a5a", "meteor", 16, 7.5, "Execução em área", "☠️", "Cinco golpes de execução nos mais próximos.")],
  osso: [K(120, "Osso Teleguiado", "#f1ead8", "homing", 1.4, 3.4, "Unitário", "🦴", "Osso que gira atrás do alvo."), K(121, "Dreno de Alma", "#9fd4d8", "drain", 3.2, 3.2, "Dreno", "👻", "Puxa a alma de quem está perto."), K(122, "Erguer Servo", "#c8c2b4", "raise", 14, 0, "Invocação", "⚰️", "Ergue um servo do último monstro que caiu."), K(123, "Grande Final", "#9fd4d8", "screen", 18, 8.5, "Super área", "💀", "Aplausos fatais em todos os visíveis.")],
  syl: [K(130, "Flecha Caçadora", "#d2e39a", "homing", 1.2, 3.2, "Unitário", "🏹", "Flecha que curva até o alvo."), K(131, "Rolamento Cortante", "#9bd46a", "dash", 1.8, 3.0, "Investida", "🍃", "Rolamento que atravessa e fere."), K(132, "Salva de Flechas", "#6aaa48", "fan", 3.0, 2.0, "Cone", "🎯", "Leque largo de flechas."), K(133, "Floresta Viva", "#d2ff7a", "meteor", 16, 7.0, "Super área", "🌲", "Raízes e luz atingem os mais próximos.")],
  tito: [K(140, "Cometa de Brasa", "#ff9a3a", "homing", 1.6, 4.4, "Unitário", "☄️", "Bola de fogo que persegue."), K(141, "Cuspe de Dragão", "#ff5a1a", "dash", 2.4, 3.4, "Investida", "🐉", "Avanço em chamas."), K(142, "Anel de Fogo", "#ffb04a", "nova2", 3.6, 3.2, "Área", "🔥", "Círculo de chamas em volta."), K(143, "Grande Incêndio", "#ff3a1a", "meteor", 17, 8.0, "Super área", "🌋", "Chuva de meteoros nos mais próximos.")],
  mari: [K(150, "Bolha Caçadora", "#8fe4ff", "homing", 1.4, 3.2, "Unitário", "🫧", "Bolha que segue o alvo."), K(151, "Maldição da Maré", "#4ac0e0", "ice", 2.6, 2.6, "Área", "🌊", "Onda gélida em volta."), K(152, "Dreno Salgado", "#5ad0e8", "drain", 3.8, 3.0, "Dreno", "🐚", "Suga vida do mar em volta."), K(153, "Maremoto", "#2a9ad0", "screen", 18, 8.0, "Super área", "🌀", "Parede de água em tela inteira.")],
  pia: [K(160, "Estilhaço Guiado", "#c0c8d4", "homing", 1.5, 3.0, "Unitário", "🪨", "Pedra afiada que persegue."), K(161, "Mergulho de Gárgula", "#9aa4b0", "dash", 2.4, 3.8, "Investida", "🦅", "Investida pesada que esmaga."), K(162, "Pele de Pedra", "#8a929c", "bulwark", 5.0, 3.0, "Defesa", "🛡️", "Abalo em volta e escudo de pedra."), K(163, "Desabamento", "#d0d6e0", "screen", 18, 8.0, "Super área", "⛰️", "Chuva de pedras em tela inteira.")],
  kael: [K(180, "Lança de Luz", "#ffe48a", "homing", 1.4, 3.4, "Unitário", "✨", "Lança de luz que persegue o alvo."), K(181, "Investida Sagrada", "#fff0b0", "dash", 2.2, 3.4, "Investida", "🛡️", "Avanço luminoso que fere."), K(182, "Aura Curativa", "#aaffc0", "heal", 9, 3.0, "Cura", "💚", "Cura o herói e dá escudo."), K(183, "Julgamento", "#ffffff", "screen", 18, 8.5, "Super área", "☀️", "Luz divina em todos os visíveis.")],
  nyx: [K(190, "Foice Sombria", "#b488ff", "fan", 1.5, 1.8, "Cone", "🌙", "Arco de lâminas de sombra."), K(191, "Passo Fantasma", "#8a5ad0", "dash", 1.8, 4.4, "Execução", "👻", "Salto de sombra com golpe fatal."), K(192, "Colheita de Almas", "#d8b8ff", "drain", 3.6, 3.2, "Dreno", "🕯️", "Colhe vida de quem está perto."), K(193, "Ceifa Final", "#ff5aa0", "meteor", 16, 7.8, "Execução em área", "💀", "Cinco ceifadas nos mais próximos.")],
  brann: [K(200, "Estaca de Gelo", "#8fe8ff", "homing", 1.4, 3.4, "Unitário", "🧊", "Estaca que persegue o alvo."), K(201, "Nevasca", "#d8f4ff", "ice", 2.8, 2.8, "Área", "❄️", "Frio cortante em volta."), K(202, "Armadura de Geada", "#b8e8ff", "ward", 8, 3.0, "Defesa", "🥶", "Casca de gelo que protege."), K(203, "Era Glacial", "#ffffff", "screen", 18, 8.5, "Super área", "🏔️", "Gelo em toda a tela.")],
  skadi: [K(210, "Machado Voador", "#ff9a5a", "homing", 1.4, 3.8, "Unitário", "🪓", "Machado que gira atrás do alvo."), K(211, "Salto Titã", "#e07a3a", "quake", 3.4, 3.6, "Área física", "💥", "Aterrissagem que racha o chão."), K(212, "Grito de Guerra", "#ffd07a", "haste", 10, 3.0, "Fúria", "📣", "Velocidade e dano por alguns segundos."), K(213, "Ragnarök", "#ff4a1a", "meteor", 17, 8.0, "Super área", "🔥", "Chuva de fogo nos mais próximos.")],
  lumen: [K(170, "Faísca Encadeada", "#ffee6a", "chain", 1.6, 2.4, "Cadeia", "⚡", "Raio que salta entre monstros."), K(171, "Curto-Circuito", "#ffd02a", "dash", 2.0, 3.4, "Investida", "🔌", "Descarga em linha."), K(172, "Pulso Elétrico", "#a0e0ff", "nova2", 3.0, 2.8, "Área", "🔋", "Pulso em volta com raios."), K(173, "Apagão", "#ffffff", "screen", 18, 8.5, "Super área", "💡", "A luz some e volta num raio em todos.")],
};
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
