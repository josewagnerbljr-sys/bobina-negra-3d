import { m4, hex, type Engine, type Mat4, type Vec3 } from "./gl";
import { HEROES } from "../game/content";
import type { HeroId, Kind } from "../game/types";

/* Grafo de cena minúsculo: cada Node é um grupo (pos/rot/scl) que pode ter uma
   primitiva desenhada com `size`. Os filhos herdam só o grupo (não o size). */

type Prim = "cube" | "sphere" | "cone" | "cyl";

export class Node {
  prim: Prim | null = null;
  size: Vec3 = [1, 1, 1];
  color: Vec3 = [1, 1, 1];
  emis: Vec3 = [0, 0, 0];
  pos: Vec3 = [0, 0, 0];
  rot: Vec3 = [0, 0, 0];
  scl: Vec3 = [1, 1, 1];
  kids: Node[] = [];
  visible = true;
  ink = true;
  alpha = 1;
  /** cor alternativa quando a forma especial está ativa */
  formColor: Vec3 | null = null;
  baseColor: Vec3 | null = null;
  add(...n: Node[]) {
    this.kids.push(...n);
    return this;
  }
}

const INK: Vec3 = [0.078, 0.031, 0.047];

function G(x = 0, y = 0, z = 0): Node {
  const n = new Node();
  n.pos = [x, y, z];
  return n;
}
function P(prim: Prim, size: Vec3, color: string | Vec3, pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0], emis = false): Node {
  const n = new Node();
  n.prim = prim;
  n.size = size;
  n.color = typeof color === "string" ? hex(color) : color;
  n.pos = pos;
  n.rot = rot;
  if (emis) n.emis = n.color.map((v) => v * 0.9) as Vec3;
  return n;
}
function glow(n: Node, k = 1) {
  n.emis = n.color.map((v) => v * k) as Vec3;
  n.ink = false;
  return n;
}
function eyes(parent: Node, y: number, z: number, spread: number, s: number, iris: string | Vec3 = "#14080c", look = 0.0) {
  for (const sx of [-1, 1]) {
    const w = P("sphere", [s, s * 1.2, s * 0.6], "#f7f1e4", [sx * spread, y, z]);
    w.ink = false;
    const p = P("sphere", [s * 0.55, s * 0.7, s * 0.4], iris, [sx * spread + look, y - s * 0.05, z + s * 0.22]);
    p.ink = false;
    parent.add(w, p);
  }
}

export type Pose = {
  t: number;
  phase: number;
  speed: number; // 0..1 movimento horizontal
  vy: number;
  facing: number;
  form: boolean;
  hurt: boolean;
  ally: boolean;
  world: number;
  attack: number; // 0..1 (pulso depois de atirar)
};

export type Model = {
  root: Node;
  kind: Kind | "hero";
  /** altura em unidades-de-modelo (sempre 1) e comprimento relativo */
  parts: Record<string, Node>;
  yaw: number;
  update: (p: Pose) => void;
  formNodes: Node[];
  fly: boolean;
};

function swing(n: Node | undefined, a: number) {
  if (n) n.rot[0] = a;
}

/* ------------------------------------------------------------------ heróis */

