import { Engine, hex, m4, mix3, type GpuMesh, type Lighting, type Vec3 } from "../engine/gl";
import { buildModel, drawModel, INK_COLOR, type DrawState, type Model, type Pose } from "../engine/models";
import { buildLevelParts, type LevelParts } from "../engine/scenery";
import { WORLDS, type WorldDef } from "./content";
import { GROUND, ROWS, TILE, Tile, VIEW_H, type HeroId, type Kind, type Level } from "./types";

export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number };

export type Paint = {
  ref: object;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  speed: number;
  facing: number;
  phase: number;
  kind: Kind | "hero";
  hero: HeroId;
  form: boolean;
  hurt: boolean;
  ally: boolean;
  world: number;
  attack: number;
};

export type ShotPaint = { x: number; y: number; w: number; h: number; color: string; vx: number; foe: boolean };

export type Frame = {
  level: Level | null;
  camX: number;
  camY: number;
  shake: number;
  t: number;
  playing: boolean;
  actors: Paint[];
  shots: ShotPaint[];
  sparks: Spark[];
  exit: { x: number; y: number; w: number; h: number; open: boolean } | null;
  lit: Set<number>;
  attractHero: HeroId;
};

const S = 1 / TILE;
const FOV = (36 * Math.PI) / 180;

const colorCache = new Map<string, Vec3>();
function col(c: string): Vec3 {
  let v = colorCache.get(c);
  if (!v) {
    v = hex(c);
    colorCache.set(c, v);
  }
  return v;
}

type Gfx = {
  level: Level;
  world: WorldDef;
  parts: LevelParts;
  terrain: GpuMesh;
  back: GpuMesh;
  glow: GpuMesh;
  light: Lighting;
  sky: { top: Vec3; mid: Vec3; bot: Vec3; stars: number; moon: Vec3; moonPos: [number, number] };
  accent: Vec3;
  trim: Vec3;
};

const MOONS: { c: string; p: [number, number]; stars: number }[] = [
  { c: "#f4e4c8", p: [0.8, 0.8], stars: 0.9 },
  { c: "#9fd4d8", p: [0.22, 0.82], stars: 1 },
  { c: "#ff9a4a", p: [0.76, 0.42], stars: 0.25 },
  { c: "#d8e890", p: [0.3, 0.84], stars: 0.8 },
  { c: "#d6c2f0", p: [0.74, 0.8], stars: 1 },
];

function lightingFor(w: WorldDef): Lighting {
  const sky2 = hex(w.sky2);
  const hill2 = hex(w.hill2);
  const trim = hex(w.trim);
  return {
    sun: mix3([0.62, 0.58, 0.54], trim, 0.18),
    sunDir: [-0.45, 0.8, 0.55],
    sky: mix3(sky2, [1, 1, 1], 0.42).map((v) => v * 0.62) as Vec3,
    ground: mix3(hill2, [0.4, 0.34, 0.34], 0.45).map((v) => v * 0.7) as Vec3,
    fog: hex(w.fog),
    fogNear: 18,
    fogFar: 95,
  };
}

