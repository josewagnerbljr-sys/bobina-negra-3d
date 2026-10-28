import { hex, m4, type Engine, type Mat4, type Vec3 } from "./gl";
import { G, glow, mix, Node, P, type DrawState, type GearLook, type GearPiece, type Model, type Pose } from "./models";
import { charAsset, RIG_SCALE, skinMeshFor, SkinRig, type CharAsset } from "./skin";
import { HEROES } from "../game/content";
import type { EquipKey, HeroId } from "../game/types";

/* Heróis com esqueleto: o manequim animado (UAL, CC0) vestido com cores por região
   e peças presas aos ossos (cabelo, chapéu, capa, armadura, arma…). Tudo em metros,
   no referencial da T-pose: x = esquerda do personagem, y = para cima, z = para frente. */

export type Mount = { joint: number; node: Node; form?: boolean };
export type SkinPart = { rig: SkinRig; a: CharAsset; mounts: Mount[]; rinv: Mat4[] };

const sw = m4.create();
const sc = m4.create();
const mw = m4.create();
const tmp = m4.create();
const FA = [0, 0, 0] as Vec3;

export function drawSkinModel(
  e: Engine,
  sk: SkinPart,
  world: Mat4,
  st: DrawState,
  pass: 0 | 1,
  drawNode: (e: Engine, n: Node, parent: Mat4, depth: number, st: DrawState, pass: 0 | 1) => void,
) {
  m4.compose(sc, FA, FA, [RIG_SCALE, RIG_SCALE, RIG_SCALE]);
  m4.mul(sw, world, sc);
  if (pass === 0) {
    e.drawSkin(skinMeshFor(e, sk.a), sw, sk.rig.bones, sk.a.J, sk.rig.region, { color: st.tint ?? [1, 1, 1], emis: st.emis ?? [0, 0, 0], flash: st.flash, alpha: st.alphaMul }, st.ink, st.thick * 0.26);
  }
  for (const m of sk.mounts) {
    if (!m.node.visible) continue;
    const j = m.joint;
    for (let i = 0; i < 16; i++) tmp[i] = sk.rig.world[j * 16 + i]!;
    m4.mul(mw, sw, tmp);
    m4.mul(tmp, mw, sk.rinv[j]!);
    drawNode(e, m.node, tmp, 0, st, pass);
  }
}

const GOLD = "#e8b72e";
const RAR = ["#d8d0c0", "#5fb4ff", "#c07aff", "#ffb23a"];

export function rinvOf(a: CharAsset, j: number): Mat4 {
  const o = j * 16;
  const r = m4.create();
  r[0] = a.inv[o]!;
  r[1] = a.inv[o + 1]!;
  r[2] = a.inv[o + 2]!;
  r[3] = 0;
  r[4] = a.inv[o + 4]!;
  r[5] = a.inv[o + 5]!;
  r[6] = a.inv[o + 6]!;
  r[7] = 0;
  r[8] = a.inv[o + 8]!;
  r[9] = a.inv[o + 9]!;
  r[10] = a.inv[o + 10]!;
  r[11] = 0;
  r[12] = 0;
  r[13] = 0;
  r[14] = 0;
  r[15] = 1;
  return r;
}

function lerpHex(a: string, b: string, k: number) {
  return mix(a, b, k);
}

/** cor do equipamento, levemente puxada para dourado nas raridades altas */
function pieceColor(p: GearPiece) {
  return p.rarity >= 3 ? lerpHex(p.color, GOLD, 0.4) : p.color;
}

type Ctx = {
  a: CharAsset;
  J: (name: string) => number;
};

