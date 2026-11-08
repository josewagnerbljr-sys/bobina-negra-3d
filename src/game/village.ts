/**
 * Fase em mundo aberto (v11): layout determinístico de uma fase — vilarejo inicial, vilarejos, aldeias,
 * mansão, castelo, estradas, portal de saída e as 3 peças do enigma. Tudo em px de mundo (origem = partida).
 * Construções com os módulos do Quaternius Medieval Village MegaKit (CC0), 1 m = 0.5 tile.
 * Prédios de 1 a 5 andares: pisos (superfícies) e escadas internas caminháveis.
 */
import { TILE } from "./types";

export const MS = 0.8; // tiles por metro do modelo (casas ~1,6× maiores que na v14: portas largas, andares altos)
const K = MS / 0.5;
export const MOD = 2 * MS * TILE; // largura de um módulo de parede (px) = 48
export const FH = 3.12 * MS; // altura de um andar (tiles)

function hh(a: number, b: number, s: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export type Piece = { m: "med" | "prop" | "nat" | "tex"; k: string; x: number; z: number; y?: number; yaw: number; s?: number; roof?: string; fl?: number; hid?: string };
/** retângulo em px; y0/y1 = faixa de elevação (tiles) em que bloqueia */
export type Rect = { x0: number; z0: number; x1: number; z1: number; y0?: number; y1?: number };
/** superfície caminhável: piso (axis null) ou rampa/escada (h varia de h0 em x0/z0 até h1 em x1/z1) */
export type Surf = { x0: number; z0: number; x1: number; z1: number; h0: number; h1: number; axis: "x" | "z" | null; vis: "slab" | "stair"; fl: number; house: string };
export type NpcRole = "merchant" | "smith" | "witch" | "armorer" | "spirit" | "quest" | "guard" | "villager" | "pup" | "soul";
export type NpcSpawn = { id: string; role: NpcRole; name: string; x: number; z: number; garb?: number };
export type ChestSpot = { id: string; x: number; z: number; h: number };
export type PlaceKind = "start" | "village" | "hamlet" | "mansion" | "castle";
export type Place = {
  id: string; kind: PlaceKind; name: string; x: number; z: number; r: number;
  pieces: Piece[]; walls: Rect[]; surfs: Surf[]; houses: { id: string; rect: Rect; floors: number }[]; npcs: NpcSpawn[]; chests: ChestSpot[];
  lamps: { x: number; z: number }[];
};
export type Marker = { id: string; x: number; z: number; name: string; how: string };
export type Layout = {
  realm: number; seed: number; R: number; places: Place[]; portal: { x: number; z: number };
  parts: Marker[]; roads: Rect[];
  /** dungeon: saída para o mundo (início) e tipo */
  exit?: { x: number; z: number }; dg?: number;
};

type Arch = { name: string; nw: number; nd: number; floors: number; stone: boolean; wood: boolean; tower?: boolean };
const ARCH = {
  cabana: { name: "cabana", nw: 3, nd: 3, floors: 1, stone: false, wood: true },
  casebre: { name: "casebre", nw: 3, nd: 4, floors: 1, stone: false, wood: false },
  casa: { name: "casa", nw: 4, nd: 4, floors: 1, stone: false, wood: false },
  casao: { name: "casa", nw: 4, nd: 5, floors: 1, stone: false, wood: true },
  sobrado: { name: "sobrado", nw: 4, nd: 4, floors: 2, stone: false, wood: false },
  sobrado2: { name: "sobrado", nw: 4, nd: 5, floors: 2, stone: false, wood: true },
  estalagem: { name: "estalagem", nw: 4, nd: 7, floors: 2, stone: false, wood: false },
  celeiro: { name: "celeiro", nw: 4, nd: 6, floors: 1, stone: false, wood: true },
  torre: { name: "torre", nw: 2, nd: 2, floors: 4, stone: true, wood: false, tower: true },
  torre3: { name: "torre", nw: 2, nd: 2, floors: 3, stone: true, wood: false, tower: true },
  torre5: { name: "torre", nw: 2, nd: 2, floors: 5, stone: true, wood: false, tower: true },
  solar: { name: "solar", nw: 4, nd: 4, floors: 3, stone: true, wood: false },
  mansao: { name: "mansão", nw: 4, nd: 6, floors: 3, stone: true, wood: false },
  keep: { name: "torre de menagem", nw: 4, nd: 5, floors: 4, stone: true, wood: false },
} satisfies Record<string, Arch>;
type ArchKey = keyof typeof ARCH;

const VNAMES = ["Vila", "Povoado", "Arraial", "Aldeia", "Feira", "Entreposto"];
const HNAMES = ["Casario", "Sítio", "Pouso", "Rancho"];
const SUFFIX = ["da Cinza", "do Corvo", "da Névoa", "do Moinho", "da Ponte", "do Sino", "do Cais", "das Brasas"];
const NPC_NAMES = ["Orlan", "Maren", "Tavish", "Hilda", "Bram", "Isolde", "Corvin", "Edda", "Rurik", "Selma", "Garrick", "Nessa"];
const ROOF_OK: Record<string, boolean> = { "2x2": true, "2x3": true, "2x4": true, "3x2": true, "3x3": true, "3x4": true, "3x5": true, "3x6": true, "3x7": true, "4x4": true, "4x5": true, "4x6": true, "4x7": true };

/** subtrai um retângulo de outro (retorna até 4 pedaços) */
function subRect(a: { x0: number; z0: number; x1: number; z1: number }, b: { x0: number; z0: number; x1: number; z1: number }) {
  const out: { x0: number; z0: number; x1: number; z1: number }[] = [];
  if (b.x1 <= a.x0 || b.x0 >= a.x1 || b.z1 <= a.z0 || b.z0 >= a.z1) return [a];
  if (b.z0 > a.z0) out.push({ x0: a.x0, z0: a.z0, x1: a.x1, z1: b.z0 });
  if (b.z1 < a.z1) out.push({ x0: a.x0, z0: b.z1, x1: a.x1, z1: a.z1 });
  const zz0 = Math.max(a.z0, b.z0);
  const zz1 = Math.min(a.z1, b.z1);
  if (b.x0 > a.x0) out.push({ x0: a.x0, z0: zz0, x1: b.x0, z1: zz1 });
  if (b.x1 < a.x1) out.push({ x0: b.x1, z0: zz0, x1: a.x1, z1: zz1 });
  return out;
}

export function buildHouse(id: string, cx: number, cz: number, ar: Arch, face: number, furnish: number, seed: number) {
  const { nw, nd, floors, stone, wood } = ar;
  const pieces: Piece[] = [];
  const walls: Rect[] = [];
  const surfs: Surf[] = [];
  const hw = (nw * MOD) / 2;
  const hd = (nd * MOD) / 2;
  const yaw0 = (face * Math.PI) / 2;
  const ca = Math.cos(yaw0);
  const sa = Math.sin(yaw0);
  const L = (lx: number, lz: number) => ({ x: cx + lx * ca + lz * sa, z: cz - lx * sa + lz * ca });
  const RW = (lx0: number, lz0: number, lx1: number, lz1: number) => {
    const a = L(lx0, lz0);
    const b = L(lx1, lz1);
    return { x0: Math.min(a.x, b.x), z0: Math.min(a.z, b.z), x1: Math.max(a.x, b.x), z1: Math.max(a.z, b.z) };
  };
  const sides = [
    { n: nw, len: hd, ox: 0, oz: 1 },
    { n: nw, len: -hd, ox: 0, oz: -1 },
    { n: nd, len: hw, ox: 1, oz: 0 },
    { n: nd, len: -hw, ox: -1, oz: 0 },
  ];
  const mid = Math.floor(nw / 2);
  const pickWall = (f: number, si: number, i: number) => {
    const w = hh(f * 53 + si * 31 + i, Math.round(cx + cz), seed + 7);
    if (stone) return w < 0.4 ? "Wall_UnevenBrick_Window_Wide_Round" : w < 0.55 ? "Wall_UnevenBrick_Window_Wide_Flat" : "Wall_UnevenBrick_Straight";
    if (wood) return w < 0.3 ? "Wall_Plaster_Window_Wide_Round" : w < 0.5 ? "Wall_Plaster_Window_Wide_Flat" : "Wall_Plaster_WoodGrid";
    return w < 0.45 ? "Wall_Plaster_Window_Wide_Round" : w < 0.6 ? "Wall_Plaster_Window_Wide_Flat" : "Wall_Plaster_Straight";
  };
  for (let f = 0; f < floors; f++) {
    sides.forEach((sd, si) => {
      for (let i = 0; i < sd.n; i++) {
        const off = (i - (sd.n - 1) / 2) * MOD;
        const lx = sd.ox === 0 ? off : sd.len;
        const lz = sd.ox === 0 ? sd.len : off;
        const p = L(lx, lz);
        const wox = sd.ox * ca + sd.oz * sa;
        const woz = -sd.ox * sa + sd.oz * ca;
        const a = Math.atan2(-wox, -woz);
        const isDoor = f === 0 && si === 0 && i === mid;
        const k = isDoor ? (stone ? "Wall_UnevenBrick_Door_Round" : "Wall_Plaster_Door_Round") : pickWall(f, si, i);
        pieces.push({ m: "med", k, x: p.x, z: p.z, y: f * FH, yaw: a, s: MS, fl: f, hid: id });
        if (!isDoor) {
          const th = 7 * K;
          const hx = MOD / 2;
          const axisX = Math.abs(wox) < 0.5;
          walls.push({ ...(axisX ? { x0: p.x - hx, z0: p.z - th, x1: p.x + hx, z1: p.z + th } : { x0: p.x - th, z0: p.z - hx, x1: p.x + th, z1: p.z + hx }), y0: f * FH - 0.1, y1: (f + 1) * FH });
        }
      }
    });
  }
  // pisos e escadas (zigue-zague: esquerda sobe para +z, direita sobe para -z)
  const SW = 52;
  const ix = hw - 7 * K;
  const iz = hd - 7 * K;
  const RUN = Math.max(MOD * 1.2, (nd - 1) * MOD);
  const ramps: { r: { x0: number; z0: number; x1: number; z1: number }; f: number; lo: number; hi: number; axis: "x" | "z"; swap: boolean }[] = [];
  for (let f = 0; f < floors - 1; f++) {
    const left = f % 2 === 0;
    const lx0 = left ? -ix : ix - SW;
    const lx1 = left ? -ix + SW : ix;
    const zs = left ? -iz : iz;
    const ze = left ? -iz + RUN : iz - RUN;
    const r = RW(lx0, Math.min(zs, ze), lx1, Math.max(zs, ze));
    // eixo e sentido em mundo: início (baixo) -> fim (alto)
    const S = L((lx0 + lx1) / 2, zs);
    const E = L((lx0 + lx1) / 2, ze);
    const axis: "x" | "z" = Math.abs(E.x - S.x) > Math.abs(E.z - S.z) ? "x" : "z";
    const startLow = axis === "x" ? S.x < E.x : S.z < E.z;
    surfs.push({ ...r, h0: startLow ? f * FH : (f + 1) * FH, h1: startLow ? (f + 1) * FH : f * FH, axis, vis: "stair", fl: f, house: id });
    ramps.push({ r, f, lo: f * FH, hi: (f + 1) * FH, axis, swap: !startLow });
    const railX = left ? -ix + SW : ix - SW;
    // corrimão só na metade de cima (o herói entra pela lateral na base da escada; antes fechava a rampa toda e ela ficava inalcançável)
    const zm = zs + (ze - zs) * 0.55;
    walls.push({ ...RW(railX - 4, Math.min(zm, ze), railX + 4, Math.max(zm, ze)), y0: f * FH + FH * 0.3, y1: (f + 1) * FH - 0.04 });
  }
  for (let f = 1; f < floors; f++) {
    const base = RW(-ix, -iz, ix, iz);
    const hole = ramps[f - 1]!.r;
    for (const piece of subRect(base, hole)) surfs.push({ ...piece, h0: f * FH, h1: f * FH, axis: null, vis: "slab", fl: f, house: id });
  }
  // piso térreo em volta (retângulo da casa)
  const fl0 = L(0, 0);
  const w2 = Math.abs(ca) > 0.5 ? nw : nd;
  const d2 = Math.abs(ca) > 0.5 ? nd : nw;
  const rect: Rect = { x0: fl0.x - (w2 * MOD) / 2 - 12, z0: fl0.z - (d2 * MOD) / 2 - 12, x1: fl0.x + (w2 * MOD) / 2 + 12, z1: fl0.z + (d2 * MOD) / 2 + 12 };
  // telhado + empenas
  const roofY = floors * FH;
  const rk = ar.tower && nw === 2 && nd === 2 ? "Roof_Tower_RoundTiles" : ROOF_OK[`${nw}x${nd}`] ? `Roof_RoundTiles_${nw * 2}x${nd * 2}` : "Roof_RoundTiles_6x6";
  pieces.push({ m: "med", k: rk, x: fl0.x, z: fl0.z, y: roofY, yaw: yaw0, s: MS, roof: id, fl: floors, hid: id });
  if (rk !== "Roof_Tower_RoundTiles") {
    for (const sgn of [1, -1]) {
      const e = L(0, sgn * hd);
      pieces.push({ m: "med", k: `Roof_Front_Brick${nw * 2}`, x: e.x, z: e.z, y: roofY, yaw: Math.atan2(-(sgn * sa), -(sgn * ca)), s: MS, roof: id, fl: floors, hid: id });
    }
  }
  // mobília por andar (zona central, longe das escadas)
  // pegada (m, antes da escala) dos móveis sólidos: nada de atravessar móvel
  const FOOT: Record<string, [number, number]> = {
    hp_table: [2.97, 2.63], vs_chair: [0.51, 0.45], vs_fire_wall: [1.34, 0.6], vs_fire_base: [1.14, 0.78], hf_farm_harvest_crate: [0.48, 0.34], hp_stand: [1.62, 1.62],
    hp_bed: [4.14, 3.14], hp_dress: [0.72, 0.81], Workbench: [1.9, 0.8], Barrel: [0.75, 0.75], Bookcase_2: [1.5, 0.5], Cauldron: [0.9, 0.9],
  };
  const solid = (k: string, p: { x: number; z: number }, r: number, f: number, sc: number) => {
    const ft = FOOT[k];
    if (!ft) return;
    const a = yaw0 + r;
    const hx = (ft[0] * sc * MS * 48) / 2;
    const hz = (ft[1] * sc * MS * 48) / 2;
    const ex = Math.abs(Math.cos(a)) * hx + Math.abs(Math.sin(a)) * hz;
    const ez = Math.abs(Math.sin(a)) * hx + Math.abs(Math.cos(a)) * hz;
    walls.push({ x0: p.x - ex, z0: p.z - ez, x1: p.x + ex, z1: p.z + ez, y0: f * FH - 0.1, y1: f * FH + FH * 0.55 });
  };
  const prop = (k: string, lx: number, lz: number, r: number, f: number) => {
    const p = L(lx * K, lz * K);
    pieces.push({ m: "prop", k, x: p.x, z: p.z, y: f * FH + 0.03, yaw: yaw0 + r, s: MS, fl: f, hid: id });
    solid(k, p, r, f, 1);
  };
  const tex = (k: string, lx: number, lz: number, r: number, f: number, sc = 1, up = 0) => {
    const p = L(lx * K, lz * K);
    pieces.push({ m: "tex", k, x: p.x, z: p.z, y: f * FH + 0.03 + up, yaw: yaw0 + r, s: MS * sc, fl: f, hid: id });
    if (up === 0) solid(k, p, r, f, sc);
  };
  // mobília em px locais (frente = +z, porta no centro da frente, fundo = -z); corredor da porta e faixas das escadas ficam livres
  const SWB = floors > 1 ? 52 + 22 : 0;
  const bx = hw - 7 * K - 16;
  const bz = hd - 7 * K - 16;
  const bxs = Math.max(30, bx - SWB);
  const chests: ChestSpot[] = [];
  const pxp = (k: string, x: number, z: number, r: number, f: number, sc = 1, up = 0, isProp = false) => {
    const p = L(x, z);
    pieces.push({ m: isProp ? "prop" : "tex", k, x: p.x, z: p.z, y: f * FH + 0.03 + up, yaw: yaw0 + r, s: isProp ? MS : MS * sc, fl: f, hid: id });
    if (up === 0) solid(k, p, r, f, isProp ? 1 : sc);
  };
  const PI2 = Math.PI / 2;
  for (let f = 0; f < floors; f++) {
    const kit = nw < 3 ? -1 : (furnish + f) % 4;
    if (kit === 0) {
      // sala: lareira no fundo, mesa com cadeiras, poltronas
      pxp("vs_fire_wall", 0, -bz + 8, 0, f, 1.15);
      pxp("vs_fire_base", 0, -bz + 8, 0, f, 1.15);
      pxp("hp_table", 0, -bz * 0.2, 0, f, 0.5);
      pxp("vs_vase", 0, -bz * 0.2, 0, f, 1.4, 0.62);
      pxp("vs_chair", -34, -bz * 0.2 + 6, 0.9, f, 1.25);
      pxp("vs_chair", 34, -bz * 0.2 + 6, -0.9, f, 1.25);
      pxp("Barrel", bxs, -bz + 12, 0, f, 1, 0, true);
      pxp("Candle_1", 0, -bz * 0.2, 0, f, 1, 0.62, true);
    } else if (kit === 1) {
      // oficina: bancada no fundo, caixas e saco
      pxp("Workbench", 0, -bz + 8, Math.PI, f, 1, 0, true);
      pxp("hf_farm_harvest_crate", -bxs + 14, -bz * 0.4, 0.3, f, 1.8);
      pxp("hf_farm_harvest_crate", -bxs + 14, -bz * 0.4, 0.1, f, 1.8, 0.45);
      pxp("hf_farm_harvest_crate", bxs - 14, -bz * 0.4, -0.2, f, 1.8);
      pxp("Bag", bxs - 8, 0, 0, f, 1, 0, true);
      pxp("hp_stand", -bxs + 14, bz * 0.2, PI2, f, 0.45);
    } else if (kit === 2) {
      // quarto: cama no canto do fundo, criado-mudo, guarda-roupa, espelho
      pxp("hp_bed", bxs - 30, -bz + 34, PI2, f, 0.55);
      pxp("hp_stand", bxs - 34 - 36, -bz + 12, 0, f, 0.45);
      pxp("CandleStick", bxs - 34 - 36, -bz + 12, 0, f, 1, 0.45, true);
      pxp("hp_dress", -bxs + 14, -bz + 20, PI2, f, 0.5);
      pxp("vs_mirror", -bxs + 6, 0, PI2, f, 1.6, 0.7);
    } else {
      // biblioteca: estantes no fundo, viola, caldeirão
      pxp("Bookcase_2", -bxs + 30, -bz + 8, Math.PI, f, 1, 0, true);
      pxp("Bookcase_2", bxs - 30, -bz + 8, Math.PI, f, 1, 0, true);
      pxp("vs_books1", 0, -bz + 12, 0, f, 1.6, 0.5);
      pxp("vs_viola", bxs - 12, bz * 0.2, 0.8, f, 1.3);
      pxp("Cauldron", -bxs + 16, bz * 0.45, 0, f, 1, 0, true);
      pxp("vs_ladder", 0, -bz + 6, 3.14, f, 1.0);
    }
    const cp = L(bxs - 10, bz * 0.1);
    if (hh(f, Math.round(cx), seed + 96) < (f === 0 ? 0.2 : 0.4)) chests.push({ id: `${id}c${f}`, x: cp.x, z: cp.z, h: f * FH });
  }
  return { pieces, walls, surfs, rect, chests, floors };
}

function placeOK(list: { x: number; z: number; r: number }[], x: number, z: number, r: number) {
  for (const q of list) if (Math.hypot(q.x - x, q.z - z) < q.r + r) return false;
  return true;
}

const VILLAGERS: [string, NpcRole][] = [
  ["Aldeão", "villager"], ["Camponesa", "villager"], ["Lenhador", "villager"], ["Pescador", "villager"], ["Criança", "villager"],
  ["Bardo", "villager"], ["Padre", "villager"], ["Caçadora", "villager"], ["Padeiro", "merchant"], ["Boticário", "merchant"],
  ["Nobre", "villager"], ["Vigia", "guard"], ["Costureira", "villager"], ["Viajante", "quest"], ["Pedinte", "villager"],
];
const fenceRing = (pl: Place, x: number, z: number, rad: number, n: number, skip: number) => {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (i % skip === 0) continue;
    pl.pieces.push({ m: "med", k: "Prop_WoodenFence_Single", x: x + Math.cos(a) * rad, z: z + Math.sin(a) * rad, yaw: -a + Math.PI / 2, s: MS });
  }
};

