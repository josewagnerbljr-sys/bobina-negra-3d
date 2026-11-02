/**
 * Mundo aberto ILIMITADO (v10): o mapa é gerado por blocos (chunks) a partir de uma semente,
 * com biomas = os 25 reinos (mais difíceis quanto mais longe do ponto de partida), espalhamento
 * de objetos por regras, perigos do próprio terreno (lava, veneno, espinhos, gelo, areia movediça),
 * eventos aleatórios (meteoros, raios, emboscadas, andarilhos), acampamentos, santuários,
 * baús e chefes errantes. Padrões inspirados em mundos abertos procedurais (biomas como dados,
 * Voronoi com bordas distorcidas por ruído, ruído em camadas, dispersão por regras).
 */
import { TILE, MAIN_LEVELS, type Kind } from "./types";
import { REALM_THEMES, type RealmStyle } from "./realms";

export const OW_COLS = 24000;
export const OW_ORIGIN_C = 12000;
export const OW_ORIGIN_X = OW_ORIGIN_C * TILE;
/** lado de um bloco (px) */
export const CH = 16 * TILE;
/** lado de uma célula de bioma (px) */
export const BC = 44 * TILE;
/** distância (px) que separa um reino do próximo, a partir da partida */
export const RING = 3.4 * BC;
const SEED = 7741;