/** constrói as peças de um item equipado (retorna montagens) */
function buildPiece(ctx: Ctx, slot: EquipKey, p: GearPiece, anim: Anim): Mount[] {
  const out: Mount[] = [];
  const col = pieceColor(p);
  const trim = p.rarity >= 3 ? "#fff2b0" : p.rarity >= 2 ? GOLD : lerpHex(col, "#ffffff", 0.35);
  const rc = RAR[Math.min(3, p.rarity)]!;
  const add = (bone: string, n: Node, form = false) => {
    out.push({ joint: ctx.J(bone), node: n, form });
    return n;
  };
  const sides = [1, -1] as const;
  const side = (sx: number) => (sx > 0 ? "L" : "R");
  if (slot === "helmet") {
    const h = "DEF-head";
    if (p.base === "cap") {
      add(h, P("sphere", [0.265, 0.17, 0.275], col, [0, 0.165, -0.005]));
      add(h, P("cube", [0.2, 0.02, 0.14], trim, [0, 0.145, 0.15]));
    } else if (p.base === "tophat") {
      add(h, P("cyl", [0.17, 0.22, 0.17], col, [0, 0.33, 0]));
      add(h, P("cyl", [0.33, 0.025, 0.33], col, [0, 0.215, 0]));
      add(h, P("cyl", [0.175, 0.04, 0.175], trim, [0, 0.26, 0]));
    } else if (p.base === "hood") {
      add(h, P("sphere", [0.3, 0.3, 0.3], col, [0, 0.13, -0.02]));
      add(h, P("cone", [0.2, 0.28, 0.2], col, [0, 0.14, -0.2], [-1.2, 0, 0]));
    } else if (p.base === "helm") {
      add(h, P("sphere", [0.29, 0.27, 0.3], col, [0, 0.15, -0.005]));
      add(h, P("cube", [0.03, 0.1, 0.3], trim, [0, 0.3, 0]));
      add(h, P("cube", [0.2, 0.025, 0.04], "#14080c", [0, 0.12, 0.14]));
    } else {
      add(h, P("cyl", [0.25, 0.07, 0.25], col, [0, 0.27, 0]));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        add(h, glow(P("cone", [0.06, 0.12, 0.06], trim, [Math.cos(a) * 0.1, 0.35, Math.sin(a) * 0.1]), 0.35));
      }
      add(h, glow(P("sphere", [0.04, 0.04, 0.04], rc, [0, 0.38, 0.1]), 0.8));
    }
  } else if (slot === "necklace") {
    add("DEF-neck", P("ring", [0.2, 0.1, 0.2], trim, [0, -0.01, 0.01]));
    add("DEF-spine.003", glow(P("sphere", [0.05, 0.065, 0.03], col, [0, 0.12, 0.13]), 0.9));
    if (p.rarity > 0) add("DEF-spine.003", glow(P("sphere", [0.02, 0.02, 0.02], rc, [0, 0.12, 0.155]), 1));
  } else if (slot === "armor") {
    const s3 = "DEF-spine.003";
    if (p.base === "plate" || p.base === "cuirass") {
      add(s3, P("cube", [0.34, 0.27, 0.07], col, [0, 0.06, 0.1]));
      add(s3, P("cube", [0.1, 0.22, 0.02], trim, [0, 0.06, 0.14]));
      add("DEF-hips", P("cyl", [0.3, 0.07, 0.22], col, [0, 0.07, 0.02]));
      for (const sx of sides) add(`DEF-upper_arm.${side(sx)}`, P("sphere", [0.2, 0.14, 0.2], col, [-sx * 0.06, 0.06, 0]));
      for (const sx of sides) add(`DEF-upper_arm.${side(sx)}`, P("cone", [0.06, 0.1, 0.06], trim, [-sx * 0.06, 0.15, 0]));
    } else if (p.base === "vest") {
      add(s3, P("cube", [0.07, 0.34, 0.025], trim, [0.07, 0.04, 0.125], [0, 0, 0.35]));
      add(s3, P("cube", [0.07, 0.34, 0.025], trim, [-0.07, 0.04, 0.125], [0, 0, -0.35]));
      add("DEF-hips", P("cyl", [0.3, 0.05, 0.21], "#3a2a20", [0, 0.06, 0.02]));
      add("DEF-hips", P("cube", [0.06, 0.05, 0.03], GOLD, [0, 0.06, 0.125]));
      for (const sx of sides) add(`DEF-upper_arm.${side(sx)}`, P("sphere", [0.15, 0.1, 0.15], col, [-sx * 0.06, 0.05, 0]));
    } else if (p.base === "robe") {
      add("DEF-hips", P("cone", [0.5, 0.74, 0.42], col, [0, -0.28, 0], [Math.PI, 0, 0]));
      add("DEF-hips", P("cyl", [0.5, 0.04, 0.42], trim, [0, -0.63, 0]));
      add(s3, P("cyl", [0.18, 0.07, 0.18], trim, [0, 0.16, 0]));
      add("DEF-hips", P("cube", [0.07, 0.6, 0.03], trim, [0, -0.28, 0.2]));
      for (const sx of sides) add(`DEF-upper_arm.${side(sx)}`, P("cone", [0.17, 0.3, 0.17], col, [-sx * 0.1, -0.03, 0], [0, 0, -sx * 1.57]));
    } else {
      // túnica de palhaço
      add("DEF-hips", P("cone", [0.44, 0.22, 0.34], col, [0, -0.04, 0], [Math.PI, 0, 0]));
      for (let i = 0; i < 3; i++) add(s3, glow(P("sphere", [0.05, 0.05, 0.04], trim, [0, 0.14 - i * 0.1, 0.13]), 0.4));
      add("DEF-neck", P("ring", [0.3, 0.2, 0.3], trim, [0, 0.0, 0.0]));
      for (const sx of sides) add(`DEF-upper_arm.${side(sx)}`, P("sphere", [0.14, 0.12, 0.14], trim, [-sx * 0.05, 0.05, 0]));
    }
  } else if (slot === "cape") {
    const top = G(0, 0.1, -0.135);
    const segs: Node[] = [];
    let parent: Node = top;
    const n = 4;
    const L = p.base === "cape_gold" || p.base === "cape_star" ? 0.3 : 0.26;
    for (let i = 0; i < n; i++) {
      const g = G(0, i === 0 ? 0 : -L * 0.92, 0);
      const w = 0.34 + i * 0.045;
      g.add(P("cube", [w, L, 0.03], i === n - 1 ? mix(col, "#000000", 0.18) : col, [0, -L / 2, 0]));
      if (i === 0) g.add(P("cube", [w + 0.04, 0.04, 0.05], trim, [0, 0, 0]));
      if (i === n - 1) g.add(P("cube", [w, 0.03, 0.035], trim, [0, -L + 0.01, 0]));
      parent.add(g);
      parent = g;
      segs.push(g);
    }
    add("DEF-spine.003", top);
    anim.cape = segs;
    for (const sx of sides) add(`DEF-spine.003`, P("sphere", [0.07, 0.07, 0.05], trim, [sx * 0.09, 0.13, 0.1]));
  } else if (slot === "gloves") {
    for (const sx of sides) {
      const b = `DEF-forearm.${side(sx)}`;
      add(b, P("cyl", [0.11, 0.16, 0.11], col, [-sx * 0.19, 0, 0], [0, 0, Math.PI / 2]));
      if (p.base === "gauntlet") add(b, P("cube", [0.17, 0.06, 0.12], trim, [-sx * 0.12, 0.0, 0]));
    }
  } else if (slot === "pants") {
    add("DEF-hips", P("cyl", [0.31, 0.05, 0.21], mix(col, "#000000", 0.25), [0, 0.1, 0.02]));
    if (p.base === "greaves") {
      for (const sx of sides) {
        add(`DEF-shin.${side(sx)}`, P("cube", [0.11, 0.3, 0.05], col, [0, -0.2, 0.065]));
        add(`DEF-shin.${side(sx)}`, P("sphere", [0.09, 0.09, 0.07], trim, [0, 0.02, 0.06]));
      }
    } else {
      for (const sx of sides) add(`DEF-thigh.${side(sx)}`, P("cyl", [0.17, 0.04, 0.17], trim, [0, -0.2, 0]));
    }
  } else if (slot === "boots") {
    for (const sx of sides) {
      add(`DEF-shin.${side(sx)}`, P("cyl", [0.125, 0.14, 0.125], col, [0, -0.33, 0]));
      add(`DEF-shin.${side(sx)}`, P("cyl", [0.135, 0.03, 0.135], trim, [0, -0.255, 0]));
      if (p.base === "boots_speed") {
        const wing = glow(P("cone", [0.05, 0.16, 0.02], rc, [-sx * 0.085, -0.28, -0.04], [0, 0, sx * 1.1]), 0.6);
        add(`DEF-shin.${side(sx)}`, wing);
      }
      if (p.base === "boots_iron") add(`DEF-toe.${side(sx)}`, P("cube", [0.11, 0.05, 0.1], trim, [0, 0.0, 0.02]));
    }
  } else if (slot === "ring1" || slot === "ring2") {
    const sx = slot === "ring1" ? 1 : -1;
    const b = `DEF-hand.${side(sx)}`;
    add(b, P("ring", [0.055, 0.06, 0.055], col, [-sx * 0.1, 0.02, 0.0], [0, 0, Math.PI / 2]));
    add(b, glow(P("sphere", [0.03, 0.03, 0.03], rc, [-sx * 0.1, 0.045, 0.0]), 1));
  } else if (slot === "offhand") {
    const b = "DEF-forearm.L";
    if (p.base === "lid") {
      add(b, P("cyl", [0.42, 0.04, 0.42], col, [-0.04, 0.0, 0.1], [Math.PI / 2, 0, Math.PI / 2]));
      add(b, P("sphere", [0.08, 0.08, 0.05], trim, [-0.04, 0.0, 0.13]));
      add(b, P("ring", [0.42, 0.3, 0.42], trim, [-0.04, 0.0, 0.1], [Math.PI / 2, 0, Math.PI / 2]));
    } else if (p.base === "tome") {
      add("DEF-hand.L", P("cube", [0.17, 0.22, 0.045], col, [-0.08, 0.0, 0.11], [0.3, 0, 0.0]));
      add("DEF-hand.L", glow(P("sphere", [0.04, 0.04, 0.03], rc, [-0.08, 0.0, 0.14]), 0.9));
    } else if (p.base === "lantern") {
      add("DEF-hand.L", P("cube", [0.11, 0.15, 0.11], "#2a2024", [-0.02, -0.13, 0.06]));
      add("DEF-hand.L", glow(P("sphere", [0.12, 0.12, 0.12], "#ffc24a", [-0.02, -0.13, 0.06]), 1.1));
    } else {
      add("DEF-spine.003", P("cyl", [0.1, 0.4, 0.1], "#6a4630", [0.12, 0.0, -0.17], [0.3, 0, -0.25]));
      for (let i = 0; i < 3; i++) add("DEF-spine.003", P("cone", [0.03, 0.08, 0.03], "#d2e39a", [0.07 + i * 0.03, 0.22, -0.2], [0.3, 0, -0.25]));
    }
  }
  return out;
}