function addHouse(pl: Place, taken: { x: number; z: number; r: number }[], arch: Arch, hx: number, hz: number, tx: number, tz: number, idx: number, seed: number, cnt: number) {
  const rad = (Math.max(arch.nw, arch.nd) * MOD) / 2 + 74 * K;
  if (!placeOK(taken, hx, hz, rad)) return false;
  const dx = tx - hx;
  const dz = tz - hz;
  const face = Math.abs(dz) >= Math.abs(dx) ? (dz > 0 ? 0 : 2) : dx > 0 ? 1 : 3;
  const hid = `${pl.id}h${cnt}`;
  const hs = buildHouse(hid, hx, hz, arch, face, idx + cnt, seed);
  pl.pieces.push(...hs.pieces);
  pl.walls.push(...hs.walls);
  pl.surfs.push(...hs.surfs);
  pl.houses.push({ id: hid, rect: hs.rect, floors: hs.floors });
  pl.chests.push(...hs.chests);
  taken.push({ x: hx, z: hz, r: rad });
  pl.lamps.push({ x: hx + (tx - hx) * 0.45 + (hz - tz) * 0.12, z: hz + (tz - hz) * 0.45 });
  return true;
}

const FLAVORS = ["vila", "mercado", "fazendas", "forja", "queimada", "cemitério", "bosque"] as const;
type Flavor = (typeof FLAVORS)[number];
/** ambiente próprio de cada vilarejo: mercado, fazendas, forja, vila queimada, cemitério ou bosque */
function addFlavor(pl: Place, fl: Flavor, x: number, z: number, taken: { x: number; z: number; r: number }[], idx: number, realm: number, seed: number) {
  if (fl === "vila") return;
  const sets: Record<string, [string, "prop" | "nat"][]> = {
    mercado: [["Stall_Empty", "prop"], ["Barrel", "prop"], ["Crate_Wooden", "prop"], ["Banner_1", "prop"], ["Banner_2", "prop"], ["Bag", "prop"], ["Barrel_Apples", "prop"], ["Stall_Cart_Empty", "prop"]],
    fazendas: [["FarmCrate_Carrot", "prop"], ["FarmCrate_Apple", "prop"], ["Barrel_Apples", "prop"], ["Prop_Wagon", "prop"], ["Crate_Wooden", "prop"], ["Bucket_Wooden_1", "prop"], ["Carrot", "prop"], ["Clover_1", "nat"], ["Plant_7", "nat"]],
    forja: [["Anvil", "prop"], ["Workbench", "prop"], ["WeaponStand", "prop"], ["Pickaxe_Bronze", "prop"], ["Barrel", "prop"], ["Crate_Metal", "prop"], ["Axe_Bronze", "prop"], ["Dummy", "prop"], ["Torch_Metal", "prop"]],
    queimada: [["DeadTree_1", "nat"], ["DeadTree_3", "nat"], ["DeadTree_5", "nat"], ["Vase_Rubble_Medium", "prop"], ["Torch_Metal", "prop"], ["Rock_Medium_2", "nat"], ["Barrel", "prop"], ["Rope_1", "prop"]],
    cemitério: [["DeadTree_2", "nat"], ["DeadTree_4", "nat"], ["CandleStick_Stand", "prop"], ["Vase_Rubble_Medium", "prop"], ["Rock_Medium_1", "nat"], ["Rock_Medium_3", "nat"], ["Chalice", "prop"], ["Mushroom_Laetiporus", "nat"]],
    bosque: [["CommonTree_2", "nat"], ["CommonTree_5", "nat"], ["Pine_1", "nat"], ["Pine_3", "nat"], ["TwistedTree_3", "nat"], ["Mushroom_Common", "nat"], ["Fern_1", "nat"], ["Plant_1_Big", "nat"]],
  };
  const list = sets[fl]!;
  const many = fl === "bosque" ? 90 : fl === "mercado" ? 46 : 38;
  for (let t = 0, put = 0; t < 420 && put < many; t++) {
    const ang = hh(idx * 61 + t, realm, seed + 140) * Math.PI * 2;
    const dd = 230 + hh(idx * 67 + t, realm, seed + 141) * 760;
    const px = x + Math.cos(ang) * dd;
    const pz = z + Math.sin(ang) * dd;
    if (!placeOK(taken, px, pz, 26)) continue;
    const [k, m] = list[Math.floor(hh(t, idx, seed + 142) * list.length)]!;
    const v = hh(t, idx, seed + 143);
    const tall = k.includes("Tree") || k.startsWith("Pine");
    pl.pieces.push({ m, k, x: px, z: pz, yaw: v * 6.28, s: m === "nat" ? (tall ? 0.42 : 0.55) * (0.85 + v * 0.4) : MS });
    if (tall) pl.walls.push({ x0: px - 7, z0: pz - 7, x1: px + 7, z1: pz + 7, y0: -5, y1: 3 });
    taken.push({ x: px, z: pz, r: 20 });
    put++;
  }
  if (fl === "fazendas") for (let q = 0; q < 4; q++) {
    const cx2 = x + Math.cos(q * 1.57 + idx) * 520;
    const cz2 = z + Math.sin(q * 1.57 + idx) * 520;
    // canteiro de tomates com cerca de ripas (Horror Farm); alguns pés estão corrompidos
    for (let r = 0; r < 5; r++) for (let c2 = 0; c2 < 7; c2++) {
      const v = hh(q * 40 + r * 7 + c2, idx, seed + 150);
      pl.pieces.push({ m: "tex", k: v < 0.22 ? "hf_tomato_mature_corrupted" : "hf_tomato_mature_healthy", x: cx2 + (c2 - 3) * 17, z: cz2 + (r - 2) * 17, yaw: v * 6.28, s: MS * (1.1 + v * 0.3) });
    }
    for (let k2 = 0; k2 < 6; k2++) {
      const a2 = (k2 / 6) * 6.283;
      pl.pieces.push({ m: "tex", k: "hf_outdoor_fence_picket_panel_2m", x: cx2 + Math.cos(a2) * 92, z: cz2 + Math.sin(a2) * 92, yaw: -a2 + Math.PI / 2, s: MS * 1.1 });
    }
    taken.push({ x: cx2, z: cz2, r: 110 });
  } else if (fl === "cemitério" || fl === "queimada") {
    for (let q = 0; q < 10; q++) pl.pieces.push({ m: "tex", k: "hf_outdoor_lantern_path_corrupted", x: x + Math.cos(q * 0.7 + idx) * (260 + (q % 3) * 120), z: z + Math.sin(q * 0.7 + idx) * (260 + (q % 3) * 120), yaw: q, s: MS * 1.2 });
  } else if (fl === "mercado") {
    for (let q = 0; q < 8; q++) pl.pieces.push({ m: "tex", k: "hf_farm_harvest_crate", x: x + Math.cos(q * 0.9 + idx) * (150 + (q % 3) * 60), z: z + Math.sin(q * 0.9 + idx) * (150 + (q % 3) * 60), yaw: q * 0.7, s: MS * 2.2 });
  }
}

