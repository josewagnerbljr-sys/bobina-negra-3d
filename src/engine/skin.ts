import { m4, type Engine, type GpuMesh, type Mat4, type Vec3 } from "./gl";

/* Personagem com esqueleto: manequim e animações CC0 (Quaternius, Universal Animation Library).
   O conversor (tools/glb2char.py) gera public/models/char.json + char.bin. */

export type Clip = { name: string; frames: number; loop: boolean; fps: number; rot: number; hip: number };

export type CharAsset = {
  J: number;
  parent: Int16Array;
  restT: Float32Array;
  restR: Float32Array;
  names: string[];
  index: Map<string, number>;
  inv: Float32Array;
  rot: Int16Array;
  hip: Float32Array;
  clips: Map<string, Clip>;
  mesh: GpuMesh;
  /** geometria bruta, para criar a malha em outro contexto GL (a prévia do personagem usa outro) */
  raw: { pos: Float32Array; nor: Float32Array; col: Float32Array; ji: Uint8Array; w: Uint8Array; idx: Uint16Array };
  meshes: Map<Engine, GpuMesh>;
  height: number;
  version: number;
};

let asset: CharAsset | null = null;
let loading: Promise<CharAsset | null> | null = null;
let version = 0;

export function charAsset() {
  return asset;
}

export function loadCharAsset(e: Engine): Promise<CharAsset | null> {
  if (asset) return Promise.resolve(asset);
  if (loading) return loading;
  loading = (async () => {
    try {
      const base = new URL("./models/", document.baseURI).href;
      const q = typeof __BUILD__ === "string" ? "?v=" + __BUILD__ : "";
      const [jr, br] = await Promise.all([fetch(base + "char.json" + q), fetch(base + "char.bin" + q)]);
      if (!jr.ok || !br.ok) return null;
      const info = await jr.json();
      const buf = await br.arrayBuffer();
      const B = info.bin as Record<string, { off: number; len: number; n: number }>;
      const f32 = (k: string) => new Float32Array(buf, B[k]!.off, B[k]!.n);
      const u8 = (k: string) => new Uint8Array(buf, B[k]!.off, B[k]!.n);
      const J = info.joints.length as number;
      const pos = f32("pos");
      const nor = f32("nor");
      const reg = u8("reg");
      const mat = u8("mat");
      const col = new Float32Array((pos.length / 3) * 3);
      for (let i = 0; i < reg.length; i++) {
        col[i * 3] = reg[i]!;
        col[i * 3 + 1] = mat[i] === 1 ? 0.78 : 1; // peças de junta um pouco mais escuras
        col[i * 3 + 2] = mat[i]!;
      }
      const idx = new Uint16Array(buf, B.idx!.off, B.idx!.n);
      const raw = { pos, nor, col, ji: u8("ji"), w: u8("w"), idx };
      const mesh = e.uploadSkin(raw.pos, raw.nor, raw.col, raw.ji, raw.w, raw.idx);
      const parent = new Int16Array(J);
      const restT = new Float32Array(J * 3);
      const restR = new Float32Array(J * 4);
      const names: string[] = [];
      const index = new Map<string, number>();
      info.joints.forEach((j: { name: string; parent: number; t: number[]; r: number[] }, i: number) => {
        parent[i] = j.parent;
        restT.set(j.t, i * 3);
        restR.set(j.r, i * 4);
        names.push(j.name);
        index.set(j.name, i);
      });
      const clips = new Map<string, Clip>();
      for (const c of info.clips as Clip[]) clips.set(c.name, c);
      asset = {
        J,
        parent,
        restT,
        restR,
        names,
        index,
        inv: f32("inv"),
        rot: new Int16Array(buf, B.rot!.off, B.rot!.n),
        hip: f32("hip"),
        clips,
        mesh,
        raw,
        meshes: new Map([[e, mesh]]),
        height: info.height as number,
        version: ++version,
      };
      return asset;
    } catch {
      return null;
    }
  })();
  return loading;
}

