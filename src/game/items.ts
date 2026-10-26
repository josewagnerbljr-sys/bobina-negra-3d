import { BAG_SIZE, EQUIP_KEYS, STAT_KEYS, type Equip, type EquipKey, type Item, type ItemSlot, type Rarity, type Stats, type StatKey } from "./types";

export type BaseDef = {
  id: string;
  name: string;
  slot: ItemSlot;
  /** blocos que o objeto ocupa na mochila */
  size: number;
  w: Partial<Stats>;
  color: string;
  glyph: string;
  heal?: number;
  buff?: "haste" | "fury" | "ward";
  text: string;
};

const SIL = "#c9d1db";
const BLK = "#2a2a34";
const RED = "#c3101e";
const PUR = "#7b2bd1";
const GLD = "#e8b72e";

export const BASES: BaseDef[] = [
  // poções e elixires
  { id: "pot", name: "Poção de Tinta", slot: "potion", size: 1, w: {}, color: "#c4373a", glyph: "♥", heal: 1, text: "Cura 1 coração. A cor é o que o contrato chama de tinta." },
  { id: "pot2", name: "Poção Grande", slot: "potion", size: 1, w: {}, color: "#e0527a", glyph: "♥", heal: 2, text: "Cura 2 corações. Gosto de vela derretida." },
  { id: "pot3", name: "Poção Gigante", slot: "potion", size: 1, w: {}, color: "#ff3a6a", glyph: "♥", heal: 4, text: "Cura 4 corações. Vem com rolha de camarote." },
  { id: "elx_haste", name: "Elixir de Pressa", slot: "potion", size: 1, w: {}, color: "#4ac0e0", glyph: "»", buff: "haste", text: "Mais velocidade e cadência por 25 segundos." },
  { id: "elx_fury", name: "Elixir de Fúria", slot: "potion", size: 1, w: {}, color: "#e08a3a", glyph: "!", buff: "fury", text: "+50% de dano por 25 segundos." },
  { id: "elx_ward", name: "Elixir de Escudo", slot: "potion", size: 1, w: {}, color: "#9aa8e0", glyph: "◇", buff: "ward", text: "Imune a dano por 8 segundos." },
  // armas
  { id: "knife", name: "Faca de Palco", slot: "weapon", size: 2, w: { dex: 2, str: 1 }, color: SIL, glyph: "†", text: "Curta e ágil. Golpe rápido, alcance pequeno." },
  { id: "claws", name: "Garras de Camarim", slot: "weapon", size: 2, w: { dex: 3, str: 1 }, color: "#b8c0cc", glyph: "ψ", text: "Duas lâminas por mão. Golpes muito rápidos." },
  { id: "wand", name: "Varinha de Maestro", slot: "weapon", size: 2, w: { int: 2, dex: 1, wis: 1 }, color: "#f0e6ff", glyph: "/", text: "Reger a orquestra e fritar monstros dá o mesmo gesto." },
  { id: "sword", name: "Espada de Ensaio", slot: "weapon", size: 3, w: { str: 3, dex: 1 }, color: "#d9d2c2", glyph: "⚔", text: "Pesada, honesta, desafinada. Golpe largo que atinge até 3 alvos." },
  { id: "staff", name: "Cajado de Fio", slot: "weapon", size: 3, w: { int: 3, wis: 1 }, color: "#c9b6e0", glyph: "Ψ", text: "Alcance longo e empurrão forte. Três blocos de mística." },
  { id: "scepter", name: "Cetro do Arquivo", slot: "weapon", size: 3, w: { int: 2, wis: 2 }, color: GLD, glyph: "♆", text: "Carimba o ar. Bom para quem vive de recarga." },
  { id: "bow", name: "Arco de Folha", slot: "weapon", size: 3, w: { dex: 3, wis: 1 }, color: "#8ac060", glyph: ")", text: "Silencioso até demais. Favorece destreza." },
  { id: "axe", name: "Machado de Forja", slot: "weapon", size: 4, w: { str: 4, rec: 1 }, color: "#e08a3a", glyph: "Ϯ", text: "Quatro blocos de problema. Golpe lento que atinge muitos alvos." },
  { id: "hammer", name: "Martelo de Carnaval", slot: "weapon", size: 4, w: { str: 5 }, color: "#b9a37a", glyph: "T", text: "Acerta o ursinho e o monstro com a mesma alegria." },
  // mão secundária
  { id: "lid", name: "Escudo de Tampa de Panela", slot: "offhand", size: 3, w: { rec: 3, str: 1 }, color: "#b8bcc6", glyph: "◎", text: "Tampa de panela com ambição. Defende e dá recuperação." },
  { id: "tome", name: "Livro de Contratos", slot: "offhand", size: 2, w: { int: 3, wis: 1 }, color: "#8a2a3a", glyph: "▤", text: "Letras miúdas, consequências enormes." },
  { id: "lantern", name: "Lanterna de Camarim", slot: "offhand", size: 2, w: { wis: 3, dex: 1 }, color: "#ffc24a", glyph: "♨", text: "Ilumina o caminho e as dívidas." },
  { id: "quiver", name: "Aljava Bordada", slot: "offhand", size: 2, w: { dex: 3, wis: 1 }, color: "#8a5a38", glyph: "∥", text: "Flechas de reserva e um bolso para balas." },
  // capacetes
  { id: "cap", name: "Boné de Contrarregra", slot: "helmet", size: 1, w: { dex: 1, rec: 1 }, color: "#5a6a8a", glyph: "◠", text: "Leve. Protege do sol e de refletor caindo." },
  { id: "tophat", name: "Cartola Emprestada", slot: "helmet", size: 2, w: { int: 2, wis: 1 }, color: BLK, glyph: "▮", text: "Sempre cabe um coelho. Ou uma ideia." },
  { id: "hood", name: "Capuz de Sombra", slot: "helmet", size: 1, w: { dex: 2, wis: 1 }, color: PUR, glyph: "▲", text: "Some com a cara. Bom para fugir de cobrador." },
  { id: "helm", name: "Elmo de Rebite", slot: "helmet", size: 3, w: { rec: 3, str: 1 }, color: SIL, glyph: "⛑", text: "Bate na cabeça de dentro pra fora." },
  { id: "crown", name: "Coroa de Papelão Dourado", slot: "helmet", size: 2, w: { wis: 3, int: 1 }, color: GLD, glyph: "♛", text: "Parece de ouro até chover." },
  // colares
  { id: "amulet", name: "Amuleto de Vela", slot: "necklace", size: 1, w: { wis: 2, rec: 1 }, color: "#ffc24a", glyph: "✦", text: "Brilha em cenas tristes." },
  { id: "charm", name: "Talismã de Lobo", slot: "necklace", size: 1, w: { str: 2, dex: 1 }, color: RED, glyph: "◆", text: "Cheira a lua cheia." },
  { id: "locket", name: "Medalhão de Foto Rasgada", slot: "necklace", size: 1, w: { rec: 2, int: 1 }, color: "#e0b15a", glyph: "◍", text: "Abre sozinho quando o clima esfria." },
  { id: "whistle", name: "Apito de Bilheteiro", slot: "necklace", size: 1, w: { dex: 2, wis: 1 }, color: "#c9d1db", glyph: "ʘ", text: "Um apito para chamar a sorte. Ela costuma atender." },
  // armaduras (peito)
  { id: "vest", name: "Colete de Couro", slot: "armor", size: 3, w: { rec: 2, str: 1 }, color: BLK, glyph: "▼", text: "Preto, resistente e bom de bolso. Aguenta uma tarde." },
  { id: "plate", name: "Armadura de Rebite", slot: "armor", size: 5, w: { rec: 4, str: 2 }, color: SIL, glyph: "▣", text: "Prateada e barulhenta. Cinco blocos de segurança." },
  { id: "robe", name: "Manto de Tinteiro", slot: "armor", size: 3, w: { int: 2, wis: 2 }, color: PUR, glyph: "◈", text: "Roxo de tanto absorver tinta e dívida." },
  { id: "tunic", name: "Túnica de Palhaço Vermelha", slot: "armor", size: 3, w: { dex: 2, rec: 1, str: 1 }, color: RED, glyph: "◬", text: "Vermelho intenso. Tem tinta de sorriso no colarinho." },
  { id: "cuirass", name: "Peitoral Dourado de Bilheteria", slot: "armor", size: 5, w: { rec: 3, str: 2, wis: 1 }, color: GLD, glyph: "▥", text: "Dourado e caro. A bilheteria desconta do seu salário." },
  // capas
  { id: "cape", name: "Capa de Camarim", slot: "cape", size: 2, w: { dex: 1, rec: 2 }, color: RED, glyph: "Ω", text: "Leve, dramática, balança com o vento." },
  { id: "cloak_dark", name: "Manto de Veludo Negro", slot: "cape", size: 2, w: { dex: 2, int: 1 }, color: BLK, glyph: "Ж", text: "Veludo preto. Some nas cortinas." },
  { id: "cape_star", name: "Capa Estrelada", slot: "cape", size: 2, w: { int: 2, wis: 2 }, color: PUR, glyph: "★", text: "Roxa, cheia de estrelas de papel alumínio." },
  { id: "cape_gold", name: "Capa de Mestre de Cerimônias", slot: "cape", size: 3, w: { wis: 2, rec: 2, str: 1 }, color: GLD, glyph: "Ω", text: "Dourada e pomposa. Dá para ouvir os aplausos." },
  // luvas
  { id: "gloves", name: "Luvas de Couro", slot: "gloves", size: 1, w: { dex: 1, str: 1 }, color: BLK, glyph: "✋", text: "Seguram melhor a arma e pior a verdade." },
  { id: "gloves_mage", name: "Luvas de Fio Roxo", slot: "gloves", size: 1, w: { int: 2 }, color: PUR, glyph: "✋", text: "Tricotadas por uma avó que sabia magia." },
  { id: "gauntlet", name: "Manoplas de Rebite", slot: "gloves", size: 2, w: { str: 2, rec: 1 }, color: SIL, glyph: "✊", text: "Para dar soco com educação." },
  // calças
  { id: "pants", name: "Calça Listrada de Palco", slot: "pants", size: 2, w: { dex: 1, rec: 1 }, color: RED, glyph: "∏", text: "Vermelha intensa. Faz o público torcer." },
  { id: "pants_leather", name: "Calça de Couro Preto", slot: "pants", size: 2, w: { str: 1, dex: 1, rec: 1 }, color: BLK, glyph: "∏", text: "Quase não amassa e nunca desbota." },
  { id: "greaves", name: "Grevas Prateadas", slot: "pants", size: 3, w: { rec: 3, str: 1 }, color: SIL, glyph: "∏", text: "Protegem as canelas de toda tropeçada." },
  // botas
  { id: "boots", name: "Botas de Sapateiro", slot: "boots", size: 2, w: { dex: 1, rec: 1 }, color: "#6a4a30", glyph: "⌐", text: "Gastas, confortáveis e fiéis." },
  { id: "boots_speed", name: "Botas de Pressa", slot: "boots", size: 2, w: { dex: 3 }, color: PUR, glyph: "⌐", text: "Roxas e leves. Dão a sensação de nunca estar atrasado." },
  { id: "boots_iron", name: "Botas de Ferro Negro", slot: "boots", size: 3, w: { rec: 2, str: 2 }, color: BLK, glyph: "⌐", text: "Pesadas. Cada passo tem opinião." },
  // anéis
  { id: "ring", name: "Anel de Contrato", slot: "ring", size: 1, w: { str: 1, int: 1, dex: 1 }, color: GLD, glyph: "○", text: "Aperta um pouco. Cabe em qualquer dedo." },
  { id: "ring_ruby", name: "Anel de Rubi de Vidro", slot: "ring", size: 1, w: { str: 2, rec: 1 }, color: RED, glyph: "◉", text: "O rubi é vidro. A força é de verdade." },
  { id: "ring_bone", name: "Anel de Osso Polido", slot: "ring", size: 1, w: { int: 2, wis: 1 }, color: "#e8e0cc", glyph: "◯", text: "Osso de fantoche. Sussurra dicas." },
  { id: "ring_seal", name: "Anel de Selo Violeta", slot: "ring", size: 1, w: { wis: 2, dex: 1 }, color: PUR, glyph: "◈", text: "Carimba tudo o que toca." },
];

