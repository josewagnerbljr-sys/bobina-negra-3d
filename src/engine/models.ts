import { m4, hex, type Engine, type Mat4, type Vec3 } from "./gl";
import { HEROES } from "../game/content";
import type { EquipKey, HeroId, Kind } from "../game/types";
import { buildSkinHero, drawSkinModel, type SkinPart } from "./skinhero";
import { buildSkinMonster } from "./skinmob";
import { charAsset } from "./skin";

/* Grafo de cena minúsculo: cada Node é um grupo (pos/rot/scl) que pode ter uma
   primitiva desenhada com `size`. Os filhos herdam só o grupo (não o size). */

export type Prim = "cube" | "sphere" | "cone" | "cyl" | "ring" | "hemi" | "blade" | "shard" | "plate" | "gem";

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

export function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i]! - v) * k).toString(16).padStart(2, "0")).join("");
}

export function G(x = 0, y = 0, z = 0): Node {
  const n = new Node();
  n.pos = [x, y, z];
  return n;
}
export function P(prim: Prim, size: Vec3, color: string | Vec3, pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0], emis = false): Node {
  const n = new Node();
  n.prim = prim;
  n.size = size;
  n.color = typeof color === "string" ? hex(color) : color;
  n.pos = pos;
  n.rot = rot;
  if (emis) n.emis = n.color.map((v) => v * 0.9) as Vec3;
  return n;
}
export function glow(n: Node, k = 1) {
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

/** o que o herói está vestindo/segurando (vem do equipamento) */
export type GearPiece = { base: string; rarity: number; color: string; fam?: string; acc?: string };
export type GearLook = Record<EquipKey, GearPiece | null>;

const ARMOR_COLOR: Record<string, string> = { plate: "#c9d1db", vest: "#1b1b22", robe: "#c3101e", cape: "#7b2bd1" };
const GOLD = "#e8b72e";
const RAR_GLOW = ["#d8d0c0", "#5fb4ff", "#c07aff", "#ffb23a"];

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
  gear?: GearLook;
  /** no chão? */
  ground?: boolean;
  /** 0..1: progresso do golpe corpo a corpo (0 = sem golpe) */
  swing?: number;
  /** 0..1 animação de morte */
  dying?: number;
  /** comportamento do monstro (andar, voar, parado…) */
  behavior?: string;
  /** 0..1 carga/ataque do monstro */
  windup?: number;
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
  /** esqueleto animado (quando o pacote de modelos carregou) */
  skin?: SkinPart;
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
  aura.alpha = 0.07;
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
    parts.sylBow = bow;
    for (const sx of [-1, 1]) {
      const ear = P("cone", [0.07, 0.17, 0.06], skin, [sx * 0.2, 0.01, 0], [0, 0, -sx * 1.25]);
      ear.visible = false;
      head.add(ear);
      formNodes.push(ear);
    }
  }

  /* ---- acabamento comum: pescoço, nariz, sobrancelhas ---- */
  body.add(P("cyl", [0.1, 0.09, 0.1], skin, [0, 0.71, 0]));
  head.add(P("cone", [0.055, 0.07, 0.055], mix(skin, "#8a4a3a", 0.25), [0, -0.025, 0.175], [Math.PI / 2, 0, 0]));
  for (const sx of [-1, 1]) head.add(P("cube", [0.075, 0.02, 0.03], def.hair, [sx * 0.075, 0.085, 0.15], [0, 0, -sx * 0.12]));
  const gold = "#e0b15a";

  if (id === "ivo") {
    body.add(P("cube", [0.3, 0.28, 0.05], cloth, [0, 0.36, -0.15], [0.2, 0, 0]));
    for (let i = 0; i < 3; i++) body.add(glow(P("sphere", [0.032, 0.032, 0.03], gold, [0, 0.64 - i * 0.075, 0.152]), 0.5));
    for (const sx of [-1, 1]) {
      body.add(P("sphere", [0.12, 0.06, 0.12], gold, [sx * 0.2, 0.72, 0]));
      head.add(P("cone", [0.045, 0.11, 0.04], "#24160f", [sx * 0.085, -0.095, 0.16], [0, 0, sx * 1.2]));
    }
    body.add(P("cyl", [0.31, 0.04, 0.26], "#6b4a2f", [0, 0.47, 0]));
    body.add(P("cube", [0.07, 0.06, 0.03], gold, [0, 0.47, 0.135]));
    // forma de lobo: juba, garras, presas, olhos acesos
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const m = P("cone", [0.11, 0.2, 0.09], i % 2 ? "#6a6f7a" : "#8d929c", [Math.cos(a) * 0.2, 0.7, Math.sin(a) * 0.17], [Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0]);
      m.visible = false;
      body.add(m);
      formNodes.push(m);
    }
    for (const sx of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        const claw = P("cone", [0.03, 0.1, 0.03], "#f4efe4", [k * 0.045, -0.37, 0.04], [Math.PI, 0, 0]);
        claw.visible = false;
        parts[sx < 0 ? "armL" : "armR"]!.add(claw);
        formNodes.push(claw);
      }
      const fang = P("cone", [0.03, 0.08, 0.03], "#fffaf0", [sx * 0.045, -0.115, 0.27], [Math.PI, 0, 0]);
      const eye = glow(P("sphere", [0.05, 0.06, 0.04], "#ffd34a", [sx * 0.075, 0.0, 0.2]), 1);
      fang.visible = false;
      eye.visible = false;
      head.add(fang, eye);
      formNodes.push(fang, eye);
    }
  } else if (id === "lena") {
    parts.cape!.add(P("cube", [0.38, 0.5, 0.02], "#c4373a", [0, 0, 0.03]));
    body.add(P("cone", [0.4, 0.26, 0.4], cloth, [0, 0.43, 0]));
    const pony = G(0, 0.04, -0.2);
    for (let i = 0; i < 3; i++) pony.add(P("sphere", [0.12 - i * 0.025, 0.12 - i * 0.025, 0.12 - i * 0.025], def.hair, [0, -0.07 * i, -0.04 * i]));
    head.add(pony);
    parts.pony = pony;
    for (const sx of [-1, 1]) {
      body.add(P("cone", [0.12, 0.22, 0.06], "#2a1a38", [sx * 0.12, 0.76, -0.12], [0, 0, -sx * 0.3]));
      head.add(P("cone", [0.06, 0.12, 0.05], skin, [sx * 0.19, 0.01, 0], [0, 0, -sx * 1.3]));
      const eye = glow(P("sphere", [0.05, 0.06, 0.04], "#ff3a4a", [sx * 0.075, 0.0, 0.2]), 1);
      eye.visible = false;
      head.add(eye);
      formNodes.push(eye);
      const wing = parts[sx < 0 ? "wingL" : "wingR"]!;
      for (let k = 0; k < 3; k++) wing.add(P("cube", [0.52, 0.026, 0.035], "#2a1a38", [sx * 0.3, 0.12 - k * 0.1, 0.015], [0, 0, sx * (0.15 + k * 0.16)]));
    }
  } else if (id === "osso") {
    body.add(P("cube", [0.3, 0.3, 0.05], cloth, [0, 0.34, -0.14], [0.18, 0, 0]));
    for (const sx of [-1, 1]) body.add(P("cone", [0.07, 0.1, 0.05], def.accent, [sx * 0.055, 0.7, 0.14], [0, 0, sx * 1.57]));
    body.add(glow(P("sphere", [0.04, 0.04, 0.03], def.accent, [0, 0.7, 0.15]), 0.6));
    parts.armL!.add(P("cyl", [0.03, 0.62, 0.03], "#6b4a2f", [0, -0.3, 0.09]));
    parts.armL!.add(P("sphere", [0.07, 0.07, 0.07], gold, [0, 0.01, 0.09]));
    body.add(P("cube", [0.52, 0.022, 0.03], "#6b4a2f", [0, 1.27, 0.02]));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI - 0.15;
      const fl = glow(P("cone", [0.09, 0.26, 0.07], def.accent, [Math.cos(a) * 0.17, 0.2 + Math.sin(a) * 0.14, -0.02], [0, 0, Math.cos(a) * -0.8]), 0.9);
      fl.visible = false;
      head.add(fl);
      formNodes.push(fl);
    }
  } else if (id === "syl") {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      body.add(P("cone", [0.09, 0.17, 0.05], i % 2 ? "#4a8a3a" : "#6aaa48", [Math.cos(a) * 0.17, 0.39, Math.sin(a) * 0.14], [Math.PI, 0, 0]));
    }
    head.add(P("cone", [0.04, 0.22, 0.02], "#c4373a", [0.15, 0.3, -0.05], [0, 0, -0.5]));
    for (const sx of [-1, 1]) {
      parts[sx < 0 ? "armL" : "armR"]!.add(P("cyl", [0.115, 0.09, 0.115], "#4a3024", [0, -0.18, 0]));
      const eye = glow(P("sphere", [0.05, 0.06, 0.04], "#d2ff7a", [sx * 0.075, 0.0, 0.2]), 1);
      eye.visible = false;
      head.add(eye);
      formNodes.push(eye);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const lf = glow(P("cone", [0.07, 0.17, 0.05], i % 2 ? "#9bd46a" : "#d2ff7a", [Math.cos(a) * 0.17, 0.24, Math.sin(a) * 0.15], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]), 0.55);
      lf.visible = false;
      head.add(lf);
      formNodes.push(lf);
    }
  }



  /* ---- novos personagens ---- */
  const nodeForm = (n: Node) => {
    n.visible = false;
    formNodes.push(n);
    return n;
  };
  if (id === "tito") {
    head.add(P("cube", [0.2, 0.03, 0.05], "#24160f", [0, -0.085, 0.16]));
    head.add(P("cube", [0.3, 0.04, 0.05], "#24160f", [0, -0.05, 0.155], [0, 0, 0.0]));
    // faixa vermelha na testa e suspensórios
    head.add(P("cyl", [0.37, 0.05, 0.34], "#c4373a", [0, 0.1, 0]));
    for (const sx of [-1, 1]) body.add(P("cube", [0.05, 0.4, 0.03], "#e0b15a", [sx * 0.1, 0.56, 0.15]));
    body.add(P("sphere", [0.36, 0.14, 0.29], "#1c1210", [0, 0.4, 0]));
    // tocha na mão esquerda
    const torch = G(0, -0.24, 0.07);
    torch.add(P("cyl", [0.035, 0.34, 0.035], "#6b4a2f", [0, 0.1, 0]));
    const tf = glow(P("cone", [0.1, 0.22, 0.1], "#ff8a2a", [0, 0.34, 0]), 1);
    torch.add(tf);
    parts.torchFlame = tf;
    parts.armL!.add(torch);
    skull.formColor = hex("#c8553a");
    torso.formColor = hex("#b02a1a");
    // forma de dragão: chifres, escamas nas costas, olhos e chama no queixo
    for (const sx of [-1, 1]) {
      head.add(nodeForm(P("cone", [0.08, 0.26, 0.08], "#3a1a10", [sx * 0.13, 0.26, 0], [0, 0, -sx * 0.35])));
      head.add(nodeForm(glow(P("sphere", [0.05, 0.06, 0.04], "#ffd34a", [sx * 0.075, 0.0, 0.2]), 1)));
    }
    for (let i = 0; i < 5; i++) body.add(nodeForm(P("cone", [0.09, 0.2 - i * 0.015, 0.07], i % 2 ? "#ff7a2a" : "#b02a1a", [0, 0.72 - i * 0.1, -0.17], [-0.9, 0, 0])));
    const dtail = nodeForm(glow(P("cone", [0.14, 0.4, 0.14], "#ff7a2a", [0, 0.34, -0.2], [-1.2, 0, 0]), 0.7));
    body.add(dtail);
    parts.tail = dtail;
    head.add(nodeForm(glow(P("cone", [0.12, 0.2, 0.1], "#ff9a3a", [0, -0.12, 0.27], [Math.PI / 2, 0, 0]), 1)));
  } else if (id === "mari") {
    // aquário na cabeça: globo de vidro com um peixinho
    const bowl = P("sphere", [0.66, 0.66, 0.62], "#9fe0ee", [0, 0.02, 0]);
    bowl.alpha = 0.26;
    bowl.ink = false;
    bowl.emis = [0.05, 0.12, 0.14];
    head.add(bowl);
    const fish = G(0, -0.02, 0.02);
    fish.add(P("sphere", [0.1, 0.07, 0.05], "#ff8a3a", [0, 0, 0]));
    fish.add(P("cone", [0.06, 0.08, 0.02], "#ff8a3a", [-0.08, 0, 0], [0, 0, Math.PI / 2]));
    head.add(fish);
    parts.fish = fish;
    head.add(P("cyl", [0.4, 0.05, 0.38], "#e0b15a", [0, -0.22, 0]));
    // cauda de peixe nas costas e cinto de escamas
    body.add(P("cone", [0.36, 0.5, 0.2], "#1c8a9a", [0, 0.1, -0.2], [0.2, 0, 0]));
    body.add(P("cone", [0.3, 0.3, 0.14], "#4ac0e0", [0, 0.02, -0.34], [0.35, 0, 0]));
    body.add(P("cone", [0.42, 0.22, 0.4], "#e0b15a", [0, 0.43, 0], [Math.PI, 0, 0]));
    for (const sx of [-1, 1]) {
      body.add(P("sphere", [0.15, 0.12, 0.1], "#e0b15a", [sx * 0.1, 0.62, 0.13]));
      const arm = parts[sx < 0 ? "armL" : "armR"]!;
      arm.add(P("cone", [0.08, 0.22, 0.02], "#4ac0e0", [sx * 0.07, -0.1, -0.04], [0, 0, -sx * 0.5]));
    }
    skull.formColor = hex("#8fe8ee");
    torso.formColor = hex("#2ac0d0");
    for (const sx of [-1, 1]) {
      const fin = G(sx * 0.12, 0.66, -0.12);
      fin.add(P("cone", [0.3, 0.6, 0.03], "#4ac0e0", [sx * 0.3, 0.0, 0], [0, 0, -sx * 1.25]));
      fin.add(P("cone", [0.2, 0.44, 0.03], "#8fe8ee", [sx * 0.24, -0.1, 0.01], [0, 0, -sx * 1.5]));
      body.add(nodeForm(fin));
      parts[sx < 0 ? "wingL" : "wingR"] = fin;
    }
    for (let i = 0; i < 3; i++) body.add(nodeForm(glow(P("sphere", [0.07, 0.07, 0.07], "#bfefff", [0, 0.5, 0]), 0.6)));
  } else if (id === "pia") {
    // chifres curtos, asas de pedra dobradas, cauda
    for (const sx of [-1, 1]) {
      head.add(P("cone", [0.08, 0.2, 0.08], "#3a3d46", [sx * 0.12, 0.2, 0], [0, 0, -sx * 0.4]));
      const wing = G(sx * 0.13, 0.62, -0.16);
      wing.add(P("cube", [0.3, 0.46, 0.04], "#4a4e56", [sx * 0.14, 0.0, 0], [0, 0, -sx * 0.5]));
      wing.add(P("cube", [0.05, 0.5, 0.05], "#2a2c32", [sx * 0.03, 0.0, 0.01]));
      body.add(wing);
      parts[sx < 0 ? "wingL" : "wingR"] = wing;
      body.add(P("sphere", [0.15, 0.12, 0.14], "#3a3d46", [sx * 0.22, 0.7, 0]));
    }
    const gt = P("cone", [0.1, 0.32, 0.1], "#4a4e56", [0, 0.3, -0.2], [-1.1, 0, 0]);
    body.add(gt);
    parts.tail = gt;
    body.add(P("cube", [0.28, 0.2, 0.05], "#4a4e56", [0, 0.56, 0.14]));
    // forma de pedra: rachaduras brilhando
    skull.formColor = hex("#6a6e78");
    torso.formColor = hex("#4a4e56");
    hair.formColor = hex("#2a2c32");
    for (let i = 0; i < 5; i++) {
      const crack = glow(P("cube", [0.025, 0.12 + (i % 2) * 0.06, 0.02], "#ff9a3a", [-0.14 + i * 0.07, 0.55 + (i % 3) * 0.04, 0.17], [0, 0, 0.5 - i * 0.25]), 1);
      body.add(nodeForm(crack));
    }
    for (const sx of [-1, 1]) head.add(nodeForm(glow(P("sphere", [0.05, 0.06, 0.04], "#ff9a3a", [sx * 0.075, 0.0, 0.2]), 1)));
    for (const sx of [-1, 1]) body.add(nodeForm(P("sphere", [0.22, 0.17, 0.2], "#6a6e78", [sx * 0.27, 0.72, 0])));
  } else if (id === "lumen") {
    // capacete amarelo com lanterna, cinto de ferramentas, cabo no ombro
    head.add(P("sphere", [0.4, 0.28, 0.4], "#e8c820", [0, 0.1, -0.01]));
    head.add(P("cyl", [0.46, 0.04, 0.44], "#e8c820", [0, 0.07, 0.02]));
    head.add(glow(P("sphere", [0.09, 0.09, 0.06], "#fffbd0", [0, 0.17, 0.2]), 1));
    head.add(P("cube", [0.2, 0.05, 0.03], "#1a1c28", [0, 0.01, 0.17]));
    body.add(P("cyl", [0.33, 0.07, 0.28], "#6b4a2f", [0, 0.44, 0]));
    for (const sx of [-1, 1]) body.add(P("cube", [0.07, 0.1, 0.05], "#c4c8d0", [sx * 0.14, 0.4, 0.15]));
    const coil = P("ring", [0.34, 0.22, 0.34], "#e0602a", [0.18, 0.7, -0.1], [0.4, 0, 0.3]);
    body.add(coil);
    const rod = G(0, -0.25, 0.06);
    rod.add(P("cyl", [0.035, 0.34, 0.035], "#8a8e98", [0, 0.1, 0]));
    const tip = glow(P("cone", [0.06, 0.12, 0.06], "#ffe24a", [0, 0.3, 0]), 1);
    rod.add(tip);
    parts.rodTip = tip;
    parts.armL!.add(rod);
    skull.formColor = hex("#f4f8ff");
    hair.formColor = hex("#fff070");
    torso.formColor = hex("#5a8aff");
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      body.add(nodeForm(glow(P("cube", [0.03, 0.34, 0.03], "#ffee6a", [Math.cos(a) * 0.3, 0.5 + (i % 2) * 0.1, Math.sin(a) * 0.22], [0, 0, a * 2 + 0.3]), 1)));
    }
    for (const sx of [-1, 1]) head.add(nodeForm(glow(P("sphere", [0.06, 0.07, 0.04], "#ffffff", [sx * 0.075, 0.0, 0.2]), 1)));
    for (let i = 0; i < 5; i++) head.add(nodeForm(glow(P("cone", [0.05, 0.2, 0.05], "#ffee6a", [-0.14 + i * 0.07, 0.3, 0], [0, 0, (i - 2) * 0.35]), 1)));
  }

  /* ---- equipamentos visíveis: armadura vestida e arma na mão ---- */
  type ArmorSet = { root: Node; main: Node[]; trim: Node[] };
  const armorSets: Record<string, ArmorSet> = {};
  const mkSet = (key: string, build: (add: (n: Node, trim?: boolean) => Node) => void) => {
    const g = G();
    g.visible = false;
    const set: ArmorSet = { root: g, main: [], trim: [] };
    build((n, trim = false) => {
      (trim ? set.trim : set.main).push(n);
      g.add(n);
      return n;
    });
    body.add(g);
    armorSets[key] = set;
  };
  const W = "#ffffff";
  mkSet("plate", (add) => {
    add(P("sphere", [0.41, 0.39, 0.32], W, [0, 0.55, 0]));
    add(P("cyl", [0.33, 0.07, 0.28], W, [0, 0.42, 0]));
    for (const sx of [-1, 1]) {
      add(P("sphere", [0.2, 0.13, 0.2], W, [sx * 0.24, 0.71, 0]));
      add(P("cone", [0.06, 0.12, 0.06], W, [sx * 0.28, 0.8, 0], [0, 0, -sx * 0.4]), true);
    }
    add(P("sphere", [0.4, 0.26, 0.38], W, [0, 0.9, -0.02]));
    add(P("cube", [0.07, 0.07, 0.36], W, [0, 1.06, -0.02]), true);
    add(P("cube", [0.1, 0.22, 0.04], W, [0, 0.55, 0.16]), true);
  });
  mkSet("vest", (add) => {
    add(P("sphere", [0.39, 0.38, 0.31], W, [0, 0.54, 0]));
    add(P("cube", [0.06, 0.5, 0.03], W, [0.1, 0.55, 0.15], [0, 0, 0.5]), true);
    add(P("cube", [0.06, 0.5, 0.03], W, [-0.1, 0.55, 0.15], [0, 0, -0.5]), true);
    add(P("cyl", [0.33, 0.06, 0.28], W, [0, 0.43, 0]), true);
    for (const sx of [-1, 1]) add(P("sphere", [0.15, 0.1, 0.15], W, [sx * 0.23, 0.7, 0]));
    add(P("cone", [0.3, 0.2, 0.3], W, [0, 0.34, 0], [Math.PI, 0, 0]));
  });
  mkSet("robe", (add) => {
    add(P("sphere", [0.4, 0.38, 0.31], W, [0, 0.55, 0]));
    add(P("cone", [0.58, 0.58, 0.52], W, [0, 0.19, 0]));
    add(P("cyl", [0.6, 0.04, 0.54], W, [0, -0.08, 0]), true);
    add(P("cyl", [0.2, 0.08, 0.2], W, [0, 0.73, 0]), true);
    for (const sx of [-1, 1]) add(P("sphere", [0.15, 0.12, 0.15], W, [sx * 0.23, 0.69, 0]), true);
    add(P("cube", [0.08, 0.5, 0.03], W, [0, 0.28, 0.2]), true);
  });
  mkSet("cape", (add) => {
    const cp = add(P("cube", [0.5, 0.74, 0.05], W, [0, 0.42, -0.2], [0.12, 0, 0]));
    parts.gearCape = cp;
    add(P("cube", [0.52, 0.05, 0.06], W, [0, 0.79, -0.18]), true);
    for (const sx of [-1, 1]) add(P("sphere", [0.14, 0.1, 0.14], W, [sx * 0.23, 0.7, 0]));
    add(P("sphere", [0.07, 0.07, 0.06], W, [0, 0.72, 0.13]), true);
  });

  type WeaponSet = { root: Node; main: Node[]; trim: Node[] };
  const weaponSets: Record<string, WeaponSet> = {};
  const mkWeapon = (key: string, build: (add: (n: Node, trim?: boolean) => Node) => void) => {
    const g = G(0, -0.25, 0.07);
    g.rot = [1.15, 0, 0];
    g.visible = false;
    const set: WeaponSet = { root: g, main: [], trim: [] };
    build((n, trim = false) => {
      (trim ? set.trim : set.main).push(n);
      g.add(n);
      return n;
    });
    parts.armR!.add(g);
    weaponSets[key] = set;
  };
  mkWeapon("knife", (add) => {
    add(P("cube", [0.05, 0.26, 0.015], W, [0, 0.16, 0]));
    add(P("cone", [0.05, 0.08, 0.02], W, [0, 0.33, 0]));
    add(P("cube", [0.12, 0.03, 0.04], W, [0, 0.02, 0]), true);
  });
  mkWeapon("sword", (add) => {
    add(P("cube", [0.075, 0.5, 0.02], W, [0, 0.3, 0]));
    add(P("cone", [0.075, 0.1, 0.025], W, [0, 0.59, 0]));
    add(P("cube", [0.26, 0.05, 0.06], W, [0, 0.03, 0]), true);
    add(P("sphere", [0.05, 0.05, 0.05], W, [0, -0.1, 0]), true);
  });
  mkWeapon("axe", (add) => {
    add(P("cyl", [0.035, 0.62, 0.035], "#6b4a2f", [0, 0.24, 0]));
    add(P("cube", [0.3, 0.2, 0.04], W, [0.14, 0.46, 0]));
    add(P("cone", [0.1, 0.22, 0.04], W, [0.32, 0.46, 0], [0, 0, -Math.PI / 2]), true);
  });
  mkWeapon("staff", (add) => {
    add(P("cyl", [0.035, 0.9, 0.035], "#6b4a2f", [0, 0.3, 0]));
    add(glow(P("sphere", [0.12, 0.12, 0.12], W, [0, 0.8, 0]), 0.8), true);
    add(P("ring", [0.2, 0.06, 0.2], W, [0, 0.72, 0], [0.4, 0, 0]));
  });
  mkWeapon("scepter", (add) => {
    add(P("cyl", [0.04, 0.55, 0.04], "#d9a830", [0, 0.22, 0]));
    add(glow(P("cone", [0.14, 0.18, 0.14], W, [0, 0.58, 0]), 0.8), true);
    add(P("cyl", [0.1, 0.04, 0.1], "#d9a830", [0, 0.46, 0]));
  });
  mkWeapon("bow", (add) => {
    add(P("cube", [0.035, 0.46, 0.035], "#8d4a2f", [0.02, 0.2, 0]));
    add(P("cube", [0.035, 0.2, 0.035], "#8d4a2f", [0.0, 0.46, 0], [0, 0, 0.5]));
    add(P("cube", [0.035, 0.2, 0.035], "#8d4a2f", [0.0, -0.06, 0], [0, 0, -0.5]));
    add(P("cube", [0.008, 0.66, 0.008], W, [-0.08, 0.2, 0]), true);
  });
  const relicGem = glow(P("sphere", [0.075, 0.09, 0.05], "#ffffff", [0, 0.6, 0.16]), 0.9);
  relicGem.visible = false;
  const relicChain = P("cyl", [0.17, 0.01, 0.15], "#d9a830", [0, 0.67, 0.0]);
  relicChain.visible = false;
  body.add(relicGem, relicChain);
  let gearKey = "";
  const paint = (n: Node, c: string, emisK = 0) => {
    n.color = hex(c);
    if (emisK > 0) n.emis = n.color.map((v) => v * emisK) as Vec3;
    if (!n.baseColor) n.baseColor = n.color;
  };
  const ARMOR_MAP: Record<string, string> = { plate: "plate", cuirass: "plate", vest: "vest", tunic: "vest", robe: "robe" };
  const WEAPON_MAP: Record<string, string> = { knife: "knife", claws: "knife", wand: "scepter", sword: "sword", staff: "staff", scepter: "scepter", bow: "bow", axe: "axe", hammer: "axe" };
  const applyGear = (g: GearLook | undefined) => {
    const ak = g?.cape ? "cape" : g?.armor ? ARMOR_MAP[g.armor.base] ?? "vest" : null;
    const wk = g?.weapon ? WEAPON_MAP[g.weapon.base] ?? "sword" : null;
    const ar = g?.cape ? g.cape.rarity : g?.armor?.rarity ?? 0;
    const wr = g?.weapon?.rarity ?? 0;
    const rel = g?.necklace ?? g?.ring1 ?? g?.offhand ?? null;
    const key = `${ak}|${ar}|${wk}|${wr}|${rel?.base}|${g?.armor?.color}`;
    if (key === gearKey) return;
    gearKey = key;
    for (const k of Object.keys(armorSets)) armorSets[k]!.root.visible = k === ak;
    for (const k of Object.keys(weaponSets)) weaponSets[k]!.root.visible = k === wk;
    if (parts.sylBow) parts.sylBow.visible = !wk;
    if (ak && armorSets[ak]) {
      const set = armorSets[ak]!;
      const col = g?.cape ? g.cape.color : g?.armor?.color ?? "#c9d1db";
      const base = ar >= 3 ? GOLD : col;
      const trim = ar >= 2 ? (ar >= 3 ? "#fff2b0" : GOLD) : "#e8b72e";
      for (const n of set.main) paint(n, base);
      for (const n of set.trim) paint(n, trim);
    }
    if (wk && weaponSets[wk]) {
      const set = weaponSets[wk]!;
      const rc = RAR_GLOW[Math.min(3, wr)]!;
      const blade = wk === "staff" || wk === "scepter" ? rc : wk === "bow" ? "#f4efe0" : wr >= 3 ? GOLD : "#dfe5ee";
      for (const n of set.main) paint(n, blade, n.emis[0] > 0 ? 0.8 : 0);
      for (const n of set.trim) paint(n, rc, n.emis[0] > 0 ? 0.9 : 0);
    }
    relicGem.visible = Boolean(rel);
    relicChain.visible = Boolean(rel);
    if (rel) paint(relicGem, rel.color, 0.9);
  };

  /* ---- efeitos da transformação: anéis de energia, colunas e brilho ---- */
  const fxCol = hex(def.accent).map((v) => Math.min(1, v * 0.85 + 0.15)) as Vec3;
  const fx: Node[] = [];
  for (let i = 0; i < 3; i++) {
    const r = P("ring", [0.9, 0.6, 0.9], fxCol, [0, 0.1, 0]);
    r.emis = fxCol.map((v) => v * 0.6) as Vec3;
    r.ink = false;
    r.alpha = 0.5;
    r.visible = false;
    root.add(r);
    fx.push(r);
    parts["fxRing" + i] = r;
  }
  for (let i = 0; i < 6; i++) {
    const c = P("cone", [0.05, 0.4, 0.05], fxCol, [0, 0, 0]);
    c.emis = fxCol.map((v) => v * 1.0) as Vec3;
    c.ink = false;
    c.alpha = 0.7;
    c.visible = false;
    root.add(c);
    fx.push(c);
    parts["fxCol" + i] = c;
  }
  let lastForm = false;
  let popAt = -10;

  const model: Model = {
    root,
    kind: "hero",
    parts,
    yaw: Math.PI / 2 - 0.5,
    formNodes,
    fly: false,
    update(p) {
      applyGear(p.gear);
      if (parts.gearCape) parts.gearCape.rot[0] = 0.15 + p.speed * 0.35 + Math.sin(p.t * 5) * 0.05 + (Math.abs(p.vy) > 70 ? 0.25 : 0);
      const run = p.speed;
      const air = Math.abs(p.vy) > 70;
      const lw = Math.sin(p.phase * 1.5);
      const bat = p.form && id === "lena";
      const skullForm = p.form && (id === "osso" || id === "mari");
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
      if (parts.pony) parts.pony.rot[0] = 0.5 + run * 0.5 + Math.sin(p.t * 6) * 0.12 - (air ? 0.4 : 0);
      if (p.form !== lastForm) {
        lastForm = p.form;
        popAt = p.t;
      }
      for (const n of fx) n.visible = p.form;
      if (p.form) {
        for (let i = 0; i < 3; i++) {
          const u = (p.t * 0.9 + i / 3) % 1;
          const r = parts["fxRing" + i]!;
          r.pos[1] = 0.05 + u * 1.15;
          const k = 0.75 + Math.sin(u * Math.PI) * 0.55;
          r.size = [k, 0.6, k];
          r.alpha = Math.sin(u * Math.PI) * 0.5 + 0.04;
          r.rot[1] = p.t * 2 + i;
        }
        for (let i = 0; i < 6; i++) {
          const u = (p.t * 0.7 + i * 0.17) % 1;
          const c = parts["fxCol" + i]!;
          const a = i * 1.047 + p.t * 1.6;
          c.pos = [Math.cos(a) * 0.36, u * 1.0 - 0.1, Math.sin(a) * 0.3];
          c.size = [0.05, 0.22 + u * 0.18, 0.05];
          c.alpha = Math.sin(u * Math.PI) * 0.7 + 0.05;
        }
      }
      if (parts.wingL && parts.wingR && id === "mari") {
        const f = Math.sin(p.t * 9) * 0.3;
        parts.wingL.rot[2] = -f;
        parts.wingR.rot[2] = f;
      } else if (parts.wingL && parts.wingR && id === "pia") {
        const f = p.form ? 0.5 + Math.sin(p.t * 3) * 0.05 : 0.05;
        parts.wingL.rot[1] = -f;
        parts.wingR.rot[1] = f;
      } else if (parts.wingL && parts.wingR) {
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
      const popK = Math.max(0, 1 - (p.t - popAt) / 0.45);
      const big = (p.form && id === "ivo" ? 1.15 : p.form && id === "pia" ? 1.2 : 1) * (1 + Math.sin(popK * Math.PI) * 0.3);
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
  const { root, body, parts, m } = make(kind, kind === "balloon" || kind === "wraith" || kind === "gull" || kind === "cherub" || kind === "shade");
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
      for (let i = 0; i < 4; i++) head.add(P("cone", [0.035, 0.07, 0.03], "#fffaf0", [-0.08 + i * 0.053, -0.09, 0.28], [Math.PI, 0, 0]));
      for (const sx of [-1, 1]) {
        head.add(P("cube", [0.14, 0.03, 0.03], "#3a1014", [sx * 0.13, 0.12, 0.26], [0, 0, -sx * 0.4]));
        const wing = G(sx * 0.3, 0.5, -0.2);
        wing.add(P("cube", [0.3, 0.26, 0.02], "#6a1c2a", [sx * 0.14, 0.05, 0], [0, sx * 0.4, sx * 0.4]));
        wing.add(P("cube", [0.3, 0.02, 0.03], "#e8a0a8", [sx * 0.14, 0.17, 0], [0, sx * 0.4, sx * 0.4]));
        body.add(wing);
        parts[sx < 0 ? "wingL" : "wingR"] = wing;
      }
      body.add(head);
      parts.tail = P("cone", [0.1, 0.34, 0.1], "#8c2430", [0, 0.28, -0.3], [-1.2, 0, 0]);
      body.add(parts.tail);
      limbs(body, parts, { hipY: 0.2, hipX: 0.15, legLen: 0.2, legW: 0.12, legColor: "#8c2430", footColor: "#3a1014", armY: 0.5, armX: 0.37, armLen: 0.2, armW: 0.08, armColor: "#b8323a" });
      standardAnim(m, { legs: 0.9, speedK: 8 });
      {
        const upd = m.update;
        m.update = (p) => {
          upd(p);
          const f = Math.sin(p.t * 12) * 0.35;
          if (parts.wingL) parts.wingL.rot[1] = -f;
          if (parts.wingR) parts.wingR.rot[1] = f;
        };
      }
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
      parts.armR!.add(P("cube", [0.04, 0.34, 0.025], "#b9b4a8", [0, -0.45, 0.06]));
      parts.armR!.add(P("cube", [0.14, 0.03, 0.04], "#6b4a2f", [0, -0.29, 0.06]));
      body.add(P("cube", [0.34, 0.3, 0.03], "#3a2a2a", [0, 0.58, -0.14], [0.15, 0, 0]));
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
      for (const sx of [-1, 1]) {
        body.add(P("sphere", [0.3, 0.24, 0.3], "#8a7c70", [sx * 0.42, 0.84, 0]));
        body.add(P("cone", [0.16, 0.18, 0.16], "#4a8a4a", [sx * 0.42, 0.98, 0]));
      }
      for (let i = 0; i < 3; i++) body.add(glow(P("cube", [0.1, 0.025, 0.03], "#ff8a3a", [-0.22 + i * 0.22, 0.38, 0.3]), 0.7));
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
      for (let i = 0; i < 4; i++) parts.armR!.add(P("cone", [0.05, 0.12, 0.05], "#d9d0c2", [(i % 2 ? 0.1 : -0.1), -0.55 - i * 0.05, 0.28 + i * 0.03], [0, 0, (i % 2 ? -1 : 1) * 1.3]));
      body.add(P("cyl", [0.62, 0.09, 0.46], "#4a321e", [0, 0.28, 0]));
      body.add(P("sphere", [0.12, 0.12, 0.1], "#efe8d8", [0, 0.28, 0.24]));
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
    case "crab": {
      body.add(P("sphere", [0.7, 0.34, 0.5], "#d8552a", [0, 0.24, 0]));
      body.add(P("sphere", [0.5, 0.14, 0.36], "#f08a4a", [0, 0.36, 0.04]));
      for (const sx of [-1, 1]) {
        body.add(P("cyl", [0.03, 0.16, 0.03], "#a83a1a", [sx * 0.14, 0.46, 0.14]));
        body.add(P("sphere", [0.1, 0.1, 0.1], "#f7f1e4", [sx * 0.14, 0.56, 0.14]));
        body.add(P("sphere", [0.05, 0.05, 0.05], "#14080c", [sx * 0.14, 0.56, 0.2]));
      }
      limbs(body, parts, { hipY: 0.16, hipX: 0.2, legLen: 0.14, legW: 0.045, legColor: "#a83a1a", armY: 0.34, armX: 0.38, armLen: 0.2, armW: 0.06, armColor: "#d8552a", hand: "#f0652a" });
      for (const k of ["armL", "armR"] as const) {
        parts[k]!.add(P("cone", [0.1, 0.12, 0.05], "#f0652a", [0, -0.3, 0], [Math.PI, 0, 0]));
      }
      standardAnim(m, { legs: 1.0, arms: 0.5, speedK: 11, bob: 0.015 });
      break;
    }
    case "gull": {
      body.add(P("sphere", [0.5, 0.3, 0.3], "#f4f6f8", [0, 0.5, 0]));
      body.add(P("sphere", [0.2, 0.2, 0.2], "#f4f6f8", [0.22, 0.62, 0]));
      body.add(P("cone", [0.07, 0.17, 0.07], "#f0a020", [0.38, 0.6, 0], [0, 0, -Math.PI / 2]));
      body.add(P("sphere", [0.04, 0.04, 0.04], "#14080c", [0.28, 0.66, 0.08]));
      body.add(P("cone", [0.14, 0.2, 0.1], "#8a96a4", [-0.3, 0.5, 0], [0, 0, Math.PI / 2]));
      for (const sx of [-1, 1]) {
        const wing = G(0, 0.56, sx * 0.1);
        wing.add(P("cube", [0.34, 0.03, 0.4], "#e8ecf0", [0, 0, sx * 0.2]));
        wing.add(P("cube", [0.16, 0.03, 0.2], "#8a96a4", [-0.02, 0, sx * 0.44]));
        body.add(wing);
        parts[sx < 0 ? "wingL" : "wingR"] = wing;
      }
      standardAnim(m, { sway: 0.06 });
      {
        const upd = m.update;
        m.update = (p) => {
          upd(p);
          const f = Math.sin(p.t * 13) * 0.6;
          if (parts.wingL) parts.wingL.rot[0] = -f;
          if (parts.wingR) parts.wingR.rot[0] = f;
        };
      }
      break;
    }
    case "scorp": {
      body.add(P("sphere", [0.6, 0.26, 0.4], "#c49a58", [0, 0.2, 0]));
      body.add(P("sphere", [0.26, 0.2, 0.3], "#a87a3a", [0.3, 0.22, 0]));
      for (const sx of [-1, 1]) body.add(glow(P("sphere", [0.04, 0.04, 0.04], "#ff4a2a", [0.4, 0.28, sx * 0.08])));
      const tail = G(-0.26, 0.26, 0);
      for (let i = 0; i < 4; i++) tail.add(P("sphere", [0.15 - i * 0.015, 0.15 - i * 0.015, 0.15 - i * 0.015], "#c49a58", [-0.04 - i * 0.04, 0.12 * i + 0.04, 0]));
      tail.add(P("cone", [0.08, 0.16, 0.08], "#6a2a1a", [-0.2, 0.56, 0], [0, 0, 1.9]));
      body.add(tail);
      parts.tail = tail;
      limbs(body, parts, { hipY: 0.15, hipX: 0.14, legLen: 0.14, legW: 0.04, legColor: "#8a6a30", armY: 0.28, armX: 0.34, armLen: 0.18, armW: 0.06, armColor: "#c49a58", hand: "#e0b070" });
      standardAnim(m, { legs: 0.9, arms: 0.3, speedK: 9 });
      break;
    }
    case "mummy": {
      body.add(P("cyl", [0.36, 0.5, 0.26], "#d9ccaa", [0, 0.52, 0]));
      for (let i = 0; i < 5; i++) body.add(P("cyl", [0.38, 0.03, 0.28], "#b8a880", [0, 0.34 + i * 0.1, 0], [0.1, 0, i % 2 ? 0.08 : -0.08]));
      const head = G(0, 0.86, 0);
      head.add(P("sphere", [0.34, 0.34, 0.32], "#d9ccaa"));
      head.add(P("cyl", [0.35, 0.03, 0.33], "#b8a880", [0, 0.06, 0], [0.1, 0, 0.1]));
      for (const sx of [-1, 1]) head.add(glow(P("sphere", [0.07, 0.05, 0.04], "#7affc0", [sx * 0.09, 0.02, 0.16]), 1));
      body.add(head);
      limbs(body, parts, { hipY: 0.28, hipX: 0.1, legLen: 0.28, legW: 0.1, legColor: "#d9ccaa", footColor: "#b8a880", armY: 0.7, armX: 0.24, armLen: 0.3, armW: 0.08, armColor: "#d9ccaa", hand: "#b8a880" });
      parts.armL!.rot[0] = -1.1;
      parts.armR!.rot[0] = -1.1;
      standardAnim(m, { legs: 0.5, arms: 0.1, speedK: 5 });
      {
        const upd = m.update;
        m.update = (p) => {
          upd(p);
          parts.armL!.rot[0] = -1.1 + Math.sin(p.phase * 3) * 0.1;
          parts.armR!.rot[0] = -1.1 - Math.sin(p.phase * 3) * 0.1;
        };
      }
      break;
    }
    case "snowman": {
      body.add(P("sphere", [0.6, 0.5, 0.56], "#f2f8ff", [0, 0.26, 0]));
      body.add(P("sphere", [0.46, 0.4, 0.44], "#f8fcff", [0, 0.62, 0]));
      const head = G(0, 0.92, 0);
      head.add(P("sphere", [0.34, 0.32, 0.32], "#ffffff"));
      head.add(P("cone", [0.06, 0.2, 0.06], "#f08a2a", [0, -0.02, 0.2], [Math.PI / 2, 0, 0]));
      for (const sx of [-1, 1]) head.add(P("sphere", [0.045, 0.045, 0.03], "#14080c", [sx * 0.09, 0.07, 0.15]));
      head.add(P("cyl", [0.28, 0.03, 0.28], "#2a2a3a", [0, 0.15, 0]));
      head.add(P("cyl", [0.19, 0.2, 0.19], "#2a2a3a", [0, 0.26, 0]));
      head.add(P("cyl", [0.2, 0.04, 0.2], "#c4373a", [0, 0.18, 0]));
      body.add(head);
      for (const sx of [-1, 1]) {
        const arm = G(sx * 0.3, 0.64, 0);
        arm.add(P("cyl", [0.025, 0.34, 0.025], "#5a3d24", [sx * 0.15, 0.0, 0], [0, 0, sx * -1.1]));
        body.add(arm);
        parts[sx < 0 ? "armL" : "armR"] = arm;
      }
      for (let i = 0; i < 3; i++) body.add(P("sphere", [0.05, 0.05, 0.03], "#14080c", [0, 0.5 + i * 0.1, 0.22]));
      standardAnim(m, { hop: true, legs: 0, arms: 0.4, speedK: 4, bob: 0.05 });
      break;
    }
    case "yeti": {
      body.add(P("sphere", [0.86, 0.8, 0.66], "#e8f2fa", [0, 0.5, 0]));
      body.add(P("sphere", [0.6, 0.5, 0.2], "#a8c8e0", [0, 0.5, 0.26]));
      const head = G(0, 0.98, 0.04);
      head.add(P("sphere", [0.5, 0.42, 0.44], "#f4f8fc"));
      head.add(P("sphere", [0.34, 0.26, 0.1], "#6a88a8", [0, -0.04, 0.2]));
      for (const sx of [-1, 1]) {
        head.add(glow(P("sphere", [0.07, 0.07, 0.04], "#7ad8ff", [sx * 0.1, 0.04, 0.24]), 1));
        head.add(P("cone", [0.07, 0.2, 0.07], "#fffaf0", [sx * 0.1, -0.2, 0.22], [Math.PI, 0, 0]));
      }
      body.add(head);
      limbs(body, parts, { hipY: 0.28, hipX: 0.2, legLen: 0.28, legW: 0.19, legColor: "#e8f2fa", footColor: "#6a88a8", armY: 0.8, armX: 0.5, armLen: 0.5, armW: 0.17, armColor: "#e8f2fa", hand: "#a8c8e0" });
      standardAnim(m, { legs: 0.7, arms: 0.9, speedK: 6, bob: 0.05 });
      break;
    }
    case "cherub": {
      body.add(P("sphere", [0.36, 0.4, 0.3], "#fbe4d0", [0, 0.4, 0]));
      const head = G(0, 0.72, 0);
      head.add(P("sphere", [0.34, 0.32, 0.3], "#fbe4d0"));
      head.add(P("sphere", [0.36, 0.2, 0.32], "#ffe27a", [0, 0.1, -0.02]));
      for (const sx of [-1, 1]) head.add(P("sphere", [0.05, 0.06, 0.03], "#14080c", [sx * 0.09, 0.0, 0.14]));
      head.add(glow(P("ring", [0.34, 0.03, 0.34], "#ffe27a", [0, 0.3, 0]), 1));
      body.add(head);
      for (const sx of [-1, 1]) {
        const wing = G(sx * 0.16, 0.5, -0.12);
        wing.add(P("sphere", [0.42, 0.14, 0.04], "#ffffff", [sx * 0.18, 0.08, 0], [0, 0, sx * 0.4]));
        wing.add(P("sphere", [0.3, 0.1, 0.04], "#e8ecff", [sx * 0.16, -0.02, 0], [0, 0, sx * 0.2]));
        body.add(wing);
        parts[sx < 0 ? "wingL" : "wingR"] = wing;
      }
      body.add(P("cyl", [0.02, 0.4, 0.02], "#c8a050", [0.24, 0.34, 0.12], [0, 0, 0.5]));
      standardAnim(m, { sway: 0.1 });
      {
        const upd = m.update;
        m.update = (p) => {
          upd(p);
          const f = Math.sin(p.t * 11) * 0.5;
          if (parts.wingL) parts.wingL.rot[1] = -f;
          if (parts.wingR) parts.wingR.rot[1] = f;
        };
      }
      break;
    }
    case "gargoyle": {
      body.add(P("sphere", [0.62, 0.56, 0.46], "#7a7f8a", [0, 0.42, 0]));
      const head = G(0, 0.8, 0.04);
      head.add(P("sphere", [0.4, 0.34, 0.36], "#8a909c"));
      for (const sx of [-1, 1]) {
        head.add(P("cone", [0.09, 0.26, 0.09], "#4a4e58", [sx * 0.16, 0.26, 0], [0, 0, -sx * 0.4]));
        head.add(glow(P("sphere", [0.06, 0.05, 0.04], "#ff3a2a", [sx * 0.1, 0.03, 0.17]), 1));
      }
      head.add(P("cube", [0.2, 0.05, 0.05], "#2a2d34", [0, -0.1, 0.17]));
      body.add(head);
      for (const sx of [-1, 1]) {
        const wing = G(sx * 0.2, 0.62, -0.2);
        wing.add(P("cube", [0.4, 0.34, 0.03], "#5a5e6a", [sx * 0.2, 0.08, 0], [0, sx * 0.5, sx * 0.3]));
        wing.add(P("cube", [0.4, 0.03, 0.04], "#3a3d46", [sx * 0.2, 0.26, 0], [0, sx * 0.5, sx * 0.3]));
        body.add(wing);
        parts[sx < 0 ? "wingL" : "wingR"] = wing;
      }
      limbs(body, parts, { hipY: 0.24, hipX: 0.18, legLen: 0.22, legW: 0.15, legColor: "#6a6f7a", footColor: "#3a3d46", armY: 0.58, armX: 0.38, armLen: 0.3, armW: 0.12, armColor: "#7a7f8a", hand: "#4a4e58" });
      standardAnim(m, { legs: 0.7, hop: true, speedK: 7 });
      break;
    }
    case "shade": {
      body.add(P("cone", [0.58, 0.9, 0.42], "#3a1e5a", [0, 0.46, 0]));
      body.add(P("sphere", [0.4, 0.38, 0.34], "#2a1444", [0, 0.8, 0]));
      for (const sx of [-1, 1]) body.add(glow(P("sphere", [0.08, 0.12, 0.05], "#d86aff", [sx * 0.1, 0.82, 0.16]), 1));
      for (let i = 0; i < 3; i++) body.add(P("cone", [0.14, 0.34, 0.12], "#2a1444", [-0.18 + i * 0.18, 0.04, 0], [Math.PI, 0, 0]));
      for (const sx of [-1, 1]) {
        const arm = G(sx * 0.3, 0.66, 0);
        arm.add(P("cone", [0.1, 0.44, 0.08], "#3a1e5a", [sx * 0.08, -0.18, 0], [0, 0, sx * 0.4]));
        body.add(arm);
        parts[sx < 0 ? "armL" : "armR"] = arm;
      }
      standardAnim(m, { sway: 0.12, arms: 0.4 });
      break;
    }
    case "jester": {
      body.add(P("sphere", [0.4, 0.46, 0.3], "#c4373a", [0, 0.52, 0]));
      body.add(P("sphere", [0.2, 0.44, 0.28], "#2a4f86", [0.1, 0.52, 0.02]));
      body.add(P("ring", [0.4, 0.06, 0.34], "#e0b15a", [0, 0.72, 0], [Math.PI / 2, 0, 0]));
      const head = G(0, 0.9, 0);
      head.add(P("sphere", [0.32, 0.32, 0.3], "#f4efe4"));
      for (const sx of [-1, 1]) head.add(P("sphere", [0.05, 0.07, 0.03], "#14080c", [sx * 0.08, 0.02, 0.14]));
      head.add(P("sphere", [0.2, 0.06, 0.04], "#c4373a", [0, -0.08, 0.14]));
      head.add(P("cone", [0.2, 0.46, 0.2], "#c4373a", [-0.14, 0.34, 0], [0, 0, 0.8]));
      head.add(P("cone", [0.2, 0.46, 0.2], "#2a4f86", [0.14, 0.34, 0], [0, 0, -0.8]));
      head.add(glow(P("sphere", [0.07, 0.07, 0.07], "#ffd34a", [-0.34, 0.5, 0]), 1));
      head.add(glow(P("sphere", [0.07, 0.07, 0.07], "#ffd34a", [0.34, 0.5, 0]), 1));
      body.add(head);
      limbs(body, parts, { hipY: 0.3, hipX: 0.1, legLen: 0.3, legW: 0.08, legColor: "#2a4f86", footColor: "#e0b15a", armY: 0.68, armX: 0.28, armLen: 0.3, armW: 0.07, armColor: "#c4373a", hand: "#f4efe4" });
      standardAnim(m, { legs: 1.0, hop: true, speedK: 9 });
      break;
    }
    case "chest": {
      body.add(P("cube", [0.82, 0.38, 0.54], "#7a4a24", [0, 0.2, 0]));
      body.add(P("cyl", [0.82, 0.54, 0.4], "#8a5a2c", [0, 0.38, 0], [0, 0, Math.PI / 2]));
      body.add(P("cube", [0.86, 0.06, 0.58], "#e0b15a", [0, 0.2, 0]));
      body.add(P("cube", [0.08, 0.5, 0.58], "#e0b15a", [-0.26, 0.28, 0]));
      body.add(P("cube", [0.08, 0.5, 0.58], "#e0b15a", [0.26, 0.28, 0]));
      body.add(glow(P("cube", [0.12, 0.14, 0.04], "#ffe27a", [0, 0.32, 0.29]), 1));
      standardAnim(m, { bob: 0 });
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
      {
        const ac = hex(["#e0b15a", "#8fd0c8", "#ff6a2a", "#d2e39a", "#c9b6e0", "#ffcc60", "#7ad8ff", "#3ad8b4", "#ffe27a", "#ff3a4a"][w % 10]!);
        const orbs: Node[] = [];
        for (let i = 0; i < 4; i++) {
          const o = glow(P("sphere", [0.15, 0.15, 0.15], ac, [0, 0.9, 0]), 1);
          body.add(o);
          orbs.push(o);
        }
        const upd = m.update;
        m.update = (p) => {
          upd(p);
          orbs.forEach((o, i) => {
            const a = p.t * 1.6 + (i / 4) * Math.PI * 2;
            o.pos = [Math.cos(a) * 0.78, 0.9 + Math.sin(p.t * 2 + i) * 0.12, Math.sin(a) * 0.5];
          });
          for (let i = 0; i < 5; i++) {
            const sh = parts["shard" + i];
            if (!sh) continue;
            const a = p.t * 1.2 + (i / 5) * Math.PI * 2;
            sh.pos = [Math.cos(a) * 0.9, 0.7 + Math.sin(p.t * 2 + i) * 0.15, Math.sin(a) * 0.4];
            sh.rot[2] = a;
          }
          for (let i = 0; i < 4; i++) {
            const pg = parts["page" + i];
            if (!pg) continue;
            const a = p.t * 0.9 + i * 1.57;
            pg.pos = [Math.cos(a) * 0.75, 0.95 + Math.sin(p.t * 1.7 + i) * 0.12, Math.sin(a) * 0.4];
            pg.rot[1] = a;
          }
          if (parts.wingL && parts.wingR) {
            const f = Math.sin(p.t * 3) * 0.18;
            parts.wingL.rot[2] = f;
            parts.wingR.rot[2] = -f;
          }
        };
      }
      break;
    }
  }
  void root;
  return m;
}

function buildBoss2(body: Node, parts: Record<string, Node>, world: number) {
  const arms = (col: string, hand: string, x = 0.46, y = 0.62) => {
    for (const sx of [-1, 1]) {
      const arm = G(sx * x, y, 0);
      arm.add(P("cyl", [0.2, 0.42, 0.2], col, [0, -0.2, 0]));
      arm.add(P("sphere", [0.24, 0.24, 0.24], hand, [0, -0.44, 0]));
      body.add(arm);
      parts[sx < 0 ? "armL" : "armR"] = arm;
    }
  };
  const eyesG = (head: Node, c: string, y = 0.03) => {
    for (const sx of [-1, 1]) head.add(glow(P("sphere", [0.08, 0.1, 0.05], c, [sx * 0.1, y, 0.18]), 1));
  };
  if (world === 5) {
    // Faraó: túnica dourada e azul, máscara, naja
    body.add(P("cone", [0.96, 1.0, 0.8], "#e0b15a", [0, 0.5, 0]));
    for (let i = 0; i < 4; i++) body.add(P("cyl", [0.9 - i * 0.18, 0.05, 0.74 - i * 0.14], "#2a5aa0", [0, 0.16 + i * 0.2, 0]));
    body.add(P("cyl", [1.0, 0.06, 0.84], "#2a5aa0", [0, 0.03, 0]));
    const head = G(0, 0.86, 0.02);
    head.add(P("sphere", [0.44, 0.46, 0.4], "#f0c860"));
    head.add(P("cube", [0.78, 0.7, 0.34], "#2a5aa0", [0, 0.04, -0.12]));
    head.add(P("cube", [0.22, 0.5, 0.1], "#2a5aa0", [-0.34, -0.2, 0.12]));
    head.add(P("cube", [0.22, 0.5, 0.1], "#2a5aa0", [0.34, -0.2, 0.12]));
    head.add(P("cube", [0.7, 0.06, 0.36], "#e0b15a", [0, 0.2, -0.1]));
    eyesG(head, "#7affc0");
    head.add(P("cone", [0.06, 0.28, 0.06], "#3aaa5a", [0, 0.34, 0.16]));
    head.add(P("cube", [0.14, 0.26, 0.08], "#2a5aa0", [0, -0.34, 0.24]));
    body.add(head);
    arms("#e0b15a", "#f0c860");
    parts.armR!.add(P("cyl", [0.05, 0.9, 0.05], "#8a5a2c", [0, -0.5, 0.15]));
    parts.armR!.add(P("sphere", [0.2, 0.2, 0.2], "#e0b15a", [0, -0.98, 0.15]));
    for (let i = 0; i < 3; i++) body.add(glow(P("sphere", [0.07, 0.07, 0.04], "#7affc0", [0, 0.6 - i * 0.12, 0.4]), 0.8));
    return;
  }
  if (world === 6) {
    // Rainha do Gelo
    body.add(P("cone", [1.02, 1.1, 0.9], "#8ac8f0", [0, 0.55, 0]));
    body.add(P("cone", [0.78, 0.8, 0.7], "#c8ecff", [0, 0.6, 0.02]));
    body.add(P("cyl", [1.04, 0.06, 0.92], "#e8f8ff", [0, 0.03, 0]));
    const head = G(0, 0.9, 0.02);
    head.add(P("sphere", [0.42, 0.44, 0.38], "#e8f2fa"));
    head.add(P("sphere", [0.46, 0.34, 0.4], "#f4fbff", [0, 0.1, -0.06]));
    eyesG(head, "#7ad8ff");
    for (let i = 0; i < 5; i++) head.add(glow(P("cone", [0.1, 0.34 + (i === 2 ? 0.18 : 0), 0.1], "#c8f0ff", [-0.24 + i * 0.12, 0.34, 0], [0, 0, (i - 2) * 0.22]), 0.7));
    body.add(head);
    arms("#8ac8f0", "#e8f2fa");
    parts.armR!.add(P("cyl", [0.05, 0.8, 0.05], "#c8ecff", [0, -0.5, 0.15]));
    parts.armR!.add(glow(P("cone", [0.2, 0.3, 0.2], "#7ad8ff", [0, -1.0, 0.15], [Math.PI, 0, 0]), 0.9));
    for (let i = 0; i < 5; i++) {
      const sh = glow(P("cone", [0.1, 0.3, 0.1], "#9ae0ff", [0, 0.7, 0]), 0.8);
      body.add(sh);
      parts["shard" + i] = sh;
    }
    return;
  }
  if (world === 7) {
    // Capitão Maré
    body.add(P("sphere", [0.96, 0.72, 0.7], "#1c3a5a", [0, 0.42, 0]));
    body.add(P("cyl", [0.98, 0.08, 0.72], "#e0b15a", [0, 0.32, 0]));
    for (let i = 0; i < 4; i++) body.add(glow(P("sphere", [0.07, 0.07, 0.04], "#e0b15a", [-0.24 + i * 0.16, 0.5, 0.34]), 0.8));
    for (const sx of [-1, 1]) {
      const leg = G(sx * 0.22, 0.22, 0);
      leg.add(P("cyl", [0.25, 0.22, 0.25], "#14283a", [0, -0.11, 0]));
      leg.add(P("cube", [0.3, 0.1, 0.4], "#14080c", [0, -0.22, 0.06]));
      body.add(leg);
      parts[sx < 0 ? "legL" : "legR"] = leg;
    }
    const head = G(0, 0.82, 0.02);
    head.add(P("sphere", [0.44, 0.42, 0.4], "#e0b890"));
    head.add(P("sphere", [0.4, 0.3, 0.2], "#3aaa94", [0, -0.14, 0.14]));
    for (let i = 0; i < 3; i++) head.add(P("cone", [0.1, 0.24, 0.1], "#3aaa94", [-0.12 + i * 0.12, -0.34, 0.18], [Math.PI, 0, 0]));
    eyesG(head, "#3ad8b4");
    head.add(P("cube", [0.08, 0.06, 0.02], "#14080c", [-0.1, 0.04, 0.2]));
    head.add(P("cyl", [0.7, 0.06, 0.5], "#14283a", [0, 0.24, 0]));
    head.add(P("cone", [0.5, 0.3, 0.4], "#14283a", [0, 0.4, 0]));
    head.add(P("sphere", [0.12, 0.08, 0.04], "#e0b15a", [0, 0.28, 0.24]));
    body.add(head);
    arms("#1c3a5a", "#e0b890");
    parts.armR!.add(P("cyl", [0.05, 0.9, 0.05], "#c9d2dc", [0, -0.5, 0.2], [0.4, 0, 0]));
    parts.armL!.add(P("cone", [0.08, 0.3, 0.08], "#c9d2dc", [0, -0.6, 0.0], [Math.PI, 0, 0.5]));
    for (let i = 0; i < 5; i++) body.add(P("sphere", [0.08, 0.06, 0.08], "#a8c0b0", [-0.4 + i * 0.2, 0.7, -0.3]));
    return;
  }
  if (world === 8) {
    // Arcanjo
    body.add(P("cone", [0.92, 1.0, 0.8], "#f4f0ff", [0, 0.5, 0]));
    body.add(P("cyl", [0.94, 0.06, 0.82], "#ffe27a", [0, 0.03, 0]));
    body.add(P("cube", [0.18, 0.7, 0.04], "#ffe27a", [0, 0.5, 0.4]));
    const head = G(0, 0.88, 0.02);
    head.add(P("sphere", [0.42, 0.42, 0.38], "#fbe4d0"));
    head.add(P("sphere", [0.46, 0.3, 0.42], "#ffe27a", [0, 0.1, -0.04]));
    eyesG(head, "#ffffff");
    head.add(glow(P("ring", [0.7, 0.05, 0.7], "#ffe27a", [0, 0.56, 0]), 1));
    parts.halo = head.kids[head.kids.length - 1]!;
    body.add(head);
    arms("#f4f0ff", "#fbe4d0");
    for (const sx of [-1, 1]) {
      const wing = G(sx * 0.3, 0.7, -0.24);
      for (let i = 0; i < 4; i++) wing.add(P("cube", [0.7 - i * 0.1, 0.1, 0.03], i % 2 ? "#ffe27a" : "#ffffff", [sx * (0.4 + i * 0.05), 0.24 - i * 0.16, 0], [0, 0, sx * (0.5 - i * 0.12)]));
      body.add(wing);
      parts[sx < 0 ? "wingL" : "wingR"] = wing;
    }
    parts.armR!.add(glow(P("cube", [0.08, 1.0, 0.08], "#fff6c0", [0, -0.6, 0.2]), 1));
    parts.armR!.add(P("cube", [0.3, 0.06, 0.1], "#ffe27a", [0, -0.2, 0.2]));
    return;
  }
  // 9: O Empresário
  body.add(P("cyl", [0.78, 0.9, 0.56], "#1a1620", [0, 0.5, 0]));
  body.add(P("cube", [0.2, 0.56, 0.04], "#f4efe4", [0, 0.6, 0.29]));
  body.add(P("cube", [0.1, 0.4, 0.05], "#c4373a", [0, 0.56, 0.32]));
  body.add(P("cyl", [0.8, 0.06, 0.58], "#e0b15a", [0, 0.1, 0]));
  for (const sx of [-1, 1]) {
    const leg = G(sx * 0.2, 0.18, 0);
    leg.add(P("cyl", [0.22, 0.18, 0.22], "#1a1620", [0, -0.09, 0]));
    leg.add(P("cube", [0.26, 0.1, 0.44], "#14080c", [0, -0.18, 0.08]));
    body.add(leg);
    parts[sx < 0 ? "legL" : "legR"] = leg;
  }
  const head = G(0, 0.98, 0.02);
  head.add(P("sphere", [0.46, 0.46, 0.4], "#e8c4a4"));
  for (const sx of [-1, 1]) {
    head.add(glow(P("cyl", [0.12, 0.03, 0.12], "#ffd24a", [sx * 0.1, 0.04, 0.2], [Math.PI / 2, 0, 0]), 1));
  }
  head.add(P("sphere", [0.3, 0.07, 0.05], "#fff8f0", [0, -0.12, 0.2]));
  head.add(P("cyl", [0.7, 0.06, 0.52], "#14080c", [0, 0.25, 0]));
  head.add(P("cyl", [0.42, 0.5, 0.4], "#14080c", [0, 0.5, 0]));
  head.add(P("cyl", [0.44, 0.08, 0.42], "#ffd24a", [0, 0.34, 0]));
  body.add(head);
  arms("#1a1620", "#f4efe4");
  parts.armR!.add(P("cube", [0.4, 0.3, 0.14], "#6b4a2f", [0, -0.64, 0.16]));
  parts.armR!.add(P("cube", [0.1, 0.06, 0.16], "#ffd24a", [0, -0.5, 0.16]));
  for (let i = 0; i < 4; i++) {
    const pg = P("cube", [0.22, 0.3, 0.015], "#f4efe4", [Math.cos(i * 1.57) * 0.7, 0.9 + (i % 2) * 0.1, Math.sin(i * 1.57) * 0.3], [0, i, 0.2]);
    pg.ink = false;
    parts["page" + i] = pg;
    body.add(pg);
  }
  for (let i = 0; i < 3; i++) body.add(glow(P("cyl", [0.14, 0.03, 0.14], "#ffd24a", [-0.6 + i * 0.6, 0.2, 0.4], [Math.PI / 2, 0, 0]), 0.9));
}

function buildBoss(body: Node, parts: Record<string, Node>, world: number) {
  if (world >= 5) {
    buildBoss2(body, parts, world);
    return;
  }
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
  if (kind === "hero") return (charAsset() && buildSkinHero(hero)) || buildHero(hero);
  const FALLBACK: Partial<Record<Kind, Kind>> = { demon: "imp", devil: "imp", ogre: "troll", seraph: "cherub", knight: "skel" };
  return (charAsset() && buildSkinMonster(kind)) || buildEnemy(FALLBACK[kind] ?? kind, world);
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
  if (model.skin) drawSkinModel(e, model.skin, world, st, pass, drawNode);
}

export const INK_COLOR = INK;
