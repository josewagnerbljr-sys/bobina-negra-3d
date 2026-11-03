/** Malha de um bloco do mundo aberto: chão com cor misturada entre biomas + objetos + perigos. */
import { addBox, addCone, addSphere, newGeo, type Geo, type Vec3 } from "./gl";
import { CH, LV, biomeAt, chunkAt, groundColor, houseInfo, palOf, styleOf, terrainH, POOL_COLOR, type Prop } from "../game/openworld";
import { FH } from "../game/village";
import { ROWS, GROUND, TILE } from "../game/types";

const GY = ROWS - GROUND;

/* ---- modelos CC0 do Quaternius Stylized Nature MegaKit (cores assadas das texturas; copas reconstruídas) ---- */
type NM = { p: number[]; n: number[]; c: number[]; i: number[] };
type MSet = { d: Record<string, NM> | null; by: Record<string, string[]> };
const SETS: Record<"nat" | "med" | "prop", MSet> = { nat: { d: null, by: {} }, med: { d: null, by: {} }, prop: { d: null, by: {} } };
let NAT: Record<string, NM> | null = null;
const NAT_BY = SETS.nat.by;
export const natureReady = () => NAT !== null;
function loadSet(set: MSet, url: string): Promise<void> {
  return fetch(url)
    .then((r) => r.json())
    .then((d: Record<string, NM>) => {
      set.d = d;
      for (const k of Object.keys(d)) (set.by[k.replace(/_\d+(_Big)?$/, "")] ??= []).push(k);
    })
    .catch(() => undefined);
}
export function loadNature(base: string, q = ""): Promise<void> {
  return Promise.all([loadSet(SETS.nat, base + "nature2.json" + q), loadSet(SETS.med, base + "medieval.json" + q), loadSet(SETS.prop, base + "props.json" + q)]).then(() => {
    NAT = SETS.nat.d;
  });
}
const hasNat = (pre: string) => Boolean(NAT && NAT_BY[pre]);
void hasNat;
/** coloca um modelo; ang em radianos; s = tiles por unidade do modelo */
function addM(g: Geo, set: MSet, pre: string, v: number, x: number, y: number, z: number, s: number, tint: Vec3, ang?: number) {
  const list = set.by[pre];
  if (!set.d || !list) return;
  const m = set.d[list[Math.floor(v * 977) % list.length]!]!;
  const a = ang ?? v * 6.283;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const base = g.pos.length / 3;
  for (let i = 0; i < m.p.length; i += 3) {
    const px = m.p[i]!;
    const pz = m.p[i + 2]!;
    g.pos.push(x + (px * ca + pz * sa) * s, y + m.p[i + 1]! * s, z + (-px * sa + pz * ca) * s);
    const nx = m.n[i]!;
    const nz = m.n[i + 2]!;
    g.nor.push(nx * ca + nz * sa, m.n[i + 1]!, -nx * sa + nz * ca);
    g.col.push(Math.min(1, m.c[i]! * tint[0]), Math.min(1, m.c[i + 1]! * tint[1]), Math.min(1, m.c[i + 2]! * tint[2]));
  }
  for (const k of m.i) g.idx.push(base + k);
}
function addNat(g: Geo, pre: string, v: number, x: number, y: number, z: number, s: number, tint: Vec3) {
  addM(g, SETS.nat, pre, v, x, y, z, s, tint);
}
const STYLE_TINT: Record<string, Vec3> = {
  garden: [0.8, 0.92, 0.72], mansion: [0.78, 0.9, 0.7], swamp: [0.7, 0.8, 0.6], cave: [0.75, 0.55, 0.6], city: [0.8, 0.75, 0.75],
  ice: [1.25, 1.35, 1.5], ruin: [0.9, 0.85, 0.75], cloud: [1.3, 1.3, 1.4], gold: [1.4, 1.2, 0.8],
};
/** devolve true se o objeto foi desenhado com um modelo do pacote */
function natProp(g: Geo, p: Prop, style: string): boolean {
  if (!NAT) return false;
  const x = p.x / TILE;
  const z = p.z / TILE;
  const s = p.s;
  const t = STYLE_TINT[style] ?? [1, 1, 1];
  const bare = style === "swamp" || style === "ruin" || style === "cave" || style === "city";
  switch (p.k) {
    case "tree": addNat(g, bare ? "DeadTree" : p.v < 0.9 ? "CommonTree" : "TwistedTree", p.v, x, GY, z, (p.v < 0.9 || bare ? 0.42 : 0.26) * s, t); return true;
    case "pine": addNat(g, "Pine", p.v, x, GY, z, 0.46 * s, t); return true;
    case "dead": addNat(g, "DeadTree", p.v, x, GY, z, 0.42 * s, t); return true;
    case "rock": addNat(g, "Rock_Medium", p.v, x, GY, z, 0.55 * s, t); return true;
    case "bush": addNat(g, p.v < 0.5 ? "Fern" : "Plant", p.v, x, GY, z, 0.45 * s, t); return true;
    case "flower": addNat(g, p.v < 0.4 ? "Petal" : p.v < 0.7 ? "Clover" : "Grass_Wispy_Short", p.v, x, GY, z, 0.8 * s, t); return true;
    case "pebble": addNat(g, p.v < 0.5 ? "Pebble_Round" : "Pebble_Square", p.v, x, GY, z, 1.1 * s, t); return true;
    case "grass": addNat(g, p.v < 0.5 ? "Grass_Wispy_Short" : "Grass_Common_Short", p.v, x, GY, z, 0.8 * s, t); return true;
    case "mush": addNat(g, "Mushroom_Common", p.v, x, GY, z, 0.9 * s, t); return true;
    default: return false;
  }
}
const dim = (c: Vec3, k: number): Vec3 => [c[0] * k, c[1] * k, c[2] * k];
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function leafColor(style: string, v: number): Vec3 {
  if (style === "garden" || style === "mansion") return mix([0.16, 0.42, 0.18], [0.3, 0.55, 0.2], v);
  if (style === "swamp") return mix([0.2, 0.3, 0.14], [0.3, 0.38, 0.18], v);
  if (style === "ice") return mix([0.7, 0.85, 0.95], [0.5, 0.7, 0.86], v);
  if (style === "cloud") return mix([0.95, 0.95, 1], [0.8, 0.86, 1], v);
  if (style === "gold") return mix([0.8, 0.65, 0.2], [0.95, 0.8, 0.3], v);
  return mix([0.25, 0.2, 0.2], [0.35, 0.25, 0.25], v);
}