function village(realm: number, seed: number, idx: number, x: number, z: number, kind: "start" | "village" | "hamlet"): Place {
  const id = `v${idx}`;
  const big = kind !== "hamlet";
  const name = kind === "start" ? "Vila de Partida" : kind === "hamlet" ? `${HNAMES[Math.floor(hh(idx, realm, seed + 90) * HNAMES.length)]} ${SUFFIX[Math.floor(hh(idx, realm, seed + 91) * SUFFIX.length)]}` : `${VNAMES[Math.floor(hh(idx, realm, seed + 90) * VNAMES.length)]} ${SUFFIX[Math.floor(hh(idx, realm, seed + 91) * SUFFIX.length)]}`;
  const pl: Place = { id, kind, name, x, z, r: big ? 1400 : 760, pieces: [], walls: [], surfs: [], houses: [], npcs: [], chests: [], lamps: [] };
  const taken: { x: number; z: number; r: number }[] = [{ x, z, r: big ? 260 : 80 }];
  const nh = kind === "start" ? 30 : big ? 26 + Math.floor(hh(idx, realm, seed + 92) * 10) : 9 + Math.floor(hh(idx, realm, seed + 92) * 5);
  const pool: ArchKey[] = big ? ["casa", "casao", "sobrado", "sobrado2", "casebre", "cabana", "sobrado", "estalagem", "torre3", "casa", "celeiro", "sobrado2", "casebre", "torre", "solar"] : ["cabana", "casebre", "cabana", "casa", "celeiro", "casebre", "sobrado"];
  let tries = 0;
  let cnt = 0;
  while (cnt < nh && tries++ < 900) {
    const ang = hh(idx * 17 + tries, realm, seed + 93) * Math.PI * 2;
    const dist = (big ? 260 : 130) + hh(idx * 19 + tries, realm, seed + 94) * (big ? 1100 : 560);
    const arch = ARCH[pool[Math.floor(hh(idx * 23 + tries, realm, seed + 95) * pool.length)]!]!;
    if (addHouse(pl, taken, arch, x + Math.cos(ang) * dist, z + Math.sin(ang) * dist, x, z, idx, seed, cnt)) {
      const h = pl.houses[pl.houses.length - 1]!;
      const hx = (h.rect.x0 + h.rect.x1) / 2;
      const hz = (h.rect.z0 + h.rect.z1) / 2;
      const d = Math.hypot(x - hx, z - hz) || 1;
      const reach = Math.max(h.rect.x1 - h.rect.x0, h.rect.z1 - h.rect.z0) / 2 + 40;
      // morador na porta (cada casa grande tem alguém por perto; aldeias, metade das casas)
      if (big || cnt % 2 === 0) {
        const k = Math.floor(hh(idx * 31 + cnt, realm, seed + 110) * VILLAGERS.length);
        const [title, role] = VILLAGERS[k]!;
        const nm = NPC_NAMES[Math.floor(hh(idx * 7 + cnt, realm, seed + 111) * NPC_NAMES.length)]!;
        pl.npcs.push({ id: `${id}r${cnt}`, role, name: `${title} ${nm}`, x: hx + ((x - hx) / d) * reach + (hz - z) * 0.05, z: hz + ((z - hz) / d) * reach, garb: Math.floor(hh(idx * 13 + cnt, realm, seed + 112) * 12) });
      }
      cnt++;
    }
  }
  const flavor: Flavor = kind === "start" ? "vila" : FLAVORS[1 + Math.floor(hh(idx, realm, seed + 130) * (FLAVORS.length - 1))]!;
  if (flavor !== "vila") pl.name = `${pl.name} · ${flavor}`;
  // árvores, arbustos e canteiros entre as casas
  const TREES = ["CommonTree_1", "CommonTree_2", "CommonTree_3", "CommonTree_4", "Pine_2", "TwistedTree_2"];
  const SMALL = ["Plant_1", "Plant_7", "Fern_1", "Clover_1", "Grass_Common_Tall", "Rock_Medium_1"];
  for (let t = 0, put = 0; t < 300 && put < (big ? 70 : 30); t++) {
    const ang = hh(idx * 41 + t, realm, seed + 120) * Math.PI * 2;
    const dd = (big ? 270 : 120) + hh(idx * 43 + t, realm, seed + 121) * (big ? 1140 : 560);
    const tx = x + Math.cos(ang) * dd;
    const tz = z + Math.sin(ang) * dd;
    if (!placeOK(taken, tx, tz, 26)) continue;
    const tree = put % 3 !== 2;
    const v = hh(t, idx, seed + 122);
    pl.pieces.push({ m: "nat", k: tree ? TREES[Math.floor(v * TREES.length)]! : SMALL[Math.floor(v * SMALL.length)]!, x: tx, z: tz, yaw: v * 6.28, s: (tree ? 0.4 : 0.5) * (0.8 + v * 0.5) });
    if (tree) pl.walls.push({ x0: tx - 7, z0: tz - 7, x1: tx + 7, z1: tz + 7, y0: -5, y1: 3 });
    taken.push({ x: tx, z: tz, r: 22 });
    put++;
  }
  addFlavor(pl, flavor, x, z, taken, idx, realm, seed);
  if (big) {
    // rua comercial: uma tenda por tipo, em fila ao longo de uma rua calçada (norte = tendas de ofício, sul = barracas de apoio)
    const SZ = 3.0;
    for (let i = -6; i <= 6; i++) for (let j = -1; j <= 0; j++) pl.pieces.push({ m: "med", k: (i + j) & 1 ? "Floor_UnevenBrick" : "Floor_Brick", x: x + i * MOD * 0.98, z: z - 64 + j * MOD, y: 0.025, yaw: 0, s: MS });
    void SZ;
    const stalls: [string, number, number, NpcRole, string, number][] = [
      ["Stall_Empty", -210, -92, "witch", "Arcanista", 0],
      ["Stall_Empty", -70, -92, "armorer", "Armeiro", 0],
      ["Stall_Cart_Empty", 70, -92, "smith", "Ferreiro de Armas", 0],
      ["Stall_Empty", 210, -92, "spirit", "Corretor de Almas", 0],
      ["Stall_Cart_Empty", -140, -36, "merchant", "Boticário", Math.PI],
      ["Stall_Empty", 140, -36, "merchant", "Mercador", Math.PI],
    ];
    stalls.forEach(([k, dx, dz, role, title, yw], i) => {
      pl.pieces.push({ m: "prop", k, x: x + dx, z: z + dz, yaw: yw, s: MS });
      pl.npcs.push({ id: `${id}n${i}`, role, name: `${title} ${NPC_NAMES[Math.floor(hh(idx + i, realm, seed + 97) * NPC_NAMES.length)]}`, x: x + dx, z: z + dz + (yw ? -30 : 30) });
      pl.walls.push({ x0: x + dx - 26, z0: z + dz - 12, x1: x + dx + 26, z1: z + dz + 12, y0: -5, y1: 1.4 });
      pl.pieces.push({ m: "prop", k: i % 2 ? "Crate_Wooden" : "Barrel", x: x + dx + 34, z: z + dz + (yw ? -4 : 4), yaw: i, s: MS });
      pl.lamps.push({ x: x + dx + 52, z: z + dz + 20 });
    });
    pl.pieces.push({ m: "prop", k: "Anvil", x: x + 104, z: z - 80, yaw: 0.4, s: MS }, { m: "prop", k: "Cauldron", x: x - 250, z: z - 78, yaw: 0, s: MS }, { m: "prop", k: "Prop_Wagon", x: x - 330, z: z - 60, yaw: 0.6, s: MS });
    pl.npcs.push({ id: `${id}q`, role: "quest", name: `Mensageiro ${NPC_NAMES[Math.floor(hh(idx, realm, seed + 98) * NPC_NAMES.length)]}`, x: x + 28, z: z + 22 });
    pl.npcs.push({ id: `${id}g`, role: "villager", name: "Aldeão", x: x - 44, z: z - 40 });
    pl.npcs.push({ id: `${id}g2`, role: "guard", name: "Guarda", x: x + 90, z: z + 90 });
    pl.lamps.push({ x: x - 36, z: z - 34 }, { x: x + 36, z: z + 66 }, { x: x - 76, z: z - 8 }, { x: x + 80, z: z - 20 });
    // praça calçada com tijolos do pacote medieval, poço e bancos
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (Math.abs(i) + Math.abs(j) <= 5) pl.pieces.push({ m: "med", k: i + j & 1 ? "Floor_UnevenBrick" : "Floor_Brick", x: x + i * MOD, z: z + j * MOD, y: 0.02, yaw: 0, s: MS });
    pl.pieces.push({ m: "prop", k: "Bench", x: x - 110, z: z - 60, yaw: 1.57, s: MS }, { m: "prop", k: "Bench", x: x + 118, z: z + 66, yaw: -1.57, s: MS }, { m: "prop", k: "Banner_1", x: x + 150, z: z - 20, yaw: 0, s: MS }, { m: "prop", k: "Banner_2", x: x - 150, z: z + 30, yaw: 0, s: MS });
    for (let i = 0; i < 6; i++) pl.npcs.push({ id: `${id}p${i}`, role: i === 5 ? "merchant" : "villager", name: ["Aldeã", "Menino", "Andarilho", "Mulher do Poço", "Velho Sábio", "Mascate"][i]! + " " + NPC_NAMES[(i * 5 + idx) % NPC_NAMES.length]!, x: x + Math.cos(i * 1.05 + idx) * (70 + (i % 3) * 22), z: z + Math.sin(i * 1.05 + idx) * (70 + (i % 3) * 22), garb: (i * 3 + idx) % 12 });
    // ruas: postes de luz em cruz saindo da praça
    for (let k = 1; k <= 6; k++) for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) pl.lamps.push({ x: x + ux * (200 + k * 110) + uz * 40, z: z + uz * (200 + k * 110) + ux * 40 });
  } else {
    // aldeia: poço de caldeirão, feno e cercado
    pl.pieces.push({ m: "prop", k: "Cauldron", x: x, z: z, yaw: 0, s: MS }, { m: "prop", k: "Barrel_Apples", x: x + 30, z: z + 12, yaw: 0.4, s: MS }, { m: "prop", k: "FarmCrate_Carrot", x: x - 30, z: z + 18, yaw: 0, s: MS });
    pl.npcs.push({ id: `${id}g`, role: "villager", name: "Camponês", x: x + 12, z: z + 28 });
    if (hh(idx, realm, seed + 99) < 0.5) pl.npcs.push({ id: `${id}m`, role: "merchant", name: `Mascate ${NPC_NAMES[Math.floor(hh(idx, realm, seed + 100) * NPC_NAMES.length)]}`, x: x - 14, z: z - 30 });
    fenceRing(pl, x, z, 110, 14, 5);
  }
  return pl;
}

