import { emptyEquip, setUidSeed } from "./items";
import { MAIN_LEVELS, EMPTY_STATS, EQUIP_KEYS, HERO_IDS, MAX_LEVEL, POINTS_PER_LEVEL, TOTAL_REELS, type Equip, type HeroId, type Item, type Stats } from "./types";

const KEY = "bobina-negra-v2";
const OLD_KEY = "bobina-negra-v1";
const MUTE_KEY = "bobina-negra-mute";

export type Save = {
  v: 2;
  hero: HeroId;
  /** próximo nível principal liberado (1..51) */
  next: number;
  level: number;
  xp: number;
  /** pontos de atributo ainda não gastos */
  points: number;
  alloc: Stats;
  seen: number;
  /** reinos 30..49 cujo prefácio já foi lido (bits 0..19) */
  realmsHi: number;
  /** reinos (0..24) cujo prefácio já foi lido */
  realms: number;
  best: number[];
  bag: Item[];
  equip: Equip;
  uid: number;
  mode: number;
  /** moedas */
  gold: number;
  /** peças do enigma por reino (bits 0..2) */
  parts: number[];
  /** monstros derrotados (total) */
  kills: number;
  /** missões dos NPCs: id -> {base, goal, done} */
  qs: Record<string, { base: number; goal: number; done: number; tier?: number }>;
  /** nível (0 = não aprendida) de cada uma das 13 magias */
  spells: number[];
  /** magia equipada em U/I/O/P (-1 = poder do herói) */
  slot: number[];
};

export function emptySave(hero: HeroId): Save {
  return {
    v: 2,
    hero,
    next: 1,
    level: 1,
    xp: 0,
    points: 0,
    alloc: { ...EMPTY_STATS },
    seen: 0,
    realms: 0,
    realmsHi: 0,
    best: Array.from({ length: TOTAL_REELS }, () => 0),
    bag: [],
    equip: emptyEquip(),
    uid: 1,
    mode: 0,
    gold: 40,
    parts: Array.from({ length: 50 }, () => 0),
    kills: 0,
    qs: {},
    spells: Array.from({ length: 13 }, () => 0),
    slot: [-1, -1, -1, -1],
  };
}

function okHero(v: unknown): v is HeroId {
  return typeof v === "string" && (HERO_IDS as readonly string[]).includes(v);
}

function okItem(v: unknown): v is Item {
  const i = v as Item;
  return Boolean(i && typeof i.uid === "number" && typeof i.base === "string" && typeof i.rarity === "number" && typeof i.tier === "number" && i.mods && typeof i.mods === "object");
}

function parse(text: string): Save | null {
  const data = JSON.parse(text) as Partial<Omit<Save, "v">> & { v?: number };
  if (!okHero(data.hero)) return null;
  const level = clampInt(data.level, 1, MAX_LEVEL);
  const best = Array.from({ length: TOTAL_REELS }, (_, i) => {
    const n = data.best?.[i];
    return typeof n === "number" && n > 0 ? n : 0;
  });
  if (data.v === 1) {
    return {
      ...emptySave(data.hero),
      next: clampInt(data.next, 1, MAIN_LEVELS + 1),
      level,
      xp: Math.max(0, Math.floor(data.xp ?? 0)),
      points: (level - 1) * POINTS_PER_LEVEL,
      seen: data.seen ?? 0,
      best,
    };
  }
  if (data.v !== 2) return null;
  const alloc: Stats = { ...EMPTY_STATS, ...(data.alloc ?? {}) };
  const bag = Array.isArray(data.bag) ? data.bag.filter(okItem) : [];
  const eq: Equip = emptyEquip();
  const raw = (data.equip ?? {}) as Record<string, Item | null>;
  for (const k of EQUIP_KEYS) if (raw[k] && okItem(raw[k])) eq[k] = raw[k]!;
  // v4: "armadura" podia ser capa; "relíquia" vira anel, colar ou mão secundária
  if (raw.armor && okItem(raw.armor) && raw.armor.base === "cape") {
    eq.armor = null;
    eq.cape = raw.armor;
  }
  if (raw.relic && okItem(raw.relic)) {
    const b = raw.relic.base;
    if (b === "ring") eq.ring1 = raw.relic;
    else if (b === "orb") eq.offhand = raw.relic;
    else eq.necklace = raw.relic;
  }
  const uid = clampInt(data.uid, 1, 1e9);
  setUidSeed(uid);
  return {
    v: 2,
    hero: data.hero,
    next: clampInt(data.next, 1, MAIN_LEVELS + 1),
    level,
    xp: Math.max(0, Math.floor(data.xp ?? 0)),
    points: Math.max(0, Math.floor(data.points ?? 0)),
    alloc,
    seen: data.seen ?? 0,
    realms: data.realms ?? 0,
    realmsHi: (data as { realmsHi?: number }).realmsHi ?? 0,
    best,
    bag,
    equip: eq,
    uid,
    mode: clampInt(data.mode, 0, 4),
    gold: Math.max(0, Math.floor(data.gold ?? 40)),
    parts: Array.from({ length: 50 }, (_, i) => clampInt(data.parts?.[i], 0, 7)),
    kills: Math.max(0, Math.floor(data.kills ?? 0)),
    qs: data.qs && typeof data.qs === "object" ? data.qs : {},
    spells: Array.from({ length: 13 }, (_, i) => clampInt((data as { spells?: number[] }).spells?.[i], 0, 5)),
    slot: Array.from({ length: 4 }, (_, i) => clampInt((data as { slot?: number[] }).slot?.[i], -1, 12)),
  };
}

export function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (!raw) return null;
    return parse(raw);
  } catch {
    return null;
  }
}

export function writeSave(save: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* sem armazenamento: segue sem salvar */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(OLD_KEY);
  } catch {
    /* ignora */
  }
}

export function loadMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMute(m: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignora */
  }
}

function clampInt(n: unknown, a: number, b: number) {
  const v = typeof n === "number" ? Math.floor(n) : a;
  return Math.min(b, Math.max(a, v));
}
