import { G, glow, mix, Node, P } from "./models";
import type { Vec3 } from "./gl";

type Add = (bone: string, n: Node, form?: boolean) => Node;

/** mecha de cabelo: base em B, apontando em dir, com ponta suave (curva para a frente quando bend>0) */
export function lock(B: Vec3, dir: Vec3, len: number, wid: number, col: string, bend = 0): Node {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const d: Vec3 = [dir[0] / l, dir[1] / l, dir[2] / l];
  const rx = Math.atan2(d[2], d[1]);
  const rz = -Math.asin(Math.max(-1, Math.min(1, d[0])));
  const n = P("horn", [wid, len, wid * 0.8], col, [B[0] + d[0] * len * 0.5, B[1] + d[1] * len * 0.5, B[2] + d[2] * len * 0.5], [rx, 0, rz]);
  void bend;
  return n;
}

export type HairStyle = "short" | "spiky" | "long" | "bob" | "ponytail" | "wild" | "pompadour" | "twin" | "bald";

/** rosto de anime: olhos grandes com brilho, sobrancelhas, nariz e boca */
export function addFace(add: Add, H: string, o: { skin: string; hair: string; iris: string; fem: boolean; eye?: number; lash?: boolean; brow?: boolean; mouth?: string }) {
  const k = o.eye ?? 1;
  const ey = 0.108;
  const ez = 0.112;
  for (const sx of [-1, 1]) {
    const w = P("sphere", [0.058 * k, 0.078 * k, 0.026], "#fbf6ea", [sx * 0.052, ey, ez]);
    w.ink = false;
    const i = P("sphere", [0.042 * k, 0.066 * k, 0.022], o.iris, [sx * 0.05, ey - 0.004, ez + 0.011]);
    i.ink = false;
    const sh = P("sphere", [0.042 * k, 0.03 * k, 0.018], mix(o.iris, "#000000", 0.45), [sx * 0.05, ey + 0.022 * k, ez + 0.016]);
    sh.ink = false;
    const pu = P("sphere", [0.02 * k, 0.034 * k, 0.014], "#0a0608", [sx * 0.05, ey - 0.006, ez + 0.02]);
    pu.ink = false;
    const hl = P("sphere", [0.014 * k, 0.016 * k, 0.012], "#ffffff", [sx * 0.05 - 0.01, ey + 0.016 * k, ez + 0.026]);
    hl.ink = false;
    hl.emis = [0.9, 0.9, 0.9];
    add(H, w);
    add(H, i);
    add(H, sh);
    add(H, pu);
    add(H, hl);
    if (o.brow !== false) {
      const br = P("cube", [0.06, 0.011, 0.016], o.hair, [sx * 0.052, ey + 0.058 * k, ez - 0.002], [0, 0, -sx * (o.fem ? 0.2 : 0.32)]);
      br.ink = false;
      add(H, br);
    }
    if (o.lash) {
      const ls = P("cube", [0.05, 0.01, 0.014], "#120a0c", [sx * 0.056, ey + 0.036 * k, ez + 0.012], [0, 0, -sx * 0.18]);
      ls.ink = false;
      add(H, ls);
      const tl = P("cube", [0.024, 0.009, 0.012], "#120a0c", [sx * 0.082, ey + 0.026 * k, ez + 0.004], [0, 0, sx * 0.55]);
      tl.ink = false;
      add(H, tl);
    }
  }
  add(H, P("sphere", [0.02, 0.026, 0.02], mix(o.skin, "#8a4a3a", 0.25), [0, 0.07, 0.126]));
  const m = P("cube", [o.fem ? 0.03 : 0.04, 0.008, 0.012], o.mouth ?? mix(o.skin, "#7a2a2a", 0.55), [0, 0.04, 0.12]);
  m.ink = false;
  add(H, m);
}

