import { G, glow, mix, P, type GearPiece, type Node } from "./models";
import type { Vec3 } from "./gl";
import type { EquipKey } from "../game/types";

/* Peças de equipamento do herói esqueletizado, por FAMÍLIA de item (não só pelo id).
   Referencial dos ossos: x = esquerda, y = para cima, z = para frente. */

export type Mount = { joint: number; node: Node; form?: boolean };
export const GOLD = "#e8b72e";
export const RAR = ["#d8d0c0", "#5fb4ff", "#c07aff", "#ffb23a"];

export type Cloth = { top: Node; cols: Node[][] };

/** pano de verdade: colunas independentes de linhas encadeadas, com sobreposição (sem frestas) */
export function makeCloth(o: { col: string; inner: string; trim: string; L: number; rows: number; cols: number; w: number; y?: number; z?: number; ragged?: number; alpha?: number; stars?: string; fur?: boolean; flame?: string }): Cloth {
  const top = G(0, o.y ?? 0.1, o.z ?? -0.135);
  const cols: Node[][] = [];
  const cw = o.w / o.cols;
  const mid = (o.cols - 1) / 2;
  for (let c = 0; c < o.cols; c++) {
    const chain: Node[] = [];
    let parent: Node = top;
    const xc = (c - mid) * cw;
    for (let r = 0; r < o.rows; r++) {
      const g = G(r === 0 ? xc : (xc * 0.08), r === 0 ? 0 : -o.L * 0.9, r === 0 ? 0 : 0);
      const k = r / (o.rows - 1);
      const shade = mix(mix(o.col, o.inner, k * 0.5), "#000000", 0.03 + ((c + r) % 2) * 0.025 + k * 0.04);
      const rag = r === o.rows - 1 && o.ragged ? 1 + o.ragged * (((c * 37) % 5) / 5 - 0.35) : 1;
      const len = o.L * 1.18 * rag;
      const wid = cw * (1.22 + r * 0.045);
      const pl = P("plate", [wid, len, 0.014], shade, [0, -len / 2 + o.L * 0.08, 0]);
      if (o.alpha) pl.alpha = o.alpha;
      g.add(pl);
      if (r === 0) g.add(P("plate", [wid * 1.02, 0.045, 0.03], o.trim, [0, 0.0, 0.004]));
      if (r === o.rows - 1) {
        if (o.flame) {
          const fl = glow(P("cone", [wid * 0.9, 0.2 * rag, 0.03], o.flame, [0, -len + 0.01, 0], [Math.PI, 0, 0]), 0.9);
          g.add(fl);
        } else g.add(P("plate", [wid * 1.02, 0.028, 0.022], o.trim, [0, -len + o.L * 0.08, 0.004]));
      }
      if (o.stars && (c + r * 2) % 4 === 1 && r > 0) g.add(glow(P("gem", [0.028, 0.035, 0.01], o.stars, [0, -o.L * 0.45, 0.012]), 0.9));
      parent.add(g);
      parent = g;
      chain.push(g);
    }
    cols.push(chain);
  }
  if (o.fur) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 2.1;
      top.add(P("sphere", [0.085, 0.07, 0.085], o.trim, [Math.sin(a) * 0.17, 0.02 - Math.abs(a) * 0.012, 0.0 + (1 - Math.cos(a)) * 0.05 + 0.1]));
    }
  }
  return { top, cols };
}

export type Feather = { n: Node; base: number; k: number };
export type WingRig = { root: Node; elbow: Node; wrist: Node; sx: number; tips: Node[]; feathers?: Feather[]; always?: boolean };

/** triângulo fino (membrana) com ápice em `a` e base entre `b` e `c` (no plano xy) */
function panel(parent: Node, a: [number, number], b: [number, number], c: [number, number], color: string, th: number) {
  const mx = (b[0] + c[0]) / 2, my = (b[1] + c[1]) / 2;
  const w = Math.hypot(b[0] - c[0], b[1] - c[1]);
  const h = Math.hypot(a[0] - mx, a[1] - my);
  const dx = (a[0] - mx) / (h || 1), dy = (a[1] - my) / (h || 1);
  const phi = Math.atan2(-dx, dy);
  const n = P("shard", [w, h, th], color, [(a[0] + mx) / 2, (a[1] + my) / 2, 0], [0, 0, phi]);
  parent.add(n);
  return n;
}

export function makeWing(sx: number, o: { bone: string; memb: string; memb2: string; span?: number; claw?: string; thick?: number; fingers?: number; glow?: string; feather?: boolean; spikes?: string; boneT?: number }): WingRig {
  const span = o.span ?? 1;
  const th = o.thick ?? 0.02;
  const root = G(sx * 0.06, 0.04, -0.14);
  const bone = (parent: Node, len: number, t: number, theta: number, from: [number, number] = [0, 0]) => {
    const phi = sx * (theta - Math.PI / 2);
    const c = P("cyl", [t, len, t], o.bone, [from[0] + (sx * Math.cos(theta) * len) / 2, from[1] + (Math.sin(theta) * len) / 2, 0], [0, 0, phi]);
    parent.add(c);
    return [from[0] + sx * Math.cos(theta) * len, from[1] + Math.sin(theta) * len] as [number, number];
  };
  const bt = o.boneT ?? 1;
  const E = bone(root, 0.4 * span, 0.052 * bt, 0.28);
  root.add(P("sphere", [0.075, 0.075, 0.075], o.bone, [0, 0, 0]));
  const elbow = G(E[0], E[1], 0);
  elbow.add(P("sphere", [0.065, 0.065, 0.065], o.bone, [0, 0, 0]));
  root.add(elbow);
  const W = bone(elbow, 0.46 * span, 0.04 * bt, 1.05);
  if (o.spikes) {
    for (let i = 0; i < 3; i++) {
      const u = 0.25 + i * 0.28;
      root.add(P("cone", [0.045 * bt, 0.12 * bt, 0.045 * bt], o.spikes, [E[0] * u, E[1] * u + 0.04, -0.01], [0, 0, sx * -0.4]));
      elbow.add(P("cone", [0.04 * bt, 0.1 * bt, 0.04 * bt], o.spikes, [W[0] * u, W[1] * u + 0.04, -0.01], [0, 0, sx * -0.4]));
    }
  }
  const wrist = G(W[0], W[1], 0);
  wrist.add(P("sphere", [0.06, 0.06, 0.06], o.bone, [0, 0, 0]));
  elbow.add(wrist);
  if (o.claw) wrist.add(P("blade", [0.05, 0.15, 0.04], o.claw, [sx * 0.02, 0.075, 0], [0, 0, 0]));
  const nf = o.fingers ?? 5;
  const lens = [0.6, 0.76, 0.76, 0.7, 0.62, 0.5, 0.44].slice(0, nf);
  const angs = [1.45, 1.02, 0.6, 0.18, -0.24, -0.66, -1.0].slice(0, nf);
  const tips: [number, number][] = [];
  const tipNodes: Node[] = [];
  for (let k = 0; k < nf; k++) {
    // dedo em dois segmentos, com curva para trás (mais orgânico)
    const t1 = 0.03 - k * 0.0015;
    const l1 = lens[k]! * span * 0.56;
    const K = bone(wrist, l1, t1, angs[k]!);
    wrist.add(P("sphere", [t1 * 1.5, t1 * 1.5, t1 * 1.5], o.bone, [K[0], K[1], 0]));
    const T = bone(wrist, lens[k]! * span * 0.5, t1 * 0.7, angs[k]! - 0.22, K);
    tips.push(T);
    const tn = P("blade", [0.022, 0.065, 0.018], o.claw ?? o.bone, [T[0], T[1], 0], [0, 0, sx * (angs[k]! - 0.22 - Math.PI / 2)]);
    wrist.add(tn);
    tipNodes.push(tn);
  }
  // membrana com borda recortada (festão) entre as pontas dos dedos
  for (let k = 0; k < nf - 1; k++) {
    const a = tips[k]!, b = tips[k + 1]!;
    const mid: [number, number] = [((a[0] + b[0]) / 2) * 0.8, ((a[1] + b[1]) / 2) * 0.8];
    const inner = mix(k % 2 ? o.memb2 : o.memb, "#ffffff", 0.06 + (k / nf) * 0.04);
    const outer = k % 2 ? o.memb2 : o.memb;
    panel(wrist, [0, 0], a, mid, outer, th);
    panel(wrist, [0, 0], mid, b, inner, th);
    // reforço escuro junto à borda
    panel(wrist, mid, [a[0] * 0.97, a[1] * 0.97], [b[0] * 0.97, b[1] * 0.97], mix(outer, "#000000", 0.25), th * 0.8);
  }
  const last = tips[nf - 1]!;
  const low: [number, number] = [-W[0] * 0.92 + sx * 0.05, -W[1] - 0.5 * span];
  panel(wrist, [0, 0], last, low, o.memb2, th);
  panel(wrist, [0, 0], low, [-sx * 0.02, -0.18 * span], mix(o.memb2, "#000000", 0.2), th);
  return { root, elbow, wrist, sx, tips: tipNodes };
}

