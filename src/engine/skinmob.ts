import { hex, type Mat4, type Vec3 } from "./gl";
import { G, glow, mix, P, type Model, type Node, type Pose } from "./models";
import { makeFeatherWing, makeWing, poseWing, type WingRig } from "./gearparts";
import { charAsset, SkinRig, type CharAsset } from "./skin";
import { rinvOf, type Mount, type SkinPart } from "./skinhero";
import type { Kind } from "../game/types";

/* Monstros humanoides com esqueleto: o mesmo manequim animado dos heróis (UAL, CC0),
   pintado por região e com peças presas aos ossos (chifres, asas, chapéus, clavas…).
   Unidades em metros do rig (manequim ~1,83 de altura). */

type Style = "walk" | "zombie" | "stomp" | "hover";

type Look = {
  skin: string;
  torso: string;
  arm?: string;
  pants: string;
  shoe: string;
  /** largura / altura do modelo em relação ao padrão */
  scale: [number, number];
  style: Style;
  /** o monstro dispara/lança: usa a animação de feitiço */
  caster?: boolean;
  rate?: number;
  build: (k: Kit) => void;
};

type Kit = {
  add: (bone: string, n: Node) => Node;
  eyes: (color: string, size?: number, y?: number) => void;
  tick: (f: (t: number, p: Pose) => void) => void;
};

const H = "DEF-head";
const S3 = "DEF-spine.003";
const HIP = "DEF-hips";
const side = (sx: number) => (sx > 0 ? "L" : "R");

/** asas de dragão/demônio articuladas (ossos com espinhos e membrana recortada) */
function batWings(k: Kit, col: string, rib: string, span = 0.9, speed = 4, amp = 0.18) {
  demonWings(k, { bone: mix(col, "#000000", 0.5), memb: col, memb2: mix(col, "#000000", 0.3), claw: rib, spikes: rib }, span * 1.25, speed * 0.8, Math.max(0.1, amp * 1.8));
}

function demonWings(k: Kit, o: { bone: string; memb: string; memb2: string; claw?: string; spikes?: string }, span = 1.1, speed = 3, amp = 0.2, fingers = 4) {
  const rigs: WingRig[] = [];
  for (const sx of [-1, 1]) {
    const wg = makeWing(sx, { bone: o.bone, memb: o.memb, memb2: o.memb2, claw: o.claw, span, fingers, spikes: o.spikes, boneT: 1.1, thick: 0.03 });
    k.add(S3, wg.root);
    rigs.push(wg);
  }
  k.tick((t, p) => {
    for (const wg of rigs) poseWing(wg, t, speed * (1 + p.speed * 0.25), amp, p.phase + (wg.sx > 0 ? 0.14 : 0), 0.05, p.speed);
  });
}

/** asas de anjo: penas em camadas */
function featherWings(k: Kit, col: string, speed = 9, span = 1, amp = 0.32, shade = "#e8f0ff") {
  const rigs: WingRig[] = [];
  for (const sx of [-1, 1]) {
    const wg = makeFeatherWing(sx, { main: col, shade, edge: undefined, span });
    k.add(S3, wg.root);
    rigs.push(wg);
  }
  k.tick((t, p) => {
    for (const wg of rigs) poseWing(wg, t, speed * (1 + p.speed * 0.2), amp, p.phase * 0.5 + (wg.sx > 0 ? 0.12 : 0), 0.05, p.speed);
  });
}

function horns(k: Kit, col: string, len = 0.2, spread = 0.1, tilt = 0.3) {
  for (const sx of [-1, 1]) k.add(H, P("cone", [0.07, len, 0.07], col, [sx * spread, 0.25, 0.0], [0, 0, -sx * tilt]));
}

