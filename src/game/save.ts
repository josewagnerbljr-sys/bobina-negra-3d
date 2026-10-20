import { EMPTY_STATS, type HeroId, type Stats } from "./types";

const KEY = "bobina-negra-v1";
const MUTE_KEY = "bobina-negra-mute";

export type Save = {
  v: 1;
  hero: HeroId;
  next: number;
  level: number;
  xp: number;
  stats: Stats;
  seen: number;
  best: number[];
};

export function emptySave(hero: HeroId): Save {
  return {
    v: 1,
    hero,
    next: 1,
    level: 1,
    xp: 0,
    stats: { ...EMPTY_STATS },
    seen: 0,
    best: Array.from({ length: 25 }, () => 0),
  };
}

function okHero(v: unknown): v is HeroId {
  return v === "ivo" || v === "lena" || v === "osso" || v === "syl";
}

export function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Save>;
    if (data.v !== 1 || !okHero(data.hero)) return null;
    const stats = { ...EMPTY_STATS, ...(data.stats ?? {}) };
    const best = Array.from({ length: 25 }, (_, i) => {
      const n = data.best?.[i];
      return typeof n === "number" && n > 0 ? n : 0;
    });
    return {
      v: 1,
      hero: data.hero,
      next: clampInt(data.next, 1, 26),
      level: clampInt(data.level, 1, 30),
      xp: Math.max(0, Math.floor(data.xp ?? 0)),
      stats,
      seen: data.seen ?? 0,
      best,
    };
  } catch {
    return null;
  }
}

export function writeSave(save: Save) {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

export function loadMute(): boolean {
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function writeMute(m: boolean) {
  localStorage.setItem(MUTE_KEY, m ? "1" : "0");
}

function clampInt(n: unknown, a: number, b: number) {
  const v = typeof n === "number" ? Math.floor(n) : a;
  return Math.min(b, Math.max(a, v));
}