export type Renderer = {
  setAttract: (l: Level) => void;
  render: (f: Frame) => void;
  previewHero: (canvas: HTMLCanvasElement, id: HeroId, t: number, form: boolean) => void;
  destroy: () => void;
  ok: boolean;
};

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  let e: Engine;
  try {
    e = new Engine(canvas);
  } catch {
    return { setAttract() {}, render() {}, previewHero() {}, destroy() {}, ok: false };
  }
  let prev: Engine | null = null;
  let prevCanvas: HTMLCanvasElement | null = null;
  const prevModels = new Map<string, Model>();

  const gfxCache = new Map<Level, Gfx>();
  const models = new WeakMap<object, Model>();
  const heroModels = new Map<HeroId, Model>();
  const yawOf = new WeakMap<Model, number>();

  function gfxFor(level: Level): Gfx {
    let g = gfxCache.get(level);
    if (g) return g;
    const world = WORLDS[level.world] ?? WORLDS[0]!;
    const parts = buildLevelParts(level, world);
    const moon = MOONS[world.id] ?? MOONS[0]!;
    g = {
      level,
      world,
      parts,
      terrain: e.upload(parts.terrain),
      back: e.upload(parts.back),
      glow: e.upload(parts.glow),
      light: lightingFor(world),
      sky: { top: hex(world.sky0), mid: hex(world.sky1), bot: hex(world.sky2), stars: moon.stars, moon: hex(moon.c), moonPos: moon.p },
      accent: hex(world.accent),
      trim: hex(world.trim),
    };
    gfxCache.set(level, g);
    while (gfxCache.size > 3) {
      const [k, old] = gfxCache.entries().next().value as [Level, Gfx];
      e.free(old.terrain);
      e.free(old.back);
      e.free(old.glow);
      gfxCache.delete(k);
    }
    return g;
  }

  function modelFor(p: Paint): Model {
    let m = models.get(p.ref);
    if (!m) {
      m = buildModel(p.kind, p.hero, p.world);
      models.set(p.ref, m);
    }
    return m;
  }

  function heroModel(id: HeroId): Model {
    let m = heroModels.get(id);
    if (!m) {
      m = buildModel("hero", id, 0);
      heroModels.set(id, m);
    }
    return m;
  }

  /** altura (em Y de mundo) do chão logo abaixo do ponto, ou null */
  function groundBelow(level: Level, xPx: number, footPx: number): number | null {
    const c = Math.floor(xPx / TILE);
    if (c < 0 || c >= level.cols) return null;
    let r = Math.floor((footPx - 2) / TILE);
    if (r < 0) r = 0;
    for (; r < ROWS; r++) {
      const t = level.tiles[r * level.cols + c];
      if (t === Tile.Solid || t === Tile.OneWay || t === Tile.Spring || t === Tile.Spike) return ROWS - r;
    }
    return null;
  }

  const wm = m4.create();
  const tmpDraw: DrawState = { flash: 0, tint: null, emis: null, ink: INK_COLOR, thick: 0.05, alphaMul: 1 };

  function placeModel(m: Model, p: Paint, t: number, dt: number): Mat4Like {
    const pose: Pose = {
      t,
      phase: p.phase,
      speed: Math.min(1, Math.abs(p.vx) / Math.max(1, p.speed)),
      vy: p.vy,
      facing: p.facing,
      form: p.form,
      hurt: p.hurt,
      ally: p.ally,
      world: p.world,
      attack: p.attack,
    };
    m.update(pose);
    const target = p.facing >= 0 ? Math.PI / 2 - 0.5 : -(Math.PI / 2 - 0.5);
    const cur = yawOf.get(m) ?? target;
    const next = cur + (target - cur) * (1 - Math.exp(-16 * dt));
    yawOf.set(m, next);
    const sc = p.h * S;
    const X = (p.x + p.w / 2) * S;
    const Y = ROWS - (p.y + p.h) * S;
    m4.compose(wm, [X, Y, 0], [0, next, 0], [sc, sc, sc]);
    return wm;
  }

  type Mat4Like = Float32Array;

  function visHForCull(aspect: number) {
    return Math.max(VIEW_H * S * 0.82, 12.5 / aspect) * 1.25;
  }
  let attractLevel: Level | null = null;
  let lastT = 0;
  const tmpBlob = m4.create();

  function render(f: Frame) {
    if (e.lost) return;
    const dt = Math.max(0.001, Math.min(0.1, f.t - lastT));
    lastT = f.t;
    const cssW = canvas.clientWidth || 640;
    const cssH = canvas.clientHeight || 360;
    e.resize(cssW, cssH, 1.5);
    const aspect = canvas.width / Math.max(1, canvas.height);

    // fase: a do jogo ou uma de vitrine nos menus
    const level = f.level ?? attractLevel!;
    const g = gfxFor(level);
    const L = g.level;
    const halfW = (visHForCull(aspect) * aspect) / 2 + 5;

    // câmera
    const visH = Math.max(VIEW_H * S * 0.82, 12.5 / aspect);
    const dist = visH / 2 / Math.tan(FOV / 2);
    let cx: number;
    let cy: number;
    let heroX = 0;
    if (f.playing) {
      cx = (f.camX + 384) * S;
      cy = ROWS - (f.camY + 216) * S;
      const sh = f.shake * 0.012;
      cx += (Math.random() - 0.5) * sh * 2;
      cy += (Math.random() - 0.5) * sh * 2;
    } else {
      const span = Math.max(1, L.cols - 40);
      const ph = (Math.sin(f.t * 0.035) * 0.5 + 0.5) * span;
      cx = 20 + ph;
      cy = ROWS - GROUND + 1.2 - Math.min(1.8, visH * 0.1);
      heroX = cx - 3.2;
    }
    const near = (xTiles: number) => Math.abs(xTiles - cx) < halfW;
    const sway = f.playing ? 0 : Math.sin(f.t * 0.2) * 3.0;
    const eye: Vec3 = [cx + sway, cy + 1.5 + (f.playing ? 0 : 0.8), dist];
    const at: Vec3 = [cx, cy - 0.25, 0];
    e.begin(g.world ? hex(g.world.fog) : [0, 0, 0]);
    e.setCamera(eye, at, FOV, 0.5, 260);

    e.drawSky(g.sky.top, g.sky.mid, g.sky.bot, f.t, g.sky.stars, g.sky.moon, g.sky.moonPos, [cx * 0.0006, 0]);
    e.useLit(g.light);

    // estáticos
    e.draw(g.back, null, { cel: false });
    e.draw(g.glow, null, { unlit: true });
    e.draw(g.terrain, null, {});

    // lanternas dos checkpoints
    for (const lan of g.parts.lanterns) {
      if (!near(lan.x)) continue;
      const on = f.lit.has(lan.idx) || !f.playing;
      const bob = Math.sin(f.t * 2 + lan.x) * 0.02;
      e.prim("cube", [lan.x, lan.y + bob, 0], [0, 0, 0], [0.26, 0.34, 0.26], { color: on ? [1, 0.86, 0.5] : [0.3, 0.26, 0.22], emis: on ? [0.9, 0.62, 0.2] : [0, 0, 0] }, INK_COLOR, 0.08);
      e.prim("cone", [lan.x, lan.y + 0.24 + bob, 0], [0, 0, 0], [0.34, 0.14, 0.34], { color: [0.2, 0.15, 0.14] });
    }

    // porta de saída
    if (f.playing && f.exit) drawExit(f, g);

    // atores
    const pass1: { m: Model; mat: Float32Array; st: DrawState }[] = [];
    const shadows: { x: number; y: number; r: number; h: number }[] = [];
    const drawActor = (p: Paint, m: Model, mat: Float32Array) => {
      const st: DrawState = { ...tmpDraw };
      st.flash = p.kind !== "hero" && p.hurt ? 0.75 : 0;
      if (p.ally) {
        st.tint = [0.65, 0.95, 1.1];
        st.emis = [0.05, 0.25, 0.3];
      }
      if (p.kind === "hero" && p.hurt) {
        // pisca ao tomar dano
        if (Math.floor(f.t * 16) % 2 === 0) return;
      }
      const copy = new Float32Array(mat);
      drawModel(e, m, copy, st, 0);
      pass1.push({ m, mat: copy, st });
      const gy = groundBelow(L, p.x + p.w / 2, p.y + p.h);
      if (gy !== null) {
        const hgt = Math.max(0, gy - (ROWS - (p.y + p.h) * S));
        shadows.push({ x: (p.x + p.w / 2) * S, y: gy, r: Math.max(0.3, p.w * S * 0.75), h: hgt });
      }
    };
    for (const p of f.actors) {
      if (p.kind === "hero") continue;
      if (!near((p.x + p.w / 2) * S)) continue;
      const m = modelFor(p);
      drawActor(p, m, placeModel(m, p, f.t, dt));
    }
    for (const p of f.actors) {
      if (p.kind !== "hero") continue;
      const m = heroModel(p.hero);
      drawActor(p, m, placeModel(m, p, f.t, dt));
    }
    // herói em vitrine nos menus
    if (!f.playing) {
      const p: Paint = {
        ref: heroModels,
        x: heroX / S - 13 + 0,
        y: (ROWS - GROUND) * 0 + (GROUND * TILE - 42),
        w: 26,
        h: 42,
        vx: 268,
        vy: 0,
        speed: 268,
        facing: 1,
        phase: f.t * 7,
        kind: "hero",
        hero: f.attractHero,
        form: false,
        hurt: false,
        ally: false,
        world: L.world,
        attack: 0,
      };
      p.x = heroX * TILE - 13;
      const m = heroModel(f.attractHero);
      const mat = placeModel(m, p, f.t, dt);
      drawActor(p, m, mat);
    }

    // projéteis (emissivos)
    for (const s of f.shots) {
      if (!near(s.x * S)) continue;
      const c = col(s.color);
      const X = (s.x + s.w / 2) * S;
      const Y = ROWS - (s.y + s.h / 2) * S;
      const len = Math.max(0.3, s.w * S * 1.6);
      const hh = Math.max(0.16, s.h * S * 1.5);
      e.prim("sphere", [X, Y, 0], [0, 0, s.vx < 0 ? 0.0 : 0], [len, hh, hh], { color: c, emis: c, unlit: false, cel: false }, INK_COLOR, 0.12);
      e.prim("cone", [X - Math.sign(s.vx) * len * 0.8, Y, 0], [0, 0, (s.vx > 0 ? 1 : -1) * Math.PI / 2], [hh * 0.8, len * 1.1, hh * 0.8], { color: c, emis: c, cel: false });
    }

    // transparências ---------------------------------------------------
    e.blend(true);
    for (const sh of shadows) {
      const a = Math.max(0.12, 0.38 - sh.h * 0.07);
      const k = sh.r * (1 + Math.min(sh.h, 3) * 0.12);
      m4.compose(tmpBlob, [sh.x, sh.y + 0.03, 0.1], [-Math.PI / 2, 0, 0], [k * 1.5, k * 0.9, 1]);
      e.draw(e.prims.sphere, tmpBlob, { color: [0.02, 0.01, 0.02], unlit: true, alpha: a });
    }
    for (const it of pass1) drawModel(e, it.m, it.mat, it.st, 1);
    e.blend(false);

    // brilhos aditivos
    e.additive(true);
    for (const lan of g.parts.lanterns) {
      if (!near(lan.x)) continue;
      const on = f.lit.has(lan.idx) || !f.playing;
      if (!on) continue;
      glowSprite(lan.x, lan.y, 0.4, 2.2 + Math.sin(f.t * 5 + lan.x) * 0.2, [1, 0.7, 0.3], 0.5);
    }
    for (const a of f.actors) {
      if (!near((a.x + a.w / 2) * S)) continue;
      if (a.kind === "candle") glowSprite((a.x + a.w / 2) * S, ROWS - (a.y + 4) * S, 0.5, 1.6, [1, 0.75, 0.3], 0.6);
      if (a.kind === "hero" && a.form) glowSprite((a.x + a.w / 2) * S, ROWS - (a.y + a.h / 2) * S, 0.2, 3.0, hex(heroAccent(a.hero)), 0.28);
    }
    for (const s of f.shots) glowSprite((s.x + s.w / 2) * S, ROWS - (s.y + s.h / 2) * S, 0.3, 1.1, col(s.color), 0.5);
    if (f.playing && f.exit) {
      const ex = f.exit;
      const X = (ex.x + ex.w / 2) * S;
      const Y = ROWS - (ex.y + ex.h / 2) * S;
      const open = ex.open;
      glowSprite(X, Y, 0.15, open ? 4.4 + Math.sin(f.t * 4) * 0.4 : 2.6, open ? g.accent : [0.8, 0.2, 0.2], open ? 0.55 : 0.28);
    }
    for (const sp of f.sparks) {
      const a = Math.max(0, sp.life / sp.max);
      const c = col(sp.color);
      const X = sp.x * S;
      const Y = ROWS - sp.y * S;
      glowSprite(X, Y, 0.3, sp.r * S * 6 * (0.4 + a), c, 0.8 * a);
    }
    // partículas de ambiente
    for (let i = 0; i < 26; i++) {
      const sx = (i * 12.9898) % 1;
      const px = cx - 12 + ((i * 7.31 + f.t * (0.35 + (i % 5) * 0.08)) % 24);
      const py = cy - 6 + ((i * 3.17 + f.t * (0.18 + (i % 3) * 0.07)) % 12) + Math.sin(f.t + i) * 0.15;
      const pz = -2 + (i % 7) * 0.7 - sx;
      glowSprite(px, py, pz, 0.1 + (i % 4) * 0.03, g.world.id === 2 ? [1, 0.55, 0.2] : g.accent, 0.5 + 0.3 * Math.sin(f.t * 2 + i));
    }
    e.additive(false);
  }

  function glowSprite(x: number, y: number, z: number, size: number, c: Vec3, a: number) {
    m4.compose(tmpBlob, [x, y, z], [0, 0, 0], [size, size, size]);
    e.draw(e.prims.sphere, tmpBlob, { color: c, unlit: true, soft: true, alpha: Math.max(0, Math.min(1, a * 1.1)) });
  }

  function drawExit(f: Frame, g: Gfx) {
    const ex = f.exit!;
    const X = (ex.x + ex.w / 2) * S;
    const Yb = ROWS - (ex.y + ex.h) * S;
    const open = ex.open;
    const stone: Vec3 = mix3(hex(g.world.groundDark), hex(g.world.trim), 0.25);
    e.prim("cube", [X - 0.55, Yb + 0.95, 0], [0, 0, 0], [0.22, 1.9, 0.5], { color: stone }, INK_COLOR, 0.04);
    e.prim("cube", [X + 0.55, Yb + 0.95, 0], [0, 0, 0], [0.22, 1.9, 0.5], { color: stone }, INK_COLOR, 0.04);
    e.prim("cube", [X, Yb + 1.95, 0], [0, 0, 0], [1.45, 0.26, 0.54], { color: g.trim }, INK_COLOR, 0.04);
    e.prim("cone", [X, Yb + 2.25, 0], [0, 0, 0], [0.5, 0.4, 0.5], { color: g.trim }, INK_COLOR, 0.05);
    if (!open) {
      for (const dy of [0.5, 1.1, 1.5]) e.prim("cube", [X, Yb + dy, 0.05], [0, 0, (dy - 1) * 0.2], [1.0, 0.06, 0.1], { color: [0.2, 0.2, 0.22] }, INK_COLOR, 0.1);
      e.prim("cube", [X, Yb + 0.95, -0.1], [0, 0, 0], [0.9, 1.7, 0.06], { color: [0.08, 0.03, 0.04] });
    } else {
      e.prim("cube", [X, Yb + 0.95, -0.1], [0, 0, 0], [0.9, 1.7, 0.06], { color: g.accent, emis: g.accent, unlit: true });
    }
  }

  function heroAccent(id: HeroId) {
    return id === "ivo" ? "#e0b15a" : id === "lena" ? "#c4373a" : id === "osso" ? "#9fd4d8" : "#d2e39a";
  }


  function previewHero(target: HTMLCanvasElement, id: HeroId, t: number, form: boolean) {
    try {
      if (!prev) {
        prevCanvas = document.createElement("canvas");
        prev = new Engine(prevCanvas, { preserve: true });
      }
      const cw = target.clientWidth || 160;
      const ch = target.clientHeight || 96;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pw = Math.floor(cw * dpr);
      const ph = Math.floor(ch * dpr);
      if (target.width !== pw || target.height !== ph) {
        target.width = pw;
        target.height = ph;
      }
      prevCanvas!.width = pw;
      prevCanvas!.height = ph;
      const pe = prev;
      pe.begin([0.1, 0.06, 0.09]);
      pe.setCamera([Math.sin(t * 0.7) * 1.4, 1.0, 2.7], [0, 0.78, 0], (34 * Math.PI) / 180, 0.3, 40);
      pe.drawSky(hex("#2a1824"), hex("#241420"), hex("#140c10"), t, 0, [0, 0, 0], [-2, -2], [0, 0]);
      pe.useLit({
        sun: [0.85, 0.8, 0.7],
        sunDir: [-0.4, 0.7, 0.6],
        sky: [0.5, 0.46, 0.55],
        ground: [0.25, 0.2, 0.22],
        fog: hex("#140c10"),
        fogNear: 8,
        fogFar: 30,
      });
      pe.prim("cyl", [0, -0.02, 0], [0, 0, 0], [3.4, 0.04, 3.4], { color: hex("#3a241c") }, INK_COLOR, 0.02);
      pe.prim("cyl", [0, 0.01, 0], [0, 0, 0], [1.3, 0.04, 1.3], { color: hex("#e0b15a"), emis: [0.05, 0.03, 0.01] });
      let m = prevModels.get(id);
      if (!m) {
        m = buildModel("hero", id, 0);
        prevModels.set(id, m);
      }
      const pose: Pose = { t, phase: t * 4, speed: 0.2, vy: 0, facing: 1, form, hurt: false, ally: false, world: 0, attack: 0 };
      m.update(pose);
      const yaw = Math.sin(t * 0.9) * 0.55 + 0.25;
      const mat = m4.compose(m4.create(), [0, 0.02, 0], [0, yaw, 0], [1.5, 1.5, 1.5]);
      const st: DrawState = { ...tmpDraw, thick: 0.05 };
      drawModel(pe, m, mat, st, 0);
      pe.blend(true);
      drawModel(pe, m, mat, st, 1);
      pe.blend(false);
      const ctx = target.getContext("2d");
      ctx?.drawImage(prevCanvas!, 0, 0, pw, ph);
    } catch {
      /* sem WebGL no preview: ignora */
    }
  }

  return {
    ok: true,
    setAttract(l) {
      attractLevel = l;
    },
    render,
    previewHero,
    destroy() {
      for (const g of gfxCache.values()) {
        e.free(g.terrain);
        e.free(g.back);
        e.free(g.glow);
      }
      gfxCache.clear();
      e.destroy();
      prev?.destroy();
    },
  };
}