const LOOKS: Partial<Record<Kind, Look>> = {
  imp: {
    skin: "#cf4048",
    torso: "#b8323a",
    pants: "#8c2430",
    shoe: "#3a1014",
    scale: [1.25, 1.3],
    style: "walk",
    rate: 1.5,
    build(k) {
      horns(k, "#f4e4c8", 0.22, 0.1, 0.35);
      k.eyes("#ffd34a", 1.25);
      demonWings(k, { bone: "#2a0a12", memb: "#8a1a2e", memb2: "#5a1020", claw: "#f4e4c8", spikes: "#f4e4c8" }, 0.85, 7, 0.34);
      const tail = G(0, 0.02, -0.1);
      tail.add(P("cone", [0.09, 0.5, 0.09], "#8c2430", [0, -0.1, -0.18], [-1.1, 0, 0]));
      tail.add(P("cone", [0.14, 0.14, 0.05], "#cf4048", [0, -0.2, -0.42], [-1.1, 0, 0]));
      k.add(HIP, tail);
      k.tick((t) => (tail.rot[2] = Math.sin(t * 8) * 0.35));
    },
  },
  skel: {
    skin: "#efe8d8",
    torso: "#e6dfcc",
    pants: "#e0d9c4",
    shoe: "#cfc7b2",
    scale: [1.05, 1.1],
    style: "walk",
    rate: 1.1,
    build(k) {
      k.add(H, P("sphere", [0.26, 0.24, 0.27], "#efe8d8", [0, 0.14, 0]));
      for (const sx of [-1, 1]) k.add(H, P("sphere", [0.06, 0.07, 0.04], "#14080c", [sx * 0.055, 0.125, 0.105]));
      k.eyes("#ff7a2a", 0.55, 0.125);
      k.add(H, P("cube", [0.14, 0.05, 0.1], "#e6dfcc", [0, 0.045, 0.085]));
      for (let i = 0; i < 4; i++) k.add(S3, P("cube", [0.3 - i * 0.02, 0.018, 0.06], "#2a2018", [0, 0.1 - i * 0.07, 0.115]));
      // espada enferrujada
      const sw = G();
      sw.add(P("cube", [0.05, 0.5, 0.012], "#8a7a62", [0, 0.28, 0]));
      sw.add(P("cube", [0.16, 0.035, 0.05], "#5a3a22", [0, 0.02, 0]));
      sw.rot = [Math.PI / 2, 0.4, 0];
      k.add("DEF-hand.R", sw);
    },
  },
  witch: {
    skin: "#7aa86a",
    torso: "#3a2a5a",
    pants: "#2a1a44",
    shoe: "#1a1224",
    scale: [1, 1],
    style: "walk",
    caster: true,
    build(k) {
      k.add(H, P("sphere", [0.27, 0.25, 0.28], "#2a1a38", [0, 0.15, -0.03]));
      k.add(H, P("cyl", [0.46, 0.03, 0.46], "#1a1224", [0, 0.235, 0]));
      k.add(H, P("cone", [0.27, 0.46, 0.27], "#1a1224", [0, 0.44, -0.03], [-0.15, 0, 0]));
      k.add(H, P("cyl", [0.272, 0.05, 0.272], "#c4373a", [0, 0.27, -0.005]));
      k.add(H, P("cone", [0.045, 0.14, 0.045], "#6a9a5a", [0, 0.085, 0.14], [Math.PI / 2 + 0.3, 0, 0]));
      k.eyes("#ffe45a", 0.9);
      k.add(HIP, P("cone", [0.52, 0.62, 0.42], "#2a1a44", [0, -0.2, 0.0]));
      const bw = G();
      bw.add(P("cyl", [0.035, 1.1, 0.035], "#6b4a2f", [0, 0.1, 0]));
      bw.add(P("cone", [0.2, 0.34, 0.2], "#d9a830", [0, -0.5, 0], [Math.PI, 0, 0]));
      bw.rot = [0.2, 0, 1.2];
      k.add("DEF-hand.L", bw);
    },
  },
  undead: {
    skin: "#8ab08a",
    torso: "#4a5a3a",
    pants: "#3a3a2a",
    shoe: "#2a2418",
    scale: [1.15, 1.15],
    style: "zombie",
    rate: 0.8,
    build(k) {
      k.eyes("#ff5a4a", 0.9);
      k.add(H, P("cube", [0.2, 0.04, 0.03], "#3a1a1a", [0, 0.05, 0.11]));
      k.add(S3, P("cube", [0.2, 0.2, 0.03], "#3a3a2a", [-0.06, 0.05, 0.12], [0, 0, 0.2]));
      k.add("DEF-thigh.L", P("cube", [0.1, 0.16, 0.03], "#2a2a20", [0, -0.1, 0.07]));
      k.add(H, P("sphere", [0.2, 0.12, 0.2], "#2a2218", [0.0, 0.2, -0.04]));
    },
  },
  golem: {
    skin: "#8a8d96",
    torso: "#7a7d86",
    pants: "#6a6d76",
    shoe: "#50535c",
    scale: [1.7, 1.5],
    style: "stomp",
    rate: 0.7,
    build(k) {
      k.eyes("#ff9a2a", 1.5);
      for (const sx of [-1, 1]) {
        k.add(`DEF-upper_arm.${side(sx)}`, P("sphere", [0.26, 0.2, 0.26], "#8a8d96", [-sx * 0.06, 0.07, 0]));
        k.add(`DEF-forearm.${side(sx)}`, P("cube", [0.2, 0.24, 0.2], "#6a6d76", [-sx * 0.12, 0.0, 0]));
      }
      k.add(S3, P("cube", [0.3, 0.3, 0.08], "#6a6d76", [0, 0.05, 0.1]));
      k.add(S3, glow(P("cube", [0.1, 0.16, 0.03], "#ff7a2a", [0, 0.06, 0.15]), 1));
      k.add(H, P("cube", [0.28, 0.12, 0.26], "#8a8d96", [0, 0.2, 0]));
      k.add(S3, P("sphere", [0.18, 0.08, 0.14], "#4a7a3a", [0.1, 0.17, -0.04]));
    },
  },
  troll: {
    skin: "#6a8a4a",
    torso: "#6b4a2f",
    pants: "#4a3a2a",
    shoe: "#2a2018",
    scale: [1.55, 1.6],
    style: "stomp",
    rate: 0.75,
    build(k) {
      k.eyes("#ffd34a", 0.9);
      for (const sx of [-1, 1]) k.add(H, P("cone", [0.045, 0.12, 0.04], "#f4efe4", [sx * 0.07, 0.075, 0.11], [0.2, 0, sx * 0.25]));
      k.add(H, P("cone", [0.05, 0.1, 0.05], "#5a7a3a", [0, 0.1, 0.13], [Math.PI / 2, 0, 0]));
      for (const sx of [-1, 1]) k.add(H, P("cone", [0.06, 0.08, 0.04], "#6a8a4a", [sx * 0.14, 0.13, 0], [0, 0, -sx * 1.4]));
      const club = G();
      club.add(P("cyl", [0.07, 0.8, 0.07], "#6b4a2f", [0, 0.28, 0]));
      club.add(P("sphere", [0.2, 0.3, 0.2], "#5a3a22", [0, 0.72, 0]));
      for (let i = 0; i < 5; i++) club.add(P("cone", [0.04, 0.08, 0.04], "#c9c2b0", [Math.cos(i * 1.3) * 0.1, 0.72 + Math.sin(i * 2.1) * 0.1, Math.sin(i * 1.3) * 0.1], [Math.sin(i * 1.3) * 1.4, 0, -Math.cos(i * 1.3) * 1.4]));
      club.rot = [Math.PI / 2 + 0.2, 0.3, 0];
      k.add("DEF-hand.R", club);
      k.add(HIP, P("cyl", [0.34, 0.14, 0.26], "#4a3a2a", [0, 0.0, 0.0]));
    },
  },
  mummy: {
    skin: "#d8cfae",
    torso: "#d4cba8",
    pants: "#cfc6a2",
    shoe: "#bfb592",
    scale: [1.1, 1.12],
    style: "zombie",
    rate: 0.75,
    build(k) {
      k.add(H, P("sphere", [0.265, 0.235, 0.28], "#d8cfae", [0, 0.145, -0.01]));
      for (let i = 0; i < 3; i++) k.add(H, P("cyl", [0.275, 0.02, 0.29], "#b9ad88", [0, 0.07 + i * 0.07, -0.01], [0.1 - i * 0.1, 0, 0.2 - i * 0.2]));
      k.eyes("#7aff9a", 0.9, 0.12);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) k.add(`DEF-upper_arm.${side(sx)}`, P("cyl", [0.12, 0.02, 0.12], "#b9ad88", [-sx * (0.03 + i * 0.1), 0, 0], [0, 0, Math.PI / 2]));
      for (let i = 0; i < 3; i++) k.add(S3, P("cube", [0.34, 0.02, 0.2], "#b9ad88", [0, -0.02 + i * 0.1, 0.0], [0, 0, 0.1 - i * 0.1]));
      k.add(S3, P("cube", [0.03, 0.26, 0.02], "#c8bf9a", [0.1, -0.1, 0.1], [0.3, 0, 0.1]));
    },
  },
  clerk: {
    skin: "#d8c0a0",
    torso: "#2a2e3a",
    pants: "#1e2230",
    shoe: "#0e0e12",
    scale: [0.95, 1],
    style: "walk",
    caster: true,
    build(k) {
      k.add(H, P("sphere", [0.255, 0.18, 0.27], "#2a2018", [0, 0.185, -0.015]));
      for (const sx of [-1, 1]) k.add(H, P("ring", [0.075, 0.05, 0.075], "#d9a830", [sx * 0.05, 0.12, 0.12], [Math.PI / 2, 0, 0]));
      k.eyes("#2a1a14", 0.6, 0.12);
      k.add(S3, P("cube", [0.05, 0.22, 0.02], "#c4373a", [0, 0.02, 0.13]));
      k.add(S3, P("cube", [0.1, 0.08, 0.02], "#f4efe4", [0, 0.14, 0.125]));
      const pad = G();
      pad.add(P("cube", [0.2, 0.28, 0.02], "#f4efe4", [0, 0.1, 0]));
      pad.add(P("cube", [0.16, 0.02, 0.025], "#c4373a", [0, 0.16, 0.01]));
      pad.rot = [0.3, 0, 0];
      k.add("DEF-hand.L", pad);
    },
  },
  yeti: {
    skin: "#e8f0f8",
    torso: "#e0eaf4",
    pants: "#d8e4f0",
    shoe: "#bcd0e4",
    scale: [1.8, 1.65],
    style: "stomp",
    rate: 0.75,
    build(k) {
      k.add(H, P("sphere", [0.3, 0.27, 0.3], "#e8f0f8", [0, 0.15, -0.01]));
      k.add(H, P("sphere", [0.2, 0.15, 0.06], "#4a5a6a", [0, 0.1, 0.12]));
      k.eyes("#8fe4ff", 0.9, 0.12);
      for (const sx of [-1, 1]) k.add(H, P("cone", [0.07, 0.2, 0.07], "#c9d9e8", [sx * 0.12, 0.26, 0], [0, 0, -sx * 0.4]));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        k.add(S3, P("cone", [0.12, 0.2, 0.1], i % 2 ? "#d8e4f0" : "#f4faff", [Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.14], [Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0]));
      }
      k.add(S3, P("cube", [0.2, 0.18, 0.04], "#d8e4f0", [0, 0.05, 0.13]));
      for (const sx of [-1, 1]) k.add(`DEF-hand.${side(sx)}`, P("sphere", [0.15, 0.13, 0.15], "#e8f0f8", [-sx * 0.09, 0, 0]));
    },
  },
  cherub: {
    skin: "#f0d0b8",
    torso: "#fff2c0",
    pants: "#fff2c0",
    shoe: "#f0d0b8",
    scale: [0.8, 1],
    style: "hover",
    caster: true,
    build(k) {
      featherWings(k, "#ffffff");
      const halo = P("ring", [0.28, 0.1, 0.28], "#ffd34a", [0, 0.4, 0]);
      glow(halo, 1);
      k.add(H, halo);
      k.add(H, P("sphere", [0.265, 0.24, 0.28], "#e8c050", [0, 0.15, -0.01]));
      k.eyes("#3a2a80", 0.9);
      k.add(S3, P("cone", [0.1, 0.08, 0.06], "#ffb0b0", [0.0, 0.0, 0.14], [Math.PI, 0, 0]));
    },
  },
  gargoyle: {
    skin: "#6a6d78",
    torso: "#60636e",
    pants: "#555864",
    shoe: "#3a3c46",
    scale: [1.5, 1.5],
    style: "hover",
    rate: 0.9,
    build(k) {
      horns(k, "#3a3c46", 0.28, 0.1, 0.5);
      k.eyes("#ff4a6a", 1.1);
      batWings(k, "#50535e", "#3a3c46", 1.1, 6, 0.22);
      for (const sx of [-1, 1]) k.add(`DEF-hand.${side(sx)}`, P("cone", [0.04, 0.12, 0.04], "#2a2c34", [-sx * 0.12, 0, 0.03], [0, 0, sx * -Math.PI / 2]));
      k.add(H, P("cone", [0.08, 0.12, 0.06], "#50535e", [0, 0.07, 0.14], [Math.PI / 2, 0, 0]));
      const tail = G(0, 0.0, -0.1);
      tail.add(P("cone", [0.1, 0.5, 0.1], "#50535e", [0, -0.1, -0.2], [-1.0, 0, 0]));
      k.add(HIP, tail);
      k.tick((t) => (tail.rot[2] = Math.sin(t * 3) * 0.2));
    },
  },
  jester: {
    skin: "#e8d4c0",
    torso: "#c4373a",
    arm: "#2a6ac0",
    pants: "#2a6ac0",
    shoe: "#d9a830",
    scale: [1.2, 1.2],
    style: "walk",
    rate: 1.2,
    build(k) {
      const bells: Node[] = [];
      for (const sx of [-1, 1]) {
        const arm = G(sx * 0.1, 0.24, 0);
        arm.add(P("cone", [0.14, 0.34, 0.14], sx > 0 ? "#c4373a" : "#2a6ac0", [sx * 0.05, 0.12, 0], [0, 0, -sx * 0.9]));
        const b = P("sphere", [0.07, 0.07, 0.07], "#ffd34a", [sx * 0.3, 0.26, 0]);
        glow(b, 0.4);
        arm.add(b);
        bells.push(arm);
        k.add(H, arm);
      }
      k.tick((t, p) => {
        bells[0]!.rot[2] = Math.sin(t * 8 + p.phase) * 0.18;
        bells[1]!.rot[2] = -Math.sin(t * 8 + p.phase) * 0.18;
      });
      k.add(H, P("cyl", [0.27, 0.05, 0.27], "#d9a830", [0, 0.2, 0]));
      k.eyes("#2a1a14", 0.8, 0.12);
      k.add(H, P("cone", [0.04, 0.03, 0.03], "#c4373a", [0, 0.07, 0.125], [Math.PI / 2, 0, 0]));
      k.add(H, P("sphere", [0.05, 0.04, 0.03], "#c4373a", [0, 0.055, 0.115]));
      k.add("DEF-neck", P("ring", [0.3, 0.1, 0.3], "#f4efe4", [0, -0.01, 0]));
      k.add(S3, P("cube", [0.3, 0.3, 0.02], "#2a6ac0", [0, 0.03, 0.12], [0, 0, 0.7]));
    },
  },
  dryad: {
    skin: "#8ac070",
    torso: "#3a6a38",
    pants: "#2a5a30",
    shoe: "#4a3a20",
    scale: [1.1, 1.2],
    style: "walk",
    caster: true,
    build(k) {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        k.add(H, P("cone", [0.09, 0.22, 0.05], i % 2 ? "#4a9a50" : "#6ab060", [Math.cos(a) * 0.17, 0.22, Math.sin(a) * 0.15], [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8]));
      }
      k.add(H, P("sphere", [0.24, 0.12, 0.26], "#3a6a38", [0, 0.22, -0.02]));
      k.add(H, glow(P("sphere", [0.06, 0.06, 0.04], "#ff9acb", [0.1, 0.27, 0.06]), 0.4));
      k.eyes("#ffe45a", 0.8);
      for (const sx of [-1, 1]) k.add(`DEF-upper_arm.${side(sx)}`, P("cone", [0.07, 0.16, 0.03], "#4a9a50", [-sx * 0.08, 0.08, 0], [0, 0, sx * 1.2]));
      k.add(HIP, P("cone", [0.44, 0.4, 0.34], "#2a5a30", [0, -0.1, 0]));
      const staff = G();
      staff.add(P("cyl", [0.035, 1.0, 0.035], "#6b4a2f", [0, 0.2, 0]));
      staff.add(glow(P("sphere", [0.12, 0.12, 0.12], "#9aff7a", [0, 0.75, 0]), 0.9));
      staff.rot = [Math.PI / 2 - 0.2, 0.2, 0];
      k.add("DEF-hand.R", staff);
    },
  },
  demon: {
    skin: "#8a1a2a",
    torso: "#6a1222",
    arm: "#7a1626",
    pants: "#3a0a14",
    shoe: "#1a0508",
    scale: [1.5, 1.55],
    style: "stomp",
    rate: 0.95,
    build(k) {
      // chifres grandes curvos + pequenos
      for (const sx of [-1, 1]) {
        k.add(H, P("cone", [0.09, 0.34, 0.09], "#2a1014", [sx * 0.1, 0.27, -0.02], [0.3, 0, -sx * 0.45]));
        k.add(H, P("cone", [0.06, 0.22, 0.06], "#2a1014", [sx * 0.2, 0.36, -0.08], [0.5, 0, sx * 0.2]));
        k.add(H, P("cone", [0.045, 0.12, 0.045], "#e8dfc8", [sx * 0.05, -0.02, 0.12], [Math.PI, 0, 0]));
      }
      k.eyes("#ffb02a", 1.5);
      k.add(H, glow(P("sphere", [0.12, 0.05, 0.03], "#ff6a1a", [0, 0.05, 0.13]), 0.9));
      demonWings(k, { bone: "#1a0508", memb: "#a01a2e", memb2: "#6a1224", claw: "#f0e0c0", spikes: "#f0e0c0" }, 1.2, 2.4, 0.16, 5);
      for (const sx of [-1, 1]) {
        k.add(`DEF-upper_arm.${side(sx)}`, P("cone", [0.07, 0.16, 0.07], "#2a1014", [-sx * 0.06, 0.1, 0], [0, 0, -sx * 0.5]));
        k.add(`DEF-hand.${side(sx)}`, P("cone", [0.035, 0.12, 0.035], "#e8dfc8", [-sx * 0.12, 0, 0.03], [0, 0, sx * -Math.PI / 2]));
        k.add(`DEF-hand.${side(sx)}`, P("cone", [0.035, 0.12, 0.035], "#e8dfc8", [-sx * 0.12, 0, -0.03], [0, 0, sx * -Math.PI / 2]));
      }
      for (let i = 0; i < 3; i++) k.add(S3, glow(P("plate", [0.14 - i * 0.02, 0.02, 0.02], "#ff5a1a", [0, 0.1 - i * 0.07, 0.125]), 0.8));
      const tail = G(0, 0.0, -0.1);
      tail.add(P("cone", [0.1, 0.62, 0.1], "#6a1222", [0, -0.12, -0.26], [-1.05, 0, 0]));
      tail.add(P("cone", [0.2, 0.2, 0.05], "#2a1014", [0, -0.3, -0.58], [-1.05, 0, 0]));
      k.add(HIP, tail);
      k.tick((t) => (tail.rot[2] = Math.sin(t * 3.2) * 0.3));
    },
  },
  devil: {
    skin: "#d23a2a",
    torso: "#b82a22",
    pants: "#7a1818",
    shoe: "#2a0c0c",
    scale: [1.25, 1.3],
    style: "walk",
    caster: true,
    rate: 1.1,
    build(k) {
      horns(k, "#2a1014", 0.24, 0.09, 0.3);
      k.eyes("#ffe02a", 1.3);
      k.add(H, P("cone", [0.06, 0.12, 0.05], "#3a1014", [0, -0.05, 0.11], [Math.PI, 0, 0]));
      demonWings(k, { bone: "#2a0a12", memb: "#7a1620", memb2: "#4a0e18", claw: "#e8dfc8" }, 0.7, 5, 0.25);
      const fork = G();
      fork.add(P("cyl", [0.035, 1.15, 0.035], "#3a2a22", [0, 0.2, 0]));
      fork.add(P("cube", [0.2, 0.03, 0.03], "#c9c2b0", [0, 0.72, 0]));
      for (const x of [-0.09, 0, 0.09]) fork.add(P("cone", [0.04, 0.2, 0.04], "#d9d2c0", [x, 0.84, 0]));
      fork.rot = [Math.PI / 2 - 0.15, 0.1, 0];
      k.add("DEF-hand.R", fork);
      const tail = G(0, 0.0, -0.1);
      tail.add(P("cone", [0.08, 0.5, 0.08], "#7a1818", [0, -0.1, -0.2], [-1.0, 0, 0]));
      tail.add(P("cone", [0.16, 0.16, 0.04], "#d23a2a", [0, -0.24, -0.44], [-1.0, 0, 0]));
      k.add(HIP, tail);
      k.tick((t) => (tail.rot[2] = Math.sin(t * 7) * 0.4));
      k.add(S3, P("cone", [0.1, 0.12, 0.05], "#2a1014", [0, -0.02, 0.12], [Math.PI, 0, 0]));
    },
  },
  ogre: {
    skin: "#7a8a4a",
    torso: "#5a4a30",
    arm: "#7a8a4a",
    pants: "#4a3a28",
    shoe: "#2a2014",
    scale: [1.75, 1.6],
    style: "stomp",
    rate: 0.7,
    build(k) {
      k.eyes("#ff4a2a", 0.9);
      for (const sx of [-1, 1]) {
        k.add(H, P("cone", [0.05, 0.14, 0.05], "#f0ead8", [sx * 0.065, 0.0, 0.11], [Math.PI, 0.2, sx * 0.2]));
        k.add(H, P("cone", [0.05, 0.1, 0.05], "#7a8a4a", [sx * 0.15, 0.1, 0], [0, 0, -sx * 1.4]));
      }
      k.add(H, P("sphere", [0.26, 0.1, 0.2], "#4a3a28", [0, 0.2, -0.02]));
      k.add(S3, P("sphere", [0.4, 0.3, 0.3], "#7a8a4a", [0, 0.0, 0.05]));
      k.add(HIP, P("cyl", [0.4, 0.14, 0.3], "#3a2a1a", [0, 0.02, 0]));
      k.add(HIP, P("plate", [0.14, 0.3, 0.03], "#6a5238", [0, -0.12, 0.17]));
      for (const sx of [-1, 1]) k.add(`DEF-upper_arm.${side(sx)}`, P("hemi", [0.24, 0.16, 0.24], "#4a3a28", [-sx * 0.06, 0.05, 0]));
      const club = G();
      club.add(P("cyl", [0.08, 0.9, 0.08], "#6b4a2f", [0, 0.3, 0]));
      club.add(P("sphere", [0.26, 0.4, 0.26], "#5a3a22", [0, 0.82, 0]));
      for (let i = 0; i < 6; i++) club.add(P("cone", [0.05, 0.1, 0.05], "#c9c2b0", [Math.cos(i * 1.1) * 0.12, 0.82 + Math.sin(i * 2.3) * 0.14, Math.sin(i * 1.1) * 0.12], [Math.sin(i * 1.1) * 1.4, 0, -Math.cos(i * 1.1) * 1.4]));
      club.rot = [Math.PI / 2 + 0.2, 0.3, 0];
      k.add("DEF-hand.R", club);
    },
  },
  seraph: {
    skin: "#f0d4b8",
    torso: "#f4f0e0",
    arm: "#e8e0c8",
    pants: "#f4f0e0",
    shoe: "#e8d090",
    scale: [1.3, 1.4],
    style: "hover",
    caster: true,
    rate: 1,
    build(k) {
      featherWings(k, "#ffffff", 5.5, 1.35, 0.3, "#e4ecff");
      const halo = glow(P("ring", [0.34, 0.1, 0.34], "#ffd34a", [0, 0.42, 0]), 1);
      k.add(H, halo);
      k.add(H, P("sphere", [0.27, 0.22, 0.28], "#e8c050", [0, 0.15, -0.02]));
      k.eyes("#ff4a3a", 1);
      k.add(S3, P("plate", [0.34, 0.26, 0.08], "#d8dce8", [0, 0.05, 0.1]));
      k.add(S3, glow(P("gem", [0.06, 0.08, 0.04], "#ffd34a", [0, 0.07, 0.15]), 1));
      for (const sx of [-1, 1]) k.add(`DEF-upper_arm.${side(sx)}`, P("hemi", [0.2, 0.12, 0.2], "#d8dce8", [-sx * 0.06, 0.04, 0]));
      const spear = G();
      spear.add(P("cyl", [0.03, 1.2, 0.03], "#e8d090", [0, 0.2, 0]));
      spear.add(glow(P("blade", [0.1, 0.34, 0.03], "#fff2b0", [0, 0.9, 0]), 0.7));
      spear.rot = [Math.PI / 2 - 0.1, 0, 0];
      k.add("DEF-hand.R", spear);
    },
  },
  knight: {
    skin: "#e8e0cc",
    torso: "#6a6e7a",
    arm: "#7a7e8a",
    pants: "#5a5e6a",
    shoe: "#3a3c46",
    scale: [1.25, 1.3],
    style: "walk",
    rate: 0.85,
    build(k) {
      k.add(H, P("hemi", [0.3, 0.2, 0.3], "#8a8e9a", [0, 0.12, -0.005]));
      k.add(H, P("plate", [0.26, 0.05, 0.05], "#14080c", [0, 0.1, 0.14]));
      k.add(H, P("shard", [0.05, 0.16, 0.3], "#c4373a", [0, 0.32, -0.02]));
      k.eyes("#ff5a3a", 0.7, 0.1);
      k.add(S3, P("plate", [0.36, 0.28, 0.1], "#7a7e8a", [0, 0.05, 0.095]));
      k.add(S3, P("plate", [0.12, 0.2, 0.03], "#c4373a", [0, 0.06, 0.15]));
      for (const sx of [-1, 1]) {
        k.add(`DEF-upper_arm.${side(sx)}`, P("hemi", [0.22, 0.14, 0.21], "#8a8e9a", [-sx * 0.06, 0.035, 0]));
        k.add(`DEF-shin.${side(sx)}`, P("plate", [0.13, 0.3, 0.06], "#7a7e8a", [0, -0.2, 0.065]));
      }
      k.add(HIP, P("shard", [0.22, 0.4, 0.04], "#c4373a", [0, -0.2, -0.15], [-0.15, 0, 0]));
      const sw = G();
      sw.add(P("blade", [0.12, 1.0, 0.03], "#b8bcc8", [0, 0.58, 0]));
      sw.add(P("plate", [0.36, 0.06, 0.09], "#5a5e6a", [0, 0.06, 0]));
      sw.add(P("cyl", [0.04, 0.2, 0.04], "#4a3024", [0, -0.06, 0]));
      sw.rot = [Math.PI / 2, 0.4, 0];
      k.add("DEF-hand.R", sw);
      const sh = G();
      sh.add(P("cyl", [0.42, 0.04, 0.42], "#6a6e7a", [0, 0, 0], [Math.PI / 2, 0, 0]));
      sh.add(P("hemi", [0.12, 0.07, 0.12], "#c4373a", [0, 0, 0.03], [Math.PI / 2, 0, 0]));
      sh.pos = [-0.04, 0, 0.12];
      k.add("DEF-forearm.L", sh);
    },
  },
};