/* ------------------------------------------------------------------ ruído */
function hh(a: number, b: number, s: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const sm = (t: number) => t * t * (3 - 2 * t);
export function vnoise(x: number, z: number, s: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = sm(x - x0);
  const fz = sm(z - z0);
  const a = hh(x0, z0, s);
  const b = hh(x0 + 1, z0, s);
  const c = hh(x0, z0 + 1, s);
  const d = hh(x0 + 1, z0 + 1, s);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
export function fbm(x: number, z: number, s: number): number {
  return vnoise(x, z, s) * 0.55 + vnoise(x * 2.1, z * 2.1, s + 1) * 0.3 + vnoise(x * 4.3, z * 4.3, s + 2) * 0.15;
}

/* ----------------------------------------------------------------- biomas */
export type BiomeHit = { a: number; b: number; t: number };

/** reino (0..24) do centro de uma célula: sobe com a distância da partida */
function cellRealm(i: number, j: number): number {
  if (i === 0 && j === 0) return 0;
  const cx = (i + 0.5) * BC;
  const cz = (j + 0.5) * BC;
  const ring = Math.hypot(cx, cz) / RING;
  const r = Math.round(ring * 1.0 + (hh(i, j, SEED + 5) - 0.5) * 5.2);
  return Math.max(0, Math.min(MAIN_LEVELS - 1, r));
}

const biomeCache = new Map<number, BiomeHit>();
export function biomeAt(wx: number, wz: number): BiomeHit {
  // bordas distorcidas por ruído
  const qx = wx + (fbm(wx / 900, wz / 900, SEED + 11) - 0.5) * 720;
  const qz = wz + (fbm(wx / 900 + 40, wz / 900 + 40, SEED + 12) - 0.5) * 720;
  const ci = Math.floor(qx / BC);
  const cj = Math.floor(qz / BC);
  let d1 = 1e9;
  let d2 = 1e9;
  let r1 = 0;
  let r2 = 0;
  for (let j = cj - 1; j <= cj + 1; j++) {
    for (let i = ci - 1; i <= ci + 1; i++) {
      const fx = (i + 0.2 + 0.6 * hh(i, j, SEED + 1)) * BC;
      const fz = (j + 0.2 + 0.6 * hh(i, j, SEED + 2)) * BC;
      const d = Math.hypot(qx - fx, qz - fz);
      const rl = cellRealm(i, j);
      if (d < d1) {
        d2 = d1;
        r2 = r1;
        d1 = d;
        r1 = rl;
      } else if (d < d2) {
        d2 = d;
        r2 = rl;
      }
    }
  }
  const w = BC * 0.32;
  const t = 0.5 - 0.5 * Math.min(1, (d2 - d1) / w);
  return { a: r1, b: r2, t };
}
void biomeCache;

export const styleOf = (realm: number): RealmStyle => REALM_THEMES[realm]!.style;

/** nível de perigo 0..24 na posição (usa o reino local) */
export const dangerAt = (wx: number, wz: number) => biomeAt(wx, wz).a;

/* ------------------------------------------------------------ cores do chão */
function h2c(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const dimc = (c: [number, number, number], k: number): [number, number, number] => [c[0] * k, c[1] * k, c[2] * k];
const GROUND_TINT: Record<RealmStyle, [number, number, number]> = {
  mansion: [0.27, 0.4, 0.2],
  garden: [0.3, 0.5, 0.22],
  swamp: [0.24, 0.3, 0.2],
  cave: [0.3, 0.14, 0.22],
  city: [0.38, 0.34, 0.33],
  ice: [0.78, 0.88, 0.96],
  ruin: [0.46, 0.46, 0.4],
  cloud: [0.86, 0.9, 1.0],
  gold: [0.78, 0.65, 0.38],
};
const palCache = new Map<number, { g: [number, number, number]; d: [number, number, number]; t: [number, number, number]; a: [number, number, number]; s0: [number, number, number]; s1: [number, number, number]; s2: [number, number, number]; fog: [number, number, number] }>();
export function palOf(realm: number) {
  let p = palCache.get(realm);
  if (!p) {
    const pl = REALM_THEMES[realm]!.pal;
    // paletas dos reinos são escuras para os corredores; ao ar livre clareamos um pouco o chão
    const lift = (c: [number, number, number], k: number): [number, number, number] => [Math.min(1, c[0] * k + 0.04), Math.min(1, c[1] * k + 0.04), Math.min(1, c[2] * k + 0.04)];
    const tint = GROUND_TINT[REALM_THEMES[realm]!.style];
    const gcol = mixc(lift(h2c(pl.ground), 1.05), tint, 0.62);
    const dcol = mixc(lift(h2c(pl.dark), 1.0), dimc(tint, 0.6), 0.55);
    p = { g: gcol, d: dcol, t: h2c(pl.trim), a: h2c(pl.accent), s0: h2c(pl.s0), s1: h2c(pl.s1), s2: h2c(pl.s2), fog: h2c(pl.fog) };
    palCache.set(realm, p);
  }
  return p;
}
const mixc = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function groundColor(wx: number, wz: number, bh?: BiomeHit): [number, number, number] {
  const b = bh ?? biomeAt(wx, wz);
  const pa = palOf(b.a);
  const pb = palOf(b.b);
  const n = fbm(wx / 260, wz / 260, SEED + 21);
  const ca = mixc(pa.d, pa.g, n);
  const cb = mixc(pb.d, pb.g, n);
  const c = mixc(ca, cb, b.t);
  const k = 0.82 + 0.3 * vnoise(wx / 70, wz / 70, SEED + 22);
  return [c[0] * k, c[1] * k, c[2] * k];
}

/** céu/neblina misturados pelo bioma da posição */
export function skyAt(wx: number, wz: number) {
  const b = biomeAt(wx, wz);
  const pa = palOf(b.a);
  const pb = palOf(b.b);
  const m = (k: "s0" | "s1" | "s2" | "fog") => mixc(pa[k], pb[k], b.t);
  return { top: m("s0"), mid: m("s1"), bot: m("s2"), fog: m("fog"), realm: b.a, style: styleOf(b.a) };
}

/* ---------------------------------------------------------- objetos do chão */
export type PropKind = "tree" | "pine" | "dead" | "rock" | "pillar" | "crystal" | "spire" | "bones" | "wall" | "bush" | "flower" | "puff" | "tomb" | "lamp" | "mush" | "arch";
export type Prop = { k: PropKind; x: number; z: number; r: number; s: number; v: number; block: boolean };

const STYLE_PROPS: Record<RealmStyle, PropKind[]> = {
  mansion: ["tree", "lamp", "wall", "bush", "tomb", "flower", "rock"],
  cave: ["spire", "rock", "crystal", "spire", "bones", "rock", "pillar"],
  swamp: ["dead", "mush", "rock", "bush", "dead", "bones", "tomb"],
  city: ["pillar", "wall", "lamp", "rock", "bones", "arch", "wall"],
  ice: ["pine", "crystal", "rock", "pine", "bones", "crystal", "pine"],
  ruin: ["pillar", "wall", "arch", "dead", "tomb", "rock", "bones"],
  garden: ["tree", "bush", "flower", "tree", "flower", "rock", "mush"],
  cloud: ["puff", "crystal", "pillar", "puff", "flower", "arch", "puff"],
  gold: ["pillar", "arch", "crystal", "wall", "lamp", "rock", "pillar"],
};
const DENSITY: Record<RealmStyle, number> = { mansion: 0.5, cave: 0.55, swamp: 0.55, city: 0.42, ice: 0.5, ruin: 0.46, garden: 0.62, cloud: 0.4, gold: 0.42 };
const BLOCKING: Partial<Record<PropKind, number>> = { tree: 20, pine: 18, dead: 14, rock: 24, pillar: 18, crystal: 16, spire: 20, wall: 34, tomb: 20, arch: 0, lamp: 8 };

/* ----------------------------------------------------------------- perigos */
export type PoolKind = "lava" | "poison" | "thorn" | "frost" | "sand" | "storm";
export type Pool = { x: number; z: number; r: number; kind: PoolKind };
export const POOL_STYLE: Record<RealmStyle, PoolKind> = { mansion: "thorn", cave: "lava", swamp: "poison", city: "lava", ice: "frost", ruin: "thorn", garden: "thorn", cloud: "storm", gold: "sand" };
export const POOL_COLOR: Record<PoolKind, [number, number, number]> = {
  lava: [1.0, 0.34, 0.08],
  poison: [0.45, 0.85, 0.2],
  thorn: [0.55, 0.12, 0.2],
  frost: [0.6, 0.85, 1.0],
  sand: [0.85, 0.7, 0.35],
  storm: [0.7, 0.75, 1.0],
};
export const POOL_NAME: Record<PoolKind, string> = { lava: "lava", poison: "veneno", thorn: "espinhos", frost: "gelo cortante", sand: "areia movediça", storm: "descarga elétrica" };

/* ------------------------------------------------------------------ pontos */
export type SiteKind = "camp" | "shrine" | "ruin" | "elite" | "chest";
export type Site = { kind: SiteKind; x: number; z: number; id: string };
export type Spawn = { id: string; kind: Kind; x: number; z: number; mini?: boolean; look?: Kind; name?: string; realm: number };

export type Chunk = { ci: number; cj: number; props: Prop[]; pools: Pool[]; sites: Site[]; spawns: Spawn[] };

const cache = new Map<string, Chunk>();
export const chunkKey = (ci: number, cj: number) => `${ci},${cj}`;

export function chunkAt(ci: number, cj: number): Chunk {
  const key = chunkKey(ci, cj);
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const ch = genChunk(ci, cj);
  cache.set(key, ch);
  while (cache.size > 220) cache.delete(cache.keys().next().value as string);
  return ch;
}

function genChunk(ci: number, cj: number): Chunk {
  const x0 = ci * CH;
  const z0 = cj * CH;
  const props: Prop[] = [];
  const pools: Pool[] = [];
  const sites: Site[] = [];
  const spawns: Spawn[] = [];
  const near0 = Math.hypot(x0 + CH / 2, z0 + CH / 2) < 700;
  // espalhamento por sub-células 4x4 (distância mínima garantida pela grade)
  const SUB = CH / 4;
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const sx = ci * 4 + i;
      const sz = cj * 4 + j;
      const px = x0 + (i + 0.15 + 0.7 * hh(sx, sz, SEED + 31)) * SUB;
      const pz = z0 + (j + 0.15 + 0.7 * hh(sx, sz, SEED + 32)) * SUB;
      const b = biomeAt(px, pz);
      const st = styleOf(b.a);
      // clareiras: ruído grande esvazia regiões
      const clear = fbm(px / 500, pz / 500, SEED + 33);
      if (hh(sx, sz, SEED + 34) > DENSITY[st] * (0.35 + clear * 1.1)) continue;
      if (near0 && Math.hypot(px, pz) < 300) continue;
      const list = STYLE_PROPS[st];
      const k = list[Math.floor(hh(sx, sz, SEED + 35) * list.length)]!;
      const s = 0.55 + hh(sx, sz, SEED + 36) * 0.75;
      const rr = (BLOCKING[k] ?? 0) * s;
      props.push({ k, x: px, z: pz, r: rr, s, v: hh(sx, sz, SEED + 37), block: rr > 0 });
    }
  }
  // perigos do terreno: poças grandes (lava, veneno, gelo cortante...)
  const cb = biomeAt(x0 + CH / 2, z0 + CH / 2);
  const hz = hh(ci, cj, SEED + 41);
  const poolChance = 0.2 + Math.min(0.2, cb.a * 0.01);
  if (!near0 && hz < poolChance) {
    const px = x0 + (0.2 + 0.6 * hh(ci, cj, SEED + 42)) * CH;
    const pz = z0 + (0.2 + 0.6 * hh(ci, cj, SEED + 43)) * CH;
    const r = 70 + hh(ci, cj, SEED + 44) * 110;
    const bb = biomeAt(px, pz);
    pools.push({ x: px, z: pz, r, kind: POOL_STYLE[styleOf(bb.a)] });
  }
  // remove objetos que ficariam dentro de poças
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i]!;
    for (const q of pools) if (Math.hypot(p.x - q.x, p.z - q.z) < q.r + p.r + 12) { props.splice(i, 1); break; }
  }
  // inimigos
  const pool = (r: number) => REALM_THEMES[r]!.pool;
  const hb = hh(ci, cj, SEED + 51);
  const base = near0 ? 0 : hb < 0.4 ? 0 : hb < 0.85 ? 1 : 2;
  for (let n = 0; n < base; n++) {
    const px = x0 + hh(ci * 7 + n, cj, SEED + 52) * CH;
    const pz = z0 + hh(ci, cj * 7 + n, SEED + 53) * CH;
    const r = biomeAt(px, pz).a;
    const pl = pool(r);
    spawns.push({ id: `${ci},${cj}:m${n}`, kind: pl[Math.floor(hh(ci + n, cj, SEED + 54) * pl.length)]!, x: px, z: pz, realm: r });
  }
  // pontos de interesse
  const roll = hh(ci, cj, SEED + 61);
  const cx = x0 + (0.25 + 0.5 * hh(ci, cj, SEED + 62)) * CH;
  const cz = z0 + (0.25 + 0.5 * hh(ci, cj, SEED + 63)) * CH;
  const rr = biomeAt(cx, cz).a;
  if (!near0) {
    if (roll < 0.07) {
      // acampamento: fogueira, baú e um bando
      sites.push({ kind: "camp", x: cx, z: cz, id: `${ci},${cj}:camp` });
      sites.push({ kind: "chest", x: cx + 40, z: cz + 20, id: `${ci},${cj}:cchest` });
      const pl = pool(rr);
      const n = 4 + Math.floor(hh(ci, cj, SEED + 64) * 3);
      for (let q = 0; q < n; q++) {
        const a = (q / n) * Math.PI * 2;
        spawns.push({ id: `${ci},${cj}:c${q}`, kind: pl[q % pl.length]!, x: cx + Math.cos(a) * 150, z: cz + Math.sin(a) * 150, realm: rr });
      }
    } else if (roll < 0.105) {
      sites.push({ kind: "shrine", x: cx, z: cz, id: `${ci},${cj}:shrine` });
    } else if (roll < 0.16) {
      // ruína com baú e guardião
      sites.push({ kind: "ruin", x: cx, z: cz, id: `${ci},${cj}:ruin` });
      sites.push({ kind: "chest", x: cx, z: cz, id: `${ci},${cj}:rchest` });
      const th = REALM_THEMES[rr]!;
      spawns.push({ id: `${ci},${cj}:rguard`, kind: th.pool[0]!, x: cx + 60, z: cz, realm: rr });
      spawns.push({ id: `${ci},${cj}:rguard2`, kind: th.pool[1]!, x: cx - 60, z: cz, realm: rr });
    } else if (roll < 0.2 + Math.min(0.03, rr * 0.002)) {
      // chefe errante (mini-chefe do reino)
      const th = REALM_THEMES[rr]!;
      const m = th.minis[Math.floor(hh(ci, cj, SEED + 65) * th.minis.length)]!;
      sites.push({ kind: "elite", x: cx, z: cz, id: `${ci},${cj}:elite` });
      spawns.push({ id: `${ci},${cj}:elite`, kind: "boss", x: cx, z: cz, mini: true, look: m.look, name: m.name, realm: rr });
    } else if (roll < 0.26) {
      sites.push({ kind: "chest", x: cx, z: cz, id: `${ci},${cj}:chest` });
    }
  }
  return { ci, cj, props, pools, sites, spawns };
}