export function addHair(add: Add, H: string, style: HairStyle, col: string, anim: { extra?: ((t: number, p: unknown) => void)[] }) {
  const dark = mix(col, "#000000", 0.28);
  const lite = mix(col, "#ffffff", 0.2);
  if (style === "bald") return;
  // calota
  add(H, P("sphere", [0.262, 0.236, 0.282], col, [0, 0.162, -0.026]));
  const swayers: { n: Node; ph: number; amp: number }[] = [];
  const hang = (B: Vec3, dir: Vec3, len: number, wid: number, c: string, amp: number) => {
    const g = G(B[0], B[1], B[2]);
    g.add(lock([0, 0, 0], dir, len, wid, c));
    add(H, g);
    swayers.push({ n: g, ph: swayers.length * 0.9, amp });
  };
  const fringe = (n: number, w: number, len: number, c = col) => {
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : i / (n - 1) - 0.5;
      add(H, lock([u * 0.2, 0.235 - Math.abs(u) * 0.05, 0.085], [u * 0.55, -1, 0.35], len * (1 - Math.abs(u) * 0.35), w, i % 2 ? c : mix(c, "#ffffff", 0.12)));
    }
  };
  if (style === "short") {
    fringe(6, 0.062, 0.1);
    for (const sx of [-1, 1]) add(H, lock([sx * 0.118, 0.17, 0.02], [sx * 0.2, -1, 0], 0.1, 0.05, dark));
  } else if (style === "spiky") {
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 2.3;
      add(H, lock([Math.sin(a) * 0.1, 0.25, Math.cos(a) * 0.06 - 0.01], [Math.sin(a) * 0.9, 1, 0.2 - Math.abs(a) * 0.12], 0.17 + (i % 2) * 0.04, 0.068, i % 2 ? col : lite));
    }
    fringe(4, 0.055, 0.085);
    for (const sx of [-1, 1]) add(H, lock([sx * 0.118, 0.165, 0.03], [sx * 0.15, -1, 0.1], 0.12, 0.05, dark));
  } else if (style === "long") {
    fringe(7, 0.058, 0.115);
    for (const sx of [-1, 1]) {
      add(H, lock([sx * 0.112, 0.2, 0.05], [sx * 0.12, -1, 0.1], 0.24, 0.075, col));
      hang([sx * 0.07, 0.2, -0.1], [sx * 0.08, -1, -0.15], 0.42, 0.1, i2(col, sx), 0.05);
    }
    hang([0, 0.2, -0.13], [0, -1, -0.12], 0.46, 0.13, dark, 0.06);
  } else if (style === "bob") {
    fringe(6, 0.06, 0.11);
    for (const sx of [-1, 1]) add(H, lock([sx * 0.115, 0.2, 0.0], [sx * 0.15, -1, -0.05], 0.2, 0.085, col));
    hang([0, 0.19, -0.13], [0, -1, -0.1], 0.2, 0.18, dark, 0.03);
  } else if (style === "ponytail") {
    fringe(5, 0.06, 0.1);
    for (const sx of [-1, 1]) add(H, lock([sx * 0.118, 0.17, 0.02], [sx * 0.18, -1, 0], 0.11, 0.05, dark));
    const tail = G(0, 0.2, -0.14);
    tail.add(P("sphere", [0.07, 0.07, 0.07], dark, [0, 0, 0]));
    tail.add(lock([0, 0, 0], [0, -1, -0.5], 0.4, 0.12, col));
    add(H, tail);
    swayers.push({ n: tail, ph: 0.4, amp: 0.18 });
  } else if (style === "twin") {
    fringe(6, 0.06, 0.1);
    for (const sx of [-1, 1]) {
      const t = G(sx * 0.13, 0.2, -0.05);
      t.add(P("sphere", [0.06, 0.06, 0.06], dark, [0, 0, 0]));
      t.add(lock([0, 0, 0], [sx * 0.35, -1, -0.2], 0.46, 0.115, col));
      add(H, t);
      swayers.push({ n: t, ph: sx, amp: 0.14 });
    }
  } else if (style === "wild") {
    for (let i = 0; i < 9; i++) {
      const a = (i / 8 - 0.5) * 3.0;
      add(H, lock([Math.sin(a) * 0.11, 0.22, -0.04 + Math.cos(a) * 0.04], [Math.sin(a) * 0.8, 0.8, -0.55 - Math.abs(a) * 0.08], 0.22 + (i % 3) * 0.05, 0.06, i % 2 ? col : lite));
    }
    fringe(4, 0.05, 0.08);
  } else if (style === "pompadour") {
    add(H, P("sphere", [0.2, 0.14, 0.26], lite, [0, 0.265, 0.03]));
    for (let i = 0; i < 5; i++) add(H, lock([(i - 2) * 0.035, 0.31, 0.12], [(i - 2) * 0.15, 0.6, 0.9], 0.15, 0.06, i % 2 ? col : lite));
    fringe(3, 0.05, 0.06);
    for (const sx of [-1, 1]) add(H, lock([sx * 0.118, 0.17, 0.0], [sx * 0.1, -1, 0], 0.09, 0.045, dark));
  }
  if (swayers.length)
    anim.extra?.push((t) => {
      for (const s of swayers) {
        s.n.rot[0] = Math.sin(t * 2.1 + s.ph) * s.amp;
        s.n.rot[2] = Math.sin(t * 1.5 + s.ph * 2) * s.amp * 0.5;
      }
    });
  void glow;
}

function i2(c: string, sx: number) {
  return sx > 0 ? c : mix(c, "#000000", 0.12);
}