/* nomes úteis dos ossos (convenção Blender DEF-*) */
export const BONE = {
  hips: "DEF-hips",
  spine1: "DEF-spine.001",
  spine2: "DEF-spine.002",
  spine3: "DEF-spine.003",
  neck: "DEF-neck",
  head: "DEF-head",
  handR: "DEF-hand.R",
  handL: "DEF-hand.L",
  foreR: "DEF-forearm.R",
  foreL: "DEF-forearm.L",
  upR: "DEF-upper_arm.R",
  upL: "DEF-upper_arm.L",
  shoR: "DEF-shoulder.R",
  shoL: "DEF-shoulder.L",
  thighR: "DEF-thigh.R",
  thighL: "DEF-thigh.L",
  shinR: "DEF-shin.R",
  shinL: "DEF-shin.L",
  footR: "DEF-foot.R",
  footL: "DEF-foot.L",
  toeR: "DEF-toe.R",
  toeL: "DEF-toe.L",
} as const;

/** ordem das regiões na malha: cabeça, tronco, braço, antebraço, mão, quadril, coxa, canela, pé */
export const REGIONS = ["head", "torso", "upperArm", "foreArm", "hand", "pelvis", "thigh", "calf", "foot"] as const;
export type RegionColors = Vec3[];

export type AnimReq = { clip: string; rate?: number; loop?: boolean; fade?: number; hold?: boolean };

const qa = new Float32Array(4);
const qb = new Float32Array(4);

function sampleInto(a: CharAsset, c: Clip, time: number, out: Float32Array, hip: Float32Array, hold: boolean) {
  const J = a.J;
  let f = time * c.fps;
  let i0: number;
  let i1: number;
  let u: number;
  if (c.loop) {
    f = ((f % c.frames) + c.frames) % c.frames;
    i0 = Math.floor(f);
    i1 = (i0 + 1) % c.frames;
    u = f - i0;
  } else {
    f = Math.max(0, Math.min(c.frames - 1, f));
    i0 = Math.min(c.frames - 1, Math.floor(f));
    i1 = Math.min(c.frames - 1, i0 + 1);
    u = f - i0;
  }
  void hold;
  const r0 = c.rot + i0 * J * 4;
  const r1 = c.rot + i1 * J * 4;
  const R = a.rot;
  const K = 1 / 32767;
  for (let j = 0; j < J; j++) {
    const o = j * 4;
    let dot = 0;
    for (let k = 0; k < 4; k++) {
      qa[k] = R[r0 + o + k]! * K;
      qb[k] = R[r1 + o + k]! * K;
      dot += qa[k]! * qb[k]!;
    }
    const s = dot < 0 ? -1 : 1;
    let x = qa[0]! * (1 - u) + qb[0]! * u * s;
    let y = qa[1]! * (1 - u) + qb[1]! * u * s;
    let z = qa[2]! * (1 - u) + qb[2]! * u * s;
    let w = qa[3]! * (1 - u) + qb[3]! * u * s;
    const l = 1 / (Math.hypot(x, y, z, w) || 1);
    x *= l;
    y *= l;
    z *= l;
    w *= l;
    out[o] = x;
    out[o + 1] = y;
    out[o + 2] = z;
    out[o + 3] = w;
  }
  const h0 = c.hip + i0 * 3;
  const h1 = c.hip + i1 * 3;
  for (let k = 0; k < 3; k++) hip[k] = a.hip[h0 + k]! * (1 - u) + a.hip[h1 + k]! * u;
}

/** vestimenta: peças (Node-like) presas a ossos */
export type Mount = { joint: number; node: unknown };

/** instância animada: crossfade entre clipes + ajustes procedurais por osso */
export class SkinRig {
  a: CharAsset;
  world: Float32Array;
  bones: Float32Array;
  local: Float32Array;
  hipT = new Float32Array(3);
  region = new Float32Array(27);
  /** rotações adicionais (quatérnio) aplicadas por cima da animação, por osso (x,y,z,w) ou null */
  extra: (Float32Array | null)[];
  /** escala por osso (sx,sy,sz nos eixos locais): dá corpos diferentes ao mesmo esqueleto */
  scl: (Float32Array | null)[];
  cur: Clip;
  curT = 0;
  curRate = 1;
  curHold = false;
  prev: Clip | null = null;
  prevT = 0;
  prevRate = 1;
  fade = 0;
  fadeDur = 0.15;
  private sa: Float32Array;
  private sb: Float32Array;
  private ha = new Float32Array(3);
  private hb = new Float32Array(3);
  finished = false;