function propGeo(g: Geo, glow: Geo, p: Prop, style: string, realm: number) {
  const pal = palOf(realm);
  const x = p.x / TILE;
  const z = p.z / TILE;
  const y = GY;
  const s = p.s;
  const v = p.v;
  const stone = mix(dim(pal.g, 0.9), [0.55, 0.55, 0.58], 0.35 + v * 0.2);
  const dark = dim(pal.d, 1.1);
  const trunk: Vec3 = [0.3, 0.2, 0.14];
  const leaf = leafColor(style, v);
  switch (p.k) {
    case "tree": {
      addCone(g, x, y, z, 0.13 * s, 0.09 * s, 1.0 * s, 6, trunk);
      addCone(g, x, y + 0.7 * s, z, 0.78 * s, 0.0, 1.0 * s, 8, dim(leaf, 0.85), leaf);
      addCone(g, x, y + 1.25 * s, z, 0.58 * s, 0.0, 0.9 * s, 8, leaf, mix(leaf, [1, 1, 0.8], 0.25));
      break;
    }
    case "pine": {
      addCone(g, x, y, z, 0.1 * s, 0.08 * s, 0.6 * s, 5, trunk);
      for (let k = 0; k < 3; k++) addCone(g, x, y + (0.4 + k * 0.55) * s, z, (0.7 - k * 0.18) * s, 0, 0.85 * s, 7, dim(leaf, 0.9 + k * 0.05), [1, 1, 1]);
      break;
    }
    case "dead": {
      addCone(g, x, y, z, 0.12 * s, 0.04 * s, 1.5 * s, 5, dim(trunk, 0.7));
      addCone(g, x + 0.2 * s, y + 0.8 * s, z, 0.06 * s, 0.0, 0.7 * s, 4, dim(trunk, 0.7));
      addCone(g, x - 0.18 * s, y + 1.0 * s, z + 0.1 * s, 0.05 * s, 0.0, 0.6 * s, 4, dim(trunk, 0.7));
      break;
    }
    case "rock": {
      addCone(g, x, y, z, 0.55 * s, 0.22 * s, 0.55 * s, 6, stone, mix(stone, [1, 1, 1], 0.25));
      addCone(g, x + 0.4 * s, y, z + 0.2 * s, 0.3 * s, 0.12 * s, 0.3 * s, 5, dim(stone, 0.85));
      break;
    }
    case "pillar": {
      const h = (0.8 + v * 1.1) * s;
      addCone(g, x, y, z, 0.3 * s, 0.26 * s, h, 8, stone, mix(stone, [1, 1, 1], 0.2));
      addBox(g, x - 0.38 * s, y, z - 0.38 * s, x + 0.38 * s, y + 0.14 * s, z + 0.38 * s, dim(stone, 0.85));
      if (v > 0.45) addBox(g, x - 0.36 * s, y + h, z - 0.36 * s, x + 0.36 * s, y + h + 0.16 * s, z + 0.36 * s, dim(stone, 0.95));
      else addCone(g, x, y + h, z, 0.26 * s, 0.05 * s, 0.18 * s, 5, dim(stone, 0.8));
      break;
    }
    case "crystal": {
      const c = pal.a;
      addCone(g, x, y, z, 0.28 * s, 0.0, 1.3 * s, 5, dim(c, 0.55), mix(c, [1, 1, 1], 0.5));
      addCone(g, x + 0.3 * s, y, z + 0.1 * s, 0.18 * s, 0.0, 0.8 * s, 5, dim(c, 0.5), c);
      addCone(g, x - 0.25 * s, y, z - 0.12 * s, 0.16 * s, 0.0, 0.7 * s, 5, dim(c, 0.5), c);
      addCone(glow, x, y + 0.6 * s, z, 0.1 * s, 0, 0.3 * s, 5, dim(c, 0.9), c);
      break;
    }
    case "spire": {
      addCone(g, x, y, z, 0.5 * s, 0.0, (1.6 + v) * s, 6, dark, mix(dark, pal.a, 0.35));
      addCone(g, x + 0.45 * s, y, z - 0.1 * s, 0.25 * s, 0, 0.9 * s, 5, dim(dark, 0.9));
      break;
    }
    case "bones": {
      addSphere(g, x, y + 0.14 * s, z, 0.14 * s, 6, 4, [0.9, 0.88, 0.8]);
      addBox(g, x + 0.15 * s, y, z - 0.05 * s, x + 0.65 * s, y + 0.06 * s, z + 0.03 * s, [0.85, 0.83, 0.75]);
      addBox(g, x - 0.3 * s, y, z + 0.1 * s, x + 0.1 * s, y + 0.06 * s, z + 0.17 * s, [0.85, 0.83, 0.75]);
      break;
    }
    case "wall": {
      const w = 0.7 * s;
      const d = 0.16 * s;
      const h = (0.5 + v * 0.7) * s;
      if (v > 0.5) addBox(g, x - w, y, z - d, x + w, y + h, z + d, stone, {}, mix(stone, [1, 1, 1], 0.15));
      else addBox(g, x - d, y, z - w, x + d, y + h, z + w, stone, {}, mix(stone, [1, 1, 1], 0.15));
      break;
    }
    case "bush": {
      const c = leaf;
      addSphere(g, x, y + 0.28 * s, z, 0.38 * s, 7, 5, dim(c, 0.9));
      addSphere(g, x + 0.3 * s, y + 0.2 * s, z + 0.1 * s, 0.26 * s, 6, 4, c);
      break;
    }
    case "flower": {
      for (let k = 0; k < 3; k++) {
        const ox = (k - 1) * 0.2 * s;
        const oz = ((k * 7) % 3) * 0.1 * s - 0.1;
        addCone(g, x + ox, y, z + oz, 0.02 * s, 0.02 * s, 0.35 * s, 4, [0.2, 0.5, 0.2]);
        addSphere(g, x + ox, y + 0.38 * s, z + oz, 0.07 * s, 5, 4, mix(pal.a, [1, 1, 0.6], k * 0.3));
      }
      break;
    }
    case "puff": {
      addSphere(g, x, y + 0.45 * s, z, 0.55 * s, 8, 6, [0.97, 0.97, 1]);
      addSphere(g, x + 0.45 * s, y + 0.35 * s, z + 0.1 * s, 0.4 * s, 7, 5, [0.9, 0.93, 1]);
      addSphere(g, x - 0.4 * s, y + 0.3 * s, z - 0.1 * s, 0.35 * s, 7, 5, [0.92, 0.94, 1]);
      break;
    }
    case "tomb": {
      addBox(g, x - 0.25 * s, y, z - 0.08 * s, x + 0.25 * s, y + 0.7 * s, z + 0.08 * s, stone);
      addSphere(g, x, y + 0.7 * s, z, 0.1 * s, 5, 3, dim(stone, 1.05));
      break;
    }
    case "lamp": {
      addCone(g, x, y, z, 0.05 * s, 0.04 * s, 1.3 * s, 5, [0.2, 0.18, 0.18]);
      addSphere(glow, x, y + 1.38 * s, z, 0.16 * s, 6, 4, mix(pal.t, [1, 0.9, 0.6], 0.5));
      break;
    }
    case "flame": {
      addCone(g, x, y, z, 0.3 * s, 0.22 * s, 0.35 * s, 6, [0.16, 0.13, 0.13]);
      addCone(glow, x, y + 0.3 * s, z, 0.26 * s, 0.02, 1.2 * s, 6, [1, 0.45, 0.08]);
      addCone(glow, x, y + 0.32 * s, z, 0.14 * s, 0.02, 0.8 * s, 5, [1, 0.85, 0.35]);
      break;
    }
    case "fissure": {
      const L = (0.9 + v) * s;
      addBox(g, x - L, y + 0.005, z - 0.12 * s, x + L, y + 0.02, z + 0.12 * s, [0.06, 0.04, 0.05]);
      addBox(glow, x - L * 0.9, y + 0.02, z - 0.045 * s, x + L * 0.9, y + 0.035, z + 0.045 * s, [1, 0.4, 0.08]);
      addBox(g, x - 0.12 * s, y + 0.005, z - L * 0.7, x + 0.12 * s, y + 0.02, z + L * 0.7, [0.06, 0.04, 0.05]);
      addBox(glow, x - 0.04 * s, y + 0.02, z - L * 0.6, x + 0.04 * s, y + 0.035, z + L * 0.6, [1, 0.5, 0.1]);
      break;
    }
    case "mush": {
      addCone(g, x, y, z, 0.07 * s, 0.06 * s, 0.4 * s, 5, [0.85, 0.82, 0.7]);
      addCone(g, x, y + 0.36 * s, z, 0.34 * s, 0.05 * s, 0.22 * s, 7, mix(pal.a, [0.6, 0.2, 0.3], 0.5), pal.a);
      break;
    }
    case "arch": {
      const h = 1.5 * s;
      addCone(g, x - 0.6 * s, y, z, 0.2 * s, 0.17 * s, h, 7, stone);
      addCone(g, x + 0.6 * s, y, z, 0.2 * s, 0.17 * s, h, 7, stone);
      addBox(g, x - 0.8 * s, y + h, z - 0.2 * s, x + 0.8 * s, y + h + 0.22 * s, z + 0.2 * s, dim(stone, 0.95));
      break;
    }
  }
}