export function buildHero(id: HeroId): Model {
  const def = HEROES.find((h) => h.id === id)!;
  const root = G();
  const parts: Record<string, Node> = {};
  const formNodes: Node[] = [];
  const skin = def.skin;
  const cloth = def.cloth;
  const cloth2 = def.cloth2;

  const body = G(0, 0, 0);
  root.add(body);
  parts.body = body;

  // pernas
  for (const sx of [-1, 1]) {
    const leg = G(sx * 0.09, 0.38, 0);
    leg.add(P("cyl", [0.13, 0.32, 0.13], cloth2, [0, -0.17, 0]));
    leg.add(P("cube", [0.15, 0.07, 0.22], def.shoe, [0, -0.35, 0.04]));
    body.add(leg);
    parts[sx < 0 ? "legL" : "legR"] = leg;
  }
  // tronco
  const torso = P("sphere", [0.36, 0.36, 0.28], cloth, [0, 0.55, 0]);
  const belt = P("cyl", [0.3, 0.05, 0.25], cloth2, [0, 0.43, 0]);
  body.add(torso, belt);
  parts.torso = torso;
  // braços
  for (const sx of [-1, 1]) {
    const arm = G(sx * 0.21, 0.66, 0);
    arm.add(P("cyl", [0.1, 0.27, 0.1], cloth, [0, -0.12, 0]));
    arm.add(P("sphere", [0.11, 0.11, 0.11], skin, [0, -0.27, 0]));
    body.add(arm);
    parts[sx < 0 ? "armL" : "armR"] = arm;
  }
  // cabeça
  const head = G(0, 0.82, 0);
  const skull = P("sphere", [0.36, 0.36, 0.33], skin);
  head.add(skull);
  const hair = P("sphere", [0.39, 0.31, 0.37], def.hair, [0, 0.05, -0.035]);
  head.add(hair);
  eyes(head, 0.0, 0.14, 0.075, 0.075);
  body.add(head);
  parts.head = head;
  parts.skull = skull;
  parts.hair = hair;
  skull.baseColor = skull.color;
  hair.baseColor = hair.color;

  const aura = P("sphere", [1.1, 1.5, 1.1], hex(def.accent), [0, 0.55, 0]);
  aura.alpha = 0.22;
  aura.ink = false;
  aura.emis = hex(def.accent).map((v) => v * 0.6) as Vec3;
  aura.visible = false;
  root.add(aura);
  parts.aura = aura;

  if (id === "ivo") {
    head.add(P("cube", [0.17, 0.035, 0.06], "#24160f", [0, -0.085, 0.16]));
    for (const sx of [-1, 1]) body.add(P("cube", [0.035, 0.32, 0.03], def.cloth2, [sx * 0.09, 0.56, 0.135]));
    // forma de lobo
    skull.formColor = hex("#8d929c");
    hair.formColor = hex("#3a3d46");
    torso.formColor = hex("#6a6f7a");
    for (const sx of [-1, 1]) {
      const ear = P("cone", [0.1, 0.2, 0.09], "#3a3d46", [sx * 0.11, 0.21, 0], [0, 0, -sx * 0.25]);
      ear.visible = false;
      head.add(ear);
      formNodes.push(ear);
    }
    const snout = P("cube", [0.14, 0.1, 0.15], "#8d929c", [0, -0.06, 0.2]);
    const nose = P("sphere", [0.05, 0.04, 0.04], "#14080c", [0, -0.03, 0.285]);
    const tail = P("cone", [0.12, 0.34, 0.12], "#6a6f7a", [0, 0.4, -0.19], [-1.15, 0, 0]);
    for (const n of [snout, nose, tail]) {
      n.visible = false;
      formNodes.push(n);
    }
    head.add(snout, nose);
    body.add(tail);
    parts.tail = tail;
  } else if (id === "lena") {
    const cape = P("cube", [0.42, 0.55, 0.05], "#2a1a38", [0, 0.48, -0.17], [0.12, 0, 0]);
    body.add(cape);
    parts.cape = cape;
    head.add(P("cube", [0.03, 0.05, 0.03], "#f4efe4", [-0.035, -0.095, 0.15]));
    head.add(P("cube", [0.03, 0.05, 0.03], "#f4efe4", [0.035, -0.095, 0.15]));
    skull.formColor = hex("#d9c0d0");
    for (const sx of [-1, 1]) {
      const wing = G(sx * 0.1, 0.66, -0.17);
      wing.add(P("cube", [0.7, 0.5, 0.025], "#6a2a7a", [sx * 0.34, 0.04, 0], [0, 0, sx * 0.32]));
      wing.add(P("cube", [0.66, 0.035, 0.04], "#c4373a", [sx * 0.3, 0.2, 0], [0, 0, sx * 0.32]));
      wing.visible = false;
      body.add(wing);
      formNodes.push(wing);
      parts[sx < 0 ? "wingL" : "wingR"] = wing;
    }
  } else if (id === "osso") {
    // cartola
    head.add(P("cyl", [0.24, 0.2, 0.24], "#1c1612", [0, 0.24, 0]));
    head.add(P("cyl", [0.36, 0.035, 0.36], "#1c1612", [0, 0.15, 0]));
    head.add(P("cyl", [0.245, 0.035, 0.245], def.accent, [0, 0.19, 0], [0, 0, 0], true));
    // fios de fantoche
    for (const sx of [-1, 1]) body.add(P("cube", [0.012, 0.5, 0.012], "#c8c2b4", [sx * 0.21, 1.02, 0.02]));
    skull.formColor = hex("#f1ead8");
    hair.formColor = hex("#f1ead8");
    for (const sx of [-1, 1]) {
      const socket = P("sphere", [0.11, 0.13, 0.06], "#14080c", [sx * 0.075, 0.0, 0.16]);
      const flame = glow(P("sphere", [0.05, 0.06, 0.04], def.accent, [sx * 0.075, 0.0, 0.19]), 1);
      socket.visible = false;
      flame.visible = false;
      head.add(socket, flame);
      formNodes.push(socket, flame);
    }
  } else if (id === "syl") {
    const hood = P("cone", [0.4, 0.34, 0.38], cloth, [0, 0.17, -0.03]);
    head.add(hood);
    const quiver = P("cyl", [0.1, 0.34, 0.1], "#4a3024", [0.1, 0.62, -0.2], [0.25, 0, -0.3]);
    body.add(quiver);
    for (let i = 0; i < 3; i++) body.add(P("cone", [0.04, 0.07, 0.04], "#d2e39a", [0.07 + i * 0.03, 0.82 + i * 0.01, -0.23], [0.25, 0, -0.3]));
    // arco na mão direita
    const bow = G(0, -0.27, 0.06);
    bow.add(P("cube", [0.03, 0.34, 0.03], "#8d4a2f", [0.04, 0.0, 0.0], [0, 0, 0.0]));
    bow.add(P("cube", [0.03, 0.16, 0.03], "#8d4a2f", [0.01, 0.2, 0.0], [0, 0, 0.5]));
    bow.add(P("cube", [0.03, 0.16, 0.03], "#8d4a2f", [0.01, -0.2, 0.0], [0, 0, -0.5]));
    bow.add(P("cube", [0.008, 0.46, 0.008], "#f4efe4", [-0.06, 0, 0]));
    parts.armR!.add(bow);
    for (const sx of [-1, 1]) {
      const ear = P("cone", [0.07, 0.17, 0.06], skin, [sx * 0.2, 0.01, 0], [0, 0, -sx * 1.25]);
      ear.visible = false;
      head.add(ear);
      formNodes.push(ear);
    }
  }

  const model: Model = {
    root,
    kind: "hero",
    parts,
    yaw: Math.PI / 2 - 0.5,
    formNodes,
    fly: false,
    update(p) {
      const run = p.speed;
      const air = Math.abs(p.vy) > 70;
      const lw = Math.sin(p.phase * 1.5);
      const bat = p.form && id === "lena";
      const skullForm = p.form && id === "osso";
      const hover = bat || skullForm;
      // bobbing e balanço
      body.pos[1] = hover ? 0.1 + Math.sin(p.t * 6) * 0.03 : Math.abs(Math.sin(p.phase * 1.5)) * 0.03 * run;
      if (air && !hover) {
        swing(parts.legL, -0.5);
        swing(parts.legR, 0.4);
        swing(parts.armL, -2.5);
        swing(parts.armR, -2.2);
      } else {
        swing(parts.legL, lw * 0.9 * run);
        swing(parts.legR, -lw * 0.9 * run);
        swing(parts.armL, -lw * 0.8 * run);
        swing(parts.armR, lw * 0.8 * run - p.attack * 1.6);
      }
      if (hover) {
        swing(parts.legL, 0.3);
        swing(parts.legR, 0.15);
      }
      body.rot[0] = run * 0.1 + (air ? -0.05 : 0);
      if (parts.cape) parts.cape.rot[0] = 0.15 + run * 0.35 + Math.sin(p.t * 5) * 0.05 + (air ? 0.25 : 0);
      if (parts.tail) parts.tail.rot[2] = Math.sin(p.t * 8) * 0.25;
      if (parts.wingL && parts.wingR) {
        const f = Math.sin(p.t * 14) * 0.5;
        parts.wingL.rot[2] = -0.3 - f;
        parts.wingR.rot[2] = 0.3 + f;
      }
      // forma
      for (const n of formNodes) n.visible = p.form;
      for (const key of ["skull", "hair", "torso"] as const) {
        const n = parts[key];
        if (!n) continue;
        if (!n.baseColor) n.baseColor = n.color;
        n.color = p.form && n.formColor ? n.formColor : n.baseColor;
      }
      parts.aura!.visible = p.form;
      if (p.form) {
        const s = 1 + Math.sin(p.t * 9) * 0.06;
        parts.aura!.size = [1.1 * s, 1.5 * s, 1.1 * s];
      }
      const big = p.form && id === "ivo" ? 1.15 : 1;
      root.scl = [big, big, big];
      // esticar/achatar no ar
      const st = Math.max(-0.12, Math.min(0.14, -p.vy * 0.00012));
      body.scl = [1 - st * 0.5, 1 + st, 1 - st * 0.5];
    },
  };
  return model;
}

