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

export const HERO_IDS = ["ivo", "lena", "osso", "syl"] as const;
export type HeroId = (typeof HERO_IDS)[number];

export const STAT_KEYS = ["vit", "impeto", "folego", "passo", "mira"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

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
  | "boss"
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
  | "dead"
  | "clear"
  | "ending";

export type Line = { who: string; text: string };

export type Action = "left" | "right" | "down" | "jump" | "attack" | "form" | "s1" | "s2" | "s3" | "s4";

export type LevelEnt = { kind: Kind; c: number; foot: number };

export type Level = {
  index: number;
  name: string;
  world: number;
  boss: boolean;
  cols: number;
  rows: number;
  tiles: Uint8Array;
  ents: LevelEnt[];
  spawn: { c: number; foot: number };
  exit: { c: number; foot: number };
};

export type Snap = {
  screen: Screen;
  hasSave: boolean;
  hero: HeroId;
  selectedHero: HeroId;
  next: number;
  level: number;
  xp: number;
  xpNeed: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  reel: number;
  reelName: string;
  worldName: string;
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
  choices: StatKey[];
  deadLine: string;
  toast: string;
  mute: boolean;
  clearText: string;
  time: number;
  best: number;
  hint: boolean;
  progress: number;
  skills: SkillSnap[];
};

export type SkillSnap = { name: string; kind: string; key: string; cd: number; cdMax: number; lv: number; unlocked: boolean };

export const EMPTY_STATS: Stats = { vit: 0, impeto: 0, folego: 0, passo: 0, mira: 0 };

export function xpToNext(level: number): number {
  return 40 + Math.max(0, level - 1) * 20;
}

export function isSolidTile(t: number): boolean {
  return t === Tile.Solid || t === Tile.Spike || t === Tile.Spring;
}

export function tileAt(level: Level, c: number, r: number): number {
  if (c < 0 || c >= level.cols) return Tile.Solid;
  if (r < 0 || r >= level.rows) return Tile.Air;
  return level.tiles[r * level.cols + c] ?? Tile.Air;
}
