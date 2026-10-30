import { moodFor, tintSky, tintLight, drawAmbientOpaque, drawAmbientBlend, type AmbientCtx } from "./ambient";
import { Engine, hex, m4, mix3, type GpuMesh, type Lighting, type Vec3 } from "../engine/gl";
import { loadCharAsset } from "../engine/skin";
import { buildModel, drawModel, INK_COLOR, type DrawState, type GearLook, type Model, type Pose } from "../engine/models";
import { buildLevelParts, type LevelParts } from "../engine/scenery";
import { themedWorld, type WorldDef } from "./content";
import { GROUND, ROWS, TILE, Tile, type HeroId, type Kind, type Level, tileAt } from "./types";

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
  /** voa: sem sombra projetada no cenário */
  fly?: boolean;
  /** 0..1 animação de morte */
  dying?: number;
  mini?: boolean;
  gear?: GearLook;
};

export type LootPaint = { x: number; y: number; color: string; rarity: number; t: number; slot: string; fam: string; acc: string };

export type Fx = { kind: "wave" | "slash" | "pillar" | "nova" | "blast" | "bolt"; x: number; y: number; t: number; max: number; color: string; r: number; dir: number; el?: string };

export type ShotPaint = { x: number; y: number; w: number; h: number; color: string; vx: number; foe: boolean; el?: string };