export const BASE_BY_ID: Record<string, BaseDef> = Object.fromEntries(BASES.map((b) => [b.id, b]));

export const RARITY_NAME = ["Comum", "Raro", "Épico", "Lendário"];
export const RARITY_COLOR = ["#cfc7b8", "#5fb4ff", "#c07aff", "#ffb23a"];
const RARITY_MUL = [1, 1.5, 2.1, 3];
const RARITY_PRE = ["", "Polido", "Encantado", "Lendário"];

export function baseOf(it: Item): BaseDef {
  return BASE_BY_ID[it.base] ?? BASES[0]!;
}

export function itemSize(it: Item) {
  return baseOf(it).size;
}

export function itemName(it: Item): string {
  const b = baseOf(it);
  if (b.slot === "potion") return b.name;
  const pre = RARITY_PRE[it.rarity] ? ` ${RARITY_PRE[it.rarity]}` : "";
  return `${b.name}${pre}${it.tier > 1 ? ` +${it.tier - 1}` : ""}`;
}

export function modText(it: Item): string {
  const b = baseOf(it);
  if (b.slot === "potion") return b.heal ? `Cura ${b.heal} ♥ (+bônus REC)` : "Efeito temporário";
  return STAT_KEYS.filter((k) => (it.mods[k] ?? 0) !== 0)
    .map((k) => `+${it.mods[k]} ${k.toUpperCase()}`)
    .join("  ");
}