function mansion(realm: number, seed: number, idx: number, x: number, z: number): Place {
  const id = `m${idx}`;
  const pl: Place = { id, kind: "mansion", name: "Mansão Assombrada", x, z, r: 400, pieces: [], walls: [], surfs: [], houses: [], npcs: [], chests: [], lamps: [] };
  const hs = buildHouse(`${id}h`, x, z, ARCH.mansao, 0, 2, seed);
  pl.pieces.push(...hs.pieces);
  pl.walls.push(...hs.walls);
  pl.surfs.push(...hs.surfs);
  pl.houses.push({ id: `${id}h`, rect: hs.rect, floors: hs.floors });
  // 1 baú por andar com ids estáveis (o do último andar guarda a peça)
  for (let f = 0; f < 3; f++) {
    const c = hs.chests.find((q) => q.id === `${id}hc${f}`);
    pl.chests.push({ id: `${id}c${f}`, x: c ? c.x : x, z: c ? c.z : z, h: f * FH });
  }
  const d = 6 * MOD;
  for (let i = 0; i < 9; i++) pl.pieces.push({ m: "med", k: "Prop_MetalFence_Ornament", x: x - 170 + i * 43, z: z + d / 2 + 90, yaw: 0, s: MS });
  pl.pieces.push({ m: "med", k: "Prop_Wagon", x: x + 150, z: z + 40, yaw: 1.2, s: MS });
  pl.lamps.push({ x: x - 110, z: z + d / 2 + 50 }, { x: x + 110, z: z + d / 2 + 50 }, { x: x - 130, z: z - 60 }, { x: x + 130, z: z - 60 });
  // torres laterais
  const tw = buildHouse(`${id}t`, x - 210, z - 30, ARCH.torre3, 0, 1, seed);
  pl.pieces.push(...tw.pieces);
  pl.walls.push(...tw.walls);
  pl.surfs.push(...tw.surfs);
  pl.houses.push({ id: `${id}t`, rect: tw.rect, floors: tw.floors });
  return pl;
}