type Anim = { cape?: Node[]; wings?: Node[]; tail?: Node[]; flame?: Node[]; extra?: ((t: number, p: Pose) => void)[] };

/** peça da arma (grip na origem, lâmina em +Y) */
function weaponNode(p: GearPiece): Node {
  const col = pieceColor(p);
  const rc = RAR[Math.min(3, p.rarity)]!;
  const blade = p.rarity >= 3 ? GOLD : "#dfe5ee";
  const g = G();
  const add = (n: Node) => {
    g.add(n);
    return n;
  };
  switch (p.base) {
    case "knife":
    case "claws": {
      add(P("cube", [0.05, 0.3, 0.015], blade, [0, 0.19, 0]));
      add(P("cone", [0.05, 0.1, 0.02], blade, [0, 0.39, 0]));
      add(P("cube", [0.14, 0.03, 0.05], rc, [0, 0.03, 0]));
      if (p.base === "claws") {
        add(P("cube", [0.05, 0.3, 0.015], blade, [0.07, 0.19, 0]));
        add(P("cube", [0.05, 0.3, 0.015], blade, [-0.07, 0.19, 0]));
      }
      break;
    }
    case "wand": {
      add(P("cyl", [0.03, 0.34, 0.03], "#3a2a40", [0, 0.14, 0]));
      add(glow(P("sphere", [0.08, 0.08, 0.08], rc, [0, 0.34, 0]), 1));
      break;
    }
    case "sword": {
      add(P("cube", [0.085, 0.62, 0.022], blade, [0, 0.38, 0]));
      add(P("cone", [0.085, 0.12, 0.026], blade, [0, 0.75, 0]));
      add(P("cube", [0.3, 0.055, 0.07], rc, [0, 0.05, 0]));
      add(P("sphere", [0.06, 0.06, 0.06], col, [0, -0.1, 0]));
      add(P("cyl", [0.035, 0.18, 0.035], "#4a3024", [0, -0.04, 0]));
      break;
    }
    case "axe": {
      add(P("cyl", [0.04, 0.8, 0.04], "#6b4a2f", [0, 0.28, 0]));
      add(P("cube", [0.36, 0.26, 0.05], blade, [0.17, 0.58, 0]));
      add(P("cone", [0.12, 0.28, 0.05], blade, [0.38, 0.58, 0], [0, 0, -Math.PI / 2]));
      add(P("sphere", [0.07, 0.07, 0.07], rc, [0, 0.7, 0]));
      break;
    }
    case "hammer": {
      add(P("cyl", [0.045, 0.78, 0.045], "#6b4a2f", [0, 0.28, 0]));
      add(P("cube", [0.3, 0.2, 0.2], col, [0, 0.7, 0]));
      add(P("cube", [0.32, 0.04, 0.22], rc, [0, 0.7, 0]));
      break;
    }
    case "staff": {
      add(P("cyl", [0.04, 1.2, 0.04], "#6b4a2f", [0, 0.4, 0]));
      add(glow(P("sphere", [0.15, 0.15, 0.15], rc, [0, 1.06, 0]), 0.85));
      add(P("ring", [0.26, 0.1, 0.26], col, [0, 0.98, 0], [0.4, 0, 0]));
      break;
    }
    case "scepter": {
      add(P("cyl", [0.045, 0.7, 0.045], "#d9a830", [0, 0.26, 0]));
      add(glow(P("cone", [0.18, 0.22, 0.18], rc, [0, 0.74, 0]), 0.85));
      add(P("cyl", [0.12, 0.05, 0.12], "#d9a830", [0, 0.6, 0]));
      break;
    }
    case "bow": {
      add(P("cube", [0.04, 0.5, 0.04], "#8d4a2f", [0.0, 0.0, 0.0]));
      add(P("cube", [0.04, 0.3, 0.04], "#8d4a2f", [0.1, 0.34, 0.0], [0, 0, -0.55]));
      add(P("cube", [0.04, 0.3, 0.04], "#8d4a2f", [0.1, -0.34, 0.0], [0, 0, 0.55]));
      add(P("cube", [0.008, 0.92, 0.008], "#f4efe4", [0.2, 0.0, 0.0]));
      break;
    }
    default: {
      add(P("cyl", [0.04, 0.5, 0.04], "#6b4a2f", [0, 0.2, 0]));
      add(P("sphere", [0.1, 0.1, 0.1], col, [0, 0.5, 0]));
    }
  }
  return g;
}

