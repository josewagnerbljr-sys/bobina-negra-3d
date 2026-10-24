import { BONUS_NAMES, ENT, POOLS, REEL_NAMES } from "./content";
import { GROUND, MAIN_LEVELS, ROWS, Tile, type Kind, type Level, type LevelEnt } from "./types";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const debugSegs: Record<number, [string, number][]> = {};

class Sketch {
  log: [string, number][] = [];
  cols = 0;
  tiles: number[] = [];
  ents: LevelEnt[] = [];
  spawnC = 3;
  exitC = 4;

  private ensure(cols: number) {
    const next = new Array(ROWS * cols).fill(Tile.Air);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < this.cols; c++) next[r * cols + c] = this.tiles[r * this.cols + c] ?? Tile.Air;
    }
    this.tiles = next;
    this.cols = cols;
  }

  widen(w: number) {
    const start = this.cols;
    this.ensure(this.cols + w);
    return start;
  }

  get(c: number, r: number) {
    if (c < 0 || r < 0 || c >= this.cols || r >= ROWS) return Tile.Air;
    return this.tiles[r * this.cols + c] ?? Tile.Air;
  }

  set(c: number, r: number, t: number) {
    if (c < 0 || r < 0 || c >= this.cols || r >= ROWS) return;
    this.tiles[r * this.cols + c] = t;
  }

  fillFloor(c0: number, c1: number) {
    for (let c = c0; c < c1; c++) for (let r = GROUND; r < ROWS; r++) this.set(c, r, Tile.Solid);
  }

  /** bloco sólido de altura h (em tiles) acima do chão */
  block(c0: number, w: number, h: number) {
    for (let c = c0; c < c0 + w; c++) for (let d = 1; d <= h; d++) this.set(c, GROUND - d, Tile.Solid);
  }

  oneway(c0: number, w: number, row: number) {
    for (let c = c0; c < c0 + w; c++) this.set(c, row, Tile.OneWay);
  }

  ent(kind: Kind, c: number, foot = GROUND, mini = false) {
    this.ents.push({ kind, c, foot, mini: mini || undefined });
  }
}

type Ctx = { pool: Kind[]; rng: () => number; world: number; stage: number; i: number };

const isFly = (k: Kind) => ENT[k].behavior === "fly";
const pick = (ctx: Ctx) => ctx.pool[Math.floor(ctx.rng() * ctx.pool.length)] ?? "imp";
const flyer = (ctx: Ctx) => ctx.pool.find((k) => isFly(k)) ?? null;
const rint = (ctx: Ctx, a: number, b: number) => a + Math.floor(ctx.rng() * (b - a + 1));

function place(sk: Sketch, ctx: Ctx, kind: Kind, c: number, foot = GROUND) {
  sk.ent(kind, c, isFly(kind) ? Math.min(foot, GROUND - 4) : foot);
}

/* ------------------------------------------------------------------ trechos */

function segPlaza(sk: Sketch) {
  const x = sk.widen(28);
  sk.fillFloor(x, x + 28);
  sk.spawnC = x + 3;
  sk.set(x + 8, GROUND - 1, Tile.Checkpoint);
  sk.oneway(x + 14, 6, GROUND - 3);
  sk.ent("candle", x + 12);
}