function castle(realm: number, seed: number, idx: number, x: number, z: number): Place {
  const id = `k${idx}`;
  const pl: Place = { id, kind: "castle", name: "Castelo do Guardião", x, z, r: 520, pieces: [], walls: [], surfs: [], houses: [], npcs: [], chests: [], lamps: [] };
  const keep = buildHouse(`${id}h`, x, z - 60, ARCH.keep, 0, 3, seed);
  pl.pieces.push(...keep.pieces);
  pl.walls.push(...keep.walls);
  pl.surfs.push(...keep.surfs);
  pl.houses.push({ id: `${id}h`, rect: keep.rect, floors: keep.floors });
  for (const c of keep.chests) pl.chests.push(c);
  // muralha quadrada com portão ao sul (+z)
  const S = 7 * MOD * 1.0; // meia-largura
  const nW = 14;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < nW; i++) {
      const t = (i - (nW - 1) / 2) * MOD;
      let px = x;
      let pz = z;
      let ox = 0;
      let oz = 0;
      if (side === 0) { px = x + t; pz = z + S; oz = 1; }
      else if (side === 1) { px = x + t; pz = z - S; oz = -1; }
      else if (side === 2) { px = x + S; pz = z + t; ox = 1; }
      else { px = x - S; pz = z + t; ox = -1; }
      const gate = side === 0 && (i === 6 || i === 7);
      const k = gate ? "Wall_Arch" : "Wall_UnevenBrick_Straight";
      pl.pieces.push({ m: "med", k, x: px, z: pz, yaw: Math.atan2(-ox, -oz), s: MS, fl: 0 });
      if (!gate) {
        const th = 8;
        const hx = MOD / 2;
        pl.walls.push(oz !== 0 ? { x0: px - hx, z0: pz - th, x1: px + hx, z1: pz + th, y0: -5, y1: FH } : { x0: px - th, z0: pz - hx, x1: px + th, z1: pz + hx, y0: -5, y1: FH });
      }
    }
  }
  // torres de canto
  const corners: [number, number][] = [[S, S], [-S, S], [S, -S], [-S, -S]];
  corners.forEach(([cx, cz], i) => {
    const tw = buildHouse(`${id}t${i}`, x + cx, z + cz, i % 2 ? ARCH.torre5 : ARCH.torre, i < 2 ? 2 : 0, i, seed);
    pl.pieces.push(...tw.pieces);
    pl.walls.push(...tw.walls);
    pl.surfs.push(...tw.surfs);
    pl.houses.push({ id: `${id}t${i}`, rect: tw.rect, floors: tw.floors });
    pl.chests.push(...tw.chests.filter((c) => c.h > 0).slice(0, 1));
  });
  // a muralha não atravessa o interior das torres de canto (antes cortava a escada)
  const inTower = (px: number, pz: number) => pl.houses.some((h) => h.id.startsWith(`${id}t`) && px > h.rect.x0 && px < h.rect.x1 && pz > h.rect.z0 && pz < h.rect.z1);
  pl.walls = pl.walls.filter((w) => !(w.y0 === -5 && inTower((w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2)));
  pl.pieces = pl.pieces.filter((q) => !(q.hid === undefined && q.fl === 0 && q.k.startsWith("Wall_") && inTower(q.x, q.z)));
  pl.lamps.push({ x: x - 60, z: z + S + 50 }, { x: x + 60, z: z + S + 50 }, { x: x - 120, z: z + 140 }, { x: x + 120, z: z + 140 });
  pl.pieces.push({ m: "prop", k: "WeaponStand", x: x - 90, z: z + 120, yaw: 0, s: MS }, { m: "prop", k: "Dummy", x: x + 90, z: z + 120, yaw: 0.3, s: MS });
  return pl;
}