/* ----------------------------------------------------------------- portais */
/** posição (mundo, px) do portal do reino k: espiral dourada, cada reino na sua faixa de distância */
export function portalPos(k: number): { x: number; z: number } {
  const ang = k * 2.399963 + 0.6;
  const d = k === 0 ? 560 : k * RING * 0.92 + 700;
  return { x: Math.cos(ang) * d, z: Math.sin(ang) * d };
}
export const PORTALS_W = Array.from({ length: MAIN_LEVELS }, (_, k) => portalPos(k));

/* --------------------------------------------------------------- colisões */
const colBuf: Prop[] = [];
/** objetos sólidos nas proximidades (mundo, px) */
export function blockersNear(wx: number, wz: number, rad: number): Prop[] {
  colBuf.length = 0;
  const c0 = Math.floor((wx - rad) / CH);
  const c1 = Math.floor((wx + rad) / CH);
  const r0 = Math.floor((wz - rad) / CH);
  const r1 = Math.floor((wz + rad) / CH);
  for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) for (const p of chunkAt(i, j).props) if (p.block) colBuf.push(p);
  return colBuf;
}
export function poolsNear(wx: number, wz: number, rad: number): Pool[] {
  const out: Pool[] = [];
  const c0 = Math.floor((wx - rad) / CH);
  const c1 = Math.floor((wx + rad) / CH);
  const r0 = Math.floor((wz - rad) / CH);
  const r1 = Math.floor((wz + rad) / CH);
  for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) for (const p of chunkAt(i, j).pools) out.push(p);
  return out;
}

export const REGION_NAMES = (r: number) => r;