const SEGS: Record<string, (sk: Sketch, ctx: Ctx) => void> = {
  gap(sk, ctx) {
    const g = rint(ctx, 2, 3);
    const x = sk.widen(g + 12);
    sk.fillFloor(x, x + 6);
    sk.fillFloor(x + 6 + g, x + 12 + g);
    if (ctx.stage > 1) place(sk, ctx, pick(ctx), x + 9 + g);
  },
  platforms(sk, ctx) {
    const x = sk.widen(32);
    sk.fillFloor(x, x + 32);
    const hs = [3, 2, 3];
    hs.forEach((h, i) => sk.oneway(x + 3 + i * 9, 5, GROUND - h));
    place(sk, ctx, pick(ctx), x + 24);
    place(sk, ctx, ctx.pool[0] ?? "imp", x + 8, GROUND - 3);
  },
  combat(sk, ctx) {
    const x = sk.widen(34);
    sk.fillFloor(x, x + 34);
    sk.oneway(x + 6, 6, GROUND - 3);
    sk.oneway(x + 20, 7, GROUND - 3);
    const n = 2 + (ctx.stage > 1 ? 1 : 0) + (ctx.world > 4 ? 1 : 0);
    for (let i = 0; i < n; i++) place(sk, ctx, pick(ctx), x + 8 + i * 6, isFly(pick(ctx)) ? GROUND - 5 : GROUND);
  },
  spikes(sk, ctx) {
    const x = sk.widen(28);
    sk.fillFloor(x, x + 28);
    for (let c = x + 6; c < x + 22; c++) sk.set(c, GROUND, Tile.Spike);
    sk.oneway(x + 7, 5, GROUND - 3);
    sk.oneway(x + 16, 5, GROUND - 3);
    sk.oneway(x + 11, 6, GROUND - 5);
    const f = flyer(ctx);
    if (f) place(sk, ctx, f, x + 14, GROUND - 5);
  },
  stairs(sk, ctx) {
    const x = sk.widen(40);
    sk.fillFloor(x, x + 40);
    const steps = [1, 2, 3, 2, 1];
    steps.forEach((h, i) => sk.block(x + 4 + i * 5, 4, Math.min(h, 2 + (h > 2 ? 1 : 0))));
    place(sk, ctx, ctx.pool[1] ?? ctx.pool[0] ?? "imp", x + 34);
  },
  climb(sk, ctx) {
    const x = sk.widen(26);
    sk.fillFloor(x, x + 26);
    for (let i = 0; i < 4; i++) sk.oneway(x + 2 + (i % 2) * 11, 7, GROUND - 3 - i * 2 > 2 ? GROUND - 3 - i * 2 : 3);
    const f = flyer(ctx);
    if (f) place(sk, ctx, f, x + 16, GROUND - 6);
    else place(sk, ctx, pick(ctx), x + 18);
    if (ctx.rng() < 0.5) sk.ent("chest", x + 13, GROUND - 7);
  },
  spring(sk, ctx) {
    const x = sk.widen(28);
    sk.fillFloor(x, x + 28);
    sk.set(x + 5, GROUND, Tile.Spring);
    for (let c = x + 8; c < x + 25; c++) sk.set(c, GROUND - 5, Tile.Solid);
    for (let r = GROUND - 5; r < ROWS; r++) sk.set(x + 24, r, Tile.Solid);
    sk.ent("candle", x + 18, GROUND - 6);
    if (ctx.rng() < 0.4) sk.ent("chest", x + 15, GROUND - 6);
  },
  tunnel(sk, ctx) {
    const x = sk.widen(30);
    sk.fillFloor(x, x + 30);
    for (let c = x + 4; c < x + 24; c++) sk.set(c, GROUND - 3, Tile.Solid);
    place(sk, ctx, ctx.pool[0] ?? "imp", x + 12);
    place(sk, ctx, ctx.pool[2] ?? ctx.pool[0] ?? "imp", x + 19);
  },
  hills(sk, ctx) {
    const x = sk.widen(44);
    sk.fillFloor(x, x + 44);
    const prof = [1, 2, 2, 1];
    for (let m = 0; m < 3; m++) prof.forEach((h, i) => sk.block(x + 4 + m * 13 + i * 2, 2, h));
    place(sk, ctx, pick(ctx), x + 12);
    place(sk, ctx, pick(ctx), x + 38);
  },
  islands(sk, ctx) {
    const n = rint(ctx, 3, 5);
    const x = sk.widen(10 + n * 6);
    sk.fillFloor(x, x + 5);
    let c = x + 5;
    let level = 0;
    for (let i = 0; i < n; i++) {
      const gap = rint(ctx, 2, 3);
      c += gap;
      const dh = Math.max(0, Math.min(2, level + rint(ctx, -1, 1)));
      level = dh;
      for (let k = 0; k < 3; k++) for (let r = GROUND - dh; r < ROWS; r++) sk.set(c + k, r, Tile.Solid);
      if (i % 2 === 1) place(sk, ctx, pick(ctx), c + 1, GROUND - dh);
      c += 3;
    }
    c += rint(ctx, 2, 3);
    const endX = Math.max(c + 5, x + 10 + n * 6);
    sk.widen(Math.max(0, endX - sk.cols));
    for (let cc = c; cc < endX; cc++) for (let r = GROUND; r < ROWS; r++) sk.set(cc, r, Tile.Solid);
  },
  bridge(sk, ctx) {
    const x = sk.widen(34);
    sk.fillFloor(x, x + 5);
    sk.fillFloor(x + 29, x + 34);
    for (let c = x + 5; c < x + 29; c++) if (c !== x + 16 && c !== x + 17) sk.set(c, GROUND, Tile.OneWay);
    const f = flyer(ctx);
    if (f) place(sk, ctx, f, x + 12, GROUND - 4);
    place(sk, ctx, pick(ctx), x + 22, GROUND - 1);
  },
  pillars(sk, ctx) {
    const x = sk.widen(38);
    sk.fillFloor(x, x + 38);
    const hs = [2, 3, 2, 3];
    hs.forEach((h, i) => sk.block(x + 5 + i * 8, 2, ctx.world > 3 ? h : 2));
    place(sk, ctx, pick(ctx), x + 10);
    place(sk, ctx, pick(ctx), x + 30);
  },
  zigzag(sk, ctx) {
    const x = sk.widen(36);
    sk.fillFloor(x, x + 36);
    for (let i = 0; i < 5; i++) {
      const c0 = x + 4 + i * 6;
      sk.block(c0, 3, 1 + (i % 2));
      if (i < 4) for (let c = c0 + 3; c < c0 + 5; c++) sk.set(c, GROUND, Tile.Spike);
    }
    const f = flyer(ctx);
    if (f) place(sk, ctx, f, x + 18, GROUND - 5);
  },
  spikehop(sk, ctx) {
    const x = sk.widen(30);
    sk.fillFloor(x, x + 30);
    for (let c = x + 5; c < x + 26; c++) sk.set(c, GROUND, Tile.Spike);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) sk.set(x + 6 + i * 5 + k, GROUND, Tile.Solid);
    for (let k = 0; k < 2; k++) sk.set(x + 25 + k, GROUND, Tile.Solid);
    const f = flyer(ctx);
    if (f) place(sk, ctx, f, x + 14, GROUND - 4);
  },
  ledges(sk, ctx) {
    const x = sk.widen(36);
    sk.fillFloor(x, x + 36);
    for (let i = 0; i < 4; i++) sk.oneway(x + 3 + i * 4, 4, GROUND - 2 - i * 2 > 2 ? GROUND - 2 - i * 2 : 3);
    for (let i = 0; i < 3; i++) sk.oneway(x + 20 + i * 4, 4, GROUND - 6 + i * 2);
    place(sk, ctx, pick(ctx), x + 8, GROUND - 4);
    place(sk, ctx, pick(ctx), x + 30);
    if (ctx.rng() < 0.55) sk.ent("chest", x + 14, GROUND - 8);
  },
  dais(sk, ctx) {
    const x = sk.widen(36);
    sk.fillFloor(x, x + 36);
    sk.block(x + 10, 3, 1);
    sk.block(x + 13, 10, 2);
    sk.block(x + 23, 3, 1);
    place(sk, ctx, pick(ctx), x + 16, GROUND - 2);
    place(sk, ctx, pick(ctx), x + 20, GROUND - 2);
    place(sk, ctx, pick(ctx), x + 30);
    sk.ent("candle", x + 5);
  },
  checkpoint(sk) {
    const x = sk.widen(12);
    sk.fillFloor(x, x + 12);
    sk.set(x + 6, GROUND - 1, Tile.Checkpoint);
    sk.ent("candle", x + 9);
  },
};