/** asa de anjo: braço com penas primárias em leque, secundárias e coberturas em camadas */
export function makeFeatherWing(sx: number, o: { main: string; shade: string; edge?: string; span?: number; glow?: string; bone?: string }): WingRig {
  const span = o.span ?? 1;
  const root = G(sx * 0.06, 0.06, -0.14);
  const feathers: Feather[] = [];
  const boneC = o.bone ?? o.shade;
  const arm = (parent: Node, len: number, th: number, theta: number, from: [number, number]) => {
    const phi = sx * (theta - Math.PI / 2);
    parent.add(P("cyl", [th, len, th], boneC, [from[0] + (sx * Math.cos(theta) * len) / 2, from[1] + (Math.sin(theta) * len) / 2, 0], [0, 0, phi]));
    return [from[0] + sx * Math.cos(theta) * len, from[1] + Math.sin(theta) * len] as [number, number];
  };
  const feather = (parent: Node, at: [number, number], len: number, wid: number, theta: number, color: string, z: number, k: number) => {
    const phi = sx * (theta - Math.PI / 2);
    const n = P("blade", [wid, len, 0.012], color, [at[0] + (sx * Math.cos(theta) * len) / 2, at[1] + (Math.sin(theta) * len) / 2, z], [0, 0, phi]);
    parent.add(n);
    feathers.push({ n, base: phi, k });
    return n;
  };
  const E = arm(root, 0.34 * span, 0.05, 0.55, [0, 0]);
  root.add(P("sphere", [0.07, 0.07, 0.07], boneC, [0, 0, 0]));
  const elbow = G(E[0], E[1], 0);
  elbow.add(P("sphere", [0.06, 0.06, 0.06], boneC, [0, 0, 0]));
  root.add(elbow);
  const W = arm(elbow, 0.4 * span, 0.04, 0.95, [0, 0]);
  const wrist = G(W[0], W[1], 0);
  wrist.add(P("sphere", [0.05, 0.05, 0.05], boneC, [0, 0, 0]));
  elbow.add(wrist);
  // primárias: leque a partir do pulso (do alto até a borda de trás)
  const N = 8;
  const tips: Node[] = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1);
    const theta = 1.25 - u * 2.0;
    const len = (0.62 + Math.sin(u * 2.4 + 0.4) * 0.28) * span;
    const col = k % 2 ? o.shade : o.main;
    tips.push(feather(wrist, [0, 0], len, 0.1 - u * 0.012, theta, col, 0.004 * (k % 2), 1 + u));
    feather(wrist, [0, 0], len * 0.62, 0.11, theta + 0.04, mix(o.main, "#ffffff", 0.25), 0.012 + 0.003 * (k % 2), 1.2 + u);
  }
  // secundárias: penduradas ao longo do antebraço
  for (let k = 0; k < 6; k++) {
    const u = (k + 0.5) / 6;
    const at: [number, number] = [W[0] * u, W[1] * u];
    feather(elbow, at, (0.52 - u * 0.1) * span, 0.1, -1.05 - u * 0.25, k % 2 ? o.shade : o.main, -0.004 * (k % 2), 1.4 + u);
    feather(elbow, at, (0.3 - u * 0.04) * span, 0.1, -0.95 - u * 0.2, mix(o.main, "#ffffff", 0.3), 0.012, 1.5 + u);
  }
  // coberturas pequenas junto ao braço
  for (let k = 0; k < 6; k++) {
    const u = (k + 0.3) / 6;
    const at: [number, number] = [E[0] * u, E[1] * u];
    feather(root, at, 0.2 * span, 0.09, -0.9 - u * 0.2, mix(o.main, "#ffffff", 0.4), 0.02, 1.6);
  }
  if (o.edge) for (let k = 0; k < N; k += 2) feather(wrist, [0, 0], (0.7 + k * 0.01) * span, 0.02, 1.25 - (k / (N - 1)) * 2.0, o.edge, 0.02, 1);
  return { root, elbow, wrist, sx, tips, feathers };
}

/** pose de batida (anjo e dragão): ombro, cotovelo, pulso com atraso e ondulação das penas */
/** batida assimétrica (descida forte e rápida, subida mais lenta com cotovelo dobrado), com atraso em cascata até a ponta */
const stroke = (x: number) => Math.sin(x) + 0.24 * Math.sin(2 * x + 0.9) - 0.06;

export function poseWing(wg: WingRig, t: number, speed: number, amp0: number, ph0 = 0, rest0 = 0, flow = 0, glide = 0) {
  const sx = wg.sx;
  // planeio: ao cair, bate menos, abre mais e treme de leve com o vento
  const amp = amp0 * (1 - 0.72 * glide);
  const ph = ph0 + (sx > 0 ? 0.16 : 0) + Math.sin(t * 0.9 + sx) * 0.05;
  const rest = rest0 - glide * 0.16;
  const th = t * speed * (1 - 0.35 * glide) + ph;
  const fl = stroke(th) * 0.92 + glide * Math.sin(t * 9 + sx * 2) * 0.05;
  const act = Math.min(1, amp / 0.3);
  const breathe = Math.sin(t * 1.3 + ph) * 0.025 + Math.sin(t * 0.7 + ph * 2) * 0.015;
  wg.root.rot[2] = sx * (0.12 - rest + fl * amp + breathe);
  wg.root.rot[1] = sx * (-0.3 - flow * 0.3 + fl * 0.16 * (0.3 + 0.7 * act));
  const up = 0.5 - 0.5 * Math.cos(th + 0.5);
  wg.elbow.rot[2] = -sx * (0.2 + 0.06 * breathe * 10 - fl * 0.4 * (0.2 + 0.8 * act) + up * 0.18 * act);
  const lag = stroke(th - 1.0);
  wg.wrist.rot[2] = -sx * (lag * amp * 0.9 + breathe * 1.5);
  wg.wrist.rot[1] = sx * lag * 0.14 * act;
  if (wg.feathers) {
    for (let i = 0; i < wg.feathers.length; i++) {
      const f = wg.feathers[i]!;
      const w = stroke(th - 1.3 - i * 0.2);
      const fl2 = Math.sin(t * 21 + i * 1.9 + ph) * 0.011 * (0.4 + act);
      f.n.rot[2] = f.base + sx * (w * (0.03 + 0.11 * act) + breathe * 0.8 + fl2) * f.k;
    }
  }
}

const lerp = mix;

/** cor do equipamento, levemente puxada para dourado nas raridades altas */
export function pieceColor(p: GearPiece) {
  return p.rarity >= 3 ? lerp(p.color, GOLD, 0.4) : p.color;
}

export type Anim = { cloth?: Cloth; wingRigs?: WingRig[]; tail?: Node[]; flame?: Node[]; extra?: ((t: number, p: unknown) => void)[]; wings?: Node[] };