/** cores de região a partir do herói + equipamento */
function applyRegions(rig: SkinRig, def: (typeof HEROES)[number], look: GearLook | undefined, form: boolean, formSkin: string) {
  const skin = form ? formSkin : def.skin;
  const set = (i: number, c: string) => rig.setRegion(i, hex(c));
  const torso = look?.armor ? pieceColor(look.armor) : def.cloth;
  const arm = look?.armor ? mix(pieceColor(look.armor), "#000000", 0.12) : def.cloth;
  const pants = look?.pants ? pieceColor(look.pants) : def.cloth2;
  const boots = look?.boots ? pieceColor(look.boots) : def.shoe;
  const gloves = look?.gloves ? pieceColor(look.gloves) : null;
  const tf = form ? def.accent : null;
  set(0, skin);
  set(1, tf ? mix(torso, tf, 0.35) : torso);
  set(2, tf ? mix(arm, tf, 0.35) : arm);
  set(3, gloves ?? skin);
  set(4, gloves ?? skin);
  set(5, pants);
  set(6, pants);
  set(7, look?.boots ? boots : pants);
  set(8, boots);
}

function baseMounts(id: HeroId, ctx: Ctx, anim: Anim): Mount[] {
  const def = HEROES.find((h) => h.id === id)!;
  const out: Mount[] = [];
  const add = (bone: string, n: Node, form = false) => {
    if (form) n.visible = false;
    out.push({ joint: ctx.J(bone), node: n, form });
    return n;
  };
  const H = "DEF-head";
  const S3 = "DEF-spine.003";
  const HIP = "DEF-hips";
  const hair = def.hair;
  const acc = def.accent;
  // cabelo (capacete de cabelo) e olhos de anime
  add(H, P("sphere", [0.26, 0.23, 0.275], hair, [0, 0.145, -0.012]));
  for (const sx of [-1, 1]) {
    const w = P("sphere", [0.05, 0.062, 0.02], "#fbf6ea", [sx * 0.05, 0.115, 0.108]);
    w.ink = false;
    const i = P("sphere", [0.03, 0.045, 0.02], id === "lena" ? "#c4373a" : id === "syl" ? "#4a9a50" : id === "mari" ? "#2a9ac0" : "#2a1a14", [sx * 0.05, 0.113, 0.118]);
    i.ink = false;
    add(H, w);
    add(H, i);
    const br = P("cube", [0.058, 0.012, 0.02], hair, [sx * 0.05, 0.165, 0.108], [0, 0, -sx * 0.12]);
    br.ink = false;
    add(H, br);
  }
  add(H, P("cone", [0.025, 0.035, 0.02], mix(def.skin, "#8a4a3a", 0.3), [0, 0.085, 0.118], [Math.PI / 2, 0, 0]));
  if (id === "ivo") {
    add(H, P("cube", [0.1, 0.02, 0.03], "#24160f", [0, 0.055, 0.115]));
    for (const sx of [-1, 1]) {
      add(`DEF-upper_arm.${sx > 0 ? "L" : "R"}`, P("cyl", [0.1, 0.06, 0.1], "#e0b15a", [-sx * 0.13, 0.0, 0], [0, 0, Math.PI / 2]));
      add(S3, P("cube", [0.035, 0.3, 0.02], def.cloth2, [sx * 0.08, 0.04, 0.125]));
    }
    add(HIP, P("cyl", [0.31, 0.05, 0.22], "#6b4a2f", [0, 0.07, 0.01]));
    add(HIP, P("cube", [0.06, 0.05, 0.03], "#e0b15a", [0, 0.07, 0.125]));
    // forma de lobo
    for (const sx of [-1, 1]) add(H, P("cone", [0.09, 0.2, 0.08], "#3a3d46", [sx * 0.1, 0.3, -0.01], [0, 0, -sx * 0.25]), true);
    add(H, P("cube", [0.11, 0.08, 0.14], "#8d929c", [0, 0.06, 0.14]), true);
    add(H, P("sphere", [0.05, 0.04, 0.04], "#14080c", [0, 0.07, 0.215]), true);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      add("DEF-neck", P("cone", [0.1, 0.2, 0.08], i % 2 ? "#6a6f7a" : "#8d929c", [Math.cos(a) * 0.17, 0.02, Math.sin(a) * 0.14], [Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0]), true);
    }
    const tail = G(0, 0.0, -0.1);
    tail.add(P("cone", [0.14, 0.42, 0.14], "#6a6f7a", [0, -0.1, -0.12], [-1.15, 0, 0]));
    add(HIP, tail, true);
    anim.tail = [tail];
    for (const sx of [-1, 1]) for (let k = -1; k <= 1; k++) add(`DEF-hand.${sx > 0 ? "L" : "R"}`, P("cone", [0.025, 0.1, 0.025], "#f4efe4", [-sx * 0.1, 0, k * 0.035], [0, 0, sx * -Math.PI / 2]), true);
  } else if (id === "lena") {
    const pony = G(0, 0.12, -0.11);
    for (let i = 0; i < 4; i++) pony.add(P("sphere", [0.1 - i * 0.015, 0.1 - i * 0.015, 0.1 - i * 0.015], hair, [0, -0.07 * i, -0.04 * i]));
    add(H, pony);
    anim.tail = [pony];
    for (const sx of [-1, 1]) add(H, P("cone", [0.045, 0.1, 0.04], def.skin, [sx * 0.125, 0.14, 0], [0, 0, -sx * 1.3]));
    add(H, P("cube", [0.02, 0.03, 0.015], "#f4efe4", [-0.025, 0.045, 0.112]));
    add(H, P("cube", [0.02, 0.03, 0.015], "#f4efe4", [0.025, 0.045, 0.112]));
    // capa de vampira
    const top = G(0, 0.12, -0.14);
    const segs: Node[] = [];
    let par: Node = top;
    for (let i = 0; i < 4; i++) {
      const g = G(0, i === 0 ? 0 : -0.26, 0);
      g.add(P("cube", [0.4 + i * 0.05, 0.28, 0.03], i % 2 ? "#3a1a48" : "#2a1a38", [0, -0.14, 0]));
      g.add(P("cube", [0.36 + i * 0.05, 0.28, 0.02], "#c4373a", [0, -0.14, 0.025]));
      par.add(g);
      par = g;
      segs.push(g);
    }
    add(S3, top);
    anim.cape = segs;
    // asas de morcego (forma)
    const wings: Node[] = [];
    for (const sx of [-1, 1]) {
      const w = G(sx * 0.06, 0.04, -0.14);
      w.add(P("cube", [0.9, 0.7, 0.025], "#6a2a7a", [sx * 0.45, 0.05, 0], [0, 0, sx * 0.3]));
      for (let k = 0; k < 3; k++) w.add(P("cube", [0.8, 0.03, 0.04], "#2a1a38", [sx * 0.4, 0.2 - k * 0.14, 0.015], [0, 0, sx * (0.15 + k * 0.17)]));
      add(S3, w, true);
      wings.push(w);
    }
    anim.wings = wings;
  } else if (id === "osso") {
    add(H, P("cyl", [0.2, 0.24, 0.2], "#1c1612", [0, 0.34, 0]));
    add(H, P("cyl", [0.34, 0.03, 0.34], "#1c1612", [0, 0.225, 0]));
    add(H, P("cyl", [0.205, 0.04, 0.205], acc, [0, 0.27, 0], [0, 0, 0], true));
    for (const sx of [-1, 1]) add(`DEF-upper_arm.${sx > 0 ? "L" : "R"}`, P("cube", [0.012, 0.7, 0.012], "#c8c2b4", [-sx * 0.05, 0.38, 0]));
    add(S3, P("cube", [0.34, 0.3, 0.04], def.cloth, [0, -0.02, -0.12], [0.18, 0, 0]));
    add(S3, glow(P("sphere", [0.045, 0.045, 0.035], acc, [0, 0.1, 0.13]), 0.7));
    for (const sx of [-1, 1]) {
      add(H, P("sphere", [0.07, 0.085, 0.03], "#14080c", [sx * 0.05, 0.115, 0.115]), true);
      const f = glow(P("sphere", [0.035, 0.045, 0.03], acc, [sx * 0.05, 0.115, 0.14]), 1);
      add(H, f, true);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI - 0.15;
      const fl = glow(P("cone", [0.08, 0.2, 0.06], acc, [Math.cos(a) * 0.14, 0.34 + Math.sin(a) * 0.1, -0.02], [0, 0, Math.cos(a) * -0.8]), 0.9);
      add(H, fl, true);
    }
  } else if (id === "syl") {
    add(H, P("cone", [0.34, 0.34, 0.34], def.cloth, [0, 0.19, -0.02]));
    add(H, P("cone", [0.1, 0.34, 0.06], "#c4373a", [0.1, 0.27, -0.12], [0, 0, -0.9]));
    for (const sx of [-1, 1]) add(H, P("cone", [0.05, 0.14, 0.04], def.skin, [sx * 0.125, 0.12, 0], [0, 0, -sx * 1.25]));
    add(S3, P("cyl", [0.1, 0.4, 0.1], "#4a3024", [0.1, 0.0, -0.17], [0.25, 0, -0.3]));
    for (let i = 0; i < 3; i++) add(S3, P("cone", [0.035, 0.08, 0.03], "#d2e39a", [0.07 + i * 0.03, 0.22 + i * 0.012, -0.21], [0.25, 0, -0.3]));
    for (const sx of [-1, 1]) add(`DEF-forearm.${sx > 0 ? "L" : "R"}`, P("cyl", [0.1, 0.14, 0.1], "#4a3024", [-sx * 0.12, 0, 0], [0, 0, Math.PI / 2]));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      add(HIP, P("cone", [0.08, 0.15, 0.05], i % 2 ? "#4a8a3a" : "#6aaa48", [Math.cos(a) * 0.16, 0.0, Math.sin(a) * 0.13], [Math.PI, 0, 0]));
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      add(H, glow(P("cone", [0.06, 0.15, 0.05], i % 2 ? "#9bd46a" : "#d2ff7a", [Math.cos(a) * 0.14, 0.3, Math.sin(a) * 0.12], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]), 0.55), true);
    }
  } else if (id === "tito") {
    add(H, P("cyl", [0.27, 0.05, 0.27], "#c4373a", [0, 0.22, 0]));
    add(H, P("cube", [0.2, 0.025, 0.03], "#24160f", [0, 0.055, 0.115]));
    for (const sx of [-1, 1]) add(S3, P("cube", [0.045, 0.34, 0.02], "#e0b15a", [sx * 0.08, 0.04, 0.125]));
    add(HIP, P("cyl", [0.31, 0.09, 0.22], "#1c1210", [0, 0.08, 0.01]));
    const torch = G(-0.03, -0.04, 0.02);
    torch.add(P("cyl", [0.035, 0.38, 0.035], "#6b4a2f", [0, 0.18, 0]));
    const tf = glow(P("cone", [0.12, 0.26, 0.12], "#ff8a2a", [0, 0.46, 0]), 1);
    const tf2 = glow(P("cone", [0.07, 0.2, 0.07], "#ffe24a", [0, 0.44, 0]), 1);
    torch.add(tf, tf2);
    torch.rot = [0.0, 0, 0];
    add("DEF-hand.L", torch);
    anim.flame = [tf, tf2];
    for (const sx of [-1, 1]) {
      add(H, P("cone", [0.07, 0.24, 0.07], "#3a1a10", [sx * 0.11, 0.3, 0], [0, 0, -sx * 0.35]), true);
      add(H, glow(P("sphere", [0.035, 0.045, 0.03], "#ffd34a", [sx * 0.05, 0.115, 0.13]), 1), true);
    }
    for (let i = 0; i < 5; i++) add(S3, P("cone", [0.09, 0.2 - i * 0.015, 0.07], i % 2 ? "#ff7a2a" : "#b02a1a", [0, 0.13 - i * 0.06, -0.15], [-0.9, 0, 0]), true);
    const dt = G(0, 0.0, -0.12);
    dt.add(glow(P("cone", [0.16, 0.5, 0.16], "#ff7a2a", [0, -0.1, -0.14], [-1.2, 0, 0]), 0.7));
    add(HIP, dt, true);
    anim.tail = [dt];
  } else if (id === "mari") {
    const bowl = P("sphere", [0.4, 0.4, 0.4], "#9fe0ee", [0, 0.14, 0]);
    bowl.alpha = 0.26;
    bowl.ink = false;
    bowl.emis = [0.05, 0.12, 0.14];
    add(H, bowl);
    const fish = G(0, 0.15, 0.0);
    fish.add(P("sphere", [0.07, 0.05, 0.035], "#ff8a3a", [0, 0, 0]));
    fish.add(P("cone", [0.04, 0.05, 0.015], "#ff8a3a", [-0.06, 0, 0], [0, 0, Math.PI / 2]));
    add(H, fish);
    anim.extra = anim.extra ?? [];
    anim.extra.push((t) => {
      fish.pos[0] = Math.sin(t * 1.6) * 0.08;
      fish.pos[1] = 0.15 + Math.sin(t * 2.3) * 0.02;
      fish.rot[1] = Math.cos(t * 1.6) > 0 ? 0 : Math.PI;
    });
    add("DEF-neck", P("cyl", [0.3, 0.05, 0.3], "#e0b15a", [0, 0.0, 0]));
    const ft = G(0, 0.0, -0.12);
    ft.add(P("cone", [0.28, 0.5, 0.16], "#1c8a9a", [0, -0.2, -0.1], [0.2, 0, 0]));
    ft.add(P("cone", [0.3, 0.3, 0.12], "#4ac0e0", [0, -0.5, -0.2], [0.35, 0, 0]));
    add(HIP, ft);
    anim.tail = [ft];
    add(HIP, P("cone", [0.44, 0.2, 0.34], "#e0b15a", [0, 0.02, 0], [Math.PI, 0, 0]));
    for (const sx of [-1, 1]) {
      add(`DEF-forearm.${sx > 0 ? "L" : "R"}`, P("cone", [0.07, 0.22, 0.02], "#4ac0e0", [-sx * 0.1, 0.0, -0.05], [0, 0, sx * -Math.PI / 2 - 0.4]));
      const f = G(sx * 0.1, 0.0, -0.14);
      f.add(P("cone", [0.3, 0.6, 0.03], "#4ac0e0", [sx * 0.3, 0.0, 0], [0, 0, -sx * 1.25]));
      add(S3, f, true);
      (anim.wings = anim.wings ?? []).push(f);
    }
  } else if (id === "pia") {
    for (const sx of [-1, 1]) {
      add(H, P("cone", [0.07, 0.2, 0.07], "#3a3d46", [sx * 0.1, 0.28, 0], [0, 0, -sx * 0.4]));
      const w = G(sx * 0.1, 0.0, -0.14);
      w.add(P("cube", [0.55, 0.62, 0.04], "#4a4e56", [sx * 0.28, 0.1, 0], [0, 0, -sx * 0.55]));
      w.add(P("cube", [0.06, 0.7, 0.06], "#2a2c32", [sx * 0.06, 0.05, 0.01]));
      add(S3, w);
      (anim.wings = anim.wings ?? []).push(w);
      add(`DEF-upper_arm.${sx > 0 ? "L" : "R"}`, P("sphere", [0.17, 0.13, 0.17], "#3a3d46", [-sx * 0.06, 0.05, 0]));
    }
    const gt = G(0, 0.0, -0.1);
    gt.add(P("cone", [0.11, 0.42, 0.11], "#4a4e56", [0, -0.1, -0.16], [-1.1, 0, 0]));
    add(HIP, gt);
    anim.tail = [gt];
    add(S3, P("cube", [0.26, 0.2, 0.05], "#4a4e56", [0, 0.04, 0.12]));
    for (let i = 0; i < 5; i++) add(S3, glow(P("cube", [0.022, 0.1 + (i % 2) * 0.05, 0.02], "#ff9a3a", [-0.1 + i * 0.05, 0.03 + (i % 3) * 0.03, 0.15], [0, 0, 0.5 - i * 0.25]), 1), true);
    for (const sx of [-1, 1]) add(H, glow(P("sphere", [0.035, 0.045, 0.03], "#ff9a3a", [sx * 0.05, 0.115, 0.13]), 1), true);
  } else if (id === "lumen") {
    add(H, P("sphere", [0.3, 0.2, 0.3], "#e8c820", [0, 0.22, -0.005]));
    add(H, P("cyl", [0.36, 0.035, 0.34], "#e8c820", [0, 0.17, 0.02]));
    add(H, glow(P("sphere", [0.07, 0.07, 0.05], "#fffbd0", [0, 0.25, 0.15]), 1));
    add(HIP, P("cyl", [0.32, 0.07, 0.22], "#6b4a2f", [0, 0.08, 0.01]));
    for (const sx of [-1, 1]) add(HIP, P("cube", [0.06, 0.1, 0.045], "#c4c8d0", [sx * 0.13, 0.0, 0.12]));
    add("DEF-shoulder.L", P("ring", [0.26, 0.2, 0.26], "#e0602a", [0.04, 0.12, -0.02], [0.4, 0, 0.3]));
    const rod = G(0, 0, 0);
    rod.add(P("cyl", [0.035, 0.42, 0.035], "#8a8e98", [0, 0.2, 0]));
    const tip = glow(P("cone", [0.07, 0.14, 0.07], "#ffe24a", [0, 0.48, 0]), 1);
    rod.add(tip);
    add("DEF-hand.L", rod);
    anim.flame = [tip];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(S3, glow(P("cube", [0.025, 0.3, 0.025], "#ffee6a", [Math.cos(a) * 0.3, -0.06 + (i % 2) * 0.1, Math.sin(a) * 0.2], [0, 0, a * 2 + 0.3]), 1), true);
    }
    for (const sx of [-1, 1]) add(H, glow(P("sphere", [0.035, 0.045, 0.03], "#ffffff", [sx * 0.05, 0.115, 0.13]), 1), true);
  }
  return out;
}