/* ---------------------------------------------------------------- inimigos */

type Biped = { root: Node; parts: Record<string, Node> };

function limbs(
  body: Node,
  parts: Record<string, Node>,
  o: { hipY: number; hipX: number; legLen: number; legW: number; legColor: string | Vec3; footColor?: string | Vec3; armY?: number; armX?: number; armLen?: number; armW?: number; armColor?: string | Vec3; hand?: string | Vec3; noArms?: boolean },
) {
  for (const sx of [-1, 1]) {
    const leg = G(sx * o.hipX, o.hipY, 0);
    leg.add(P("cyl", [o.legW, o.legLen, o.legW], o.legColor, [0, -o.legLen / 2, 0]));
    if (o.footColor) leg.add(P("cube", [o.legW * 1.15, o.legW * 0.55, o.legW * 1.7], o.footColor, [0, -o.legLen, o.legW * 0.3]));
    body.add(leg);
    parts[sx < 0 ? "legL" : "legR"] = leg;
    if (!o.noArms) {
      const arm = G(sx * (o.armX ?? o.hipX + 0.1), o.armY ?? o.hipY + 0.22, 0);
      const al = o.armLen ?? 0.26;
      arm.add(P("cyl", [o.armW ?? 0.09, al, o.armW ?? 0.09], o.armColor ?? o.legColor, [0, -al / 2, 0]));
      if (o.hand) arm.add(P("sphere", [(o.armW ?? 0.09) * 1.25, (o.armW ?? 0.09) * 1.25, (o.armW ?? 0.09) * 1.25], o.hand, [0, -al, 0]));
      body.add(arm);
      parts[sx < 0 ? "armL" : "armR"] = arm;
    }
  }
}

function make(kind: Kind, fly = false): { root: Node; body: Node; parts: Record<string, Node>; m: Model } {
  const root = G();
  const body = G();
  root.add(body);
  const parts: Record<string, Node> = { body };
  const m: Model = { root, kind, parts, yaw: Math.PI / 2 - 0.5, formNodes: [], fly, update: () => undefined };
  return { root, body, parts, m };
}

function standardAnim(m: Model, o: { bob?: number; legs?: number; arms?: number; sway?: number; hop?: boolean; speedK?: number }) {
  const { parts } = m;
  m.update = (p) => {
    const run = Math.max(0.25, p.speed);
    const sw = Math.sin(p.phase * (o.speedK ?? 6));
    parts.body!.pos[1] = m.fly ? Math.sin(p.phase * 2.2) * 0.04 : Math.abs(sw) * (o.bob ?? 0.03) * run;
    const air = Math.abs(p.vy) > 70;
    if (air && o.hop) {
      swing(parts.legL, 0.5);
      swing(parts.legR, 0.5);
      const st = Math.max(-0.2, Math.min(0.25, -p.vy * 0.0002));
      parts.body!.scl = [1 - st * 0.5, 1 + st, 1 - st * 0.5];
    } else {
      parts.body!.scl = [1, 1, 1];
      swing(parts.legL, sw * (o.legs ?? 0.8) * run);
      swing(parts.legR, -sw * (o.legs ?? 0.8) * run);
    }
    swing(parts.armL, -sw * (o.arms ?? 0.7) * run);
    swing(parts.armR, sw * (o.arms ?? 0.7) * run);
    if (o.sway) parts.body!.rot[2] = Math.sin(p.phase * 2) * o.sway;
    if (parts.tail) parts.tail.rot[2] = Math.sin(p.phase * 5) * 0.4;
    if (parts.flame) {
      const f = 1 + Math.sin(p.phase * 11) * 0.15;
      parts.flame.size = [0.16 * f, 0.26 * f, 0.16 * f];
    }
  };
}