/** constrói as peças de um item equipado por família */
export function buildPiece(J: (b: string) => number, slot: EquipKey, p: GearPiece, anim: Anim): Mount[] {
  const out: Mount[] = [];
  const col = pieceColor(p);
  const dark = mix(col, "#000000", 0.35);
  const acc = p.acc ?? (p.rarity >= 3 ? "#fff2b0" : p.rarity >= 2 ? GOLD : mix(col, "#ffffff", 0.35));
  const trim = p.acc && p.rarity < 3 ? p.acc : p.rarity >= 3 ? "#fff2b0" : p.rarity >= 2 ? GOLD : mix(col, "#ffffff", 0.35);
  const rc = RAR[Math.min(3, p.rarity)]!;
  const fam = p.fam ?? p.base;
  const id = p.base;
  const add = (bone: string, n: Node, form = false) => {
    out.push({ joint: J(bone), node: n, form });
    return n;
  };
  const sides = [1, -1] as const;
  const side = (sx: number) => (sx > 0 ? "L" : "R");
  const gem = (bone: string, pos: Vec3, s: number, c = rc) => add(bone, glow(P("gem", [s, s * 1.35, s], c, pos), 0.85));
  const ice = id.includes("ice");
  const crystal = (bone: string, pos: Vec3, h: number, rot: Vec3 = [0, 0, 0], c = "#bfe8ff") => {
    const n = P("shard", [h * 0.45, h, h * 0.3], c, pos, rot);
    n.alpha = 0.88;
    return add(bone, glow(n, 0.35));
  };

  if (slot === "helmet") {
    const h = "DEF-head";
    if (fam === "cap") {
      add(h, P("hemi", [0.28, 0.17, 0.29], col, [0, 0.105, -0.005]));
      add(h, P("plate", [0.22, 0.02, 0.15], dark, [0, 0.12, 0.16], [0.18, 0, 0]));
      add(h, P("cyl", [0.285, 0.022, 0.295], trim, [0, 0.115, -0.005]));
      add(h, P("sphere", [0.04, 0.04, 0.04], trim, [0, 0.285, -0.005]));
    } else if (fam === "tophat") {
      const tall = id === "u_tophat" ? 1.25 : 1;
      add(h, P("cyl", [0.18, 0.24 * tall, 0.18], col, [0, 0.34 + (tall - 1) * 0.12, 0]));
      add(h, P("cyl", [0.34, 0.025, 0.34], dark, [0, 0.218, 0]));
      add(h, P("cyl", [0.185, 0.05, 0.185], id === "tophat" ? trim : p.acc ?? trim, [0, 0.262, 0]));
      add(h, P("plate", [0.05, 0.05, 0.02], GOLD, [0, 0.262, 0.095]));
      add(h, P("cyl", [0.19, 0.012, 0.19], dark, [0, 0.46 + (tall - 1) * 0.24, 0]));
      if (id === "tophat_magic") {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.5;
          add(h, glow(P("gem", [0.028, 0.034, 0.012], "#ffe88a", [Math.sin(a) * 0.092, 0.34 + (i % 2) * 0.07, Math.cos(a) * 0.092], [0, a, 0]), 0.9));
        }
        add(h, P("shard", [0.2, 0.1, 0.04], col, [0, 0.52, -0.02], [0.4, 0, 0]));
        add(h, glow(P("gem", [0.05, 0.07, 0.05], "#ffe88a", [0, 0.58, 0.0]), 1));
      }
      if (id === "u_tophat") {
        add(h, glow(P("gem", [0.05, 0.07, 0.03], "#c4373a", [0.07, 0.262, 0.095]), 0.8));
        add(h, P("ring", [0.07, 0.025, 0.07], GOLD, [0.06, 0.1, 0.16], [Math.PI / 2, 0, 0]));
      }
    } else if (fam === "hood") {
      add(h, P("hemi", [0.33, 0.28, 0.33], col, [0, 0.065, -0.03]));
      add(h, P("shard", [0.3, 0.34, 0.07], col, [0, -0.02, -0.16], [0.18, 0, 0]));
      add(h, P("cyl", [0.3, 0.025, 0.28], trim, [0, 0.07, 0.01], [0.15, 0, 0]));
      add(h, P("shard", [0.08, 0.1, 0.05], dark, [0, 0.275, -0.08], [-0.5, 0, 0]));
    } else if (fam === "mask") {
      add(h, P("cyl", [0.3, 0.035, 0.3], trim, [0, 0.12, 0.0]));
      add(h, P("plate", [0.22, 0.14, 0.03], col, [0, 0.065, 0.14], [0.05, 0, 0]));
      add(h, P("sphere", [0.2, 0.08, 0.04], col, [0, 0.135, 0.135], [0.3, 0, 0]));
      for (const sx of sides) {
        add(h, P("sphere", [0.04, 0.03, 0.02], "#14080c", [sx * 0.055, 0.075, 0.158]));
        add(h, P("plate", [0.012, 0.07, 0.012], trim, [sx * 0.06, 0.02, 0.158]));
        add(h, P("plate", [0.04, 0.02, 0.05], col, [sx * 0.16, 0.08, 0.02]));
      }
      add(h, P("shard", [0.05, 0.11, 0.025], trim, [0, 0.03, 0.155], [Math.PI, 0, 0]));
      add(h, P("plate", [0.3, 0.03, 0.05], dark, [0, 0.09, -0.15]));
    } else if (fam === "helm") {
      add(h, P("hemi", [0.3, 0.22, 0.31], col, [0, 0.1, -0.005]));
      add(h, P("plate", [0.3, 0.075, 0.31], dark, [0, 0.08, -0.005]));
      add(h, P("plate", [0.24, 0.05, 0.05], "#14080c", [0, 0.115, 0.14]));
      add(h, P("plate", [0.03, 0.1, 0.05], col, [0, 0.08, 0.15]));
      add(h, P("shard", [0.045, 0.17, 0.3], trim, [0, 0.34, -0.02]));
      for (const sx of sides) add(h, P("plate", [0.03, 0.13, 0.2], col, [sx * 0.15, 0.06, 0.0]));
      if (id === "helm_wing") {
        for (const sx of sides) for (let k = 0; k < 4; k++) add(h, P("shard", [0.06, 0.2 - k * 0.025, 0.018], k % 2 ? "#ffffff" : "#e8f0ff", [sx * (0.17 + k * 0.04), 0.2 - k * 0.035, -0.03], [0, 0, -sx * (0.5 + k * 0.28)]));
      }
    } else {
      // coroa
      add(h, P("cyl", [0.26, 0.07, 0.26], col, [0, 0.27, 0]));
      add(h, P("cyl", [0.27, 0.02, 0.27], trim, [0, 0.245, 0]));
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const hh = (i % 2 ? 0.13 : 0.19) * (ice ? 1.2 : 1);
        if (ice) crystal(h, [Math.cos(a) * 0.115, 0.3 + hh * 0.5, Math.sin(a) * 0.115], hh, [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15]);
        else add(h, glow(P("shard", [0.075, hh, 0.045], trim, [Math.cos(a) * 0.115, 0.3 + hh * 0.5, Math.sin(a) * 0.115], [0, -a + Math.PI / 2, 0]), 0.35));
        if (i % 2 === 0) add(h, P("sphere", [0.02, 0.02, 0.02], rc, [Math.cos(a) * 0.115, 0.31 + hh, Math.sin(a) * 0.115]));
      }
      gem(h, [0, 0.285, 0.13], 0.055);
    }
  } else if (slot === "necklace") {
    add("DEF-neck", P("ring", [0.21, 0.07, 0.21], trim, [0, -0.01, 0.01]));
    const bead = (c: string, i: number) => {
      const a = Math.PI * (0.15 + (i / 8) * 0.7);
      add("DEF-neck", P("sphere", [0.028, 0.028, 0.028], c, [Math.cos(a + Math.PI / 2) * 0.1, -0.05 - Math.sin((i / 8) * Math.PI) * 0.05, 0.065 + Math.sin(a) * 0.04]));
    };
    const pc = "DEF-spine.003";
    if (fam === "pearls") {
      for (let i = 0; i < 9; i++) bead(i % 4 === 2 ? "#ffd8e8" : "#f6f0f8", i);
      for (let i = 0; i < 5; i++) add(pc, P("sphere", [0.035, 0.035, 0.035], "#f6f0f8", [Math.sin((i - 2) * 0.5) * 0.09, 0.11 - Math.cos((i - 2) * 0.5) * 0.02 - Math.abs(i - 2) * 0.0, 0.133]));
      gem(pc, [0, 0.07, 0.14], 0.04, acc);
    } else {
      for (let i = 0; i < 9; i++) bead(i % 3 === 1 ? rc : trim, i);
      if (fam === "scarab") {
        add(pc, P("sphere", [0.075, 0.05, 0.1], col, [0, 0.08, 0.135]));
        add(pc, glow(P("gem", [0.04, 0.05, 0.03], p.acc ?? "#2ac0a8", [0, 0.085, 0.175]), 0.8));
        for (const sx of sides) add(pc, P("shard", [0.07, 0.1, 0.012], trim, [sx * 0.08, 0.1, 0.14], [0, 0, -sx * 1.2]));
      } else if (fam === "charm") {
        add(pc, P("plate", [0.02, 0.1, 0.02], "#6b4a2f", [0, 0.12, 0.13]));
        for (let k = -1; k <= 1; k++) add(pc, P("cone", [0.04, 0.12 - Math.abs(k) * 0.03, 0.04], col, [k * 0.045, 0.06 + Math.abs(k) * 0.02, 0.14], [Math.PI, 0, k * 0.25]));
        add(pc, P("sphere", [0.025, 0.025, 0.025], p.acc ?? rc, [0, 0.115, 0.145]));
      } else if (fam === "locket") {
        add(pc, P("sphere", [0.07, 0.085, 0.03], col, [0, 0.07, 0.14]));
        add(pc, P("ring", [0.075, 0.03, 0.09], trim, [0, 0.07, 0.145], [Math.PI / 2, 0, 0]));
        add(pc, glow(P("gem", [0.03, 0.04, 0.02], rc, [0, 0.07, 0.165]), 0.7));
      } else if (fam === "medal") {
        add(pc, P("cyl", [0.08, 0.015, 0.08], col, [0, 0.055, 0.14], [Math.PI / 2, 0, 0]));
        add(pc, glow(P("gem", [0.035, 0.045, 0.02], p.acc ?? rc, [0, 0.055, 0.155]), 0.8));
        for (const sx of sides) add(pc, P("plate", [0.04, 0.12, 0.012], p.acc ?? "#c4373a", [sx * 0.03, 0.13, 0.135], [0, 0, sx * 0.3]));
      } else if (fam === "whistle") {
        add(pc, P("cyl", [0.03, 0.09, 0.03], col, [0, 0.08, 0.14], [0, 0, Math.PI / 2]));
        add(pc, P("sphere", [0.05, 0.05, 0.05], col, [0.04, 0.08, 0.14]));
        add(pc, P("cyl", [0.012, 0.02, 0.012], "#14080c", [-0.01, 0.1, 0.14]));
      } else {
        add(pc, P("ring", [0.08, 0.025, 0.08], trim, [0, 0.1, 0.135], [Math.PI / 2, 0, 0]));
        gem(pc, [0, 0.06, 0.14], 0.052, col);
        if (p.rarity > 0) gem(pc, [0, 0.025, 0.14], 0.028, rc);
      }
      if (id === "u_halo") add("DEF-head", glow(P("ring", [0.34, 0.03, 0.34], "#fff0a0", [0, 0.42, 0], [0, 0, 0]), 1));
    }
  } else if (slot === "armor") {
    const s3 = "DEF-spine.003";
    const accent = p.acc ?? trim;
    if (fam === "plate") {
      add(s3, P("plate", [0.36, 0.28, 0.1], col, [0, 0.05, 0.095]));
      add(s3, P("plate", [0.12, 0.2, 0.03], accent, [0, 0.06, 0.15]));
      add(s3, P("plate", [0.3, 0.04, 0.09], dark, [0, -0.09, 0.1]));
      add(s3, P("plate", [0.34, 0.26, 0.05], dark, [0, 0.05, -0.1]));
      for (const sx of sides) {
        add(s3, P("plate", [0.14, 0.05, 0.04], dark, [sx * 0.09, 0.12, 0.148], [0, 0, -sx * 0.25]));
        add(s3, P("sphere", [0.016, 0.016, 0.016], accent, [sx * 0.15, -0.01, 0.15]));
      }
      add("DEF-hips", P("plate", [0.32, 0.07, 0.24], dark, [0, 0.08, 0.02]));
      for (let i = 0; i < 3; i++) add("DEF-hips", P("shard", [0.1, 0.18, 0.03], i === 1 ? accent : col, [-0.1 + i * 0.1, -0.06, 0.125], [Math.PI, 0.0, 0]));
      for (const sx of sides) {
        const u = `DEF-upper_arm.${side(sx)}`;
        add(u, P("hemi", [0.22, 0.14, 0.21], col, [-sx * 0.06, 0.035, 0]));
        add(u, P("cyl", [0.225, 0.02, 0.215], accent, [-sx * 0.06, 0.035, 0]));
        add(u, P("shard", [0.07, 0.12, 0.05], accent, [-sx * 0.06, 0.17, 0]));
        if (id === "plate_black") for (let k = 0; k < 3; k++) add(u, P("cone", [0.04, 0.12, 0.04], dark, [-sx * (0.0 + k * 0.05), 0.12, (k - 1) * 0.06], [0, 0, -sx * 0.3]));
        if (ice) for (let k = 0; k < 3; k++) crystal(u, [-sx * (0.0 + k * 0.05), 0.14, (k - 1) * 0.06], 0.16 - k * 0.02, [0, 0, -sx * 0.2]);
        if (id === "cuirass") add(u, P("plate", [0.22, 0.03, 0.2], GOLD, [-sx * 0.06, 0.07, 0]));
      }
      add("DEF-neck", P("cyl", [0.2, 0.05, 0.2], accent, [0, -0.01, 0]));
      if (id === "cuirass" || p.rarity >= 3) {
        add(s3, glow(P("gem", [0.06, 0.08, 0.03], id === "cuirass" ? "#c4373a" : rc, [0, 0.07, 0.165]), 0.8));
        for (const sx of sides) add(s3, P("shard", [0.09, 0.05, 0.02], GOLD, [sx * 0.08, 0.07, 0.16], [0, 0, -sx * 0.5]));
      }
    } else if (fam === "vest") {
      add(s3, P("plate", [0.075, 0.34, 0.03], trim, [0.075, 0.04, 0.125], [0, 0, 0.32]));
      add(s3, P("plate", [0.075, 0.34, 0.03], trim, [-0.075, 0.04, 0.125], [0, 0, -0.32]));
      add(s3, P("plate", [0.3, 0.2, 0.04], col, [0, 0.05, -0.115]));
      add("DEF-hips", P("cyl", [0.31, 0.06, 0.22], "#3a2a20", [0, 0.06, 0.02]));
      add("DEF-hips", P("plate", [0.07, 0.06, 0.03], GOLD, [0, 0.06, 0.13]));
      for (let i = 0; i < 4; i++) add(s3, P("sphere", [0.018, 0.018, 0.018], p.acc ?? GOLD, [i % 2 ? 0.05 : -0.05, 0.15 - i * 0.07, 0.135]));
      for (const sx of sides) {
        add(`DEF-upper_arm.${side(sx)}`, P("hemi", [0.16, 0.09, 0.16], col, [-sx * 0.06, 0.04, 0]));
        add(s3, P("plate", [0.1, 0.18, 0.04], col, [sx * 0.11, 0.05, 0.1], [0, 0, sx * 0.15]));
        add(s3, P("cyl", [0.02, 0.1, 0.02], "#2a1a10", [sx * 0.11, -0.04, 0.125]));
      }
      add(s3, P("plate", [0.34, 0.025, 0.03], "#3a2a20", [0, 0.0, 0.135]));
    } else if (fam === "robe") {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        add("DEF-hips", P("shard", [0.22, 0.58, 0.035], i % 2 ? col : dark, [Math.sin(a) * 0.18, -0.31, Math.cos(a) * 0.15], [Math.cos(a) * 0.16, a, -Math.sin(a) * 0.16]));
      }
      add("DEF-hips", P("cyl", [0.48, 0.03, 0.4], trim, [0, -0.58, 0]));
      add("DEF-hips", P("plate", [0.32, 0.06, 0.24], trim, [0, 0.09, 0.02]));
      add(s3, P("plate", [0.3, 0.2, 0.06], col, [0, 0.06, 0.09]));
      add(s3, P("cyl", [0.2, 0.07, 0.2], trim, [0, 0.17, 0]));
      add("DEF-hips", P("plate", [0.06, 0.55, 0.03], trim, [0, -0.28, 0.2]));
      if (id === "robe_star") for (let i = 0; i < 8; i++) add("DEF-hips", glow(P("gem", [0.035, 0.045, 0.012], "#ffe88a", [Math.sin(i * 0.8) * 0.15, -0.12 - (i % 4) * 0.11, 0.2 + Math.cos(i * 0.8) * 0.02]), 0.9));
      for (const sx of sides) {
        const u = `DEF-upper_arm.${side(sx)}`;
        add(u, P("shard", [0.2, 0.34, 0.06], col, [-sx * 0.1, -0.04, 0], [0, 0, -sx * 1.57]));
        add(u, P("hemi", [0.18, 0.1, 0.18], dark, [-sx * 0.06, 0.05, 0]));
      }
    } else {
      // túnica / casaco
      add(s3, P("plate", [0.34, 0.3, 0.07], col, [0, 0.04, 0.1]));
      add(s3, P("plate", [0.34, 0.3, 0.05], dark, [0, 0.04, -0.1]));
      for (let i = 0; i < 4; i++) add(s3, P("sphere", [0.02, 0.02, 0.02], p.acc ?? GOLD, [0.02, 0.14 - i * 0.07, 0.14]));
      for (const sx of sides) {
        add(s3, P("plate", [0.1, 0.22, 0.03], p.acc ?? trim, [sx * 0.07, 0.07, 0.14], [0, 0, sx * 0.35]));
        const u = `DEF-upper_arm.${side(sx)}`;
        add(u, P("hemi", [0.18, 0.1, 0.18], col, [-sx * 0.06, 0.04, 0]));
        add(u, P("cyl", [0.19, 0.03, 0.19], p.acc ?? GOLD, [-sx * 0.06, 0.04, 0]));
        for (let k = 0; k < 4; k++) add(u, P("cyl", [0.012, 0.07, 0.012], p.acc ?? GOLD, [-sx * 0.06, -0.01, -0.07 + k * 0.047]));
      }
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        add("DEF-hips", P("shard", [0.17, 0.26, 0.03], i % 2 ? col : p.acc ?? trim, [Math.sin(a) * 0.17, -0.1, Math.cos(a) * 0.14], [Math.cos(a) * 0.25, a, -Math.sin(a) * 0.25]));
      }
      add("DEF-hips", P("shard", [0.2, 0.34, 0.03], col, [0, -0.2, -0.16], [-0.25, 0, 0]));
      add("DEF-neck", P("ring", [0.3, 0.2, 0.3], p.acc ?? trim, [0, 0.0, 0.0]));
    }
  } else if (slot === "cape") {
    const L = id === "cape_gold" || id === "cape_star" || id === "cape_moon" ? 0.135 : id === "cape_fur" ? 0.105 : fam === "cloak" ? 0.125 : 0.115;
    const cl = makeCloth({
      col,
      inner: p.acc ? mix(col, p.acc, 0.45) : mix(col, trim, 0.3),
      trim: id === "cape_fur" ? p.acc ?? "#e8dcc0" : trim,
      L,
      rows: 8,
      cols: 5,
      w: 0.4,
      ragged: fam === "cloak" ? 0.35 : 0,
      alpha: id === "u_veil" ? 0.78 : undefined,
      stars: id === "cape_star" || id === "cape_moon" ? p.acc ?? "#ffe88a" : undefined,
      fur: id === "cape_fur",
      flame: id === "cloak_flame" ? p.acc ?? "#ffd34a" : undefined,
    });
    add("DEF-spine.003", cl.top);
    anim.cloth = cl;
    for (const sx of sides) add("DEF-spine.003", P("plate", [0.08, 0.06, 0.06], trim, [sx * 0.1, 0.13, 0.1]));
    add("DEF-spine.003", P("plate", [0.1, 0.04, 0.05], trim, [0, 0.145, -0.12]));
    add("DEF-spine.003", P("plate", [0.24, 0.03, 0.03], trim, [0, 0.13, 0.115]));
    gem("DEF-spine.003", [0, 0.11, 0.135], 0.04, p.acc ?? rc);
    if (id === "cloak_flame" || id === "cape_moon") {
      const glowc = id === "cloak_flame" ? "#ff8a3a" : "#cfe0ff";
      for (let i = 0; i < 5; i++) {
        const f = glow(P("cone", [0.05, 0.18, 0.05], glowc, [(i - 2) * 0.07, 0.0, -0.15]), 0.9);
        add("DEF-spine.003", f);
        anim.flame = anim.flame ?? [];
        anim.flame.push(f);
      }
    }
  } else if (slot === "gloves") {
    for (const sx of sides) {
      const b = `DEF-forearm.${side(sx)}`;
      const hd = `DEF-hand.${side(sx)}`;
      if (fam === "boxing") {
        add(hd, P("sphere", [0.16, 0.14, 0.15], col, [-sx * 0.085, 0.02, 0.0]));
        add(hd, P("sphere", [0.07, 0.06, 0.07], col, [-sx * 0.08, 0.02, 0.095]));
        add(b, P("cyl", [0.05, 0.14, 0.14], p.acc ?? "#ffffff", [-sx * 0.27, 0, 0]));
        add(hd, P("plate", [0.02, 0.1, 0.1], p.acc ?? "#ffffff", [-sx * 0.0, 0.02, 0.0]));
        for (let k = -1; k <= 1; k++) add(hd, P("cube", [0.02, 0.01, 0.03], "#ffffff", [-sx * 0.1, 0.09, k * 0.03]));
        continue;
      }
      add(b, P("plate", [0.16, 0.12, 0.125], col, [-sx * 0.19, 0, 0]));
      add(b, P("cyl", [0.03, 0.14, 0.14], trim, [-sx * 0.26, 0, 0], [0, 0, 0]));
      add(hd, P("plate", [0.11, 0.075, 0.12], col, [-sx * 0.06, 0.025, 0]));
      for (let k = -1; k <= 1; k++) add(hd, P("sphere", [0.028, 0.028, 0.028], trim, [-sx * 0.12, 0.03, k * 0.04]));
      if (id === "gloves_silk") {
        add(b, P("plate", [0.3, 0.1, 0.1], col, [-sx * 0.1, 0, 0]));
        add(b, P("shard", [0.08, 0.2, 0.02], p.acc ?? "#c0b0e0", [-sx * 0.28, -0.02, 0], [0, 0, -sx * 1.57]));
      }
      if (fam === "gauntlet") {
        add(b, P("shard", [0.09, 0.1, 0.05], trim, [-sx * 0.16, 0.085, 0], [0, 0, -sx * 1.57]));
        add(b, P("plate", [0.05, 0.15, 0.13], trim, [-sx * 0.11, 0, 0]));
        for (let k = 0; k < 3; k++) add(hd, P("plate", [0.03, 0.028, 0.032], dark, [-sx * 0.15, 0.04, (k - 1) * 0.042]));
        add(b, P("hemi", [0.1, 0.07, 0.15], col, [-sx * 0.04, 0.0, 0.0]));
      }
    }
  } else if (slot === "pants") {
    add("DEF-hips", P("plate", [0.32, 0.06, 0.22], mix(col, "#000000", 0.25), [0, 0.1, 0.02]));
    add("DEF-hips", P("plate", [0.05, 0.05, 0.03], GOLD, [0, 0.1, 0.13]));
    if (fam === "greaves") {
      for (const sx of sides) {
        add(`DEF-shin.${side(sx)}`, P("plate", [0.13, 0.3, 0.06], col, [0, -0.2, 0.065]));
        add(`DEF-shin.${side(sx)}`, P("hemi", [0.13, 0.08, 0.1], trim, [0, 0.03, 0.065], [Math.PI / 2, 0, 0]));
        add(`DEF-thigh.${side(sx)}`, P("plate", [0.17, 0.2, 0.17], dark, [0, -0.17, 0]));
        add(`DEF-thigh.${side(sx)}`, P("plate", [0.1, 0.24, 0.03], col, [0, -0.17, 0.095]));
        if (ice) crystal(`DEF-shin.${side(sx)}`, [0, 0.07, 0.07], 0.12, [0.4, 0, 0]);
      }
    } else if (id === "shorts_forge") {
      for (const sx of sides) {
        add(`DEF-thigh.${side(sx)}`, P("cyl", [0.19, 0.17, 0.19], col, [0, -0.1, 0]));
        add(`DEF-thigh.${side(sx)}`, P("cyl", [0.2, 0.025, 0.2], p.acc ?? trim, [0, -0.19, 0]));
      }
      add("DEF-hips", P("plate", [0.26, 0.3, 0.03], "#3a2a20", [0, -0.12, 0.135]));
      add("DEF-hips", P("plate", [0.2, 0.025, 0.035], p.acc ?? trim, [0, -0.02, 0.14]));
    } else {
      const silk = id === "pants_silk";
      for (const sx of sides) {
        add(`DEF-thigh.${side(sx)}`, P("cyl", [0.17, 0.045, 0.17], trim, [0, -0.2, 0]));
        add(`DEF-thigh.${side(sx)}`, P("plate", [0.04, 0.2, 0.025], trim, [0, -0.1, 0.095]));
        if (silk) {
          add(`DEF-shin.${side(sx)}`, P("cone", [0.2, 0.34, 0.2], col, [0, -0.2, 0], [Math.PI, 0, 0]));
          add(`DEF-shin.${side(sx)}`, P("cyl", [0.2, 0.02, 0.2], p.acc ?? trim, [0, -0.37, 0]));
        } else if (id === "pants_leather") {
          for (let k = 0; k < 3; k++) add(`DEF-thigh.${side(sx)}`, P("plate", [0.172, 0.012, 0.172], "#4a3a44", [0, -0.1 - k * 0.1, 0]));
        }
      }
    }
  } else if (slot === "boots") {
    for (const sx of sides) {
      const sb = `DEF-shin.${side(sx)}`;
      const tb = `DEF-toe.${side(sx)}`;
      if (fam === "slippers") {
        add(tb, P("plate", [0.11, 0.04, 0.17], col, [0, -0.01, 0.0]));
        add(tb, P("hemi", [0.08, 0.05, 0.1], col, [0, 0.0, 0.07], [Math.PI / 2, 0, 0]));
        add(sb, P("cyl", [0.12, 0.03, 0.12], col, [0, -0.38, 0.0]));
        for (let k = 0; k < 3; k++) add(sb, P("cyl", [0.075, 0.012, 0.075], p.acc ?? "#ffffff", [0, -0.3 + k * 0.05, 0]));
        add(sb, P("plate", [0.02, 0.2, 0.012], p.acc ?? "#ffffff", [0.045, -0.3, 0.04], [0, 0, 0.1]));
        add(sb, P("plate", [0.02, 0.2, 0.012], p.acc ?? "#ffffff", [-0.045, -0.3, 0.04], [0, 0, -0.1]));
        continue;
      }
      add(sb, P("plate", [0.135, 0.16, 0.135], col, [0, -0.33, 0]));
      add(sb, P("plate", [0.145, 0.035, 0.145], trim, [0, -0.255, 0]));
      add(tb, P("plate", [0.115, 0.045, 0.14], dark, [0, -0.01, 0.0]));
      add(sb, P("hemi", [0.1, 0.06, 0.09], col, [0, -0.385, 0.05], [Math.PI / 2, 0, 0]));
      add(sb, P("plate", [0.03, 0.12, 0.012], trim, [0, -0.32, 0.07]));
      if (id === "boots_heel") add(tb, P("plate", [0.04, 0.09, 0.04], dark, [0, -0.04, -0.07], [0.2, 0, 0]));
      if (id === "boots_gold") for (let k = 0; k < 4; k++) add(sb, P("sphere", [0.016, 0.016, 0.016], "#fff2b0", [0.06, -0.28 - k * 0.025, 0.04]));
      if (id === "boots_speed") {
        for (const k of [0, 1]) add(sb, glow(P("shard", [0.07, 0.2 - k * 0.05, 0.02], rc, [-sx * 0.085, -0.26 - k * 0.03, -0.04 - k * 0.02], [0, 0, sx * (1.1 + k * 0.25)]), 0.6));
      }
      if (id === "boots_iron") add(tb, P("plate", [0.12, 0.06, 0.1], trim, [0, 0.0, 0.03]));
    }
  } else if (slot === "ring1" || slot === "ring2") {
    const sx = slot === "ring1" ? 1 : -1;
    const b = `DEF-hand.${side(sx)}`;
    const gc = p.acc ?? rc;
    if (id === "ring_thread") {
      add(b, P("ring", [0.05, 0.012, 0.05], "#c3101e", [-sx * 0.1, 0.02, 0.0], [0, 0, Math.PI / 2]));
      add(b, P("cone", [0.025, 0.04, 0.012], "#c3101e", [-sx * 0.1, 0.055, 0.015], [0, 0, 0.9]));
      add(b, P("cone", [0.025, 0.04, 0.012], "#c3101e", [-sx * 0.1, 0.055, -0.015], [0, 0, -0.9]));
    } else if (id === "ring_bone") {
      add(b, P("ring", [0.058, 0.06, 0.058], col, [-sx * 0.1, 0.02, 0.0], [0, 0, Math.PI / 2]));
      add(b, P("sphere", [0.04, 0.032, 0.032], col, [-sx * 0.1, 0.05, 0.0]));
    } else if (id === "ring_seal") {
      add(b, P("ring", [0.055, 0.06, 0.055], col, [-sx * 0.1, 0.02, 0.0], [0, 0, Math.PI / 2]));
      add(b, P("plate", [0.05, 0.02, 0.05], col, [-sx * 0.1, 0.055, 0.0]));
      add(b, glow(P("gem", [0.03, 0.02, 0.03], gc, [-sx * 0.1, 0.07, 0.0]), 0.9));
    } else {
      add(b, P("ring", [0.055, 0.06, 0.055], col, [-sx * 0.1, 0.02, 0.0], [0, 0, Math.PI / 2]));
      const flat = id === "ring_topaz";
      add(b, glow(P("gem", [flat ? 0.05 : 0.035, flat ? 0.035 : 0.055, flat ? 0.05 : 0.035], gc, [-sx * 0.1, 0.055, 0.0]), 1));
      add(b, P("cyl", [0.045, 0.012, 0.045], col, [-sx * 0.1, 0.045, 0.0]));
    }
  } else if (slot === "offhand") {
    const b = "DEF-forearm.L";
    if (fam === "shield") {
      add(b, P("cyl", [0.42, 0.04, 0.42], col, [-0.04, 0.0, 0.1], [Math.PI / 2, 0, Math.PI / 2]));
      add(b, P("hemi", [0.12, 0.07, 0.12], trim, [-0.04, 0.0, 0.125], [Math.PI / 2, 0, 0]));
      add(b, P("ring", [0.42, 0.3, 0.42], trim, [-0.04, 0.0, 0.1], [Math.PI / 2, 0, Math.PI / 2]));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(b, P("sphere", [0.025, 0.025, 0.025], trim, [-0.04 + Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0.125]));
      }
      if (id === "shield_rivet") for (let k = 0; k < 4; k++) add(b, P("plate", [0.05, 0.22, 0.012], dark, [-0.04 + Math.cos(k * 1.57 + 0.78) * 0.0, 0, 0.128], [0, 0, k * 0.785]));
    } else if (fam === "tome") {
      add("DEF-hand.L", P("plate", [0.19, 0.25, 0.05], col, [-0.08, 0.0, 0.11], [0.3, 0, 0.0]));
      add("DEF-hand.L", P("cube", [0.17, 0.23, 0.03], "#f2ead2", [-0.08, 0.0, 0.1], [0.3, 0, 0.0]));
      add("DEF-hand.L", P("plate", [0.025, 0.25, 0.06], trim, [-0.17, 0.0, 0.11], [0.3, 0, 0.0]));
      add("DEF-hand.L", glow(P("gem", [0.05, 0.07, 0.04], p.acc ?? rc, [-0.08, 0.0, 0.145]), 0.9));
      for (const k of [-1, 1]) add("DEF-hand.L", P("plate", [0.05, 0.05, 0.012], trim, [-0.08 + k * 0.06, k * 0.1, 0.14], [0.3, 0, 0]));
      if (id === "tome_shadow") add("DEF-hand.L", glow(P("sphere", [0.06, 0.06, 0.06], "#b06ad0", [-0.08, 0.2, 0.12]), 0.8));
    } else if (fam === "lantern") {
      add("DEF-hand.L", P("plate", [0.11, 0.15, 0.11], ice ? "#3a5a6a" : "#2a2024", [-0.02, -0.13, 0.06]));
      add("DEF-hand.L", glow(P("gem", [0.1, 0.15, 0.1], ice ? "#bfe8ff" : "#ffc24a", [-0.02, -0.13, 0.06]), 1.2));
      add("DEF-hand.L", P("hemi", [0.14, 0.05, 0.14], "#2a2024", [-0.02, -0.04, 0.06]));
      add("DEF-hand.L", P("ring", [0.09, 0.04, 0.09], trim, [-0.02, -0.02, 0.06], [Math.PI / 2, 0, 0]));
      add("DEF-hand.L", P("cyl", [0.14, 0.02, 0.14], "#2a2024", [-0.02, -0.21, 0.06]));
    } else if (fam === "orb") {
      add("DEF-hand.L", P("cyl", [0.1, 0.03, 0.1], GOLD, [-0.04, 0.05, 0.03]));
      const o = P("sphere", [0.2, 0.2, 0.2], col, [-0.04, 0.17, 0.03]);
      o.alpha = 0.82;
      add("DEF-hand.L", glow(o, 0.8));
      add("DEF-hand.L", glow(P("sphere", [0.09, 0.09, 0.09], "#ffffff", [-0.04, 0.17, 0.03]), 1));
      add("DEF-hand.L", P("ring", [0.26, 0.02, 0.26], p.acc ?? GOLD, [-0.04, 0.17, 0.03], [0.8, 0, 0.4]));
    } else {
      add("DEF-spine.003", P("cyl", [0.1, 0.4, 0.1], "#6a4630", [0.12, 0.0, -0.17], [0.3, 0, -0.25]));
      add("DEF-spine.003", P("cyl", [0.11, 0.02, 0.11], GOLD, [0.14, 0.15, -0.17], [0.3, 0, -0.25]));
      for (let i = 0; i < 4; i++) add("DEF-spine.003", P("shard", [0.07, 0.12, 0.025], "#d2e39a", [0.06 + i * 0.03, 0.2 + (i % 2) * 0.03, -0.2], [0.3, i * 0.9, -0.25 + (i - 1.5) * 0.3]));
    }
  }
  return out;
}