let uidSeed = 1;
export function setUidSeed(n: number) {
  uidSeed = Math.max(uidSeed, n);
}
export function peekUid() {
  return uidSeed;
}

export function makeItem(baseId: string, rarity: Rarity, tier: number, rnd: () => number): Item {
  const b = BASE_BY_ID[baseId] ?? BASES[0]!;
  const mods: Partial<Stats> = {};
  if (b.slot !== "potion") {
    const mul = RARITY_MUL[rarity]!;
    for (const k of STAT_KEYS) {
      const w = b.w[k];
      if (w) mods[k] = Math.max(1, Math.round(w * (0.8 + tier * 0.55) * mul));
    }
    if (rarity >= 1) {
      const k = STAT_KEYS[Math.floor(rnd() * STAT_KEYS.length)] as StatKey;
      mods[k] = (mods[k] ?? 0) + Math.max(1, Math.round((1 + tier * 0.4) * rarity));
    }
  }
  return { uid: uidSeed++, base: baseId, rarity, tier, mods };
}

export type DropSource = "mob" | "mini" | "boss" | "chest";

export function rollDrops(src: DropSource, world: number, luck: number, rnd: () => number): Item[] {
  const tier = Math.min(10, world + 1);
  const out: Item[] = [];
  const rar = (bonus: number): Rarity => {
    const t = (0.06 + bonus + world * 0.004) * luck;
    if (rnd() < t * 0.18) return 3;
    if (rnd() < t * 0.55) return 2;
    if (rnd() < t * 1.5 + 0.1) return 1;
    return 0;
  };
  const potion = () => {
    const x = rnd();
    const id = x < 0.45 ? "pot" : x < 0.64 ? "pot2" : x < 0.72 ? "pot3" : x < 0.84 ? "elx_haste" : x < 0.93 ? "elx_fury" : "elx_ward";
    return makeItem(id, 0, tier, rnd);
  };
  const gear = (bonus: number, force?: Rarity) => {
    const pool = BASES.filter((b) => b.slot !== "potion");
    const b = pool[Math.floor(rnd() * pool.length)]!;
    return makeItem(b.id, force ?? rar(bonus), tier, rnd);
  };
  if (src === "mob") {
    if (rnd() < 0.15 * luck) out.push(rnd() < 0.62 ? potion() : gear(0));
  } else if (src === "mini") {
    out.push(potion(), gear(0.12));
    if (rnd() < 0.5) out.push(gear(0.12));
  } else if (src === "boss") {
    out.push(potion(), potion(), gear(0.3, 1), gear(0.3));
    if (rnd() < 0.4) out.push(gear(0.4, 2));
  } else {
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) out.push(rnd() < 0.4 ? potion() : gear(0.2));
  }
  return out;
}