  constructor(a: CharAsset, first = "Idle_Loop") {
    this.a = a;
    this.world = new Float32Array(a.J * 16);
    this.bones = new Float32Array(a.J * 16);
    this.local = new Float32Array(a.J * 4);
    this.sa = new Float32Array(a.J * 4);
    this.sb = new Float32Array(a.J * 4);
    this.extra = Array.from({ length: a.J }, () => null);
    this.scl = Array.from({ length: a.J }, () => null);
    this.cur = a.clips.get(first) ?? [...a.clips.values()][0]!;
  }

  /** muda o clipe (com fade); se já é o mesmo, só atualiza a taxa */
  play(name: string, rate = 1, fade = 0.15, restart = false, hold = false) {
    const c = this.a.clips.get(name);
    if (!c) return;
    this.curRate = rate;
    this.curHold = hold;
    if (c === this.cur && !restart) return;
    this.prev = this.cur;
    this.prevT = this.curT;
    this.prevRate = this.curRate;
    this.cur = c;
    this.curT = 0;
    this.fade = 0;
    this.fadeDur = Math.max(0.001, fade);
    this.finished = false;
  }

  /** deixa o novo clipe continuar de onde o anterior está (mesma fase), útil p/ andar→correr */
  playSync(name: string, rate = 1, fade = 0.2) {
    const c = this.a.clips.get(name);
    if (!c) return;
    this.curRate = rate;
    if (c === this.cur) return;
    const ph = this.curT / (this.cur.frames / this.cur.fps);
    this.prev = this.cur;
    this.prevT = this.curT;
    this.prevRate = rate;
    this.cur = c;
    this.curT = ph * (c.frames / c.fps);
    this.fade = 0;
    this.fadeDur = fade;
    this.finished = false;
  }

  get clipName() {
    return this.cur.name;
  }

  get progress() {
    const d = this.cur.frames / this.cur.fps;
    return Math.min(1, this.curT / d);
  }

  advance(dt: number) {
    const c = this.cur;
    const dur = c.frames / c.fps;
    this.curT += dt * this.curRate;
    if (!c.loop && this.curT >= dur - 1 / c.fps) {
      this.curT = dur - 1 / c.fps;
      this.finished = true;
    }
    if (this.prev) {
      this.prevT += dt * this.prevRate;
      this.fade += dt / this.fadeDur;
      if (this.fade >= 1) {
        this.prev = null;
        this.fade = 1;
      }
    }
  }

