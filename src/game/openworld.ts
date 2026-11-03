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
import { layoutOf, roadDist, type Layout, type NpcSpawn, type Piece, type Rect, type Surf } from "./village";

export const OW_COLS = 24000;
export const OW_ORIGIN_C = 12000;
export const OW_ORIGIN_X = OW_ORIGIN_C * TILE;
/** lado de um bloco (px) */
export const CH = 16 * TILE;
/** lado de uma célula de bioma (px) */
export const BC = 44 * TILE;
/** distância (px) que separa um reino do próximo, a partir da partida */
export const RING = 3.4 * BC;
let SEED = 7741;
/** modo fase (v11): um mundo aberto próprio por reino, com vilarejos, mansão, estradas e portal trancado */
export const LV = { on: false, realm: 0, lay: null as Layout | null };
const LVBIOME: { a: number; b: number; t: number } = { a: 0, b: 0, t: 0 };
export function setLevel(realm: number | null) {
  if (realm === null) { LV.on = false; LV.lay = null; SEED = 7741; } else {
    LV.on = true; LV.realm = realm; SEED = 7741 + (realm + 1) * 1013; LV.lay = layoutOf(realm, SEED);
    LVBIOME.a = realm; LVBIOME.b = realm;
  }
  cache.clear();
}

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
  if (LV.on) return LVBIOME;
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