const FORM_SKIN: Record<string, string> = {
  ivo: "#8d929c",
  lena: "#d9c0d0",
  osso: "#f1ead8",
  syl: "#9bd46a",
  tito: "#c8553a",
  mari: "#8fe8ee",
  pia: "#6a6e78",
  lumen: "#f4f8ff",
};

/** nomes dos clipes por situação */
const CLIP = {
  idle: "Idle_Loop",
  walk: "Walk_Loop",
  jog: "Jog_Fwd_Loop",
  run: "Sprint_Loop",
  jumpStart: "Jump_Start",
  jumpLoop: "Jump_Loop",
  land: "Jump_Land",
  hit: "Hit_Chest",
  death: "Death01",
  sword: "Sword_Attack",
  jab: "Punch_Jab",
  cross: "Punch_Cross",
  spell: "Spell_Simple_Shoot",
  spellIdle: "Spell_Simple_Idle_Loop",
  pistol: "Pistol_Shoot",
  dance: "Dance_Loop",
};

const MELEE_SWORD = new Set(["sword", "axe", "hammer", "knife", "claws", "staff", "scepter", "bow", "wand"]);
const CASTERS = new Set(["staff", "scepter", "wand"]);

export function buildSkinHero(id: HeroId): Model | null {
  const a = charAsset();
  if (!a) return null;
  const def = HEROES.find((h) => h.id === id)!;
  const rig = new SkinRig(a, CLIP.idle);
  const J = (name: string) => {
    const j = a.index.get(name);
    if (j === undefined) throw new Error("osso ausente: " + name);
    return j;
  };
  const ctx: Ctx = { a, J };
  const anim: Anim = {};
  const base = baseMounts(id, ctx, anim);
  const rinv: Mat4[] = Array.from({ length: a.J }, (_, j) => rinvOf(a, j));
  const mounts: Mount[] = [...base];
  const sk: SkinPart = { rig, a, mounts, rinv };

  const root = G();
  const parts: Record<string, Node> = {};
  const aura = P("sphere", [1.1, 1.5, 1.1], hex(def.accent), [0, 0.55, 0]);
  aura.alpha = 0.07;
  aura.ink = false;
  aura.emis = hex(def.accent).map((v) => v * 0.6) as Vec3;
  aura.visible = false;
  root.add(aura);
  parts.aura = aura;
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

  // peças de equipamento
  let gearKey = "";
  let gearMounts: Mount[] = [];
  let weaponGrip: Node | null = null;
  const rebuildGear = (g: GearLook | undefined) => {
    const key = g ? Object.entries(g).map(([k, v]) => (v ? `${k}:${v.base}:${v.rarity}:${v.color}` : k)).join("|") : "";
    if (key === gearKey) return;
    gearKey = key;
    gearMounts = [];
    anim.cape = baseCape;
    weaponGrip = null;
    if (g) {
      const order: EquipKey[] = ["helmet", "necklace", "armor", "cape", "gloves", "pants", "boots", "ring1", "ring2", "offhand"];
      for (const slot of order) {
        const p = g[slot];
        if (!p) continue;
        const capeBefore = anim.cape;
        gearMounts.push(...buildPiece(ctx, slot, p, anim));
        if (slot !== "cape") anim.cape = capeBefore;
      }
      if (g.weapon) {
        const grip = G();
        const wn = weaponNode(g.weapon);
        grip.add(wn);
        // lâmina para frente e para cima quando o braço está relaxado
        const isBow = g.weapon.base === "bow";
        const tilt = isBow ? [0, 0, 0] : [Math.PI / 2, 0.5, 0];
        wn.rot = [tilt[0]!, tilt[1]!, tilt[2]!];
        gearMounts.push({ joint: J("DEF-hand.R"), node: grip });
        weaponGrip = grip;
      }
    }
    mounts.length = 0;
    mounts.push(...base, ...gearMounts);
    // esconde peças do herói que conflitam (arco do Syl etc.) — nada por enquanto
  };
  const baseCape = anim.cape;

  let last = -1;
  let hurtPrev = false;
  let inAirT = 0;
  let landT = 0;
  let attackBusy = 0;
  let meleeAlt = 0;
  let swingPrev = 0;
  let atkPrev = 0;
  let lastForm = false;
  let popAt = -10;
  const jHips = J("DEF-hips");
  const jSp1 = J("DEF-spine.001");
  const jSp2 = J("DEF-spine.002");
  const jHead = J("DEF-head");
  const jNeck = J("DEF-neck");

  const model: Model = {
    root,
    kind: "hero",
    parts,
    yaw: Math.PI / 2 - 0.5,
    formNodes: [],
    fly: false,
    skin: sk,
    update(p: Pose) {
      const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, p.t - last));
      last = p.t;
      rebuildGear(p.gear);
      const g = p.gear;
      const w = g?.weapon?.base ?? "";
      const air = p.ground === false || (p.ground === undefined && Math.abs(p.vy) > 70);
      // ---- escolha de animação
      const sp = p.speed;
      if (p.hurt && !hurtPrev) {
        rig.play(CLIP.hit, 1.2, 0.05, true);
        attackBusy = 0.3;
      }
      hurtPrev = p.hurt;
      const swing = p.swing ?? 0;
      if (swing > 0 && swingPrev <= 0) {
        if (MELEE_SWORD.has(w) && w !== "") {
          rig.play(CLIP.sword, 1.9, 0.04, true);
          attackBusy = 0.5;
        } else {
          meleeAlt ^= 1;
          rig.play(meleeAlt ? CLIP.cross : CLIP.jab, 1.7, 0.04, true);
          attackBusy = 0.4;
        }
      }
      swingPrev = swing;
      if (p.attack > 0 && atkPrev <= 0 && swing <= 0) {
        rig.play(CASTERS.has(w) ? CLIP.spell : CLIP.pistol, 2.0, 0.05, true);
        attackBusy = 0.3;
      }
      atkPrev = p.attack;
      attackBusy = Math.max(0, attackBusy - dt);
      if (air) inAirT += dt;
      else {
        if (inAirT > 0.35) landT = 0.25;
        inAirT = 0;
      }
      landT = Math.max(0, landT - dt);
      const form = p.form;
      const rateK = form ? 1.2 : 1;
      if (attackBusy > 0) {
        // golpe em andamento: deixa o clipe tocar
      } else if (air) {
        if (p.vy < -30 && inAirT < 0.25) rig.play(CLIP.jumpStart, 2.4 * rateK, 0.06);
        else rig.play(CLIP.jumpLoop, 1.1, 0.1);
      } else if (landT > 0) {
        rig.play(CLIP.land, 2.6, 0.05);
      } else if (sp > 0.06) {
        if (sp < 0.4) rig.playSync(CLIP.walk, (0.7 + sp * 1.4) * rateK);
        else if (sp < 0.8) rig.playSync(CLIP.jog, (0.75 + sp * 0.45) * rateK);
        else rig.playSync(CLIP.run, (0.8 + sp * 0.3) * rateK);
      } else {
        rig.play(form ? CLIP.spellIdle : CLIP.idle, 1, 0.2);
      }
      rig.advance(dt);
      // leve inclinação e balanço extra
      rig.clearExtras();
      const lean = sp * 0.12 + (air ? -0.05 : 0);
      rig.setExtra(jSp1, lean * 0.5, 0, 0);
      rig.setExtra(jSp2, lean * 0.5, 0, 0);
      rig.setExtra(jHead, -lean * 0.6 + Math.sin(p.t * 1.3) * 0.02, Math.sin(p.t * 0.9) * 0.05, 0);
      void jHips;
      void jNeck;
      rig.solve();
      applyRegions(rig, def, p.gear, form, FORM_SKIN[id] ?? def.skin);
      // peças que só aparecem na forma
      for (const m of base) if (m.form) m.node.visible = form;
      // movimento secundário
      const t = p.t;
      if (anim.cape) {
        const k = Math.min(1, sp);
        for (let i = 0; i < anim.cape.length; i++) {
          const s = anim.cape[i]!;
          const lag = i * 0.9;
          s.rot[0] = (i === 0 ? 0.12 : 0.05) + k * (i === 0 ? 0.35 : 0.22) + Math.sin(t * 5 - lag) * 0.05 * (0.4 + k) + (air ? (p.vy > 0 ? -0.15 : 0.25) : 0);
        }
      }
      if (anim.tail) for (const n of anim.tail) n.rot[2] = Math.sin(t * 7) * 0.2;
      if (anim.wings) {
        const f = Math.sin(t * (form ? 11 : 3)) * (form ? 0.4 : 0.06);
        anim.wings.forEach((n, i) => (n.rot[2] = (i === 0 ? -1 : 1) * f));
      }
      if (anim.flame) for (const n of anim.flame) n.scl = [1 + Math.sin(t * 22 + 1) * 0.12, 1 + Math.sin(t * 17) * 0.2, 1 + Math.sin(t * 19) * 0.12];
      if (anim.extra) for (const f of anim.extra) f(t, p);
      // transformação
      if (form !== lastForm) {
        lastForm = form;
        popAt = t;
      }
      for (const n of fx) n.visible = form;
      parts.aura!.visible = form;
      if (form) {
        for (let i = 0; i < 3; i++) {
          const u = (t * 0.9 + i / 3) % 1;
          const r = parts["fxRing" + i]!;
          r.pos[1] = 0.05 + u * 1.15;
          const k = 0.75 + Math.sin(u * Math.PI) * 0.55;
          r.size = [k, 0.6, k];
          r.alpha = Math.sin(u * Math.PI) * 0.5 + 0.04;
          r.rot[1] = t * 2 + i;
        }
        for (let i = 0; i < 6; i++) {
          const u = (t * 0.7 + i * 0.17) % 1;
          const c = parts["fxCol" + i]!;
          const an = i * 1.047 + t * 1.6;
          c.pos = [Math.cos(an) * 0.36, u * 1.0 - 0.1, Math.sin(an) * 0.3];
          c.size = [0.05, 0.22 + u * 0.18, 0.05];
          c.alpha = Math.sin(u * Math.PI) * 0.7 + 0.05;
        }
        const s = 1 + Math.sin(t * 9) * 0.06;
        parts.aura!.size = [1.1 * s, 1.5 * s, 1.1 * s];
      }
      const popK = Math.max(0, 1 - (t - popAt) / 0.45);
      const big = (form && id === "ivo" ? 1.12 : form && id === "pia" ? 1.18 : 1) * (1 + Math.sin(popK * Math.PI) * 0.3);
      root.scl = [big, big, big];
      void weaponGrip;
    },
  };
  rebuildGear(undefined);
  return model;
}