/** peça da arma (grip na origem, lâmina em +Y) — por família */
export function weaponNode(p: GearPiece): Node {
  const col = pieceColor(p);
  const dark = mix(col, "#000000", 0.4);
  const rc = RAR[Math.min(3, p.rarity)]!;
  const blade = p.rarity >= 3 ? GOLD : mix("#dfe5ee", col, 0.18);
  const edge = p.rarity >= 3 ? "#fff2b0" : "#ffffff";
  const wood = "#6b4a2f";
  const ac = p.acc ?? mix(col, "#ffffff", 0.35);
  const fam = p.fam ?? p.base;
  const id = p.base;
  const uniq = id.startsWith("u_");
  const g = G();
  const add = (n: Node) => {
    g.add(n);
    return n;
  };
  const jewel = (y: number, s: number, c = rc) => add(glow(P("gem", [s, s * 1.4, s], c, [0, y, 0]), 0.9));
  const guard = (y: number, w: number, c = rc) => {
    add(P("plate", [w, 0.055, 0.085], c, [0, y, 0]));
    for (const sx of [-1, 1]) add(P("shard", [0.06, 0.07, 0.07], c, [sx * (w / 2 + 0.02), y + 0.01, 0], [0, 0, -sx * 1.4]));
  };
  const grip = (len: number, y = -0.05) => {
    add(P("cyl", [0.036, len, 0.036], "#4a3024", [0, y, 0]));
    for (let i = 0; i < 3; i++) add(P("cyl", [0.042, 0.012, 0.042], mix(col, "#ffffff", 0.35), [0, y - 0.05 + i * 0.05, 0]));
  };
  switch (fam) {
    case "knife":
    case "foil":
    case "claws": {
      const offs = fam === "claws" ? [-0.075, 0, 0.075] : [0];
      const long = fam === "foil" ? 0.7 : 0.4;
      for (const x of offs) {
        add(P("blade", [fam === "foil" ? 0.045 : 0.075, long, 0.028], blade, [x, long / 2 + 0.02, 0], fam === "claws" ? [0, 0, x * 2.5] : [0, 0, 0]));
        add(P("cube", [0.012, long * 0.7, 0.03], edge, [x, long * 0.5, 0.0]));
      }
      if (fam === "foil") {
        add(P("sphere", [0.17, 0.05, 0.17], GOLD, [0, 0.02, 0]));
        add(P("ring", [0.14, 0.02, 0.14], GOLD, [0, 0.03, 0], [Math.PI / 2, 0, 0]));
      } else add(P("plate", [0.16, 0.035, 0.07], rc, [0, 0.02, 0]));
      add(P("cyl", [0.032, 0.1, 0.032], id === "dagger_bone" ? "#efe8d8" : "#4a3024", [0, -0.04, 0]));
      add(P("sphere", [0.045, 0.045, 0.045], col, [0, -0.1, 0]));
      if (id === "katar") add(P("plate", [0.2, 0.025, 0.06], ac, [0, 0.03, 0]));
      if (uniq) jewel(0.1, 0.06);
      break;
    }
    case "wand": {
      add(P("cyl", [0.032, 0.34, 0.032], "#3a2a40", [0, 0.14, 0]));
      add(P("cyl", [0.05, 0.03, 0.05], col, [0, 0.0, 0]));
      add(P("cyl", [0.05, 0.03, 0.05], col, [0, 0.29, 0]));
      jewel(0.38, 0.075, id === "wand_star" ? "#ffe88a" : rc);
      for (const sx of [-1, 1]) add(P("shard", [0.04, 0.12, 0.02], col, [sx * 0.05, 0.31, 0], [0, 0, -sx * 0.5]));
      if (id === "wand_star") for (let k = 0; k < 5; k++) add(glow(P("shard", [0.05, 0.12, 0.02], "#ffe88a", [Math.sin(k * 1.256) * 0.1, 0.4 + Math.cos(k * 1.256) * 0.1, 0], [0, 0, -k * 1.256 + Math.PI]), 0.9));
      break;
    }
    case "sword":
    case "scimitar": {
      if (fam === "scimitar") {
        add(P("blade", [0.13, 0.78, 0.03], blade, [0.03, 0.43, 0], [0, 0, -0.14]));
        add(P("shard", [0.12, 0.2, 0.03], blade, [0.13, 0.8, 0], [0, 0, -0.9]));
        add(P("cube", [0.01, 0.55, 0.034], edge, [0.04, 0.45, 0], [0, 0, -0.14]));
        add(P("sphere", [0.15, 0.04, 0.1], ac, [0, 0.05, 0]));
        add(P("cyl", [0.036, 0.16, 0.036], "#4a3024", [0, -0.04, 0]));
        add(P("sphere", [0.06, 0.06, 0.06], ac, [0, -0.13, 0]));
        if (uniq) jewel(0.06, 0.05, "#ffffff");
        break;
      }
      add(P("blade", [0.105, 0.82, 0.03], blade, [0, 0.45, 0]));
      add(P("cube", [0.018, 0.5, 0.034], dark, [0, 0.36, 0]));
      add(P("cube", [0.008, 0.6, 0.036], edge, [0, 0.48, 0]));
      guard(0.05, 0.34);
      grip(0.18);
      add(P("gem", [0.07, 0.09, 0.07], col, [0, -0.17, 0]));
      break;
    }
    case "axe": {
      add(P("cyl", [0.042, 0.82, 0.042], wood, [0, 0.28, 0]));
      add(P("shard", [0.44, 0.38, 0.05], blade, [0.2, 0.6, 0], [0, 0, Math.PI / 2]));
      add(P("cube", [0.018, 0.3, 0.054], edge, [0.38, 0.6, 0]));
      add(P("plate", [0.1, 0.12, 0.07], dark, [0.02, 0.6, 0]));
      if (p.rarity >= 2 || id === "axe_great") add(P("shard", [0.3, 0.26, 0.05], blade, [-0.15, 0.6, 0], [0, 0, -Math.PI / 2]));
      add(P("blade", [0.05, 0.18, 0.05], blade, [0, 0.76, 0]));
      add(P("plate", [0.2, 0.02, 0.06], ac, [0.2, 0.46, 0]));
      jewel(0.06, 0.05);
      break;
    }
    case "hammer": {
      add(P("cyl", [0.046, 0.8, 0.046], wood, [0, 0.28, 0]));
      add(P("plate", [0.36, 0.23, 0.23], id === "mace" ? dark : col, [0, 0.7, 0]));
      for (const sx of [-1, 1]) add(P("plate", [0.04, 0.25, 0.25], rc, [sx * 0.19, 0.7, 0]));
      add(P("plate", [0.2, 0.04, 0.24], rc, [0, 0.83, 0]));
      if (id === "mace") for (let k = 0; k < 6; k++) add(P("cone", [0.07, 0.1, 0.07], ac, [Math.cos(k * 1.047) * 0.18, 0.7, Math.sin(k * 1.047) * 0.14], [Math.sin(k * 1.047) * 1.2, 0, -Math.cos(k * 1.047) * 1.57]));
      for (let i = 0; i < 4; i++) add(P("cyl", [0.054, 0.012, 0.054], rc, [0, -0.05 + i * 0.05, 0]));
      if (uniq) add(glow(P("gem", [0.1, 0.14, 0.1], ac, [0, 0.7, 0.13]), 0.9));
      break;
    }
    case "spear": {
      add(P("cyl", [0.035, 1.3, 0.035], wood, [0, 0.45, 0]));
      add(P("blade", [0.1, 0.36, 0.03], blade, [0, 1.25, 0]));
      add(P("cube", [0.01, 0.28, 0.034], edge, [0, 1.22, 0]));
      add(P("cyl", [0.06, 0.04, 0.06], col, [0, 1.07, 0]));
      for (const sx of [-1, 1]) add(P("shard", [0.05, 0.14, 0.02], ac, [sx * 0.05, 1.06, 0], [0, 0, -sx * 0.6]));
      add(P("cone", [0.05, 0.12, 0.05], col, [0, -0.2, 0], [Math.PI, 0, 0]));
      break;
    }
    case "staff": {
      const fire = id === "staff_fire";
      const iceS = id === "staff_ice";
      const root = id === "u_root";
      add(P("cyl", [0.042, 1.2, 0.042], wood, [0, 0.4, 0]));
      for (let i = 0; i < 3; i++) add(P("cyl", [0.06, 0.02, 0.06], col, [0, 0.0 + i * 0.28, 0]));
      if (iceS) {
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2;
          const c = P("shard", [0.08, 0.34, 0.05], "#bfe8ff", [Math.cos(a) * 0.08, 1.04, Math.sin(a) * 0.08], [Math.sin(a) * 0.4, -a + Math.PI / 2, -Math.cos(a) * 0.4]);
          c.alpha = 0.9;
          add(glow(c, 0.4));
        }
        add(glow(P("gem", [0.14, 0.34, 0.14], "#e0f4ff", [0, 1.1, 0]), 0.95));
      } else if (fire) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          add(glow(P("cone", [0.09, 0.3, 0.09], k % 2 ? "#ff8a3a" : "#ffd34a", [Math.cos(a) * 0.07, 1.06, Math.sin(a) * 0.07], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]), 0.9));
        }
        add(glow(P("sphere", [0.13, 0.13, 0.13], "#fff2b0", [0, 1.04, 0]), 1));
      } else if (root) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          add(P("cyl", [0.03, 0.34, 0.03], "#4a8a38", [Math.cos(a) * 0.1, 1.02, Math.sin(a) * 0.1], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]));
          add(P("shard", [0.08, 0.12, 0.02], "#9ae060", [Math.cos(a) * 0.15, 1.12, Math.sin(a) * 0.15], [Math.sin(a) * 0.6, a, -Math.cos(a) * 0.6]));
        }
        add(glow(P("gem", [0.14, 0.22, 0.14], ac, [0, 1.04, 0]), 0.95));
      } else {
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2;
          add(P("shard", [0.08, 0.3, 0.03], col, [Math.cos(a) * 0.09, 1.02, Math.sin(a) * 0.09], [Math.sin(a) * 0.35, -a + Math.PI / 2, -Math.cos(a) * 0.35]));
        }
        add(glow(P("gem", [0.14, 0.26, 0.14], rc, [0, 1.06, 0]), 0.95));
        add(P("ring", [0.28, 0.08, 0.28], col, [0, 0.92, 0], [0.0, 0, 0]));
      }
      break;
    }
    case "scepter": {
      add(P("cyl", [0.046, 0.7, 0.046], "#d9a830", [0, 0.26, 0]));
      add(P("cyl", [0.13, 0.05, 0.13], "#d9a830", [0, 0.6, 0]));
      add(glow(P("gem", [0.17, 0.26, 0.17], id === "scepter_sun" ? "#ffd34a" : rc, [0, 0.76, 0]), 0.95));
      for (let k = 0; k < (id === "scepter_sun" ? 8 : 4); k++) {
        const n = id === "scepter_sun" ? 8 : 4;
        const a = (k / n) * Math.PI * 2;
        add(P("shard", [0.06, id === "scepter_sun" ? 0.26 : 0.16, 0.03], "#e8c04a", [Math.cos(a) * 0.1, 0.68, Math.sin(a) * 0.1], [Math.sin(a) * 0.4, -a + Math.PI / 2, -Math.cos(a) * 0.4]));
      }
      add(P("sphere", [0.05, 0.05, 0.05], "#d9a830", [0, -0.02, 0]));
      if (id === "u_stamp") add(P("plate", [0.2, 0.05, 0.2], "#c4373a", [0, 0.9, 0]));
      break;
    }
    case "bow":
    case "crossbow": {
      const limb = id === "longbow" ? "#a0b858" : "#8d4a2f";
      const k = id === "longbow" ? 1.25 : 1;
      if (fam === "crossbow") {
        add(P("plate", [0.07, 0.5, 0.06], "#5a3220", [0, 0.1, 0]));
        add(P("blade", [0.04, 0.5, 0.035], limb, [0, 0.36, 0], [0, 0, Math.PI / 2]));
        add(P("cube", [0.01, 0.18, 0.01], "#f4efe4", [0.13, 0.28, 0], [0, 0, 0.9]));
        add(P("cube", [0.01, 0.18, 0.01], "#f4efe4", [-0.13, 0.28, 0], [0, 0, -0.9]));
        add(P("cone", [0.03, 0.14, 0.03], "#c9d1db", [0, 0.4, 0]));
        break;
      }
      add(P("plate", [0.05, 0.22, 0.05], "#5a3220", [0, 0, 0]));
      for (const s of [1, -1]) {
        add(P("blade", [0.055, 0.34 * k, 0.035], limb, [0.07, s * 0.27 * k, 0], [0, 0, -s * 0.38 + (s > 0 ? 0 : Math.PI)]));
        add(P("blade", [0.04, 0.26 * k, 0.03], limb, [0.2, s * 0.5 * k, 0], [0, 0, -s * 0.9 + (s > 0 ? 0 : Math.PI)]));
        add(P("sphere", [0.035, 0.035, 0.035], rc, [0.27, s * 0.62 * k, 0]));
      }
      add(P("cube", [0.008, 1.2 * k, 0.008], "#f4efe4", [0.27, 0.0, 0.0]));
      break;
    }
    default: {
      add(P("cyl", [0.046, 0.5, 0.046], wood, [0, 0.2, 0]));
      add(P("hemi", [0.15, 0.1, 0.15], col, [0, 0.46, 0], [Math.PI, 0, 0]));
      add(P("sphere", [0.15, 0.15, 0.15], col, [0, 0.5, 0]));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        add(P("shard", [0.04, 0.06, 0.04], rc, [Math.cos(a) * 0.075, 0.52, Math.sin(a) * 0.075], [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]));
      }
    }
  }
  return g;
}