  /** calcula matrizes de osso (para a malha) e de mundo (para encaixes) */
  solve() {
    const a = this.a;
    const J = a.J;
    sampleInto(a, this.cur, this.curT, this.sa, this.ha, this.curHold);
    let q = this.sa;
    const hp = this.hipT;
    hp[0] = this.ha[0]!;
    hp[1] = this.ha[1]!;
    hp[2] = this.ha[2]!;
    if (this.prev) {
      sampleInto(a, this.prev, this.prevT, this.sb, this.hb, false);
      const k = this.fade * this.fade * (3 - 2 * this.fade);
      for (let j = 0; j < J; j++) {
        const o = j * 4;
        const d = this.sb[o]! * this.sa[o]! + this.sb[o + 1]! * this.sa[o + 1]! + this.sb[o + 2]! * this.sa[o + 2]! + this.sb[o + 3]! * this.sa[o + 3]!;
        const s = d < 0 ? -1 : 1;
        let x = this.sb[o]! * (1 - k) + this.sa[o]! * k * s;
        let y = this.sb[o + 1]! * (1 - k) + this.sa[o + 1]! * k * s;
        let z = this.sb[o + 2]! * (1 - k) + this.sa[o + 2]! * k * s;
        let w = this.sb[o + 3]! * (1 - k) + this.sa[o + 3]! * k * s;
        const l = 1 / (Math.hypot(x, y, z, w) || 1);
        x *= l;
        y *= l;
        z *= l;
        w *= l;
        this.local[o] = x;
        this.local[o + 1] = y;
        this.local[o + 2] = z;
        this.local[o + 3] = w;
      }
      for (let k2 = 0; k2 < 3; k2++) hp[k2] = this.hb[k2]! * (1 - k) + this.ha[k2]! * k;
      q = this.local;
    } else {
      this.local.set(this.sa);
      q = this.local;
    }
    // ajustes procedurais
    for (let j = 0; j < J; j++) {
      const ex = this.extra[j];
      if (!ex) continue;
      const o = j * 4;
      const ax = q[o]!;
      const ay = q[o + 1]!;
      const az = q[o + 2]!;
      const aw = q[o + 3]!;
      const bx = ex[0]!;
      const by = ex[1]!;
      const bz = ex[2]!;
      const bw = ex[3]!;
      // q = ex * q  (aplica o ajuste no referencial do pai)
      q[o] = bw * ax + bx * aw + by * az - bz * ay;
      q[o + 1] = bw * ay - bx * az + by * aw + bz * ax;
      q[o + 2] = bw * az + bx * ay - by * ax + bz * aw;
      q[o + 3] = bw * aw - bx * ax - by * ay - bz * az;
    }
    const W = this.world;
    const rt = a.restT;
    for (let j = 0; j < J; j++) {
      const o = j * 4;
      const x = q[o]!;
      const y = q[o + 1]!;
      const z = q[o + 2]!;
      const w = q[o + 3]!;
      const xx = x * x;
      const yy = y * y;
      const zz = z * z;
      const xy = x * y;
      const xz = x * z;
      const yz = y * z;
      const wx = w * x;
      const wy = w * y;
      const wz = w * z;
      // matriz local (colunas)
      const sc = this.scl[j];
      const kx = sc ? sc[0]! : 1;
      const ky = sc ? sc[1]! : 1;
      const kz = sc ? sc[2]! : 1;
      const l0 = (1 - 2 * (yy + zz)) * kx;
      const l1 = 2 * (xy + wz) * kx;
      const l2 = 2 * (xz - wy) * kx;
      const l4 = 2 * (xy - wz) * ky;
      const l5 = (1 - 2 * (xx + zz)) * ky;
      const l6 = 2 * (yz + wx) * ky;
      const l8 = 2 * (xz + wy) * kz;
      const l9 = 2 * (yz - wx) * kz;
      const l10 = (1 - 2 * (xx + yy)) * kz;
      let tx = rt[j * 3]!;
      let ty = rt[j * 3 + 1]!;
      let tz = rt[j * 3 + 2]!;
      if (j === 1) {
        tx = hp[0]!;
        ty = hp[1]!;
        tz = hp[2]!;
      }
      const p = a.parent[j]!;
      const m = j * 16;
      if (p < 0) {
        W[m] = l0;
        W[m + 1] = l1;
        W[m + 2] = l2;
        W[m + 3] = 0;
        W[m + 4] = l4;
        W[m + 5] = l5;
        W[m + 6] = l6;
        W[m + 7] = 0;
        W[m + 8] = l8;
        W[m + 9] = l9;
        W[m + 10] = l10;
        W[m + 11] = 0;
        W[m + 12] = tx;
        W[m + 13] = ty;
        W[m + 14] = tz;
        W[m + 15] = 1;
      } else {
        const pm = p * 16;
        const p0 = W[pm]!;
        const p1 = W[pm + 1]!;
        const p2 = W[pm + 2]!;
        const p4 = W[pm + 4]!;
        const p5 = W[pm + 5]!;
        const p6 = W[pm + 6]!;
        const p8 = W[pm + 8]!;
        const p9 = W[pm + 9]!;
        const p10 = W[pm + 10]!;
        W[m] = p0 * l0 + p4 * l1 + p8 * l2;
        W[m + 1] = p1 * l0 + p5 * l1 + p9 * l2;
        W[m + 2] = p2 * l0 + p6 * l1 + p10 * l2;
        W[m + 3] = 0;
        W[m + 4] = p0 * l4 + p4 * l5 + p8 * l6;
        W[m + 5] = p1 * l4 + p5 * l5 + p9 * l6;
        W[m + 6] = p2 * l4 + p6 * l5 + p10 * l6;
        W[m + 7] = 0;
        W[m + 8] = p0 * l8 + p4 * l9 + p8 * l10;
        W[m + 9] = p1 * l8 + p5 * l9 + p9 * l10;
        W[m + 10] = p2 * l8 + p6 * l9 + p10 * l10;
        W[m + 11] = 0;
        W[m + 12] = p0 * tx + p4 * ty + p8 * tz + W[pm + 12]!;
        W[m + 13] = p1 * tx + p5 * ty + p9 * tz + W[pm + 13]!;
        W[m + 14] = p2 * tx + p6 * ty + p10 * tz + W[pm + 14]!;
        W[m + 15] = 1;
      }
    }
    // matriz de pele = mundo * inversa-do-bind
    const B = this.bones;
    const inv = a.inv;
    for (let j = 0; j < J; j++) {
      const m = j * 16;
      for (let c = 0; c < 4; c++) {
        const i0 = inv[m + c * 4]!;
        const i1 = inv[m + c * 4 + 1]!;
        const i2 = inv[m + c * 4 + 2]!;
        const i3 = inv[m + c * 4 + 3]!;
        B[m + c * 4] = W[m]! * i0 + W[m + 4]! * i1 + W[m + 8]! * i2 + W[m + 12]! * i3;
        B[m + c * 4 + 1] = W[m + 1]! * i0 + W[m + 5]! * i1 + W[m + 9]! * i2 + W[m + 13]! * i3;
        B[m + c * 4 + 2] = W[m + 2]! * i0 + W[m + 6]! * i1 + W[m + 10]! * i2 + W[m + 14]! * i3;
        B[m + c * 4 + 3] = W[m + 3]! * i0 + W[m + 7]! * i1 + W[m + 11]! * i2 + W[m + 15]! * i3;
      }
    }
  }