const cache = new Map<string, Layout>();
export function layoutOf(realm: number, seed: number): Layout {
  const key = `${realm}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const R = 10800;
  const places: Place[] = [];
  places.push(village(realm, seed, 0, 0, 0, "start"));
  const nv = 5 + (realm % 3);
  const base = hh(realm, 1, seed + 70) * Math.PI * 2;
  const pos: { x: number; z: number }[] = [];
  const total = nv + 7;
  for (let i = 0; i < total; i++) {
    const ang = base + (i / total) * Math.PI * 2 + (hh(i, realm, seed + 71) - 0.5) * 0.35;
    const dist = 3300 + hh(i, realm, seed + 72) * 4700 + (i % 2) * 800;
    pos.push({ x: Math.cos(ang) * dist, z: Math.sin(ang) * dist });
  }
  for (let i = 0; i < nv; i++) places.push(village(realm, seed, i + 1, pos[i]!.x, pos[i]!.z, "village"));
  const mp = pos[nv]!;
  places.push(mansion(realm, seed, nv + 1, mp.x, mp.z));
  const cp = pos[nv + 1]!;
  places.push(castle(realm, seed, nv + 2, cp.x, cp.z));
  places.push(village(realm, seed, nv + 3, pos[nv + 2]!.x, pos[nv + 2]!.z, "hamlet"));
  places.push(village(realm, seed, nv + 4, pos[nv + 3]!.x, pos[nv + 3]!.z, "hamlet"));
  for (let i = 4; i < 7; i++) places.push(village(realm, seed, nv + 1 + i, pos[nv + i]!.x, pos[nv + i]!.z, "hamlet"));
  // portal oposto à mansão
  const pa = Math.atan2(mp.z, mp.x) + Math.PI;
  const portal = { x: Math.cos(pa) * (R - 1300), z: Math.sin(pa) * (R - 1300) };
  const v1 = places[1]!;
  const mans = places.find((p) => p.kind === "mansion")!;
  const cast = places.find((p) => p.kind === "castle")!;
  const parts: Marker[] = [
    { id: "p0", x: v1.x, z: v1.z, name: "Peça 1: missão em " + v1.name, how: "quest" },
    { id: "p1", x: mans.x, z: mans.z, name: "Peça 2: baú no alto da Mansão", how: "chest" },
    { id: "p2", x: cast.x, z: cast.z, name: "Peça 3: Guardião do Castelo", how: "boss" },
  ];
  const roads: Rect[] = [];
  const hub = places[0]!;
  for (let i = 1; i < places.length; i++) roads.push({ x0: hub.x, z0: hub.z, x1: places[i]!.x, z1: places[i]!.z });
  // estradas entre vizinhos próximos
  for (let i = 1; i < places.length; i++) {
    let bj = -1;
    let bd = 1e9;
    for (let j = 1; j < places.length; j++) if (j !== i) { const d = Math.hypot(places[i]!.x - places[j]!.x, places[i]!.z - places[j]!.z); if (d < bd) { bd = d; bj = j; } }
    if (bj > i) roads.push({ x0: places[i]!.x, z0: places[i]!.z, x1: places[bj]!.x, z1: places[bj]!.z });
  }
  roads.push({ x0: places[1]!.x, z0: places[1]!.z, x1: portal.x, z1: portal.z });
  const lay: Layout = { realm, seed, R, places, portal, parts, roads };
  cache.set(key, lay);
  return lay;
}

/** dungeon: mapa aberto independente, menor, com saída no início e descida para o próximo andar */
export function dungeonLayout(kind: number, floor: number, seed: number): Layout {
  const realm = 50 + kind;
  const key = `dg${kind}:${floor}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const R = 5200;
  const places: Place[] = [];
  const ang = hh(floor, kind, seed + 301) * Math.PI * 2;
  const portal = { x: Math.cos(ang) * (R - 1500), z: Math.sin(ang) * (R - 1500) };
  if (kind === 3) {
    // castelo amaldiçoado: fortaleza no caminho da descida
    const ca = ang + 0.9;
    places.push(castle(realm, seed, 1, Math.cos(ca) * 2300, Math.sin(ca) * 2300));
  }
  const lay: Layout = { realm, seed, R, places, portal, parts: [], roads: [], exit: { x: 0, z: -70 }, dg: kind };
  cache.set(key, lay);
  return lay;
}