/** asa de anjo: osso do braço + camadas de penas (primárias no pulso, secundárias no cotovelo, coberturas) */
export function makeAngelWing(sx: number, o: { col: string; tip?: string; bone?: string; span?: number; glowK?: number } = { col: "#f6f2ea" }): WingRig {
  const span = o.span ?? 1;
  const bone = o.bone ?? mix(o.col, "#8a7a60", 0.4);
  const tipc = o.tip ?? mix(o.col, "#ffe9a0", 0.55);
  const root = G(sx * 0.06, 0.04, -0.14);
  const arm = (parent: Node, len: number, t: number, theta: number, from: [number, number] = [0, 0]) => {
    parent.add(P("cyl", [t, len, t], bone, [from[0] + (sx * Math.cos(theta) * len) / 2, from[1] + (Math.sin(theta) * len) / 2, 0], [0, 0, sx * (theta - Math.PI / 2)]));
    return [from[0] + sx * Math.cos(theta) * len, from[1] + Math.sin(theta) * len] as [number, number];
  };
  const feather = (parent: Node, at: [number, number], ang: number, len: number, wd: number, c: string, z: number) => {
    // pena: lâmina larga com ponta suave, base em `at`, direção `ang` (0 = +x, π/2 = cima)
    const dx = sx * Math.cos(ang), dy = Math.sin(ang);
    const body = P("shard", [wd, len, 0.012], c, [at[0] + (dx * len) / 2, at[1] + (dy * len) / 2, z], [0, 0, sx * (ang - Math.PI / 2)]);
    parent.add(body);
    const tip = P("sphere", [wd * 0.5, wd * 0.55, 0.01], mix(c, tipc, 0.5), [at[0] + dx * len * 0.97, at[1] + dy * len * 0.97, z + 0.002]);
    tip.ink = false;
    parent.add(tip);
  };
  const E = arm(root, 0.36 * span, 0.05, 0.62);
  root.add(P("sphere", [0.075, 0.075, 0.075], bone, [0, 0, 0]));
  const elbow = G(E[0], E[1], 0);
  elbow.add(P("sphere", [0.06, 0.06, 0.06], bone, [0, 0, 0]));
  root.add(elbow);
  const W = arm(elbow, 0.4 * span, 0.04, 1.15);
  const wrist = G(W[0], W[1], 0);
  wrist.add(P("sphere", [0.055, 0.055, 0.055], bone, [0, 0, 0]));
  elbow.add(wrist);
  // coberturas pequenas ao longo do braço (duas fileiras)
  for (let k = 0; k < 7; k++) {
    const u = k / 6;
    feather(root, [E[0] * u * 0.9, E[1] * u * 0.9], 0.2 - u * 0.3 - 0.9, 0.2 * span, 0.075, mix(o.col, "#ffffff", 0.15), 0.012);
  }
  for (let k = 0; k < 6; k++) {
    const u = k / 5;
    feather(elbow, [W[0] * u * 0.95, W[1] * u * 0.95], -0.25 - u * 0.45, 0.24 * span, 0.08, o.col, 0.014);
  }
  // secundárias (do cotovelo, para baixo e fora)
  const sec = 8;
  for (let k = 0; k < sec; k++) {
    const u = k / (sec - 1);
    feather(elbow, [W[0] * u * 0.55, W[1] * u * 0.55], 0.1 - u * 1.25, (0.62 - Math.abs(u - 0.35) * 0.3) * span, 0.1, mix(o.col, tipc, u * 0.25), -0.006 - u * 0.004);
  }
  // primárias (do pulso, leque amplo para cima e fora)
  const pri = 9;
  const tips: Node[] = [];
  for (let k = 0; k < pri; k++) {
    const u = k / (pri - 1);
    const len = (0.9 - Math.abs(u - 0.35) * 0.55) * span;
    feather(wrist, [0, 0], 1.45 - u * 1.65, len, 0.095, mix(o.col, tipc, 0.2 + u * 0.3), 0.004 + (k % 2) * 0.006);
  }
  return { root, elbow, wrist, sx, tips };
}

/** asa de demônio/dragão: grande, de couro, com chifres no braço e garra no pulso */
export function makeDragonWing(sx: number, o: { bone: string; memb: string; memb2: string; claw?: string; span?: number; fingers?: number }): WingRig {
  const wg = makeWing(sx, { bone: o.bone, memb: o.memb, memb2: o.memb2, claw: o.claw ?? "#e8dfc8", span: o.span ?? 1.35, thick: 0.034, fingers: o.fingers ?? 4 });
  const span = o.span ?? 1.35;
  // espinhos ao longo do braço e cotovelo
  for (let k = 0; k < 3; k++) wg.root.add(P("cone", [0.04, 0.12, 0.04], o.claw ?? "#e8dfc8", [sx * (0.05 + k * 0.1) * span, 0.06 + k * 0.07 * span, 0], [0, 0, sx * -1.1]));
  wg.elbow.add(P("cone", [0.06, 0.2, 0.06], o.claw ?? "#e8dfc8", [0, 0.05, 0], [0, 0, sx * -0.7]));
  wg.wrist.add(P("cone", [0.05, 0.18, 0.05], o.claw ?? "#e8dfc8", [sx * 0.04, 0.06, 0], [0, 0, sx * 0.2]));
  return wg;
}
