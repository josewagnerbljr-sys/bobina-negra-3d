import { BAG_SIZE, STAT_KEYS, type Equip, type Item, type ItemSlot, type Rarity, type Stats, type StatKey } from "./types";

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

export const BASES: BaseDef[] = [
  { id: "pot", name: "Poção de Tinta", slot: "potion", size: 1, w: {}, color: "#c4373a", glyph: "♥", heal: 1, text: "Cura corações. A cor é o que o contrato chama de tinta." },
  { id: "pot2", name: "Poção Grande", slot: "potion", size: 1, w: {}, color: "#e0527a", glyph: "♥", heal: 2, text: "Cura mais. Gosto de vela derretida." },
  { id: "elx_haste", name: "Elixir de Pressa", slot: "potion", size: 1, w: {}, color: "#4ac0e0", glyph: "»", buff: "haste", text: "Mais velocidade e cadência por 25s." },
  { id: "elx_fury", name: "Elixir de Fúria", slot: "potion", size: 1, w: {}, color: "#e08a3a", glyph: "!", buff: "fury", text: "+50% de dano por 25s." },
  { id: "elx_ward", name: "Elixir de Escudo", slot: "potion", size: 1, w: {}, color: "#9aa8e0", glyph: "◇", buff: "ward", text: "Imune a dano por 8s." },
  { id: "knife", name: "Faca de Palco", slot: "weapon", size: 2, w: { dex: 2, str: 1 }, color: "#c9d2dc", glyph: "†", text: "Curta e ágil." },
  { id: "sword", name: "Espada de Ensaio", slot: "weapon", size: 3, w: { str: 3, dex: 1 }, color: "#d9d2c2", glyph: "⚔", text: "Pesada, honesta, desafinada." },
  { id: "axe", name: "Machado de Forja", slot: "weapon", size: 4, w: { str: 4, rec: 1 }, color: "#e08a3a", glyph: "Ϯ", text: "Quatro blocos de problema." },
  { id: "staff", name: "Cajado de Fio", slot: "weapon", size: 3, w: { int: 3, wis: 1 }, color: "#c9b6e0", glyph: "Ψ", text: "Três blocos de mística." },
  { id: "scepter", name: "Cetro do Arquivo", slot: "weapon", size: 3, w: { int: 2, wis: 2 }, color: "#e0b15a", glyph: "♆", text: "Carimba o ar." },
  { id: "bow", name: "Arco de Folha", slot: "weapon", size: 3, w: { dex: 3, wis: 1 }, color: "#8ac060", glyph: ")", text: "Silencioso até demais." },
  { id: "cape", name: "Capa de Camarim", slot: "armor", size: 2, w: { dex: 1, rec: 2 }, color: "#7a1d38", glyph: "Ω", text: "Leve, dramática." },
  { id: "vest", name: "Colete de Couro", slot: "armor", size: 3, w: { rec: 2, str: 1 }, color: "#8a6a4a", glyph: "▼", text: "Aguenta uma tarde." },
  { id: "plate", name: "Armadura de Rebite", slot: "armor", size: 5, w: { rec: 4, str: 2 }, color: "#8a929c", glyph: "▣", text: "Cinco blocos de segurança." },
  { id: "robe", name: "Manto de Tinteiro", slot: "armor", size: 3, w: { int: 2, wis: 2 }, color: "#3a2a58", glyph: "◈", text: "Absorve tinta e dívida." },
  { id: "ring", name: "Anel de Contrato", slot: "relic", size: 1, w: { str: 1, int: 1, dex: 1 }, color: "#e0b15a", glyph: "○", text: "Aperta um pouco." },
  { id: "amulet", name: "Amuleto de Vela", slot: "relic", size: 1, w: { wis: 2, rec: 1 }, color: "#ffc24a", glyph: "✦", text: "Brilha em cenas tristes." },
  { id: "charm", name: "Talismã de Lobo", slot: "relic", size: 1, w: { str: 2, dex: 1 }, color: "#c4373a", glyph: "◆", text: "Cheira a lua cheia." },
  { id: "orb", name: "Orbe Rachada", slot: "relic", size: 2, w: { int: 3, wis: 1 }, color: "#8fd0c8", glyph: "◉", text: "Rachada, mas ainda enxerga." },
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
    const id = x < 0.55 ? "pot" : x < 0.75 ? "pot2" : x < 0.86 ? "elx_haste" : x < 0.94 ? "elx_fury" : "elx_ward";
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
  return { weapon: null, armor: null, relic: null };
}

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