function buildEnemy(kind: Kind, world: number): Model {
  const { root, body, parts, m } = make(kind, kind === "balloon" || kind === "wraith");
  const w = world;
  switch (kind) {
    case "imp": {
      body.add(P("sphere", [0.72, 0.56, 0.6], "#b8323a", [0, 0.4, 0]));
      const head = G(0, 0.72, 0);
      head.add(P("sphere", [0.66, 0.52, 0.56], "#cf4048"));
      for (const sx of [-1, 1]) {
        head.add(P("cone", [0.13, 0.28, 0.13], "#f4e4c8", [sx * 0.22, 0.34, 0], [0, 0, -sx * 0.3]));
        head.add(glow(P("sphere", [0.12, 0.14, 0.08], "#ffd34a", [sx * 0.13, 0.03, 0.26])));
      }
      head.add(P("cube", [0.26, 0.05, 0.06], "#3a1014", [0, -0.12, 0.27]));
      body.add(head);
      parts.tail = P("cone", [0.1, 0.34, 0.1], "#8c2430", [0, 0.28, -0.3], [-1.2, 0, 0]);
      body.add(parts.tail);
      limbs(body, parts, { hipY: 0.2, hipX: 0.15, legLen: 0.2, legW: 0.12, legColor: "#8c2430", footColor: "#3a1014", armY: 0.5, armX: 0.37, armLen: 0.2, armW: 0.08, armColor: "#b8323a" });
      standardAnim(m, { legs: 0.9, speedK: 8 });
      break;
    }
    case "mask": {
      const face = G(0, 0.56, 0);
      face.add(P("sphere", [0.88, 0.98, 0.42], "#f4efe4"));
      for (const sx of [-1, 1]) {
        face.add(P("sphere", [0.17, 0.24, 0.1], "#14080c", [sx * 0.18, 0.1, 0.17]));
        face.add(P("sphere", [0.14, 0.1, 0.05], "#c4373a", [sx * 0.28, -0.1, 0.19]));
      }
      face.add(P("sphere", [0.42, 0.1, 0.08], "#c4373a", [0, -0.28, 0.19]));
      face.add(P("cone", [0.3, 0.34, 0.3], "#2a4f86", [0.18, 0.58, 0], [0, 0, -0.5]));
      face.add(P("sphere", [0.1, 0.1, 0.1], "#e0b15a", [0.34, 0.74, 0]));
      body.add(face);
      for (const sx of [-1, 1]) {
        const leg = G(sx * 0.17, 0.12, 0);
        for (let i = 0; i < 3; i++) leg.add(P("cyl", [0.2 - i * 0.02, 0.04, 0.2 - i * 0.02], "#9aa3b0", [0, -0.01 - i * 0.045, 0]));
        body.add(leg);
        parts[sx < 0 ? "legL" : "legR"] = leg;
      }
      standardAnim(m, { hop: true, legs: 0.1, arms: 0 });
      break;
    }
    case "balloon": {
      const hue: Vec3 = hex(["#c4373a", "#8fd0c8", "#e08a3a", "#6aaa48", "#c9b6e0"][w % 5]!);
      body.add(P("sphere", [0.92, 1.02, 0.9], hue, [0, 0.58, 0]));
      body.add(glow(P("sphere", [0.18, 0.22, 0.1], "#ffffff", [-0.2, 0.78, 0.36]), 0.3));
      body.add(P("cone", [0.14, 0.14, 0.14], hue.map((v) => v * 0.7) as Vec3, [0, 0.07, 0], [Math.PI, 0, 0]));
      eyes(body, 0.62, 0.4, 0.17, 0.16, "#14080c");
      body.add(P("cyl", [0.06, 0.14, 0.04], "#3a1014", [0, 0.44, 0.44]));
      parts.string = P("cyl", [0.012, 0.16, 0.012], "#f4efe4", [0, -0.02, 0]);
      body.add(parts.string);
      standardAnim(m, { sway: 0.08 });
      break;
    }
    case "skel": {
      const head = G(0, 0.86, 0);
      head.add(P("sphere", [0.42, 0.36, 0.36], "#efe8d8"));
      head.add(P("cube", [0.26, 0.09, 0.2], "#efe8d8", [0, -0.17, 0.03]));
      for (const sx of [-1, 1]) {
        head.add(P("sphere", [0.12, 0.14, 0.08], "#14080c", [sx * 0.09, 0.0, 0.16]));
        head.add(glow(P("sphere", [0.04, 0.05, 0.04], "#9fd4d8", [sx * 0.09, 0.0, 0.2])));
      }
      body.add(head);
      body.add(P("cyl", [0.07, 0.34, 0.07], "#efe8d8", [0, 0.58, 0]));
      for (let i = 0; i < 3; i++) body.add(P("cyl", [0.4 - i * 0.05, 0.045, 0.22], "#efe8d8", [0, 0.68 - i * 0.075, 0]));
      body.add(P("cube", [0.28, 0.08, 0.16], "#efe8d8", [0, 0.4, 0]));
      limbs(body, parts, { hipY: 0.38, hipX: 0.09, legLen: 0.36, legW: 0.07, legColor: "#efe8d8", footColor: "#cfc6b4", armY: 0.72, armX: 0.22, armLen: 0.3, armW: 0.06, armColor: "#efe8d8" });
      standardAnim(m, { legs: 0.8 });
      break;
    }
    case "witch": {
      body.add(P("cone", [0.7, 0.62, 0.7], "#5a2a78", [0, 0.3, 0]));
      body.add(P("sphere", [0.34, 0.34, 0.32], "#9bc47a", [0, 0.7, 0]));
      body.add(P("cone", [0.06, 0.13, 0.06], "#9bc47a", [0, 0.67, 0.18], [Math.PI / 2 + 0.2, 0, 0]));
      body.add(P("cyl", [0.62, 0.04, 0.62], "#2a1838", [0, 0.82, 0]));
      body.add(P("cone", [0.38, 0.4, 0.38], "#2a1838", [0, 1.0, 0], [0, 0, 0.12]));
      body.add(P("cyl", [0.4, 0.05, 0.4], "#e0b15a", [0, 0.86, 0]));
      eyes(body, 0.72, 0.14, 0.07, 0.06, "#14080c");
      const arm = G(0.26, 0.55, 0.05);
      arm.add(P("cyl", [0.08, 0.26, 0.08], "#5a2a78", [0, -0.12, 0]));
      arm.add(P("cyl", [0.03, 0.8, 0.03], "#6b4a2f", [0.03, 0.0, 0.1]));
      arm.add(glow(P("sphere", [0.14, 0.14, 0.14], "#8cff6a", [0.03, 0.42, 0.1]), 1));
      body.add(arm);
      parts.armR = arm;
      standardAnim(m, { legs: 0, arms: 0.2, bob: 0.02 });
      break;
    }
    case "undead": {
      body.rot[0] = 0.2;
      body.add(P("sphere", [0.58, 0.52, 0.42], "#6f7a58", [0, 0.5, 0]));
      const head = G(0, 0.8, 0.08);
      head.add(P("sphere", [0.42, 0.4, 0.38], "#a9b58a"));
      for (const sx of [-1, 1]) head.add(glow(P("sphere", [0.07, 0.08, 0.05], "#ff4a3a", [sx * 0.09, 0.02, 0.18])));
      head.add(P("cube", [0.2, 0.04, 0.05], "#2a1a14", [0, -0.1, 0.19]));
      body.add(head);
      body.add(P("cube", [0.3, 0.1, 0.1], "#4a3a2a", [0.12, 0.35, 0.18], [0, 0, 0.4]));
      limbs(body, parts, { hipY: 0.28, hipX: 0.11, legLen: 0.28, legW: 0.13, legColor: "#4a5a3a", footColor: "#2a1a14", armY: 0.62, armX: 0.28, armLen: 0.32, armW: 0.1, armColor: "#a9b58a", hand: "#a9b58a" });
      standardAnim(m, { legs: 0.5, arms: 0.1, bob: 0.02, speedK: 4 });
      const upd = m.update;
      m.update = (p) => {
        upd(p);
        parts.armL!.rot[0] = -1.35;
        parts.armR!.rot[0] = -1.35 + Math.sin(p.phase * 3) * 0.12;
      };
      break;
    }
    case "golem": {
      body.add(P("cube", [0.82, 0.5, 0.58], "#7a6c60", [0, 0.52, 0]));
      body.add(P("cube", [0.84, 0.1, 0.6], "#4a8a4a", [0, 0.78, 0]));
      const head = G(0, 0.88, 0.02);
      head.add(P("cube", [0.36, 0.28, 0.32], "#8a7c70"));
      for (const sx of [-1, 1]) head.add(glow(P("cube", [0.07, 0.05, 0.04], "#ff8a3a", [sx * 0.09, 0.02, 0.17])));
      body.add(head);
      body.add(glow(P("sphere", [0.22, 0.22, 0.12], "#ff8a3a", [0, 0.52, 0.3]), 1));
      limbs(body, parts, { hipY: 0.28, hipX: 0.2, legLen: 0.28, legW: 0.28, legColor: "#6a5c50", armY: 0.76, armX: 0.52, armLen: 0.5, armW: 0.24, armColor: "#7a6c60", hand: "#8a7c70" });
      standardAnim(m, { legs: 0.4, arms: 0.3, bob: 0.015, speedK: 4 });
      break;
    }
    case "troll": {
      body.add(P("sphere", [0.9, 0.66, 0.66], "#6d8a4a", [0, 0.42, 0]));
      const head = G(0, 0.8, 0.04);
      head.add(P("sphere", [0.44, 0.4, 0.4], "#7f9d58"));
      for (const sx of [-1, 1]) {
        head.add(P("cone", [0.07, 0.15, 0.07], "#f4e4c8", [sx * 0.11, -0.1, 0.18], [0, 0, 0]));
        head.add(P("cone", [0.1, 0.2, 0.06], "#7f9d58", [sx * 0.24, 0.03, 0], [0, 0, -sx * 1.2]));
        head.add(glow(P("sphere", [0.06, 0.07, 0.05], "#ffd34a", [sx * 0.1, 0.05, 0.18])));
      }
      body.add(head);
      limbs(body, parts, { hipY: 0.24, hipX: 0.2, legLen: 0.24, legW: 0.22, legColor: "#55703a", footColor: "#3a2a1a", armY: 0.6, armX: 0.5, armLen: 0.4, armW: 0.18, armColor: "#6d8a4a", hand: "#7f9d58" });
      parts.armR!.add(P("cyl", [0.16, 0.6, 0.16], "#6b4a2f", [0.0, -0.4, 0.14], [0.5, 0, 0]));
      standardAnim(m, { legs: 0.6, arms: 0.4, bob: 0.03, speedK: 5 });
      break;
    }
    case "thorn": {
      body.add(P("sphere", [0.74, 0.62, 0.74], "#3e7a34", [0, 0.32, 0]));
      const bulb = G(0, 0.62, 0);
      bulb.add(P("sphere", [0.62, 0.52, 0.62], "#c4373a"));
      bulb.add(P("sphere", [0.4, 0.2, 0.2], "#3a1014", [0, -0.04, 0.27]));
      for (let i = 0; i < 6; i++) bulb.add(P("cone", [0.06, 0.1, 0.06], "#f4efe4", [-0.16 + i * 0.065, 0.04, 0.34], [Math.PI, 0, 0]));
      eyes(bulb, 0.14, 0.26, 0.12, 0.1, "#14080c");
      body.add(bulb);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        body.add(P("cone", [0.08, 0.26, 0.08], "#d9d0a0", [Math.cos(a) * 0.36, 0.2 + (i % 3) * 0.1, Math.sin(a) * 0.36], [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1]));
      }
      body.add(P("cone", [0.16, 0.34, 0.06], "#2a5a28", [0.32, 0.12, 0.1], [0, 0, -0.9]));
      body.add(P("cone", [0.16, 0.34, 0.06], "#2a5a28", [-0.32, 0.12, 0.1], [0, 0, 0.9]));
      standardAnim(m, { sway: 0.07 });
      m.yaw = Math.PI / 2 - 0.5;
      break;
    }
    case "hound": {
      body.add(P("sphere", [0.5, 0.46, 0.95], "#5a5560", [0, 0.58, 0]));
      const head = G(0, 0.74, 0.56);
      head.add(P("sphere", [0.4, 0.36, 0.4], "#6a6570"));
      head.add(P("cube", [0.2, 0.17, 0.3], "#6a6570", [0, -0.07, 0.24]));
      head.add(P("sphere", [0.07, 0.06, 0.05], "#14080c", [0, -0.01, 0.4]));
      for (const sx of [-1, 1]) {
        head.add(P("cone", [0.11, 0.22, 0.08], "#4a4550", [sx * 0.14, 0.24, -0.05], [0, 0, -sx * 0.25]));
        head.add(glow(P("sphere", [0.06, 0.06, 0.04], "#ff3a3a", [sx * 0.1, 0.07, 0.17])));
      }
      body.add(head);
      parts.tail = P("cone", [0.1, 0.4, 0.1], "#4a4550", [0, 0.64, -0.5], [-1.0, 0, 0]);
      body.add(parts.tail);
      const legsList: Node[] = [];
      for (const [x, z] of [[-0.14, 0.3], [0.14, 0.3], [-0.14, -0.3], [0.14, -0.3]] as const) {
        const leg = G(x, 0.4, z);
        leg.add(P("cyl", [0.12, 0.4, 0.12], "#4a4550", [0, -0.2, 0]));
        body.add(leg);
        legsList.push(leg);
      }
      parts.legL = legsList[0]!;
      parts.legR = legsList[1]!;
      const upd = (p: Pose) => {
        const sw = Math.sin(p.phase * 12);
        body.pos[1] = Math.abs(sw) * 0.04;
        legsList.forEach((l, i) => (l.rot[0] = sw * 0.9 * (i % 2 === 0 ? 1 : -1) * (i < 2 ? 1 : -1)));
        parts.tail!.rot[2] = Math.sin(p.phase * 6) * 0.4;
      };
      m.update = upd;
      break;
    }
    case "dryad": {
      body.add(P("cyl", [0.3, 0.55, 0.3], "#6b4a2f", [0, 0.34, 0]));
      body.add(P("cone", [0.62, 0.3, 0.62], "#55391f", [0, 0.12, 0]));
      const head = G(0, 0.7, 0);
      head.add(P("sphere", [0.32, 0.32, 0.3], "#9bc47a"));
      for (const sx of [-1, 1]) head.add(glow(P("sphere", [0.06, 0.08, 0.04], "#d2e39a", [sx * 0.07, 0.01, 0.14])));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        head.add(P("sphere", [0.2, 0.2, 0.2], i % 2 ? "#4a8a3a" : "#6aaa48", [Math.cos(a) * 0.17, 0.2 + (i % 2) * 0.05, Math.sin(a) * 0.15]));
      }
      body.add(head);
      for (const sx of [-1, 1]) {
        const arm = G(sx * 0.17, 0.55, 0);
        arm.add(P("cyl", [0.06, 0.3, 0.06], "#6b4a2f", [0, -0.14, 0]));
        arm.add(P("sphere", [0.12, 0.08, 0.12], "#6aaa48", [0, -0.3, 0]));
        body.add(arm);
        parts[sx < 0 ? "armL" : "armR"] = arm;
      }
      standardAnim(m, { legs: 0, arms: 0.4, sway: 0.05, bob: 0.015 });
      break;
    }
    case "wraith": {
      body.add(P("cone", [0.72, 0.9, 0.6], "#cfe4ee", [0, 0.42, 0], [Math.PI, 0, 0]));
      const head = G(0, 0.74, 0);
      head.add(P("sphere", [0.52, 0.5, 0.46], "#e6f2f6"));
      for (const sx of [-1, 1]) head.add(glow(P("sphere", [0.1, 0.16, 0.06], "#58d4ff", [sx * 0.11, 0.0, 0.2]), 1));
      head.add(P("sphere", [0.12, 0.14, 0.06], "#14080c", [0, -0.14, 0.2]));
      body.add(head);
      for (const sx of [-1, 1]) {
        const arm = G(sx * 0.32, 0.55, 0);
        arm.add(P("cone", [0.14, 0.4, 0.1], "#cfe4ee", [0, -0.16, 0], [0, 0, sx * 0.4]));
        body.add(arm);
        parts[sx < 0 ? "armL" : "armR"] = arm;
      }
      for (let i = 0; i < 3; i++) body.add(P("cone", [0.14, 0.3, 0.1], "#bcd6e2", [-0.2 + i * 0.2, 0.02, 0], [Math.PI, 0, 0]));
      standardAnim(m, { sway: 0.1, arms: 0.35 });
      break;
    }
    case "clerk": {
      body.add(P("cube", [0.5, 0.48, 0.3], "#6b7280", [0, 0.46, 0]));
      body.add(P("cube", [0.07, 0.34, 0.03], "#c4373a", [0, 0.5, 0.16]));
      const head = G(0, 0.82, 0);
      head.add(P("sphere", [0.36, 0.36, 0.33], "#e8c4a4"));
      head.add(P("sphere", [0.38, 0.22, 0.36], "#2a1f1a", [0, 0.1, -0.03]));
      eyes(head, 0.0, 0.14, 0.075, 0.07);
      for (const sx of [-1, 1]) head.add(P("cyl", [0.11, 0.02, 0.11], "#e0b15a", [sx * 0.075, 0.0, 0.18], [Math.PI / 2, 0, 0]));
      body.add(head);
      limbs(body, parts, { hipY: 0.24, hipX: 0.1, legLen: 0.24, legW: 0.12, legColor: "#3a3f4a", footColor: "#14080c", armY: 0.62, armX: 0.28, armLen: 0.28, armW: 0.1, armColor: "#6b7280", hand: "#e8c4a4" });
      parts.armR!.add(P("cube", [0.22, 0.14, 0.3], "#f4efe4", [0, -0.3, 0.14]));
      standardAnim(m, { legs: 0.7, arms: 0.3 });
      break;
    }
    case "candle": {
      body.add(P("cyl", [0.3, 0.55, 0.3], "#f4e4c8", [0, 0.3, 0]));
      body.add(P("cyl", [0.45, 0.06, 0.45], "#e0b15a", [0, 0.03, 0]));
      parts.flame = glow(P("sphere", [0.16, 0.26, 0.16], "#ffc24a", [0, 0.72, 0]), 1);
      body.add(parts.flame);
      standardAnim(m, { bob: 0 });
      break;
    }
    case "boss": {
      buildBoss(body, parts, w);
      standardAnim(m, { legs: 0.3, arms: 0.2, bob: 0.02, speedK: 3 });
      break;
    }
  }
  void root;
  return m;
}