export function emptyEquip(): Equip {
  return { helmet: null, necklace: null, armor: null, cape: null, gloves: null, pants: null, boots: null, weapon: null, offhand: null, ring1: null, ring2: null };
}

/** em qual espaço do personagem o item entra (anéis: primeiro vazio, senão o do primeiro anel) */
export function equipKeyFor(it: Item, eq: Equip): EquipKey | null {
  const slot = baseOf(it).slot;
  if (slot === "potion") return null;
  if (slot === "ring") return !eq.ring1 ? "ring1" : !eq.ring2 ? "ring2" : "ring1";
  return slot;
}

/** explica cada bônus do item em linguagem do jogo */
export const MOD_MEANING: Record<StatKey, (n: number) => string> = {
  str: (n) => `+${Math.round(n * 5)}% de dano físico (tiro, golpe e poderes unitários)`,
  int: (n) => `+${(n * 5.5).toFixed(0)}% de dano mágico e área maior`,
  dex: (n) => `mais velocidade, tiro mais rápido e chance de crítico (+${(n * 0.6).toFixed(1)}%)`,
  wis: (n) => `poderes e forma recarregam ${(n * 0.85).toFixed(0)}% mais rápido, mais XP e drops`,
  rec: (n) => `${n >= 5 ? "ganha corações extras, " : ""}poções curam mais e proteção após dano dura mais`,
};