const SIGNATURE: string[][] = [
  ["spring", "platforms", "pillars"],
  ["tunnel", "spikes", "stairs"],
  ["spikehop", "bridge", "dais"],
  ["hills", "climb", "islands"],
  ["zigzag", "ledges", "pillars"],
  ["hills", "islands", "gap"],
  ["bridge", "zigzag", "spikes"],
  ["islands", "bridge", "gap"],
  ["ledges", "spring", "climb"],
  ["dais", "spikehop", "zigzag"],
];
const GENERIC = ["gap", "platforms", "combat", "combat", "spikes", "stairs", "climb", "spring", "tunnel", "hills", "islands", "bridge", "pillars", "zigzag", "spikehop", "ledges", "dais"];

function arena(sk: Sketch, mini: boolean) {
  const x = sk.widen(mini ? 34 : 44);
  sk.fillFloor(x, x + (mini ? 34 : 44));
  sk.set(x + 3, GROUND - 1, Tile.Checkpoint);
  if (mini) {
    sk.oneway(x + 7, 6, GROUND - 3);
    sk.oneway(x + 21, 6, GROUND - 3);
    sk.ent("boss", x + 24, GROUND, true);
    sk.ent("chest", x + 31);
  } else {
    sk.oneway(x + 8, 7, GROUND - 3);
    sk.oneway(x + 25, 7, GROUND - 3);
    sk.oneway(x + 16, 6, GROUND - 5);
    sk.ent("boss", x + 33);
    sk.exitC = x + 40;
  }
}