function buildBoss(body: Node, parts: Record<string, Node>, world: number) {
  const robe = ["#9a2a3a", "#e9e0cf", "#3a3236", "#4a3320", "#3a2248"][world]!;
  const robe2 = ["#2a1a22", "#1c1818", "#e08a3a", "#2a5a28", "#e0b15a"][world]!;
  const accent = ["#e0b15a", "#8fd0c8", "#ff6a2a", "#d2e39a", "#c9b6e0"][world]!;
  if (world === 3) {
    // árvore
    body.add(P("cyl", [0.6, 0.7, 0.6], "#5a3d24", [0, 0.35, 0]));
    body.add(P("cone", [0.95, 0.3, 0.95], "#4a321e", [0, 0.1, 0]));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      body.add(P("sphere", [0.5, 0.45, 0.5], i % 2 ? "#3e7a34" : "#4a8a3a", [Math.cos(a) * 0.32, 0.88 + (i % 3) * 0.05, Math.sin(a) * 0.25]));
    }
    body.add(P("sphere", [0.6, 0.5, 0.55], "#4a8a3a", [0, 1.0, 0]));
    const eye = G(0, 0.62, 0.3);
    eye.add(P("sphere", [0.3, 0.34, 0.12], "#f7f1e4"));
    eye.add(glow(P("sphere", [0.16, 0.2, 0.08], "#9aff6a", [0, 0, 0.07]), 1));
    body.add(eye);
    parts.eye = eye;
    for (const sx of [-1, 1]) {
      const arm = G(sx * 0.35, 0.7, 0);
      arm.add(P("cyl", [0.12, 0.5, 0.12], "#5a3d24", [sx * 0.15, -0.1, 0.1], [0, 0, sx * 0.9]));
      arm.add(P("sphere", [0.3, 0.14, 0.3], "#4a8a3a", [sx * 0.34, -0.3, 0.1]));
      body.add(arm);
      parts[sx < 0 ? "armL" : "armR"] = arm;
    }
    for (let i = 0; i < 4; i++) body.add(P("cone", [0.2, 0.34, 0.2], "#4a321e", [-0.4 + i * 0.27, 0.06, 0.1], [0.1, 0, (i - 1.5) * 0.35]));
    return;
  }
  // corpo base
  const robed = world === 1 || world === 4;
  if (robed) {
    body.add(P("cone", [0.98, 0.98, 0.9], robe, [0, 0.49, 0]));
    body.add(P("cyl", [0.99, 0.06, 0.92], robe2, [0, 0.03, 0]));
  } else {
    body.add(P("sphere", [0.88, 0.62, 0.66], robe, [0, 0.42, 0]));
    body.add(P("cyl", [0.9, 0.08, 0.68], robe2, [0, 0.3, 0]));
    for (const sx of [-1, 1]) {
      const leg = G(sx * 0.2, 0.22, 0);
      leg.add(P("cyl", [0.25, 0.22, 0.25], robe2, [0, -0.11, 0]));
      leg.add(P("cube", [0.29, 0.1, 0.4], "#14080c", [0, -0.22, 0.06]));
      body.add(leg);
      parts[sx < 0 ? "legL" : "legR"] = leg;
    }
  }
  const head = G(0, 0.8, 0.02);
  head.add(P("sphere", [0.44, 0.42, 0.4], world === 1 ? "#f0e6dc" : world === 2 ? "#6a625c" : "#e8c4a4"));
  for (const sx of [-1, 1]) head.add(glow(P("sphere", [0.08, 0.1, 0.05], accent, [sx * 0.1, 0.03, 0.18]), 1));
  head.add(P("cube", [0.2, 0.04, 0.05], "#14080c", [0, -0.1, 0.19]));
  body.add(head);
  for (const sx of [-1, 1]) {
    const arm = G(sx * 0.46, 0.62, 0);
    arm.add(P("cyl", [0.2, 0.42, 0.2], robed ? robe : robe, [0, -0.2, 0]));
    arm.add(P("sphere", [0.24, 0.24, 0.24], world === 2 ? "#6a625c" : "#e8c4a4", [0, -0.44, 0]));
    body.add(arm);
    parts[sx < 0 ? "armL" : "armR"] = arm;
  }
  if (world === 0) {
    head.add(P("cyl", [0.36, 0.42, 0.36], "#14080c", [0, 0.38, 0]));
    head.add(P("cyl", [0.5, 0.05, 0.5], "#14080c", [0, 0.2, 0]));
    head.add(P("cyl", [0.37, 0.07, 0.37], accent, [0, 0.28, 0]));
    head.add(P("cube", [0.3, 0.05, 0.06], "#14080c", [0, -0.05, 0.2]));
    body.add(P("sphere", [0.2, 0.1, 0.1], "#c4373a", [0, 0.66, 0.3]));
    for (let i = 0; i < 3; i++) body.add(glow(P("sphere", [0.07, 0.07, 0.04], accent, [0, 0.5 - i * 0.1, 0.33]), 0.6));
  } else if (world === 1) {
    head.add(P("cone", [0.62, 0.62, 0.55], "#14101a", [0, 0.1, -0.02]));
    const halo = glow(P("cyl", [0.62, 0.03, 0.62], accent, [0, 0.52, 0]), 0.9);
    head.add(halo);
    parts.halo = halo;
    body.add(P("cube", [0.2, 0.3, 0.06], "#c9b6e0", [0, 0.58, 0.46]));
  } else if (world === 2) {
    head.add(P("cube", [0.62, 0.2, 0.4], "#4a4540", [0, 0.28, 0]));
    for (let i = 0; i < 5; i++) head.add(glow(P("cone", [0.1, 0.24, 0.1], accent, [-0.24 + i * 0.12, 0.5, 0]), 0.8));
    body.add(glow(P("sphere", [0.3, 0.3, 0.14], accent, [0, 0.5, 0.33]), 1));
    parts.armR!.add(P("cyl", [0.12, 0.8, 0.12], "#6b4a2f", [0.0, -0.4, 0.14], [0.7, 0, 0]));
    parts.armR!.add(P("cube", [0.4, 0.26, 0.26], "#5a5550", [0.0, -0.78, 0.5]));
  } else if (world === 4) {
    head.add(P("cone", [0.64, 0.6, 0.55], "#1a1224", [0, 0.1, -0.02]));
    for (const sx of [-1, 1]) head.add(P("cyl", [0.13, 0.02, 0.13], accent, [sx * 0.1, 0.01, 0.2], [Math.PI / 2, 0, 0]));
    parts.armR!.add(P("cyl", [0.08, 0.5, 0.08], "#6b4a2f", [0, -0.5, 0.15]));
    parts.armR!.add(P("cube", [0.34, 0.1, 0.3], "#c4373a", [0, -0.78, 0.15]));
    for (let i = 0; i < 4; i++) {
      const pg = P("cube", [0.22, 0.3, 0.015], "#f4efe4", [Math.cos(i * 1.57) * 0.7, 0.9 + (i % 2) * 0.1, Math.sin(i * 1.57) * 0.3], [0, i, 0.2]);
      pg.ink = false;
      parts["page" + i] = pg;
      body.add(pg);
    }
  }
}