export function describeMods(it: Item): { key: StatKey; value: number; text: string }[] {
  const out: { key: StatKey; value: number; text: string }[] = [];
  for (const k of STAT_KEYS) {
    const v = it.mods[k] ?? 0;
    if (v) out.push({ key: k, value: v, text: MOD_MEANING[k](v) });
  }
  return out;
}

/** diferença de atributos entre o item e o que está no espaço onde ele entraria */
export function compareItem(it: Item, eq: Equip): { key: EquipKey; diff: Partial<Record<StatKey, number>>; current: Item | null } | null {
  const key = equipKeyFor(it, eq);
  if (!key) return null;
  const cur = eq[key];
  const diff: Partial<Record<StatKey, number>> = {};
  for (const k of STAT_KEYS) {
    const d = (it.mods[k] ?? 0) - (cur?.mods[k] ?? 0);
    if (d) diff[k] = d;
  }
  return { key, diff, current: cur };
}

export const SLOT_NAME: Record<ItemSlot, string> = {
  potion: "Consumível",
  weapon: "Arma",
  offhand: "Mão secundária",
  helmet: "Capacete",
  necklace: "Colar",
  ring: "Anel",
  armor: "Armadura",
  cape: "Capa",
  gloves: "Luvas",
  pants: "Calça",
  boots: "Botas",
};

export { EQUIP_KEYS };

export function bagUsed(bag: Item[]): number {
  let n = 0;
  for (const it of bag) n += itemSize(it);
  return n;
}

export function canFit(bag: Item[], it: Item): boolean {
  return bagUsed(bag) + itemSize(it) <= BAG_SIZE;
}

export function countPotions(bag: Item[]): number {
  return bag.filter((i) => baseOf(i).slot === "potion").length;
}