function finale(sk: Sketch) {
  const x = sk.widen(18);
  sk.fillFloor(x, x + 18);
  sk.set(x + 6, GROUND - 1, Tile.Checkpoint);
  sk.ent("candle", x + 4);
  sk.exitC = x + 14;
}

function addCrowd(sk: Sketch, i: number, world: number, boss: boolean, rng: () => number) {
  const extra = Math.min(14, Math.floor(i * 0.45) + (i >= 10 ? 1 : 0));
  if (extra <= 0) return;
  const pools = [POOLS[world] ?? POOLS[0]!, POOLS[(world + 9) % 10]!, POOLS[(world + 1) % 10]!];
  const cands: number[] = [];
  const end = sk.cols - (boss ? 50 : 20);
  for (let c = sk.spawnC + 10; c < end; c++) {
    if (sk.get(c, GROUND) !== Tile.Solid) continue;
    if (sk.get(c, GROUND - 1) !== Tile.Air || sk.get(c, GROUND - 2) !== Tile.Air) continue;
    if (sk.get(c - 1, GROUND) !== Tile.Solid || sk.get(c + 1, GROUND) !== Tile.Solid) continue;
    cands.push(c);
  }
  for (let k = cands.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [cands[k], cands[j]] = [cands[j]!, cands[k]!];
  }
  let placed = 0;
  for (const c of cands) {
    if (placed >= extra) break;
    if (sk.ents.some((e) => Math.abs(e.c - c) < 3)) continue;
    const pool = pools[i >= 6 && rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0]!;
    const kind = pool[Math.floor(rng() * pool.length)] ?? "imp";
    sk.ent(kind, c, isFly(kind) ? GROUND - 4 : GROUND);
    placed += 1;
  }
}

function fixEnts(sk: Sketch) {
  for (const e of sk.ents) {
    const def = ENT[e.kind];
    if (def.behavior === "fly") {
      e.foot = Math.min(GROUND - 4, Math.max(3, e.foot));
      continue;
    }
    if (e.c < 1) e.c = 1;
    if (e.c >= sk.cols - 1) e.c = sk.cols - 2;
    let guard = 0;
    while (guard++ < 10) {
      const t = sk.get(e.c, e.foot);
      const surface = t === Tile.Solid || t === Tile.OneWay || t === Tile.Spring;
      if (surface) break;
      const g = sk.get(e.c, GROUND);
      if (g === Tile.Solid || g === Tile.Spring) {
        e.foot = GROUND;
        break;
      }
      e.c += 1;
    }
  }
}