/** retângulo e andares de uma casa pelo id */
export function houseInfo(id: string): { rect: Rect; floors: number } | null {
  if (!LV.lay) return null;
  for (const pl of LV.lay.places) for (const h of pl.houses) if (h.id === id) return h;
  return null;
}
/* ------------------------------------------------------------------ relevo */
const smoothk = (t: number) => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };
/** altura do terreno (tiles): colinas suaves, planícies junto aos vilarejos/estradas e montanhas na borda */
export function terrainH(wx: number, wz: number): number {
  const lay = LV.on ? LV.lay : null;
  if (!lay) return 0;
  const d = Math.hypot(wx, wz);
  let h = Math.max(0, fbm(wx / 2100, wz / 2100, SEED + 200) - 0.4) * 16 + (fbm(wx / 380, wz / 380, SEED + 201) - 0.5) * 1.1;
  let k = 1;
  for (const pl of lay.places) {
    const dd = Math.hypot(wx - pl.x, wz - pl.z);
    if (dd < pl.r + 480) k = Math.min(k, smoothk((dd - pl.r - 60) / 420));
  }
  if (k > 0) k = Math.min(k, 0.25 + 0.75 * smoothk(roadDist(lay, wx, wz) / 220));
  k = Math.min(k, smoothk((Math.hypot(wx - lay.portal.x, wz - lay.portal.z) - 260) / 420));
  h = Math.max(0, h) * k;
  const e = d - (lay.R - 1900);
  if (e > 0) h += Math.pow(e / 1900, 1.6) * 16 * (0.7 + 0.6 * fbm(wx / 500, wz / 500, SEED + 202));
  return h;
}
/** altura do piso (tiles) em (wx,wz) para quem está na elevação cur: terreno, pisos e escadas */
export function floorElev(wx: number, wz: number, cur: number): number {
  let best = terrainH(wx, wz);
  if (!LV.on) return best;
  const ch = chunkAt(Math.floor(wx / CH), Math.floor(wz / CH));
  for (const s of ch.surfs) {
    if (wx < s.x0 || wx > s.x1 || wz < s.z0 || wz > s.z1) continue;
    let hs = s.h0;
    if (s.axis === "x") hs = s.h0 + (s.h1 - s.h0) * ((wx - s.x0) / (s.x1 - s.x0 || 1));
    else if (s.axis === "z") hs = s.h0 + (s.h1 - s.h0) * ((wz - s.z0) / (s.z1 - s.z0 || 1));
    if (hs <= cur + 0.62 && hs > best) best = hs;
  }
  return best;
}

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
  let p = palCache.get(realm + (LV.on ? 100 : 0));
  if (!p) {
    const pl = REALM_THEMES[realm]!.pal;
    // paletas dos reinos são escuras para os corredores; ao ar livre clareamos um pouco o chão
    const lift = (c: [number, number, number], k: number): [number, number, number] => [Math.min(1, c[0] * k + 0.04), Math.min(1, c[1] * k + 0.04), Math.min(1, c[2] * k + 0.04)];
    const tint = GROUND_TINT[REALM_THEMES[realm]!.style];
    const tw = LV.on ? 0.9 : 0.62;
    const gcol = mixc(lift(h2c(pl.ground), 1.05), tint, tw);
    const dcol = mixc(lift(h2c(pl.dark), 1.0), dimc(tint, LV.on ? 0.72 : 0.6), LV.on ? 0.8 : 0.55);
    p = { g: gcol, d: dcol, t: h2c(pl.trim), a: h2c(pl.accent), s0: h2c(pl.s0), s1: h2c(pl.s1), s2: h2c(pl.s2), fog: h2c(pl.fog) };
    palCache.set(realm + (LV.on ? 100 : 0), p);
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
  if (LV.on && LV.lay) {
    // estradas de terra e praças dos vilarejos
    const rd = roadDist(LV.lay, wx, wz);
    let w = rd < 70 ? Math.min(1, (70 - rd) / 30) : 0;
    for (const pl of LV.lay.places) { const d = Math.hypot(wx - pl.x, wz - pl.z); if (d < 150) w = Math.max(w, Math.min(1, (150 - d) / 60) * 0.85); }
    if (w > 0) {
      const dirt: [number, number, number] = [0.5 + 0.06 * k, 0.42 + 0.05 * k, 0.3];
      return [c[0] * k + (dirt[0] - c[0] * k) * w, c[1] * k + (dirt[1] - c[1] * k) * w, c[2] * k + (dirt[2] - c[2] * k) * w];
    }
  }
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
export type Site = { kind: SiteKind; x: number; z: number; id: string; h?: number };
export type Spawn = { id: string; kind: Kind; x: number; z: number; mini?: boolean; look?: Kind; name?: string; realm: number; h?: number };

export type Chunk = { ci: number; cj: number; props: Prop[]; pools: Pool[]; sites: Site[]; spawns: Spawn[]; pieces: Piece[]; walls: Rect[]; surfs: Surf[]; houses: { id: string; rect: Rect; floors: number }[]; npcs: NpcSpawn[] };

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
  const near0 = !LV.on && Math.hypot(x0 + CH / 2, z0 + CH / 2) < 700;
  const pieces: Piece[] = [];
  const walls: Rect[] = [];
  const houses: { id: string; rect: Rect; floors: number }[] = [];
  const surfs: Surf[] = [];
  const npcs: NpcSpawn[] = [];
  const lay = LV.on ? LV.lay : null;
  const inChunk = (x: number, z: number) => x >= x0 && x < x0 + CH && z >= z0 && z < z0 + CH;
  const nearPlace = (x: number, z: number, extra = 0) => { if (!lay) return false; for (const pl of lay.places) if (Math.hypot(x - pl.x, z - pl.z) < pl.r + extra) return true; return false; };
  // espalhamento por sub-células 4x4 (distância mínima garantida pela grade)
  const NS = LV.on ? 6 : 4;
  const SUB = CH / NS;
  for (let j = 0; j < NS; j++) {
    for (let i = 0; i < NS; i++) {
      const sx = ci * NS + i;
      const sz = cj * NS + j;
      const px = x0 + (i + 0.15 + 0.7 * hh(sx, sz, SEED + 31)) * SUB;
      const pz = z0 + (j + 0.15 + 0.7 * hh(sx, sz, SEED + 32)) * SUB;
      const b = biomeAt(px, pz);
      const st = styleOf(b.a);
      // clareiras: ruído grande esvazia regiões
      const clear = fbm(px / 500, pz / 500, SEED + 33);
      // fases: florestas densas, campinas abertas e encostas rochosas
      const forest = LV.on ? fbm(px / 1100, pz / 1100, SEED + 210) : 0.5;
      const dens = LV.on ? (forest > 0.52 ? 1.5 + (forest - 0.52) * 3 : forest < 0.36 ? 0.4 : 0.9) : 1;
      if (hh(sx, sz, SEED + 34) > DENSITY[st] * (0.35 + clear * 1.1) * dens * (LV.on ? 0.9 : 1)) continue;
      if (near0 && Math.hypot(px, pz) < 300) continue;
      if (lay) {
        if (nearPlace(px, pz, 30) || roadDist(lay, px, pz) < 60 || Math.hypot(px - lay.portal.x, pz - lay.portal.z) < 200) continue;
      }
      const list = STYLE_PROPS[st];
      let k = list[Math.floor(hh(sx, sz, SEED + 35) * list.length)]!;
      if (LV.on && st !== "cave" && st !== "cloud" && st !== "gold") {
        const hv = terrainH(px, pz);
        const q = hh(sx, sz, SEED + 211);
        if (hv > 2.2) k = q < 0.55 ? "rock" : q < 0.8 ? "pine" : "dead";
        else if (forest > 0.52) k = q < 0.58 ? (st === "ice" || st === "ruin" ? "pine" : "tree") : q < 0.78 ? "pine" : q < 0.9 ? "bush" : q < 0.96 ? "mush" : "rock";
        else if (forest < 0.36) k = q < 0.6 ? "flower" : q < 0.8 ? "bush" : q < 0.92 ? "rock" : "tree";
      }
      const s = 0.55 + hh(sx, sz, SEED + 36) * 0.75;
      const rr = (BLOCKING[k] ?? 0) * s;
      props.push({ k, x: px, z: pz, r: rr, s, v: hh(sx, sz, SEED + 37), block: rr > 0 });
    }
  }
  if (lay) {
    // muralha natural: borda do mapa com pedras e árvores secas bem densas
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const px = x0 + (i + 0.5) * SUB; const pz = z0 + (j + 0.5) * SUB;
      const d = Math.hypot(px, pz);
      if (d > lay.R - 420 && d < lay.R + 2400) {
        const s = 1.2 + hh(ci * 4 + i, cj * 4 + j, SEED + 38) * 0.9;
        props.push({ k: hh(ci * 4 + i, cj * 4 + j, SEED + 39) < 0.55 ? "rock" : "dead", x: px, z: pz, r: 40 * s, s, v: hh(ci * 4 + i, cj * 4 + j, SEED + 40), block: true });
      }
    }
    const ov = (r: { x0: number; z0: number; x1: number; z1: number }) => r.x1 >= x0 && r.x0 < x0 + CH && r.z1 >= z0 && r.z0 < z0 + CH;
    for (const pl of lay.places) {
      if (Math.hypot(pl.x - (x0 + CH / 2), pl.z - (z0 + CH / 2)) > pl.r + CH + 260) continue;
      for (const pc of pl.pieces) if (inChunk(pc.x, pc.z)) pieces.push(pc);
      for (const w of pl.walls) if ((w.x0 + w.x1) / 2 >= x0 && (w.x0 + w.x1) / 2 < x0 + CH && (w.z0 + w.z1) / 2 >= z0 && (w.z0 + w.z1) / 2 < z0 + CH) walls.push(w);
      for (const sf of pl.surfs) if (ov(sf)) surfs.push(sf);
      for (const h of pl.houses) { const cx = (h.rect.x0 + h.rect.x1) / 2; const cz = (h.rect.z0 + h.rect.z1) / 2; if (inChunk(cx, cz)) houses.push(h); }
      for (const l of pl.lamps) if (inChunk(l.x, l.z)) props.push({ k: "lamp", x: l.x, z: l.z, r: 8, s: 1, v: 0.5, block: true });
      for (const c of pl.chests) if (inChunk(c.x, c.z)) sites.push({ kind: "chest", x: c.x, z: c.z, id: c.id, h: c.h });
      for (const n of pl.npcs) if (inChunk(n.x, n.z)) npcs.push(n);
    }
    if (inChunk(lay.portal.x, lay.portal.z)) sites.push({ kind: "shrine", x: lay.portal.x + 150, z: lay.portal.z, id: "portal-shrine" });
  }
  // perigos do terreno: poças grandes (lava, veneno, gelo cortante...)
  const cb = biomeAt(x0 + CH / 2, z0 + CH / 2);
  const hz = hh(ci, cj, SEED + 41);
  const poolChance = 0.2 + Math.min(0.2, cb.a * 0.01);
  if (!near0 && hz < poolChance && !(lay && (nearPlace(x0 + CH / 2, z0 + CH / 2, 500) || roadDist(lay, x0 + CH / 2, z0 + CH / 2) < 200))) {
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
  if (lay) {
    // nada de monstros dentro dos vilarejos; mais fortes longe da partida
    for (let i = spawns.length - 1; i >= 0; i--) if (nearPlace(spawns[i]!.x, spawns[i]!.z, 60) ) spawns.splice(i, 1);
    for (let i = sites.length - 1; i >= 0; i--) { const st = sites[i]!; if (st.kind !== "chest" && nearPlace(st.x, st.z, 40)) sites.splice(i, 1); }
    // guardiões da mansão
    for (const pl of lay.places) if (pl.kind === "castle" && inChunk(pl.x, pl.z - 60)) {
      const th = REALM_THEMES[lay.realm]!;
      const m = th.minis[0]!;
      sites.push({ kind: "elite", x: pl.x, z: pl.z - 60, id: "castle:elite" });
      spawns.push({ id: "castle:boss", kind: "boss", x: pl.x, z: pl.z - 60, mini: true, look: m.look, name: "Guardião: " + m.name, realm: lay.realm });
      for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; spawns.push({ id: `castle:g${q}`, kind: th.pool[q % th.pool.length]!, x: pl.x + Math.cos(a) * 250, z: pl.z + 60 + Math.sin(a) * 150, realm: lay.realm }); }
    }
    for (const pl of lay.places) if (pl.kind === "mansion" && inChunk(pl.x, pl.z)) {
      const th = REALM_THEMES[lay.realm]!;
      spawns.push({ id: "mansion:boss", kind: "boss", x: pl.x, z: pl.z - 70, mini: true, look: th.minis[1]!.look, name: th.minis[1]!.name, realm: lay.realm });
      spawns.push({ id: "mansion:g0", kind: th.pool[0]!, x: pl.x - 40, z: pl.z + 60, realm: lay.realm }, { id: "mansion:g1", kind: th.pool[1]!, x: pl.x + 40, z: pl.z + 60, realm: lay.realm });
    }
  }
  return { ci, cj, props, pools, sites, spawns, pieces, walls, surfs, houses, npcs };
}

/* ----------------------------------------------------------------- portais */
/** posição (mundo, px) do portal do reino k: espiral dourada, cada reino na sua faixa de distância */
export function portalPos(k: number): { x: number; z: number } {
  const ang = k * 2.399963 + 0.6;
  const d = k === 0 ? 560 : k * RING * 0.92 + 700;
  return { x: Math.cos(ang) * d, z: Math.sin(ang) * d };
}
export const PORTALS_W: { x: number; z: number }[] = Array.from({ length: MAIN_LEVELS }, (_, k) => portalPos(k));
/** em modo fase há um único portal, no fim do mapa */
export const levelPortal = () => (LV.on && LV.lay ? LV.lay.portal : null);

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
const wBuf: Rect[] = [];
export function wallsNear(wx: number, wz: number, rad: number): Rect[] {
  wBuf.length = 0;
  const c0 = Math.floor((wx - rad) / CH); const c1 = Math.floor((wx + rad) / CH);
  const r0 = Math.floor((wz - rad) / CH); const r1 = Math.floor((wz + rad) / CH);
  for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) for (const w of chunkAt(i, j).walls) wBuf.push(w);
  return wBuf;
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