export function hasSkinMonster(kind: Kind) {
  return Boolean(LOOKS[kind]) && charAsset() !== null;
}

const CLIP = {
  idle: "Idle_Loop",
  walk: "Walk_Loop",
  jog: "Jog_Fwd_Loop",
  run: "Sprint_Loop",
  jumpStart: "Jump_Start",
  jumpLoop: "Jump_Loop",
  hit: "Hit_Chest",
  death: "Death01",
  jab: "Punch_Jab",
  cross: "Punch_Cross",
  sword: "Sword_Attack",
  spell: "Spell_Simple_Shoot",
  spellIdle: "Spell_Simple_Idle_Loop",
};

export function buildSkinMonster(kind: Kind): Model | null {
  const a = charAsset();
  const look = LOOKS[kind];
  if (!a || !look) return null;
  const rig = new SkinRig(a, CLIP.idle);
  const J = (name: string) => {
    const j = a.index.get(name);
    if (j === undefined) throw new Error("osso ausente: " + name);
    return j;
  };
  const rinv: Mat4[] = Array.from({ length: a.J }, (_, j) => rinvOf(a, j));
  const mounts: Mount[] = [];
  const ticks: ((t: number, p: Pose) => void)[] = [];
  const kit: Kit = {
    add(bone, n) {
      mounts.push({ joint: J(bone), node: n });
      return n;
    },
    eyes(color, size = 1, y = 0.115) {
      for (const sx of [-1, 1]) {
        const e = P("sphere", [0.042 * size, 0.05 * size, 0.02], color, [sx * 0.05, y, 0.12]);
        glow(e, 1);
        e.ink = false;
        mounts.push({ joint: J(H), node: e });
      }
    },
    tick(f) {
      ticks.push(f);
    },
  };
  look.build(kit);
  const sk: SkinPart = { rig, a, mounts, rinv };
  const root = G();
  const root0 = root;
  const [sw, sh] = look.scale;
  root0.scl = [sw, sh, sw];
  const jSp1 = J("DEF-spine.001");
  const jSp2 = J("DEF-spine.002");
  const jHead = J("DEF-head");
  const jUpL = J("DEF-upper_arm.L");
  const jUpR = J("DEF-upper_arm.R");
  const jFoL = J("DEF-forearm.L");
  const jFoR = J("DEF-forearm.R");
  const jHips = J("DEF-hips");
  const arm = look.arm ?? look.torso;
  const set = (i: number, c: string) => rig.setRegion(i, hex(c));
  set(0, look.skin);
  set(1, look.torso);
  set(2, arm);
  set(3, look.style === "stomp" || kind === "mummy" || kind === "yeti" ? arm : look.skin);
  set(4, look.skin);
  set(5, look.pants);
  set(6, look.pants);
  set(7, kind === "jester" ? "#c4373a" : look.pants);
  set(8, look.shoe);
  let last = -1;
  let hurtPrev = false;
  let atkPrev = 0;
  let busy = 0;
  let alt = 0;
  let dead = false;
  const model: Model = {
    root,
    kind,
    parts: {},
    yaw: Math.PI / 2 - 0.5,
    formNodes: [],
    fly: look.style === "hover",
    skin: sk,
    update(p: Pose) {
      const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, p.t - last));
      last = p.t;
      const sp = p.speed;
      const dy = p.dying ?? 0;
      if (dy > 0 && !dead) {
        dead = true;
        rig.play(CLIP.death, 2.2, 0.05, true, true);
      }
      if (dy <= 0) dead = false;
      if (!dead) {
        if (p.hurt && !hurtPrev) {
          rig.play(CLIP.hit, 1.3, 0.05, true);
          busy = 0.28;
        }
        hurtPrev = p.hurt;
        if (p.attack > 0 && atkPrev <= 0) {
          if (look.caster) rig.play(CLIP.spell, 2.0, 0.05, true);
          else {
            alt ^= 1;
            rig.play(alt ? CLIP.cross : CLIP.jab, 1.7, 0.05, true);
          }
          busy = 0.35;
        }
        atkPrev = p.attack;
        busy = Math.max(0, busy - dt);
        const rate = look.rate ?? 1;
        const air = Math.abs(p.vy) > 90;
        if (busy > 0) {
          // golpe ou dano em andamento
        } else if (look.style === "hover") {
          rig.play(CLIP.idle, 1.1, 0.2);
        } else if (air && look.style !== "stomp") {
          rig.play(p.vy < 0 ? CLIP.jumpStart : CLIP.jumpLoop, 1.4, 0.08);
        } else if (sp > 0.08) {
          rig.playSync(sp > 0.7 && look.style === "walk" ? CLIP.jog : CLIP.walk, (0.7 + sp * 0.7) * rate);
        } else {
          rig.play(CLIP.idle, 0.9 * rate, 0.2);
        }
      }
      rig.advance(dt);
      rig.clearExtras();
      const t = p.t;
      if (!dead) {
        if (look.style === "zombie") {
          // braços à frente, tronco curvado, cabeça caída
          const k = 0.9 + Math.sin(t * 2 + p.phase) * 0.08;
          rig.setExtra(jUpL, 0, 0, -1.0 * k);
          rig.setExtra(jUpR, 0, 0, 1.0 * k);
          rig.setExtra(jFoL, 0, 0.0, 0.0);
          rig.setExtra(jFoR, 0, 0.0, 0.0);
          rig.setExtra(jSp1, 0.14, 0, 0);
          rig.setExtra(jSp2, 0.14, 0, Math.sin(t * 1.7) * 0.05);
          rig.setExtra(jHead, 0.2, Math.sin(t * 1.1) * 0.15, 0);
        } else if (look.style === "stomp") {
          const st = Math.sin(p.phase * 4) * Math.min(1, sp * 2);
          rig.setExtra(jSp1, 0.1 + st * 0.05, 0, st * 0.08);
          rig.setExtra(jSp2, 0.08, 0, -st * 0.08);
          rig.setExtra(jHead, 0.1, 0, 0);
          rig.setExtra(jUpL, 0, 0, 0.18);
          rig.setExtra(jUpR, 0, 0, -0.18);
          rig.setExtra(jHips, 0, st * 0.06, 0);
        } else if (look.style === "hover") {
          rig.setExtra(jSp1, 0.18, 0, 0);
          rig.setExtra(jHead, -0.08, Math.sin(t * 1.4) * 0.12, 0);
          rig.setExtra(jUpL, 0, 0, 0.4 + Math.sin(t * 5) * 0.08);
          rig.setExtra(jUpR, 0, 0, -0.4 - Math.sin(t * 5) * 0.08);
        } else {
          const lean = sp * 0.12;
          rig.setExtra(jSp1, lean * 0.6, 0, 0);
          rig.setExtra(jSp2, lean * 0.6, 0, 0);
          rig.setExtra(jHead, -lean * 0.5 + Math.sin(t * 1.3) * 0.02, Math.sin(t * 0.9) * 0.05, 0);
        }
      }
      rig.solve();
      for (const f of ticks) f(t, p);
    },
  };
  return model;
}

export const _mix = mix;
export type { CharAsset, Vec3 };