  /** define uma rotação adicional em um osso (eixo-ângulo em torno de x,y,z do pai). Zera com clear */
  setExtra(joint: number, ax: number, ay: number, az: number) {
    if (joint < 0) return;
    let e = this.extra[joint];
    if (!e) {
      e = new Float32Array(4);
      this.extra[joint] = e;
    }
    // ângulos pequenos em Euler XYZ -> quatérnio
    const cx = Math.cos(ax / 2);
    const sx = Math.sin(ax / 2);
    const cy = Math.cos(ay / 2);
    const sy = Math.sin(ay / 2);
    const cz = Math.cos(az / 2);
    const sz = Math.sin(az / 2);
    e[0] = sx * cy * cz + cx * sy * sz;
    e[1] = cx * sy * cz - sx * cy * sz;
    e[2] = cx * cy * sz + sx * sy * cz;
    e[3] = cx * cy * cz - sx * sy * sz;
  }

  setScale(joint: number, sx: number, sy = sx, sz = sx) {
    if (joint < 0) return;
    this.scl[joint] = new Float32Array([sx, sy, sz]);
  }

  clearExtras() {
    for (let i = 0; i < this.extra.length; i++) this.extra[i] = null;
  }

  setRegion(i: number, c: Vec3) {
    this.region[i * 3] = c[0];
    this.region[i * 3 + 1] = c[1];
    this.region[i * 3 + 2] = c[2];
  }

  /** matriz de mundo (do rig, em metros) de um osso, copiada em out */
  boneMat(joint: number, out: Mat4) {
    for (let i = 0; i < 16; i++) out[i] = this.world[joint * 16 + i]!;
    return out;
  }
}

export const RIG_SCALE = 1 / 1.83;

export function skinReady() {
  return asset !== null;
}

export const _m4 = m4;

/** malha do personagem para um contexto GL específico (cria sob demanda) */
export function skinMeshFor(e: Engine, a: CharAsset): GpuMesh {
  let m = a.meshes.get(e);
  if (!m) {
    const r = a.raw;
    m = e.uploadSkin(r.pos, r.nor, r.col, r.ji, r.w, r.idx);
    a.meshes.set(e, m);
  }
  return m;
}