/** posição de um ponto da estrada (curva suave) para o segmento r no parâmetro t */
export function roadPt(r: Rect, t: number) {
  const dx = r.x1 - r.x0;
  const dz = r.z1 - r.z0;
  const len = Math.hypot(dx, dz) || 1;
  const bend = Math.sin(t * Math.PI) * 260 * Math.sin(r.x0 * 0.001 + r.z1 * 0.002);
  return { x: r.x0 + dx * t - (dz / len) * bend, z: r.z0 + dz * t + (dx / len) * bend };
}
/** distância de um ponto às estradas (poligonal de 24 trechos por estrada) */
export function roadDist(lay: Layout, x: number, z: number): number {
  let best = 1e9;
  for (const r of lay.roads) {
    // descarte rápido pela caixa
    const mnx = Math.min(r.x0, r.x1) - 420;
    const mxx = Math.max(r.x0, r.x1) + 420;
    const mnz = Math.min(r.z0, r.z1) - 420;
    const mxz = Math.max(r.z0, r.z1) + 420;
    if (x < mnx || x > mxx || z < mnz || z > mxz) continue;
    let a = roadPt(r, 0);
    for (let i = 1; i <= 24; i++) {
      const b = roadPt(r, i / 24);
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / (ex * ex + ez * ez || 1)));
      best = Math.min(best, Math.hypot(x - (a.x + ex * t), z - (a.z + ez * t)));
      a = b;
    }
  }
  return best;
}
