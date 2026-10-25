export const TILE = 48;
export const ROWS = 16;
export const GROUND = 14;
export const VIEW_W = 768;
export const VIEW_H = 432;

export const Tile = {
  Air: 0,
  Solid: 1,
  OneWay: 2,
  Spike: 3,
  Spring: 4,
  Checkpoint: 5,
} as const;

export type TileId = (typeof Tile)[keyof typeof Tile];

export const HERO_IDS = ["ivo", "lena", "osso", "syl", "tito", "mari", "pia", "lumen"] as const;
export type HeroId = (typeof HERO_IDS)[number];

export const STAT_KEYS = ["str", "int", "dex", "wis", "rec"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const BAG_SIZE = 32;
export const POINTS_PER_LEVEL = 5;
export const MAX_LEVEL = 50;
export const MAIN_LEVELS = 50;
export const BONUS_LEVELS = 10;
export const TOTAL_REELS = MAIN_LEVELS + BONUS_LEVELS;

export type ItemSlot = "potion" | "weapon" | "armor" | "relic";
export type Rarity = 0 | 1 | 2 | 3;
export type Item = {
  uid: number;
  base: string;
  rarity: Rarity;
  tier: number;
  mods: Partial<Stats>;
};
export type Equip = { weapon: Item | null; armor: Item | null; relic: Item | null };

export type BuffKind = "haste" | "fury" | "ward";

export type Kind =
  | "imp"
  | "mask"
  | "balloon"
  | "skel"
  | "witch"
  | "undead"
  | "golem"
  | "troll"
  | "thorn"
  | "hound"
  | "dryad"
  | "wraith"
  | "clerk"
  | "crab"
  | "gull"
  | "scorp"
  | "mummy"
  | "snowman"
  | "yeti"
  | "cherub"
  | "gargoyle"
  | "shade"
  | "jester"
  | "boss"
  | "chest"
  | "candle";

export type Behavior = "walk" | "jump" | "fly" | "shoot" | "charge" | "still" | "boss" | "item";

export type Screen =
  | "title"
  | "help"
  | "cast"
  | "map"
  | "talk"
  | "play"
  | "pause"
  | "levelup"
  | "char"
  | "mode"
  | "dead"
  | "clear"
  | "ending";

export type Line = { who: string; text: string };

export type Action = "left" | "right" | "down" | "jump" | "attack" | "form" | "s1" | "s2" | "s3" | "s4" | "potion" | "melee";

export type LevelEnt = { kind: Kind; c: number; foot: number; mini?: boolean };

export type Level = {
  index: number;
  name: string;
  world: number;
  boss: boolean;
  mini: boolean;
  bonus: boolean;
  cols: number;
  rows: number;
  tiles: Uint8Array;
  ents: LevelEnt[];
  spawn: { c: number; foot: number };
  exit: { c: number; foot: number };
};

export type BuffSnap = { kind: BuffKind; left: number };

export type Snap = {
  screen: Screen;
  hasSave: boolean;
  hero: HeroId;
  selectedHero: HeroId;
  next: number;
  bonusOpen: number;
  mode: number;
  meleeCd: number;
  meleeMax: number;
  cine: boolean;
  level: number;
  xp: number;
  xpNeed: number;
  /** atributos finais (base do herói + pontos + equipamentos) */
  stats: Stats;
  /** só os pontos gastos pelo jogador */
  alloc: Stats;
  points: number;
  hp: number;
  maxHp: number;
  reel: number;
  reelName: string;
  worldName: string;
  bonus: boolean;
  bossAlive: boolean;
  bossName: string;
  bossHp: number;
  bossMax: number;
  formActive: boolean;
  formLeft: number;
  formCd: number;
  formDur: number;
  lines: Line[];
  lineIndex: number;
  deadLine: string;
  toast: string;
  mute: boolean;
  clearText: string;
  time: number;
  best: number;
  hint: boolean;
  progress: number;
  skills: SkillSnap[];
  bag: Item[];
  equip: Equip;
  bagUsed: number;
  potions: number;
  buffs: BuffSnap[];
  derived: Record<string, string>;
  levelupFresh: boolean;
};

export type SkillSnap = { name: string; kind: string; key: string; cd: number; cdMax: number; lv: number; unlocked: boolean };

export const EMPTY_STATS: Stats = { str: 0, int: 0, dex: 0, wis: 0, rec: 0 };

export function xpToNext(level: number): number {
  return 40 + Math.max(0, level - 1) * 26;
}

export function isSolidTile(t: number): boolean {
  return t === Tile.Solid || t === Tile.Spike || t === Tile.Spring;
}

export function tileAt(level: Level, c: number, r: number): number {
  if (c < 0 || c >= level.cols) return Tile.Solid;
  if (r < 0 || r >= level.rows) return Tile.Air;
  return level.tiles[r * level.cols + c] ?? Tile.Air;
}