function build(i: number, bonus: boolean): Level {
  const world = bonus ? i - MAIN_LEVELS : Math.floor(i / 5);
  const stage = bonus ? 5 : i % 5;
  const boss = !bonus && stage === 4;
  const mini = !bonus && stage === 2;
  const rng = mulberry32(900 + i * 131 + world * 7);
  const pool = POOLS[world] ?? POOLS[0]!;
  const ctx: Ctx = { pool, rng, world, stage, i };
  const sk = new Sketch();
  segPlaza(sk);

  if (bonus) {
    // mapa-tesouro: poucos monstros, muitos baús, rotas altas e baixas
    const seq = ["platforms", "islands", "ledges", "climb", "spring", "bridge", "hills", "ledges", "gap", "dais"];
    const order = [...SIGNATURE[world]!, ...seq];
    let chests = 0;
    for (let b = 0; b < 12; b++) {
      const id = order[(b * 3 + world) % order.length]!;
      sk.log.push([id, sk.cols]);
      SEGS[id]!(sk, { ...ctx, stage: 1 });
      const c = sk.cols - 10;
      if (b % 2 === 1 && sk.get(c, GROUND) === Tile.Solid) {
        sk.ent("chest", c);
        chests += 1;
      }
      if (b === 5) SEGS.checkpoint!(sk, ctx);
    }
    void chests;
    for (let k = 0; k < 3; k++) sk.ent("chest", sk.cols - 8 - k * 2);
    finale(sk);
    sk.ent("chest", sk.cols - 6);
    cleanSpikes(sk);
  fixEnts(sk);
    debugSegs[i] = sk.log;
    return mk(sk, i, world, false, false, true);
  }

  const beats = boss ? 9 : 10 + Math.min(4, stage * 2 + Math.floor(world / 3));
  const sig = SIGNATURE[world] ?? SIGNATURE[0]!;
  let bag: string[] = [];
  const refill = () => {
    bag = [...sig, ...sig, ...GENERIC];
    for (let k = bag.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [bag[k], bag[j]] = [bag[j]!, bag[k]!];
    }
  };
  refill();
  let last = "";
  for (let b = 0; b < beats; b++) {
    if (bag.length < 3) refill();
    let id = bag.pop()!;
    if (id === last) id = bag.pop() ?? "combat";
    last = id;
    sk.log.push([id, sk.cols]);
    SEGS[id]!(sk, ctx);
    if (b === 3 || b === 7 || b === 11) SEGS.checkpoint!(sk, ctx);
    if (mini && b === Math.floor(beats / 2)) arena(sk, true);
  }
  if (boss) arena(sk, false);
  else finale(sk);
  addCrowd(sk, i, world, boss, rng);
  // todo nível principal tem ao menos um baú
  if (!sk.ents.some((e) => e.kind === "chest")) {
    for (let c = Math.floor(sk.cols * 0.6); c < sk.cols - 20; c++) {
      if (sk.get(c, GROUND) === Tile.Solid && sk.get(c, GROUND - 1) === Tile.Air && sk.get(c + 1, GROUND) === Tile.Solid) {
        sk.ent("chest", c);
        break;
      }
    }
  }
  cleanSpikes(sk);
  fixEnts(sk);
  debugSegs[i] = sk.log;
  return mk(sk, i, world, boss, mini, false);
}

/** espinho nunca encosta na borda de um buraco: ali o herói tomava dano antes de cair */
function cleanSpikes(sk: Sketch) {
  const open = (c: number, r: number) => c >= 0 && c < sk.cols && sk.get(c, r) === Tile.Air && sk.get(c, r + 1) === Tile.Air && sk.get(c, ROWS - 1) === Tile.Air;
  for (let pass = 0; pass < 2; pass++) {
    for (let c = 0; c < sk.cols; c++) {
      for (let r = 0; r <= GROUND; r++) {
        if (sk.get(c, r) !== Tile.Spike) continue;
        let near = false;
        for (let dc = -2; dc <= 2; dc++) if (dc !== 0 && open(c + dc, r) && sk.get(c + dc, GROUND) === Tile.Air) near = true;
        if (near && r === GROUND) sk.set(c, r, Tile.Solid);
      }
    }
  }
}

function mk(sk: Sketch, i: number, world: number, boss: boolean, mini: boolean, bonus: boolean): Level {
  return {
    index: i,
    name: bonus ? (BONUS_NAMES[i - MAIN_LEVELS] ?? "Bis") : (REEL_NAMES[i] ?? `Rolo ${i + 1}`),
    world,
    boss,
    mini,
    bonus,
    cols: sk.cols,
    rows: ROWS,
    tiles: Uint8Array.from(sk.tiles),
    ents: sk.ents,
    spawn: { c: sk.spawnC, foot: GROUND },
    exit: { c: sk.exitC, foot: GROUND },
  };
}

export function buildLevel(index: number): Level {
  const i = Math.max(0, Math.min(MAIN_LEVELS + 9, index));
  return build(i, i >= MAIN_LEVELS);
}