export type Frame = {
  level: Level | null;
  camX: number;
  camY: number;
  /** herói em pixels de jogo: a câmera 3D o segue (inclusive nos pulos) */
  focus: { x: number; y: number; vy: number; facing: number; grounded: boolean } | null;
  shake: number;
  t: number;
  playing: boolean;
  actors: Paint[];
  shots: ShotPaint[];
  sparks: Spark[];
  exit: { x: number; y: number; w: number; h: number; open: boolean } | null;
  lit: Set<number>;
  attractHero: HeroId;
  fx: Fx[];
  flash: number;
  loot: LootPaint[];
  /** câmera dinâmica: tempo de fase, chefe próximo e alvo de cinemática */
  cam?: { t: number; moving: number; boss: { x: number; y: number } | null; cine: { x: number; y: number } | null };
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
  { c: "#ffe9a8", p: [0.7, 0.55], stars: 0.35 },
  { c: "#e8f4ff", p: [0.28, 0.84], stars: 1 },
  { c: "#b8fff0", p: [0.76, 0.78], stars: 0.9 },
  { c: "#fff6c0", p: [0.5, 0.86], stars: 0.7 },
  { c: "#ff6a4a", p: [0.72, 0.7], stars: 0.6 },
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
  previewHero: (canvas: HTMLCanvasElement, id: HeroId, t: number, form: boolean, gear?: GearLook) => void;
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
  let models = new WeakMap<object, Model>();
  const heroModels = new Map<HeroId, Model>();
  const yawOf = new WeakMap<Model, number>();

  // modelos animados (esqueleto + animações): quando chegam, todos os bonecos são refeitos com eles
  let skinTried = false;
  function startSkinLoad() {
    if (skinTried) return;
    skinTried = true;
    loadCharAsset(e)
      .then((a) => {
        if (!a) return;
        heroModels.clear();
        models = new WeakMap<object, Model>();
        prevModels.clear();
      })
      .catch(() => undefined);
  }
  startSkinLoad();

  function gfxFor(level: Level): Gfx {
    let g = gfxCache.get(level);
    if (g) return g;
    const world = themedWorld(level.world, level.index % 5);
    const parts = buildLevelParts(level, world);
    const base = MOONS[world.id] ?? MOONS[0]!;
    const st = level.index % 5;
    // a lua muda de lugar (e de brilho) a cada fase
    const moon = { c: base.c, p: [Math.min(0.9, Math.max(0.1, base.p[0] + (st - 2) * 0.17)), Math.min(0.92, base.p[1] - (st % 3) * 0.1)] as [number, number], stars: Math.min(1, base.stars * (st === 2 ? 1.2 : 1)) };
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
      const t = tileAt(level, c, r);
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
      gear: p.gear,
      dying: p.dying ?? 0,
    };
    m.update(pose);
    const target = p.facing >= 0 ? Math.PI / 2 - 0.5 : -(Math.PI / 2 - 0.5);
    const cur = yawOf.get(m) ?? target;
    const next = cur + (target - cur) * (1 - Math.exp(-16 * dt));
    yawOf.set(m, next);
    const d = p.dying ?? 0;
    const sc = p.h * S * (1 - d * (m.skin ? 0.35 : 0.75));
    const X = (p.x + p.w / 2) * S;
    const Y = ROWS - (p.y + p.h) * S;
    m4.compose(wm, [X, Y, 0], [0, next, m.skin ? 0 : d * 2.5 * (p.facing >= 0 ? -1 : 1)], [sc, sc, sc]);
    return wm;
  }

  type Mat4Like = Float32Array;

  function visHForCull(aspect: number) {
    return Math.max(5.2, 9.0 / aspect) * 1.25;
  }
  const formPrev = new WeakMap<object, boolean>();
  const bursts: { x: number; y: number; foot: number; t0: number; c: Vec3; on: boolean }[] = [];
  let camInit = false;
  let camYawS = 0;
  let camRS = 1.5;
  let camBossK = 0;
  let camCineK = 0;
  let camCX = 0;
  let camCY = 0;
  let camPX = 0;
  let camPY = 0;
  let attractLevel: Level | null = null;
  let lastT = 0;
  const qaZoom = (() => { try { const z = Number(new URLSearchParams(location.search).get("zoom")); return z > 0.2 && z <= 1 ? z : 1; } catch { return 1; } })();
  const qaPv = (() => { try { const q = new URLSearchParams(location.search); return q.has("pva") ? { a: Number(q.get("pva")) || 0, d: Number(q.get("pvd")) || 1 } : null; } catch { return null; } })();
  const tmpBlob = m4.create();
  let ambBase = 1.5;
  let ambInit = false;
  let frameAvg = 0.016, lastScale = 0, resScale = 1;
  const moodLight: Lighting = { sun: [0, 0, 0], sunDir: [0, 1, 0], sky: [0, 0, 0], ground: [0, 0, 0], fog: [0, 0, 0], fogNear: 0, fogFar: 0 };

  function render(f: Frame) {
    if (e.lost) return;
    const dt = Math.max(0.001, Math.min(0.1, f.t - lastT));
    lastT = f.t;
    const cssW = canvas.clientWidth || 640;
    const cssH = canvas.clientHeight || 360;
    // resolução dinâmica: se o aparelho engasga, baixa a nitidez; se sobra, sobe
    frameAvg = frameAvg * 0.94 + dt * 0.06;
    if (f.t - lastScale > 1.5) {
      lastScale = f.t;
      if (frameAvg > 0.026 && resScale > 0.6) resScale = Math.max(0.6, resScale - 0.12);
      else if (frameAvg < 0.019 && resScale < 1) resScale = Math.min(1, resScale + 0.06);
    }
    // cena de fala do chefe: resolução menor (a tela fica parada e o texto precisa fluir)
    const eco = f.cam && f.cam.cine ? 0.72 : 1;
    e.resize(cssW, cssH, 1.5 * Math.min(resScale, eco));
    const aspect = canvas.width / Math.max(1, canvas.height);

    // fase: a do jogo ou uma de vitrine nos menus
    const level = f.level ?? attractLevel!;
    const g = gfxFor(level);
    const L = g.level;

    // câmera: mais próxima, presa ao herói, orbita para trás dele (ângulo 3/4) e abre da visão 2D lateral
    const visH = Math.max(4.3, 7.4 / aspect);
    const dist0 = visH / 2 / Math.tan(FOV / 2);
    let cx: number;
    let cy: number;
    let heroX = 0;
    let eye: Vec3;
    let at: Vec3;
    if (f.playing && f.focus) {
      const fo = f.focus;
      const cam = f.cam ?? { t: 99, moving: 0, boss: null, cine: null };
      const hx = fo.x * S;
      const hy = ROWS - fo.y * S;
      const lookX = fo.facing * 1.8;
      const tx = hx + lookX;
      if (!camInit) {
        camPX = tx;
        camPY = hy + 0.6;
        camYawS = 0;
        camRS = 1.5;
        camBossK = 0;
        camCineK = 0;
        camInit = true;
      }
      const airUp = fo.grounded ? 0 : Math.max(0, -fo.vy) / 60;
      const airDown = fo.grounded ? 0 : Math.max(0, fo.vy) / 90;
      const ty = hy + 0.7 - Math.min(2.2, airDown) + Math.min(1.2, airUp * 0.4);
      const kx = 1 - Math.exp(-4.2 * dt);
      const ky = 1 - Math.exp(-(fo.grounded ? 2.8 : 6.0) * dt);
      camPX += (tx - camPX) * kx;
      camPY += (ty - camPY) * ky;
      // abertura: começa aberta e lateral (como o 2D) e vai aproximando e girando para trás do herói
      const intro = cam.t >= 99 ? 1 : Math.min(1, cam.t / 3.4);
      const ease = intro * intro * (3 - 2 * intro);
      // chefe por perto: abre o plano para ver chão, cenário e chefe
      const bossNear = cam.boss && Math.abs(cam.boss.x * S - hx) < 15 ? 1 : 0;
      camBossK += (bossNear - camBossK) * (1 - Math.exp(-1.6 * dt));
      const cineOn = cam.cine ? 1 : 0;
      camCineK += (cineOn - camCineK) * (1 - Math.exp(-2.4 * dt));
      // ângulo: atrás do herói, mais forte em movimento
      const yawT = (fo.facing >= 0 ? 1 : -1) * (0.26 + 0.16 * cam.moving) * ease * (1 - 0.5 * camBossK);
      camYawS += (yawT - camYawS) * (1 - Math.exp(-1.3 * dt));
      const rT = (1.5 - 0.95 * ease) * (1 + 0.22 * camBossK) * (1 - 0.18 * camCineK);
      camRS += (rT - camRS) * (1 - Math.exp(-2.0 * dt));
      let ax = camPX;
      let ay = camPY;
      if (cam.boss && camBossK > 0.01) {
        ax += (cam.boss.x * S - ax) * 0.34 * camBossK;
        ay += (ROWS - cam.boss.y * S + 0.3 - ay) * 0.2 * camBossK;
      }
      if (cam.cine && camCineK > 0.01) {
        ax += (cam.cine.x * S - ax) * camCineK;
        ay += (ROWS - cam.cine.y * S + 0.6 - ay) * camCineK;
      }
      const halfWv = (visH * aspect) / 2;
      cx = Math.min(L.cols - halfWv + 1.5, Math.max(halfWv - 1.5, ax));
      cy = Math.max(visH / 2 - 1.0, Math.min(ROWS + 1, ay));
      const sh = f.shake * 0.012;
      const R = dist0 * camRS * qaZoom;
      const yaw = camYawS * (1 - camCineK) + Math.sin(f.t * 0.5) * 0.3 * camCineK;
      const lift = 1.0 + 0.9 * (1 - camCineK * 0.8);
      at = [cx + (Math.random() - 0.5) * sh * 2, cy - 0.1 + (Math.random() - 0.5) * sh * 2, 0];
      eye = [at[0] - Math.sin(yaw) * R, at[1] + lift * (0.6 + 0.4 * camRS / 1.5), Math.cos(yaw) * R];
      camCX = cx;
      camCY = cy;
    } else {
      camInit = false;
      const span = Math.max(1, L.cols - 40);
      const ph = (Math.sin(f.t * 0.035) * 0.5 + 0.5) * span;
      cx = 20 + ph;
      cy = ROWS - GROUND + 1.2 - Math.min(1.8, visH * 0.1) + 1.0;
      heroX = cx - 3.2;
      const sway = Math.sin(f.t * 0.2) * 3.0;
      eye = [cx + sway, cy + 1.9, dist0 * 1.35];
      at = [cx, cy - 0.15, 0];
    }
    const halfW = (Math.max(5.2, 9.0 / aspect) * aspect) / 2 * 1.2 + 6;
    const near = (xTiles: number) => Math.abs(xTiles - cx) < halfW;
    e.begin(g.world ? hex(g.world.fog) : [0, 0, 0]);
    e.setCamera(eye, at, FOV, 0.5, 260);

    const mood = moodFor(L.index % 5, f.playing ? heroX / Math.max(1, L.cols) : 0.3, f.t);
    e.drawSky(tintSky(g.sky.top, mood), tintSky(g.sky.mid, mood), tintSky(g.sky.bot, mood), f.t, Math.min(1, g.sky.stars + mood.stars), g.sky.moon, g.sky.moonPos, [cx * 0.0006, 0]);
    e.useLit(tintLight(g.light, mood, moodLight));

    // estáticos
    e.draw(g.back, null, { cel: false });
    e.draw(g.glow, null, { unlit: true });
    e.draw(g.terrain, null, {});
    if (L.risers) {
      const gc = hex(g.world.ground);
      const tc = g.trim;
      for (const z of L.risers) {
        if (z.vis < 0.02) continue;
        const wob = z.col !== Math.round(z.vis) ? Math.sin(f.t * 40 + z.c) * 0.012 : 0;
        const hgt = z.vis + 0.6;
        m4.compose(tmpBlob, [z.c + z.w / 2 + wob, ROWS - GROUND - 0.6 + hgt / 2, -0.05], [0, 0, 0], [z.w, hgt, 2.1]);
        e.draw(e.prims.cube, tmpBlob, { color: gc });
        m4.compose(tmpBlob, [z.c + z.w / 2 + wob, ROWS - GROUND + z.vis - 0.08, 0.0], [0, 0, 0], [z.w + 0.04, 0.16, 2.2]);
        e.draw(e.prims.cube, tmpBlob, { color: [tc[0] * 0.8 + gc[0] * 0.2, tc[1] * 0.8 + gc[1] * 0.2, tc[2] * 0.8 + gc[2] * 0.2] as Vec3 });
      }
    }

    if (!ambInit) { ambBase = cy; ambInit = true; }
    ambBase += (cy - ambBase) * (1 - Math.exp(-0.35 * dt));
    const ambCtx: AmbientCtx = { base: ambBase, e, wid: g.world ? g.world.id : 0, t: f.t, cx, cy: ROWS - GROUND + 2.6, halfW, mood, dark: [0.04, 0.04, 0.07], accent: g.accent, fog: mood.flash > 0 ? [0.9, 0.93, 1] : tintSky(hex(g.world ? g.world.fog : "#444455"), mood), hero: null, glow: glowSprite, tmp: tmpBlob };
    drawAmbientOpaque(ambCtx);

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
      const gy = p.fly ? null : groundBelow(L, p.x + p.w / 2, p.y + p.h);
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
      const was = formPrev.get(p.ref);
      if (was !== undefined && was !== p.form) {
        bursts.push({ x: (p.x + p.w / 2) * S, y: ROWS - (p.y + p.h / 2) * S, foot: ROWS - (p.y + p.h) * S, t0: f.t, c: hex(heroAccent(p.hero)), on: p.form });
        if (bursts.length > 6) bursts.shift();
      }
      formPrev.set(p.ref, p.form);
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
      const a = Math.max(0.1, 0.5 - sh.h * 0.09);
      const k = sh.r * (1.15 + Math.min(sh.h, 3) * 0.16);
      m4.compose(tmpBlob, [sh.x, sh.y + 0.035, 0.1], [-Math.PI / 2, 0, 0], [k * 2.1, k * 1.5, 0.02]);
      e.draw(e.prims.sphere, tmpBlob, { color: [0.0, 0.0, 0.01], unlit: true, soft: true, alpha: a });
    }
    drawAmbientBlend(ambCtx);
    for (const lt of f.loot) {
      if (!near(lt.x * S)) continue;
      drawLoot(lt, f.t);
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
      if (a.kind === "chest") glowSprite((a.x + a.w / 2) * S, ROWS - (a.y + a.h / 2) * S, 0.5, 1.5 + Math.sin(f.t * 3) * 0.2, [1, 0.8, 0.3], 0.4);
      if (a.kind === "candle") glowSprite((a.x + a.w / 2) * S, ROWS - (a.y + 4) * S, 0.5, 1.6, [1, 0.75, 0.3], 0.6);
      if (a.kind === "hero" && a.form) glowSprite((a.x + a.w / 2) * S, ROWS - (a.y + a.h / 2) * S, 0.2, 3.0, hex(heroAccent(a.hero)), 0.28);
    }
    for (const lt of f.loot) {
      if (!near(lt.x * S)) continue;
      const c = col(lt.color);
      glowSprite(lt.x * S, ROWS - lt.y * S + 0.3, 0.2, 0.9 + lt.rarity * 0.3, c, 0.4);
      if (lt.rarity > 0) {
        const h = 1.3 + lt.rarity * 0.9;
        m4.compose(tmpBlob, [lt.x * S, ROWS - lt.y * S + h * 0.5, 0.1], [0, 0, 0], [0.12 + lt.rarity * 0.03, h, 0.12]);
        e.draw(e.prims.sphere, tmpBlob, { color: c, unlit: true, soft: true, alpha: 0.12 + lt.rarity * 0.04 });
        for (let q = 0; q < lt.rarity * 2; q++) {
          const u = (f.t * 0.6 + q * 0.37 + lt.t) % 1;
          glowSprite(lt.x * S + Math.sin(f.t * 2 + q * 2) * 0.35, ROWS - lt.y * S + 0.3 + u * h, 0.3, 0.16, [1, 1, 0.9], 0.8 * (1 - u));
        }
      }
    }
    for (const s of f.shots) drawShotGlow(s, f.t);
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
    // clima de cada mundo: confete, cinzas, brasas, vagalumes, folhas de papel
    const wid = g.world.id;
    const stg = L.index % 5;
    const n = 30 + stg * 7;
    for (let i = 0; i < n; i++) {
      const r1 = ((i * 12.9898) % 1 + 1) % 1;
      const sp = 0.35 + (i % 5) * 0.08;
      let px = cx - 12 + ((i * 7.31 + f.t * sp) % 24);
      let py = cy - 6 + ((i * 3.17 + f.t * (0.18 + (i % 3) * 0.07)) % 12) + Math.sin(f.t + i) * 0.15;
      const pz = -2 + (i % 7) * 0.7 - r1;
      let size = 0.1 + (i % 4) * 0.03;
      let c: Vec3 = g.accent;
      let a = 0.5 + 0.3 * Math.sin(f.t * 2 + i);
      if (wid === 0) {
        // confete caindo
        py = cy + 6 - ((i * 3.7 + f.t * (0.9 + (i % 4) * 0.2)) % 12);
        px += Math.sin(f.t * 1.6 + i) * 0.6;
        c = i % 3 === 0 ? [0.9, 0.25, 0.25] : i % 3 === 1 ? [0.95, 0.75, 0.3] : [0.35, 0.6, 1];
      } else if (wid === 1) {
        // cinza fria descendo devagar
        py = cy + 6 - ((i * 3.7 + f.t * 0.35) % 12);
        px += Math.sin(f.t * 0.7 + i * 2) * 0.9;
        c = [0.75, 0.85, 0.9];
        a *= 0.7;
        size *= 0.9;
      } else if (wid === 2) {
        // brasas subindo
        py = cy - 6 + ((i * 3.7 + f.t * (0.9 + (i % 3) * 0.3)) % 12);
        px += Math.sin(f.t * 1.2 + i * 3) * 0.5;
        c = i % 2 ? [1, 0.55, 0.15] : [1, 0.8, 0.3];
        size *= 1.1;
      } else if (wid === 3) {
        // vagalumes passeando
        px = cx - 11 + ((i * 5.7) % 22) + Math.sin(f.t * 0.5 + i) * 1.3;
        py = cy - 3 + ((i * 2.3) % 6) + Math.cos(f.t * 0.6 + i * 1.7) * 0.9;
        c = [0.85, 1, 0.45];
        a = 0.35 + 0.65 * Math.max(0, Math.sin(f.t * 1.5 + i * 2));
      } else if (wid === 5) {
        // vento de areia: riscos horizontais
        px = cx - 12 + ((i * 7.31 + f.t * (3 + (i % 4))) % 24);
        py = cy - 4 + ((i * 2.9) % 9) + Math.sin(f.t * 2 + i) * 0.2;
        c = [0.95, 0.78, 0.45];
        a *= 0.6;
        size *= 0.8;
      } else if (wid === 6) {
        // neve
        py = cy + 6 - ((i * 3.7 + f.t * (0.5 + (i % 3) * 0.2)) % 12);
        px += Math.sin(f.t * 0.9 + i * 2) * 0.7;
        c = [0.95, 0.98, 1];
        size *= 1.1;
      } else if (wid === 7) {
        // bolhas subindo
        py = cy - 6 + ((i * 3.7 + f.t * (0.4 + (i % 3) * 0.15)) % 12);
        px += Math.sin(f.t * 1.1 + i * 3) * 0.5;
        c = [0.6, 1, 0.95];
        a *= 0.7;
      } else if (wid === 8) {
        // pétalas douradas à deriva
        py = cy + 6 - ((i * 3.7 + f.t * 0.45) % 12);
        px += Math.sin(f.t * 0.8 + i) * 1.1 + f.t * 0.2 % 1;
        c = i % 2 ? [1, 0.9, 0.5] : [1, 0.75, 0.9];
      } else if (wid === 9) {
        // brasas e moedas de ouro
        py = cy - 6 + ((i * 3.7 + f.t * (0.7 + (i % 3) * 0.3)) % 12);
        px += Math.sin(f.t * 1.3 + i * 3) * 0.6;
        c = i % 3 ? [1, 0.25, 0.2] : [1, 0.85, 0.3];
      } else {
        // poeira e fagulhas de tinta
        py = cy - 5 + ((i * 3.7 + f.t * 0.25) % 11);
        px += Math.sin(f.t * 0.4 + i) * 0.8;
        c = i % 2 ? [0.9, 0.82, 1] : [1, 0.85, 0.5];
        a *= 0.8;
      }
      glowSprite(px, py, pz, size, c, a);
    }
    // explosão de transformação: clarão, ondas, raios e fagulhas
    for (let bi = bursts.length - 1; bi >= 0; bi--) {
      const b = bursts[bi]!;
      const age = f.t - b.t0;
      const life = b.on ? 1.1 : 0.7;
      if (age > life || age < 0) {
        if (age > life) bursts.splice(bi, 1);
        continue;
      }
      const u = age / life;
      const fade = 1 - u;
      const bright: Vec3 = [Math.min(1, b.c[0] * 0.8 + 0.2), Math.min(1, b.c[1] * 0.8 + 0.2), Math.min(1, b.c[2] * 0.8 + 0.2)];
      glowSprite(b.x, b.y, 0.5, (b.on ? 5.2 : 3.4) * (0.4 + u * 0.8), b.c, 0.55 * fade * fade);
      // coluna de luz
      m4.compose(tmpBlob, [b.x, b.foot + 3.2, 0], [0, 0, 0], [0.45 * (1 - u * 0.6), 6.5 * (0.5 + u), 0.45]);
      e.draw(e.prims.sphere, tmpBlob, { color: b.c, unlit: true, soft: true, alpha: 0.45 * fade });
      // onda no chão
      e.prim("ring", [b.x, b.foot + 0.06, 0.05], [0, 0, 0], [1 + u * 9, 1, 1 + u * 9], { color: bright, unlit: true, alpha: 0.6 * fade });
      // halo em pé, voltado para a câmera
      e.prim("ring", [b.x, b.y, 0.2], [Math.PI / 2, 0, 0], [0.8 + u * 5.5, 1, 0.8 + u * 5.5], { color: b.c, unlit: true, alpha: 0.55 * fade });
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2 + (k % 2) * 0.2;
        const d = (0.4 + u * (2.6 + (k % 3) * 0.9)) * (b.on ? 1 : 0.7);
        glowSprite(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d * 0.9, 0.4, 0.2 * (1 - u * 0.6), k % 2 ? bright : b.c, 0.85 * fade);
      }
    }
    // poderes: ondas, cortes, pilares de luz e o super especial
    for (const fxx of f.fx) {
      if (fxx.t < 0) continue;
      const u = Math.min(1, fxx.t / fxx.max);
      const fade = 1 - u;
      const c = col(fxx.color);
      const X = fxx.x * S;
      const Y = ROWS - fxx.y * S;
      const R = fxx.r * S;
      if (fxx.kind === "wave") {
        const d = 2 * R * (0.15 + 0.85 * u);
        e.prim("ring", [X, Y, 0.2], [Math.PI / 2, 0, 0], [d, 1.4, d], { color: c, unlit: true, alpha: 0.85 * fade });
        e.prim("ring", [X, Y, 0.2], [Math.PI / 2, 0, 0], [d * 0.72, 0.9, d * 0.72], { color: [1, 1, 1], unlit: true, alpha: 0.45 * fade });
        e.prim("ring", [X, Y - 0.35, 0.05], [0, 0, 0], [d * 1.1, 1, d * 0.5], { color: c, unlit: true, alpha: 0.5 * fade });
        glowSprite(X, Y, 0.4, d * 0.7, c, 0.35 * fade);
      } else if (fxx.kind === "slash") {
        const len = R * (0.5 + 0.9 * u);
        for (let k = 0; k < 4; k++) {
          m4.compose(tmpBlob, [X + fxx.dir * len * 0.5, Y + (k - 1.5) * 0.12, 0.3], [0, 0, (k - 1.5) * 0.06 * fxx.dir], [len, 0.34 * (1 - u * 0.7) * (k % 2 ? 0.6 : 1), 0.25]);
          e.draw(e.prims.sphere, tmpBlob, { color: k % 2 ? [1, 1, 1] : c, unlit: true, soft: true, alpha: 0.9 * fade });
        }
      } else if (fxx.kind === "bolt") {
        const fl = Math.sin(fxx.t * 70) > -0.4 ? 1 : 0.4;
        drawBolt(X, Y + 7.5, Y, Math.floor(fxx.x) + Math.floor(fxx.t * 14), [1, 0.97, 0.55], 0.95 * fade * fl, 0.09);
        drawBolt(X, Y + 7.5, Y, Math.floor(fxx.x) + 99 + Math.floor(fxx.t * 14), [1, 1, 1], 0.9 * fade * fl, 0.04);
        glowSprite(X, Y + 0.2, 0.4, 2.8 * (0.4 + fade), [1, 0.95, 0.5], 0.7 * fade);
        e.prim("ring", [X, Y + 0.05, 0.1], [0, 0, 0], [0.8 + u * 2.6, 1, 0.8 + u * 2.6], { color: [1, 1, 0.8], unlit: true, alpha: 0.7 * fade });
      } else if (fxx.kind === "blast") {
        const rr = Math.max(1.2, R / 14);
        glowSprite(X, Y, 0.5, rr * (0.6 + u * 1.5), [1, 0.45, 0.1], 0.6 * fade);
        glowSprite(X, Y, 0.6, rr * (0.3 + u * 0.9), [1, 0.9, 0.4], 0.8 * fade);
        glowSprite(X, Y, 0.7, rr * 0.35 * fade, [1, 1, 0.95], 0.9 * fade);
        e.prim("ring", [X, Y - 0.2, 0.3], [Math.PI / 2, 0, 0], [rr * (0.8 + u * 2.2), 1.2, rr * (0.8 + u * 2.2)], { color: [1, 0.7, 0.25], unlit: true, alpha: 0.7 * fade });
        e.prim("ring", [X, Y - 0.4, 0.1], [0, 0, 0], [rr * (1 + u * 2.6), 1, rr * (1 + u * 1.2)], { color: [1, 0.55, 0.15], unlit: true, alpha: 0.55 * fade });
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2 + rnd(k + fxx.x) * 0.5;
          const dd = rr * (0.3 + u * (1.3 + rnd(k * 1.7) * 0.9));
          glowSprite(X + Math.cos(a) * dd, Y + Math.sin(a) * dd * 0.9 + u * 0.6, 0.5, 0.35 * (1 - u * 0.7), k % 2 ? [1, 0.75, 0.2] : [1, 0.4, 0.1], 0.9 * fade);
        }
      } else if (fxx.kind === "pillar" && fxx.el && fxx.el !== "fire" && fxx.el !== "lightning") {
        const el = fxx.el;
        const grow = Math.min(1, u * 3.5);
        if (el === "stone" || el === "nature" || el === "blood") {
          for (let k = 0; k < 5; k++) {
            const hh = (1.5 + rnd(k + fxx.x) * 1.6) * grow * (1 - u * 0.3);
            const cc: Vec3 = el === "stone" ? (k % 2 ? [0.62, 0.58, 0.52] : [0.75, 0.7, 0.62]) : el === "nature" ? (k % 2 ? [0.3, 0.7, 0.3] : [0.55, 0.9, 0.35]) : k % 2 ? [0.7, 0.05, 0.15] : [0.95, 0.15, 0.25];
            m4.compose(tmpBlob, [X + (k - 2) * 0.28, Y + hh * 0.5, 0.1 + (k % 2) * 0.1], [0, 0, (k - 2) * 0.12], [0.3, hh, 0.3]);
            e.draw(e.prims.cone, tmpBlob, { color: cc, emis: cc.map((v) => v * 0.35) as Vec3, alpha: 0.95 * (1 - u * u) });
          }
          glowSprite(X, Y + 0.3, 0.3, 2.6 * grow, el === "blood" ? [0.9, 0.1, 0.2] : el === "nature" ? [0.5, 1, 0.4] : [0.8, 0.75, 0.6], 0.35 * fade);
        } else if (el === "water") {
          m4.compose(tmpBlob, [X, Y + 2.0 * grow, 0.2], [0, 0, 0], [0.9 * (1 - u * 0.4), 4.2 * grow, 0.9 * (1 - u * 0.4)]);
          e.draw(e.prims.sphere, tmpBlob, { color: [0.4, 0.85, 1], unlit: true, soft: true, alpha: 0.6 * fade });
          for (let k = 0; k < 8; k++) glowSprite(X + (rnd(k * 3.3 + fxx.x) - 0.5) * 1.8, Y + 1 + grow * 3 * rnd(k) + Math.sin(u * 6 + k) * 0.2, 0.3, 0.35, [0.85, 0.97, 1], 0.8 * fade);
          e.prim("ring", [X, Y + 0.05, 0.1], [0, 0, 0], [1.2 + u * 3, 1, 1.2 + u * 3], { color: [0.7, 0.95, 1], unlit: true, alpha: 0.7 * fade });
        } else if (el === "spirit") {
          m4.compose(tmpBlob, [X, Y + 3, 0.2], [0, 0, 0], [0.8, 6.5 * grow, 0.8]);
          e.draw(e.prims.sphere, tmpBlob, { color: [0.45, 1, 0.75], unlit: true, soft: true, alpha: 0.45 * fade });
          for (let k = 0; k < 3; k++) {
            const hh = 0.5 + ((u * 3 + k * 0.33) % 1) * 5;
            glowSprite(X + Math.sin(hh * 2 + k) * 0.4, Y + hh, 0.4, 0.75, [0.8, 1, 0.9], 0.8 * fade);
            glowSprite(X + Math.sin(hh * 2 + k) * 0.4 - 0.12, Y + hh + 0.05, 0.5, 0.14, [0.05, 0.1, 0.1], 0.9 * fade);
            glowSprite(X + Math.sin(hh * 2 + k) * 0.4 + 0.12, Y + hh + 0.05, 0.5, 0.14, [0.05, 0.1, 0.1], 0.9 * fade);
          }
        } else {
          const w2 = 1.3 * (1 - u * 0.4);
          m4.compose(tmpBlob, [X, Y + 3.5, 0.2], [0, 0, 0], [w2, 8 * grow, w2]);
          e.draw(e.prims.sphere, tmpBlob, { color: [0.9, 0.95, 1], unlit: true, soft: true, alpha: 0.7 * fade });
          glowSprite(X, Y + 0.3, 0.3, 3.2 * grow, [0.85, 0.92, 1], 0.5 * fade);
        }
        e.prim("ring", [X, Y + 0.05, 0.1], [0, 0, 0], [1.2 + u * 2.4, 1, 1.2 + u * 2.4], { color: [1, 1, 1], unlit: true, alpha: 0.5 * fade });
      } else if (fxx.kind === "pillar") {
        const w = 0.6 * (1 - u * 0.55);
        m4.compose(tmpBlob, [X, Y + 3, 0.2], [0, 0, 0], [w, 7.5 * (0.4 + 0.6 * Math.min(1, u * 4)), w]);
        e.draw(e.prims.sphere, tmpBlob, { color: c, unlit: true, soft: true, alpha: 0.9 * fade });
        e.prim("ring", [X, Y + 0.05, 0.1], [0, 0, 0], [1.2 + u * 2.4, 1, 1.2 + u * 2.4], { color: [1, 1, 1], unlit: true, alpha: 0.7 * fade });
      } else {
        const d = 2 * R * (0.1 + 0.9 * u);
        for (let k = 0; k < 3; k++) {
          const dd = d * (1 - k * 0.18);
          e.prim("ring", [X, Y, 0.3], [Math.PI / 2, 0, 0], [dd, 1.1 - k * 0.2, dd], { color: k === 1 ? mix3(c, [1, 1, 1], 0.5) : c, unlit: true, alpha: 0.5 * fade });
        }
        e.prim("ring", [X, Y - 0.6, 0.1], [0, 0, 0], [d * 1.2, 1, d * 0.6], { color: c, unlit: true, alpha: 0.6 * fade });
        glowSprite(X, Y, 1.5, 20 * Math.min(1, u * 5) * (0.4 + fade), c, 0.3 * fade * fade);
      }
    }
    if (f.flash > 0.02) glowSprite(cx, cy, 6, 30, [1, 1, 1], 0.14 * f.flash);
    e.additive(false);
    (window as unknown as { __drawCalls?: number }).__drawCalls = e.drawCalls;
  }

  const rnd = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  /** raio em zigue-zague do alto até o chão */
  function drawBolt(X: number, yTop: number, yBot: number, seed: number, c: Vec3, alpha: number, thick: number) {
    const n = 9;
    let px = X + (rnd(seed) - 0.5) * 1.2;
    let py = yTop;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const nx = i === n ? X : X + (rnd(seed + i * 3.1) - 0.5) * 1.5 * (1 - u * 0.5);
      const ny = yTop + (yBot - yTop) * u;
      const dx = nx - px;
      const dy = ny - py;
      const len = Math.hypot(dx, dy);
      m4.compose(tmpBlob, [(px + nx) / 2, (py + ny) / 2, 0.3], [0, 0, Math.atan2(dy, dx)], [len * 1.08, thick, thick]);
      e.draw(e.prims.cube, tmpBlob, { color: c, unlit: true, alpha });
      m4.compose(tmpBlob, [(px + nx) / 2, (py + ny) / 2, 0.28], [0, 0, Math.atan2(dy, dx)], [len * 1.08, thick * 3.2, thick * 3.2]);
      e.draw(e.prims.sphere, tmpBlob, { color: c, unlit: true, soft: true, alpha: alpha * 0.28 });
      px = nx;
      py = ny;
    }
  }

  /** brilho e rastro do projétil de acordo com o elemento do herói */
  function drawShotGlow(s: ShotPaint, t: number) {
    const X = (s.x + s.w / 2) * S;
    const Y = ROWS - (s.y + s.h / 2) * S;
    const c = col(s.color);
    const dir = s.vx >= 0 ? 1 : -1;
    const el = s.el;
    if (!el || s.foe) {
      glowSprite(X, Y, 0.3, 1.1, c, 0.5);
      return;
    }
    const fl = 0.85 + Math.sin(t * 40 + X * 3) * 0.15;
    if (el === "fire") {
      glowSprite(X, Y, 0.3, 2.3 * fl, [1, 0.45, 0.1], 0.55);
      glowSprite(X, Y, 0.35, 1.3, [1, 0.9, 0.4], 0.8);
      glowSprite(X, Y, 0.4, 0.6, [1, 1, 0.9], 0.95);
      for (let k = 1; k <= 6; k++) glowSprite(X - dir * k * 0.42, Y + Math.sin(t * 18 + k) * 0.12 + k * 0.03, 0.25, (1.5 - k * 0.2) * fl, k % 2 ? [1, 0.45, 0.12] : [1, 0.75, 0.2], 0.5 - k * 0.06);
    } else if (el === "lightning") {
      glowSprite(X, Y, 0.3, 1.6 * fl, [1, 0.95, 0.4], 0.5);
      glowSprite(X, Y, 0.4, 0.55, [1, 1, 1], 0.95);
      for (let k = 0; k < 3; k++) {
        const a = rnd(Math.floor(t * 30) + k * 7) * Math.PI * 2;
        m4.compose(tmpBlob, [X + Math.cos(a) * 0.35, Y + Math.sin(a) * 0.35, 0.35], [0, 0, a], [0.7, 0.05, 0.05]);
        e.draw(e.prims.cube, tmpBlob, { color: [0.9, 0.95, 1], unlit: true, alpha: 0.9 });
      }
    } else if (el === "water") {
      glowSprite(X, Y, 0.3, 1.5, [0.4, 0.85, 1], 0.45);
      e.prim("ring", [X, Y, 0.3], [Math.PI / 2, 0, 0], [0.9 + Math.sin(t * 12) * 0.1, 1, 0.9], { color: [0.8, 0.97, 1], unlit: true, alpha: 0.7 });
      for (let k = 1; k <= 4; k++) glowSprite(X - dir * k * 0.35, Y + Math.sin(t * 10 + k) * 0.1, 0.25, 0.7 - k * 0.1, [0.5, 0.9, 1], 0.4);
    } else if (el === "stone") {
      glowSprite(X, Y, 0.3, 1.3, [0.8, 0.75, 0.65], 0.3);
      for (let k = 1; k <= 4; k++) glowSprite(X - dir * k * 0.3, Y - k * 0.04, 0.25, 0.6, [0.7, 0.65, 0.58], 0.3 - k * 0.05);
    } else if (el === "nature") {
      glowSprite(X, Y, 0.3, 1.3, [0.5, 1, 0.45], 0.4);
      for (let k = 1; k <= 5; k++) glowSprite(X - dir * k * 0.34, Y + Math.sin(t * 14 + k * 1.3) * 0.18, 0.25, 0.65, k % 2 ? [0.55, 1, 0.4] : [1, 0.9, 0.5], 0.45 - k * 0.06);
    } else if (el === "blood") {
      glowSprite(X, Y, 0.3, 1.6, [0.9, 0.1, 0.2], 0.5);
      for (let k = 1; k <= 5; k++) glowSprite(X - dir * k * 0.3, Y - k * 0.08, 0.25, 0.7 - k * 0.08, [0.75, 0.05, 0.15], 0.5 - k * 0.07);
    } else if (el === "spirit") {
      glowSprite(X, Y, 0.3, 1.8 * fl, [0.5, 1, 0.8], 0.45);
      glowSprite(X, Y, 0.4, 0.8, [0.9, 1, 0.95], 0.8);
      for (let k = 1; k <= 5; k++) glowSprite(X - dir * k * 0.4, Y + Math.sin(t * 8 + k * 1.7) * 0.25, 0.25, 1.0 - k * 0.14, [0.45, 1, 0.75], 0.4 - k * 0.05);
    } else {
      glowSprite(X, Y, 0.3, 1.8, [0.85, 0.9, 1], 0.5);
      e.prim("ring", [X, Y, 0.3], [0, Math.PI / 2, 0.5 * dir], [1.1, 1, 1.1], { color: [0.95, 0.97, 1], unlit: true, alpha: 0.75 });
      for (let k = 1; k <= 5; k++) glowSprite(X - dir * k * 0.36, Y, 0.25, 0.8 - k * 0.1, [0.8, 0.88, 1], 0.4 - k * 0.06);
    }
  }

  /** objeto 3D do drop: cada família de item tem uma miniatura própria, girando e flutuando */
  function drawLoot(lt: LootPaint, t: number) {
    const c = col(lt.color);
    const ac = col(lt.acc);
    const k = 1 + lt.rarity * 0.14;
    const bob = Math.sin(t * 3 + lt.t) * 0.07;
    const X0 = lt.x * S;
    const Y0 = ROWS - lt.y * S + 0.34 + bob;
    const spin = t * 1.6 + lt.t;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const em = (v: Vec3, m = 0.4): Vec3 => [v[0] * m, v[1] * m, v[2] * m];
    const steel: Vec3 = [0.84, 0.87, 0.92];
    const wood: Vec3 = [0.5, 0.33, 0.2];
    const gold: Vec3 = [0.95, 0.75, 0.2];
    const part = (kind: "cube" | "sphere" | "cone" | "cyl" | "ring", ox: number, oy: number, oz: number, sx: number, sy: number, sz: number, color: Vec3, rot: Vec3 = [0, 0, 0], emis = 0.3) => {
      const rx = (ox * cs - oz * sn) * k;
      const rz = (ox * sn + oz * cs) * k;
      e.prim(kind, [X0 + rx, Y0 + oy * k, 0.05 + rz], [rot[0], rot[1] + spin, rot[2]], [sx * k, sy * k, sz * k], { color, emis: em(color, emis) }, INK_COLOR, 0.04);
    };
    const f = lt.fam;
    if (f === "flask" || f === "bottle") {
      part("sphere", 0, -0.02, 0, 0.3, f === "flask" ? 0.28 : 0.34, 0.3, c, [0, 0, 0], 0.55);
      part("cyl", 0, 0.2, 0, 0.1, 0.16, 0.1, [0.85, 0.9, 0.95]);
      part("cyl", 0, 0.3, 0, 0.12, 0.05, 0.12, wood);
    } else if (f === "bread") {
      part("sphere", 0, 0, 0, 0.5, 0.26, 0.3, [0.85, 0.6, 0.3]);
    } else if (f === "scroll") {
      part("cyl", 0, 0, 0, 0.14, 0.42, 0.14, [0.94, 0.88, 0.74], [0, 0, 1.2]);
      part("sphere", 0, 0, 0.1, 0.11, 0.11, 0.06, c, [0, 0, 0], 0.6);
    } else if (f === "sword" || f === "foil" || f === "knife" || f === "scimitar" || f === "spear" || f === "claws") {
      const len = f === "knife" ? 0.3 : f === "spear" ? 0.8 : 0.55;
      part("cube", 0, 0.05, 0, f === "foil" || f === "spear" ? 0.04 : 0.08, len, 0.025, f === "knife" ? steel : steel, [0, 0, 0.55]);
      part("cube", -0.05, -len * 0.45, 0, 0.28, 0.06, 0.08, f === "spear" ? ac : gold, [0, 0, 0.55]);
      part("cyl", -0.1, -len * 0.62, 0, 0.05, 0.16, 0.05, wood, [0, 0, 0.55]);
      part("sphere", 0, len * 0.5, 0, 0.1, 0.1, 0.1, c, [0, 0, 0], 0.5);
    } else if (f === "wand" || f === "staff" || f === "scepter") {
      part("cyl", 0, 0, 0, 0.05, 0.72, 0.05, f === "scepter" ? gold : wood, [0, 0, 0.5]);
      part("sphere", 0.17, 0.3, 0, 0.17, 0.17, 0.17, c, [0, 0, 0], 0.9);
      part("ring", 0.17, 0.3, 0, 0.3, 0.3, 0.3, ac, [0.5, 0, 0]);
    } else if (f === "axe" || f === "hammer") {
      part("cyl", 0, 0, 0, 0.05, 0.7, 0.05, wood, [0, 0, 0.5]);
      part(f === "axe" ? "cone" : "cube", 0.2, 0.3, 0, f === "axe" ? 0.34 : 0.3, f === "axe" ? 0.34 : 0.22, 0.1, f === "axe" ? steel : c, [0, 0, f === "axe" ? -1.57 : 0.5]);
    } else if (f === "bow" || f === "crossbow") {
      part("ring", 0, 0, 0, 0.55, 0.55, 0.55, wood, [Math.PI / 2, 0, 0.3]);
      part("cube", 0.02, 0, 0, 0.02, 0.6, 0.02, [0.95, 0.93, 0.85]);
    } else if (f === "shield" || f === "orb" || f === "tome" || f === "lantern" || f === "quiver") {
      if (f === "shield") {
        part("cyl", 0, 0, 0, 0.5, 0.07, 0.5, c, [Math.PI / 2, 0, 0], 0.4);
        part("sphere", 0, 0, 0.05, 0.16, 0.16, 0.1, gold);
      } else if (f === "orb") {
        part("sphere", 0, 0.05, 0, 0.36, 0.36, 0.36, c, [0, 0, 0], 0.9);
        part("cyl", 0, -0.2, 0, 0.2, 0.08, 0.2, gold);
      } else if (f === "tome") {
        part("cube", 0, 0, 0, 0.42, 0.52, 0.14, c, [0, 0, 0], 0.4);
        part("cube", 0.02, 0, 0, 0.36, 0.46, 0.15, [0.95, 0.92, 0.82]);
        part("cube", -0.2, 0, 0, 0.05, 0.54, 0.16, ac);
      } else if (f === "lantern") {
        part("cube", 0, 0, 0, 0.3, 0.38, 0.3, c, [0, 0, 0], 0.9);
        part("cube", 0, 0.24, 0, 0.36, 0.06, 0.36, gold);
        part("cube", 0, -0.24, 0, 0.36, 0.06, 0.36, gold);
      } else {
        part("cyl", 0, 0, 0, 0.22, 0.5, 0.22, wood);
        for (let i = -1; i <= 1; i++) part("cube", i * 0.06, 0.34, 0, 0.03, 0.2, 0.03, [0.9, 0.85, 0.7]);
      }
    } else if (f === "cap" || f === "tophat" || f === "hood" || f === "helm" || f === "crown" || f === "mask") {
      if (f === "tophat") {
        part("cyl", 0, 0.05, 0, 0.26, 0.4, 0.26, c);
        part("cyl", 0, -0.14, 0, 0.5, 0.05, 0.5, c);
        part("cyl", 0, -0.04, 0, 0.27, 0.07, 0.27, ac);
      } else if (f === "crown") {
        part("cyl", 0, -0.04, 0, 0.42, 0.14, 0.42, gold, [0, 0, 0], 0.6);
        for (let i = 0; i < 5; i++) part("cone", Math.cos(i * 1.256) * 0.17, 0.1, Math.sin(i * 1.256) * 0.17, 0.1, 0.18, 0.1, gold, [0, 0, 0], 0.6);
      } else if (f === "mask") {
        part("sphere", 0, 0, 0, 0.4, 0.46, 0.14, [0.96, 0.94, 0.9]);
        part("sphere", -0.1, 0.05, 0.07, 0.1, 0.06, 0.04, [0.1, 0.05, 0.08]);
        part("sphere", 0.1, 0.05, 0.07, 0.1, 0.06, 0.04, [0.1, 0.05, 0.08]);
      } else {
        part("sphere", 0, 0, 0, 0.44, f === "cap" ? 0.3 : 0.4, 0.44, f === "helm" ? steel : c);
        if (f === "helm") part("cube", 0, 0.02, 0.2, 0.34, 0.06, 0.04, [0.08, 0.04, 0.06]);
        if (f === "cap") part("cube", 0, -0.08, 0.22, 0.34, 0.04, 0.24, ac);
      }
    } else if (f === "amulet" || f === "charm" || f === "locket" || f === "whistle" || f === "pearls" || f === "scarab" || f === "medal") {
      part("ring", 0, 0.12, 0, 0.5, 0.5, 0.5, [0.75, 0.62, 0.42], [Math.PI / 2 * 0.2, 0, 0]);
      part(f === "charm" ? "cone" : "sphere", 0, -0.14, 0, 0.2, 0.26, 0.12, c, [0, 0, 0], 0.9);
      part("sphere", 0, -0.14, 0.05, 0.08, 0.08, 0.08, ac, [0, 0, 0], 0.9);
    } else if (f === "ring" || f === "ringthin") {
      part("ring", 0, -0.04, 0, 0.34, 0.34, 0.34, gold, [Math.PI / 2 * 0.3, 0, 0], 0.5);
      part("sphere", 0, 0.14, 0, 0.12, 0.14, 0.12, ac, [0, 0, 0], 1);
    } else if (f === "vest" || f === "plate" || f === "tunic" || f === "robe") {
      part("cube", 0, 0, 0, 0.42, f === "robe" ? 0.56 : 0.42, 0.2, f === "plate" ? steel : c, [0, 0, 0], 0.35);
      part("cube", 0, 0.24, 0, 0.5, 0.08, 0.22, f === "plate" ? c : ac);
      part("cube", 0, 0, 0.1, 0.08, 0.4, 0.04, ac);
    } else if (f === "cape" || f === "cloak") {
      part("cone", 0, -0.02, 0, 0.5, 0.5, 0.14, c, [Math.PI, 0, 0], 0.35);
      part("cyl", 0, 0.24, 0, 0.36, 0.05, 0.12, ac);
    } else if (f === "gloves" || f === "gauntlet" || f === "boxing") {
      part("cube", 0, 0, 0, 0.3, f === "boxing" ? 0.3 : 0.34, 0.16, f === "gauntlet" ? steel : c, [0, 0, 0], 0.3);
      part("cube", 0, -0.2, 0, 0.34, 0.1, 0.2, ac);
      for (let i = -1; i <= 1; i++) part("cube", i * 0.08, 0.2, 0, 0.06, 0.12, 0.1, f === "gauntlet" ? steel : c);
    } else if (f === "pants" || f === "greaves") {
      for (const sx of [-1, 1]) part("cube", sx * 0.1, 0, 0, 0.16, 0.5, 0.14, f === "greaves" ? steel : c, [0, 0, sx * -0.05], 0.3);
      part("cube", 0, 0.26, 0, 0.4, 0.08, 0.16, ac);
    } else if (f === "boots" || f === "slippers") {
      part("cube", 0, 0.04, -0.04, 0.2, 0.4, 0.2, c, [0, 0, 0], 0.3);
      part("cube", 0.08, -0.14, 0.08, 0.34, 0.14, 0.22, c, [0, 0, 0], 0.3);
      part("cube", 0, 0.24, -0.04, 0.24, 0.06, 0.24, ac);
    } else {
      part("sphere", 0, 0, 0, 0.3, 0.3, 0.3, c, [0, 0, 0], 0.6);
    }
    // raridade: anel no chão, feixe de luz e faíscas
    if (lt.rarity > 0) {
      const gy = ROWS - lt.y * S + 0.05;
      e.prim("ring", [X0, gy, 0.05], [0, 0, 0], [0.7 + Math.sin(t * 3 + lt.t) * 0.06, 1, 0.7], { color: c, emis: em(c, 0.9), unlit: true }, undefined, 0);
    }
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
    return ({ ivo: "#e0b15a", lena: "#c4373a", osso: "#9fd4d8", syl: "#d2e39a", tito: "#ff7a2a", mari: "#4ac0e0", pia: "#c0c8d4", lumen: "#ffe24a" } as Record<string, string>)[id] ?? "#e0b15a";
  }


  function previewHero(target: HTMLCanvasElement, id: HeroId, t: number, form: boolean, gear?: GearLook) {
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
      const pva = qaPv ? qaPv.a : Math.sin(t * 0.7) * 0.5;
      const pvd = qaPv ? qaPv.d : 1;
      pe.setCamera([Math.sin(pva) * 3.0 * pvd, 1.0 * (0.4 + 0.6 * pvd), Math.cos(pva) * 3.0 * pvd], [0, 0.78, 0], (34 * Math.PI) / 180, 0.3, 40);
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
      const pose: Pose = { t, phase: t * 4, speed: 0.2, vy: 0, facing: 1, form, hurt: false, ally: false, world: 0, attack: 0, gear };
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