const cache = new Map<string, number>();
void cache;

export function buildModel(kind: Kind | "hero", hero: HeroId, world: number): Model {
  if (kind === "hero") return buildHero(hero);
  return buildEnemy(kind, world);
}

/* ---------------------------------------------------------------- desenho */

export type DrawState = {
  flash: number;
  tint: Vec3 | null;
  emis: Vec3 | null;
  ink: Vec3;
  thick: number;
  alphaMul: number;
};

const stack: Mat4[] = Array.from({ length: 12 }, () => m4.create());
const meshM = m4.create();
const sizeM = m4.create();

function drawNode(e: Engine, n: Node, parent: Mat4, depth: number, st: DrawState, pass: 0 | 1) {
  if (!n.visible) return;
  const w = stack[depth]!;
  m4.compose(sizeM, n.pos, n.rot, n.scl);
  m4.mul(w, parent, sizeM);
  if (n.prim) {
    const a = n.alpha * st.alphaMul;
    const transparent = a < 0.999;
    if ((pass === 1) === transparent) {
      m4.compose(sizeM, [0, 0, 0], [0, 0, 0], n.size);
      m4.mul(meshM, w, sizeM);
      const col: Vec3 = st.tint ? [n.color[0] * st.tint[0], n.color[1] * st.tint[1], n.color[2] * st.tint[2]] : n.color;
      const emis: Vec3 = st.emis ? [n.emis[0] + st.emis[0], n.emis[1] + st.emis[1], n.emis[2] + st.emis[2]] : n.emis;
      e.drawInked(e.prims[n.prim], meshM, { color: col, emis, alpha: a, flash: st.flash }, st.ink, n.ink && !transparent ? st.thick : 0);
    }
  }
  for (const k of n.kids) drawNode(e, k, w, depth + 1, st, pass);
}

export function drawModel(e: Engine, model: Model, world: Mat4, st: DrawState, pass: 0 | 1) {
  drawNode(e, model.root, world, 0, st, pass);
}

export const INK_COLOR = INK;
