import type { HeroId, Item, ItemSlot, Kind, Stats } from "./types";

/** companheiros: cães do inferno, nefelins (celestiais), almas amarradas (conjuradores) e feras submetidas (guerreiros) */
export type PetKind = "hell" | "nefelin" | "soul" | "tamed";
export type Pet = {
  id: string;
  kind: PetKind;
  look: Kind;
  name: string;
  lv: number;
  xp: number;
  /** renasceu em forma final */
  final: boolean;
  active: boolean;
  /** armadura, joia e adorno */
  gear: (Item | null)[];
  bag: Item[];
};

export const HOUND_MAX = 5;
export const SERV_MAX = 5;
export const BAG_MAX = 20;
export const FIGHT_LV = 15;
export const ADULT_LV = 25;
export const LV_MAX = 50;
export const ACTIVE_MAX = 4;
export const GEAR_LABEL = ["Armadura", "Joia", "Adorno"];

/** classes que amarram almas (conjuradores) x classes que submetem feras (guerreiras/caçadoras) */
export const SOUL_HEROES: ReadonlySet<HeroId> = new Set<HeroId>(["osso", "nyx", "mari", "tito", "lumen", "brann"]);

export const isHound = (p: Pet) => p.kind === "hell" || p.kind === "nefelin";
export const isAdult = (p: Pet) => !isHound(p) || p.lv >= ADULT_LV;
export const canFight = (p: Pet) => isAdult(p) || p.lv >= FIGHT_LV;
export const petNeed = (lv: number) => 20 + lv * 12;
export const houndCount = (pets: Pet[]) => pets.filter(isHound).length;
export const servCount = (pets: Pet[]) => pets.filter((p) => !isHound(p)).length;
/** com 5 cães o mundo sobe 2 níveis acima do herói */
export const petsFive = (pets: Pet[]) => houndCount(pets) >= HOUND_MAX;

export const petMaxHp = (p: Pet) => Math.round((40 + p.lv * 16) * (isAdult(p) ? 1.25 : 1) * (p.final ? 1.7 : 1));
export const petDmg = (p: Pet, phys: number) => {
  const gear = p.gear.reduce((s, it) => s + (it?.mods.str ?? 0) * 0.5, 0);
  return (phys * 0.35 + p.lv * 0.5 + gear) * (isAdult(p) ? 1.3 : 1) * (p.final ? 1.7 : 1);
};
/** escala do corpo: filhote pequeno, adulto cheio, forma final maior */
export const petScale = (p: Pet) => (p.final ? 1.3 : isAdult(p) ? 1.0 : 0.5 + Math.min(1, p.lv / ADULT_LV) * 0.45);
export const petTitle = (p: Pet) => {
  const base = p.kind === "hell" ? "Cão do Inferno" : p.kind === "nefelin" ? "Nefelin" : p.kind === "soul" ? "Sombra" : "Fera submissa";
  if (isHound(p)) return `${base} ${p.final ? "(forma final)" : isAdult(p) ? "adulto" : canFight(p) ? "jovem" : "filhote"}`;
  return p.final ? `${base} (forma final)` : base;
};

/** qual espaço do companheiro aceita o item (-1 = não aceita) */
export function petSlotFor(slot: ItemSlot): number {
  if (slot === "armor" || slot === "helmet" || slot === "pants" || slot === "gloves" || slot === "boots") return 0;
  if (slot === "necklace" || slot === "ring") return 1;
  if (slot === "cape" || slot === "offhand") return 2;
  return -1;
}

/** bônus que os companheiros dão ao herói: atributo por nível + atributos dos itens equipados neles */
export function petStatBonus(pets: Pet[]): Stats {
  const out: Stats = { str: 0, int: 0, dex: 0, wis: 0, rec: 0 };
  for (const p of pets) {
    const k = p.kind === "hell" ? "str" : p.kind === "nefelin" ? "wis" : p.kind === "soul" ? "int" : "dex";
    out[k] += Math.floor(p.lv / 5) + (p.final ? 2 : 0);
    for (const it of p.gear) if (it) for (const s of ["str", "int", "dex", "wis", "rec"] as const) out[s] += it.mods[s] ?? 0;
  }
  return out;
}

export const PET_NAMES: Record<PetKind, string[]> = {
  hell: ["Brasinha", "Carvão", "Enxofre", "Tição", "Fumaça", "Cérbero Jr.", "Latido-Negro"],
  nefelin: ["Nuvem", "Alvorada", "Cirro", "Brisa", "Aurora"],
  soul: ["Sombra de", "Eco de", "Véu de"],
  tamed: ["Servo", "Cativo", "Vassalo"],
};
export const petUid = () => `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