export type HouseGroup = { id: string; rect: { x0: number; z0: number; x1: number; z1: number }; floors: Geo[]; roof: Geo | null };
export type ChunkMesh = { solid: Geo; glow: Geo; groups: HouseGroup[] };
const shiftY = (g: Geo, from: number, dy: number) => { if (!dy) return; for (let i = from * 3 + 1; i < g.pos.length; i += 3) g.pos[i] = g.pos[i]! + dy; };

export function buildChunkMesh(ci: number, cj: number): ChunkMesh {
  const g = newGeo();
  const glow = newGeo();
  const ch = chunkAt(ci, cj);
  const N = 8;
  const step = CH / N;
  const base = ROWS * 0; // sem uso
  void base;
  // chão com relevo
  const hts: number[] = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hts.push(terrainH(ci * CH + i * step, cj * CH + j * step));
  const HT = (i: number, j: number) => hts[Math.max(0, Math.min(N, j)) * (N + 1) + Math.max(0, Math.min(N, i))]!;
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const wx = ci * CH + i * step;
      const wz = cj * CH + j * step;
      const c = groundColor(wx, wz);
      const h = HT(i, j);
      const dx = (HT(i + 1, j) - HT(i - 1, j)) / (2 * step / TILE);
      const dz = (HT(i, j + 1) - HT(i, j - 1)) / (2 * step / TILE);
      const nl = Math.hypot(dx, 1, dz);
      const slope = Math.hypot(dx, dz);
      const rock = Math.min(1, Math.max(0, (slope - 0.45) * 2.2));
      const snow = Math.min(1, Math.max(0, (h - 6.5) * 0.35));
      const cc = mix(mix(c as Vec3, [0.42, 0.4, 0.38], rock * 0.8), [0.92, 0.94, 0.98], snow * 0.7);
      g.pos.push(wx / TILE, GY + h, wz / TILE);
      g.nor.push(-dx / nl, 1 / nl, -dz / nl);
      g.col.push(cc[0], cc[1], cc[2]);
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      g.idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2);
    }
  }
  // estruturas: casas por andar (para o modo "casa de bonecas"), barracas, cercas
  const groups = new Map<string, HouseGroup>();
  const grp = (id: string): HouseGroup | null => {
    let gr = groups.get(id);
    if (!gr) {
      const hi = houseInfo(id);
      if (!hi) return null;
      gr = { id, rect: hi.rect, floors: Array.from({ length: hi.floors }, () => newGeo()), roof: null };
      groups.set(id, gr);
    }
    return gr;
  };
  for (const pc of ch.pieces) {
    const set = pc.m === "med" ? SETS.med : pc.m === "prop" ? SETS.prop : SETS.nat;
    const th = terrainH(pc.x, pc.z);
    let tgt = g;
    const gr = pc.hid ? grp(pc.hid) : null;
    if (gr) {
      if (pc.roof) { gr.roof ??= newGeo(); tgt = gr.roof; } else tgt = gr.floors[Math.min(pc.fl ?? 0, gr.floors.length - 1)]!;
    }
    addM(tgt, set, pc.k, 0, pc.x / TILE, GY + th + (pc.y ?? 0), pc.z / TILE, pc.s ?? 0.5, [1, 1, 1], pc.yaw);
  }
  // pisos e escadas
  const wood: Vec3 = [0.46, 0.33, 0.22];
  const woodD: Vec3 = [0.36, 0.25, 0.17];
  for (const sf of ch.surfs) {
    const gr = grp(sf.house);
    if (!gr) continue;
    const tgt = gr.floors[Math.min(sf.fl, gr.floors.length - 1)]!;
    if (sf.vis === "slab") addBox(tgt, sf.x0 / TILE, GY + sf.h0 - 0.06, sf.z0 / TILE, sf.x1 / TILE, GY + sf.h0 + 0.02, sf.z1 / TILE, wood);
    else {
      const NSTEP = 9;
      for (let k = 0; k < NSTEP; k++) {
        const t0 = k / NSTEP;
        const t1 = (k + 1) / NSTEP;
        const h = sf.h0 + (sf.h1 - sf.h0) * ((t0 + t1) / 2);
        if (sf.axis === "x") addBox(tgt, (sf.x0 + (sf.x1 - sf.x0) * t0) / TILE, GY, sf.z0 / TILE, (sf.x0 + (sf.x1 - sf.x0) * t1) / TILE, GY + h, sf.z1 / TILE, k % 2 ? wood : woodD);
        else addBox(tgt, sf.x0 / TILE, GY, (sf.z0 + (sf.z1 - sf.z0) * t0) / TILE, sf.x1 / TILE, GY + h, (sf.z0 + (sf.z1 - sf.z0) * t1) / TILE, k % 2 ? wood : woodD);
      }
    }
  }
  // piso térreo
  for (const h of ch.houses) addBox(g, h.rect.x0 / TILE + 0.16, GY, h.rect.z0 / TILE + 0.16, h.rect.x1 / TILE - 0.16, GY + 0.03, h.rect.z1 / TILE - 0.16, [0.42, 0.3, 0.2]);
  const groupList = [...groups.values()];
  void FH;
  void LV;
  // objetos
  for (const p of ch.props) {
    const b = biomeAt(p.x, p.z);
    const s0 = g.pos.length / 3;
    const s1 = glow.pos.length / 3;
    if (!natProp(g, p, styleOf(b.a))) propGeo(g, glow, p, styleOf(b.a), b.a);
    const th = terrainH(p.x, p.z);
    shiftY(g, s0, th);
    shiftY(glow, s1, th);
  }
  // tufos de capim / cascalho: dão textura ao chão e sensação de velocidade
  for (let k = 0; k < 30; k++) {
    const wx = ci * CH + (((k * 37) % 23) / 23 + ((k * 7) % 5) * 0.01) * CH * 0.96 + 12;
    const wz = cj * CH + (((k * 53) % 29) / 29) * CH * 0.96 + 12;
    const gc = groundColor(wx, wz);
    const thg = terrainH(wx, wz);
    const gs0 = g.pos.length / 3;
    if (NAT && k % 3 === 0) {
      const st = styleOf(biomeAt(wx, wz).a);
      if (st !== "cloud" && st !== "gold") addNat(g, k % 4 === 0 ? "Grass_Common_Tall" : "Grass_Wispy_Tall", (k * 0.37) % 1, wx / TILE, GY, wz / TILE, 0.5, STYLE_TINT[st] ?? [1, 1, 1]);
      shiftY(g, gs0, thg);
      continue;
    }
    const lite: Vec3 = [Math.min(1, gc[0] * 1.35 + 0.05), Math.min(1, gc[1] * 1.4 + 0.05), Math.min(1, gc[2] * 1.25 + 0.03)];
    addCone(g, wx / TILE, GY, wz / TILE, 0.07, 0, 0.2 + (k % 4) * 0.05, 4, gc, lite);
    addCone(g, wx / TILE + 0.08, GY, wz / TILE + 0.03, 0.05, 0, 0.14, 4, gc, lite);
    shiftY(g, gs0, thg);
  }
  // perigos: disco brilhante com borda escura
  for (const q of ch.pools) {
    const c = POOL_COLOR[q.kind];
    const ps0 = g.pos.length / 3;
    const ps1 = glow.pos.length / 3;
    addCone(g, q.x / TILE, GY + 0.012, q.z / TILE, (q.r + 7) / TILE, (q.r + 7) / TILE, 0.02, 22, dim(c, 0.28), undefined, true);
    addCone(glow, q.x / TILE, GY + 0.035, q.z / TILE, q.r / TILE, q.r / TILE, 0.02, 22, dim(c, 0.78), undefined, true);
    addCone(glow, q.x / TILE, GY + 0.06, q.z / TILE, (q.r * 0.55) / TILE, (q.r * 0.55) / TILE, 0.02, 18, c, undefined, true);
    const pth = terrainH(q.x, q.z);
    shiftY(g, ps0, pth);
    shiftY(glow, ps1, pth);
  }
  // pontos de interesse
  for (const s of ch.sites) {
    const ss0 = g.pos.length / 3;
    const ss1 = glow.pos.length / 3;
    const x = s.x / TILE;
    const z = s.z / TILE;
    const b = biomeAt(s.x, s.z);
    const pal = palOf(b.a);
    if (s.kind === "camp") {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        addCone(g, x + Math.cos(a) * 0.5, GY, z + Math.sin(a) * 0.5, 0.07, 0.06, 0.5, 5, [0.3, 0.2, 0.12]);
      }
      addCone(glow, x, GY + 0.05, z, 0.28, 0, 0.8, 6, [1, 0.45, 0.1], [1, 0.9, 0.4]);
    } else if (s.kind === "shrine") {
      addCone(g, x, GY, z, 0.5, 0.4, 0.3, 8, [0.5, 0.5, 0.55]);
      addCone(g, x, GY + 0.3, z, 0.18, 0.14, 1.4, 8, [0.6, 0.6, 0.65]);
      addSphere(glow, x, GY + 1.9, z, 0.24, 8, 6, mix(pal.t, [0.7, 1, 0.9], 0.6));
    } else if (s.kind === "ruin") {
      addBox(g, x - 1.2, GY, z - 1.0, x - 0.9, GY + 1.5, z + 1.0, [0.5, 0.5, 0.52]);
      addBox(g, x + 0.9, GY, z - 1.0, x + 1.2, GY + 1.0, z + 1.0, [0.46, 0.46, 0.48]);
      addBox(g, x - 1.2, GY, z + 0.9, x + 1.2, GY + 0.7, z + 1.1, [0.5, 0.5, 0.52]);
    } else if (s.kind === "elite") {
      // marca no chão: círculo escuro com brilho vermelho
      addCone(glow, x, GY + 0.03, z, 1.6, 1.6, 0.02, 22, [0.35, 0.05, 0.08], undefined, true);
    }
    const sth = terrainH(s.x, s.z);
    shiftY(g, ss0, sth);
    shiftY(glow, ss1, sth);
  }
  return { solid: g, glow, groups: groupList };
}
