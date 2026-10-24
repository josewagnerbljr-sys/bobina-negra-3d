import { STAT_KEYS, type Equip, type HeroId, type Stats, type StatKey } from "./types";

/** pontos base de cada herói no nível 1 */
export const BASE_STATS: Record<HeroId, Stats> = {
  ivo: { str: 6, int: 1, dex: 3, wis: 2, rec: 5 },
  lena: { str: 3, int: 4, dex: 5, wis: 3, rec: 2 },
  osso: { str: 2, int: 6, dex: 2, wis: 5, rec: 3 },
  syl: { str: 3, int: 2, dex: 7, wis: 3, rec: 3 },
};

export const STAT_INFO: Record<StatKey, { abbr: string; name: string; text: string }> = {
  str: { abbr: "FOR", name: "Força", text: "Dano de tiro, golpe e poderes unitários." },
  int: { abbr: "INT", name: "Inteligência", text: "Dano e alcance dos poderes em área. Forma dura mais." },
  dex: { abbr: "DES", name: "Destreza", text: "Velocidade, cadência de tiro, chance de crítico." },
  wis: { abbr: "SAB", name: "Sabedoria", text: "Recarga menor de poderes e forma, mais XP e mais drops." },
  rec: { abbr: "REC", name: "Recuperação", text: "Mais corações, poções curam mais, escudo de dano mais longo." },
};

export function sumEquip(eq: Equip): Stats {
  const out: Stats = { str: 0, int: 0, dex: 0, wis: 0, rec: 0 };
  for (const it of [eq.weapon, eq.armor, eq.relic]) {
    if (!it) continue;
    for (const k of STAT_KEYS) out[k] += it.mods[k] ?? 0;
  }
  return out;
}

export function totalStats(hero: HeroId, alloc: Stats, eq: Equip): Stats {
  const base = BASE_STATS[hero];
  const e = sumEquip(eq);
  const out = { ...base };
  for (const k of STAT_KEYS) out[k] = base[k] + alloc[k] + e[k];
  return out;
}

export type Derived = {
  maxHp: number;
  phys: number;
  magic: number;
  radius: number;
  speed: number;
  atkCd: number;
  crit: number;
  cdr: number;
  formDur: number;
  formCool: number;
  xp: number;
  luck: number;
  potion: number;
  iframe: number;
};

export function derive(s: Stats, level: number): Derived {
  const hearts = 5 + Math.floor(s.rec / 5) + Math.floor(level / 12);
  const cdr = Math.min(0.5, 0.0085 * (s.wis - 1));
  return {
    maxHp: Math.min(16, hearts),
    phys: 1 + 0.05 * (s.str - 1),
    magic: 1 + 0.055 * (s.int - 1),
    radius: 1 + Math.min(0.6, 0.012 * (s.int - 1)),
    speed: 1 + Math.min(0.45, 0.0075 * (s.dex - 1)),
    atkCd: Math.max(0.13, 0.36 * Math.pow(0.985, s.dex - 1)),
    crit: Math.min(0.6, 0.02 + 0.006 * (s.dex - 1)),
    cdr,
    formDur: 7 + 0.1 * s.wis + 0.06 * s.int,
    formCool: Math.max(3.5, 11 * (1 - cdr)),
    xp: 1 + 0.01 * (s.wis - 1),
    luck: 1 + 0.012 * (s.wis - 1),
    potion: 2 + Math.floor(s.rec / 12),
    iframe: 0.95 + Math.min(0.5, 0.01 * s.rec),
  };
}

export function derivedLines(d: Derived): Record<string, string> {
  const pct = (v: number) => `${Math.round((v - 1) * 100)}%`;
  return {
    "Dano físico": `+${pct(d.phys)}`,
    "Dano em área": `+${pct(d.magic)}`,
    "Alcance de área": `+${pct(d.radius)}`,
    Velocidade: `+${pct(d.speed)}`,
    Cadência: `${(1 / d.atkCd).toFixed(1)}/s`,
    Crítico: `${Math.round(d.crit * 100)}%`,
    Recarga: `-${Math.round(d.cdr * 100)}%`,
    Forma: `${d.formDur.toFixed(1)}s`,
    XP: `+${pct(d.xp)}`,
    Corações: `${d.maxHp}`,
  };
}
