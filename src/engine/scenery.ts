import { addBox, addCone, addSphere, hex, m4, mix3, newGeo, type Geo, type Vec3 } from "./gl";
import { GROUND, ROWS, Tile, type Level } from "../game/types";
import type { WorldDef } from "../game/content";

/* Geração procedural do cenário 3D: terreno (blocos), decoração do chão e fundo
   com profundidade real (a perspectiva cria o paralaxe sozinha). */

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** copia `src` para `dst` aplicando rotação/translação/escala */
function bake(dst: Geo, src: Geo, p: Vec3, r: Vec3 = [0, 0, 0], s: Vec3 = [1, 1, 1]) {
  const m = m4.compose(m4.create(), p, r, s);
  const base = dst.pos.length / 3;
  for (let i = 0; i < src.pos.length; i += 3) {
    const x = src.pos[i]!, y = src.pos[i + 1]!, z = src.pos[i + 2]!;
    dst.pos.push(m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, m[1]! * x + m[5]! * y + m[9]! * z + m[13]!, m[2]! * x + m[6]! * y + m[10]! * z + m[14]!);
    const nx = src.nor[i]!, ny = src.nor[i + 1]!, nz = src.nor[i + 2]!;
    const ox = m[0]! * nx + m[4]! * ny + m[8]! * nz;
    const oy = m[1]! * nx + m[5]! * ny + m[9]! * nz;
    const oz = m[2]! * nx + m[6]! * ny + m[10]! * nz;
    const l = Math.hypot(ox, oy, oz) || 1;
    dst.nor.push(ox / l, oy / l, oz / l);
    dst.col.push(src.col[i]!, src.col[i + 1]!, src.col[i + 2]!);
  }
  for (const i of src.idx) dst.idx.push(base + i);
}

function jitter(c: Vec3, k: number, rnd: () => number): Vec3 {
  const f = 1 + (rnd() - 0.5) * k;
  return [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)];
}

export type Palette = {
  ground: Vec3;
  groundDark: Vec3;
  trim: Vec3;
  accent: Vec3;
  hill: Vec3;
  hill2: Vec3;
  fog: Vec3;
  sky2: Vec3;
};

export function paletteOf(w: WorldDef): Palette {
  return {
    ground: hex(w.ground),
    groundDark: hex(w.groundDark),
    trim: hex(w.trim),
    accent: hex(w.accent),
    hill: hex(w.hill),
    hill2: hex(w.hill2),
    fog: hex(w.fog),
    sky2: hex(w.sky2),
  };
}

export type Lantern = { x: number; y: number; idx: number };

export type LevelParts = {
  terrain: Geo;
  back: Geo;
  glow: Geo;
  lanterns: Lantern[];
};

const D_BACK = -1.1;
const D_FRONT = 1.0;

export function buildLevelParts(level: Level, world: WorldDef): LevelParts {
  const pal = paletteOf(world);
  const rnd = mulberry(7000 + level.index * 31);
  const terrain = newGeo();
  const back = newGeo();
  const glow = newGeo();
  const lanterns: Lantern[] = [];
  const { cols } = level;
  const T = level.tiles;
  const at = (c: number, r: number) => (c < 0 || c >= cols || r < 0 || r >= ROWS ? (c < 0 || c >= cols ? Tile.Solid : Tile.Air) : T[r * cols + c]!);
  const solid = (c: number, r: number) => at(c, r) === Tile.Solid;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const t = T[r * cols + c]!;
      if (t === Tile.Air) continue;
      const x0 = c;
      const x1 = c + 1;
      const y1 = ROWS - r;
      const y0 = y1 - 1;
      if (t === Tile.Solid) {
        const deep = r > GROUND;
        const base = jitter(deep ? pal.groundDark : pal.ground, 0.16, rnd);
        const open = !solid(c, r - 1);
        // blocos totalmente cercados só aparecem pela frente
        addBox(
          terrain,
          x0,
          y0,
          D_BACK,
          x1,
          open ? y1 - 0.14 : y1,
          D_FRONT,
          base,
          { px: !solid(c + 1, r), nx: !solid(c - 1, r), py: !open, ny: false, pz: true },
        );
        if (open) {
          // tampa de acabamento (grama/enfeite) um pouco mais larga e funda
          addBox(terrain, x0 - 0.01, y1 - 0.16, D_BACK - 0.06, x1 + 0.01, y1, D_FRONT + 0.07, jitter(mix3(pal.trim, pal.ground, 0.4), 0.12, rnd), { px: !solid(c + 1, r), nx: !solid(c - 1, r), py: true, pz: true, ny: false });
        }
        // moldura em relevo na face da frente
        const insetCol = mix3(base, pal.groundDark, 0.45);
        addBox(terrain, x0 + 0.09, y0 + 0.09, D_FRONT, x1 - 0.09, y1 - (open ? 0.24 : 0.09), D_FRONT + 0.035, insetCol, { px: false, nx: false, py: false, ny: false, pz: true });
      } else if (t === Tile.OneWay) {
        const wood = mix3(pal.trim, pal.ground, 0.45);
        addBox(terrain, x0, y1 - 0.24, -0.85, x1, y1, 0.85, jitter(wood, 0.12, rnd), { px: !(at(c + 1, r) === Tile.OneWay), nx: !(at(c - 1, r) === Tile.OneWay), py: true, ny: false, pz: true }, jitter(pal.trim, 0.1, rnd));
        addBox(terrain, x0 + 0.05, y1 - 0.4, 0.78, x1 - 0.05, y1 - 0.24, 0.84, pal.groundDark, { px: false, nx: false, py: false, ny: false, pz: true });
        if (c % 3 === 0) addBox(terrain, x0 + 0.42, y1 - 0.7, -0.05, x0 + 0.58, y1 - 0.24, 0.05, pal.groundDark, { ny: false });
      } else if (t === Tile.Spike) {
        addBox(terrain, x0, y0, -0.9, x1, y0 + 0.14, 0.9, pal.groundDark, { ny: false });
        const steel: Vec3 = [0.82, 0.84, 0.88];
        for (let k = 0; k < 3; k++) {
          for (const z of [-0.45, 0.35]) {
            addCone(terrain, x0 + 0.17 + k * 0.33, y0 + 0.14, z, 0.14, 0, 0.78, 7, steel, [0.95, 0.35, 0.3]);
          }
        }
      } else if (t === Tile.Spring) {
        addBox(terrain, x0 + 0.08, y0, -0.7, x1 - 0.08, y0 + 0.18, 0.7, [0.3, 0.24, 0.22], { ny: false });
        addCone(terrain, x0 + 0.5, y0 + 0.18, 0, 0.26, 0.26, 0.5, 10, hex("#e0b15a"));
        addBox(terrain, x0 + 0.02, y1 - 0.2, -0.75, x1 - 0.02, y1 - 0.06, 0.75, hex("#c4373a"), { ny: false });
      } else if (t === Tile.Checkpoint) {
        // poste e base (lanterna é dinâmica)
        addBox(terrain, x0 + 0.3, y0, -0.2, x1 - 0.3, y0 + 0.14, 0.2, pal.groundDark, { ny: false });
        addBox(terrain, x0 + 0.46, y0 + 0.14, -0.04, x0 + 0.54, y0 + 1.08, 0.04, [0.2, 0.15, 0.14], { ny: false });
        addBox(terrain, x0 + 0.46, y0 + 1.0, -0.04, x0 + 0.86, y0 + 1.08, 0.04, [0.2, 0.15, 0.14], { ny: false });
        lanterns.push({ x: x0 + 0.86, y: y0 + 0.84, idx: r * cols + c });
      }
    }
  }

  // paredes laterais da fase e abismo
  const wallCol = pal.groundDark;
  addBox(terrain, -16, -8, -3, 0, ROWS + 10, 2.5, wallCol, { px: true, nx: false, py: true, pz: true });
  addBox(terrain, cols, -8, -3, cols + 16, ROWS + 10, 2.5, wallCol, { px: false, nx: true, py: true, pz: true });
  addBox(terrain, 0, -8, -3, cols, 0.0, 2.5, mix3(pal.groundDark, [0, 0, 0], 0.55), { px: false, nx: false, py: true, pz: true });
  // listras verticais nas paredes
  for (let i = 0; i < 5; i++) {
    addBox(terrain, -16 + i * 3, 0, 2.5, -15 + i * 3, ROWS + 10, 2.54, mix3(wallCol, pal.trim, 0.12), { px: false, nx: false, py: false, ny: false, pz: true });
    addBox(terrain, cols + 1 + i * 3, 0, 2.5, cols + 2 + i * 3, ROWS + 10, 2.54, mix3(wallCol, pal.trim, 0.12), { px: false, nx: false, py: false, ny: false, pz: true });
  }

  // enfeites do chão
  for (let c = 1; c < cols - 1; c++) {
    if (!solid(c, GROUND) || solid(c, GROUND - 1)) continue;
    if (rnd() > 0.2) continue;
    const z = -0.3 - rnd() * 0.55; // sempre atrás da pista, para nunca esconder o herói
    decor(terrain, glow, world.id, c + 0.2 + rnd() * 0.6, ROWS - GROUND, z, rnd, pal);
  }

  buildBackdrop(back, glow, level, world, pal);
  return { terrain, back, glow, lanterns };
}

function decor(g: Geo, glow: Geo, w: number, x: number, y: number, z: number, rnd: () => number, pal: Palette) {
  const s = 0.7 + rnd() * 0.6;
  if (w === 0) {
    const a = rnd() < 0.5 ? hex("#c4373a") : hex("#f4e4c8");
    addCone(g, x, y, z, 0.2 * s, 0.2 * s, 0.34 * s, 8, a);
    addCone(g, x, y + 0.34 * s, z, 0.28 * s, 0, 0.36 * s, 8, rnd() < 0.5 ? hex("#2a4f86") : hex("#e0b15a"));
  } else if (w === 1) {
    if (rnd() < 0.5) {
      addSphere(g, x, y + 0.16 * s, z, 0.16 * s, 8, 6, hex("#efe8d8"));
      addBox(g, x - 0.1 * s, y, z - 0.04, x + 0.1 * s, y + 0.06, z + 0.04, hex("#efe8d8"), { ny: false });
    } else {
      addCone(g, x, y, z, 0.09, 0.07, 0.34 * s, 6, hex("#f4e4c8"));
      addSphere(glow, x, y + 0.4 * s, z, 0.05, 5, 4, hex("#ffcf6a"));
    }
  } else if (w === 2) {
    if (rnd() < 0.5) {
      addCone(g, x, y, z, 0.2 * s, 0.2 * s, 0.4 * s, 9, hex("#6b4a2f"));
      addCone(g, x, y + 0.4 * s, z, 0.2 * s, 0.2 * s, 0.04, 9, hex("#e08a3a"));
    } else {
      addBox(g, x - 0.18 * s, y, z - 0.18 * s, x + 0.18 * s, y + 0.3 * s, z + 0.18 * s, hex("#6a625c"), { ny: false });
      addBox(g, x - 0.1 * s, y + 0.3 * s, z - 0.1 * s, x + 0.1 * s, y + 0.42 * s, z + 0.1 * s, hex("#8a7c70"), { ny: false });
    }
  } else if (w === 3) {
    if (rnd() < 0.55) {
      for (let k = -1; k <= 1; k++) addCone(g, x + k * 0.07, y, z, 0.06, 0, (0.3 + rnd() * 0.25) * s, 5, hex(k === 0 ? "#6aaa48" : "#4a8a3a"));
    } else {
      addCone(g, x, y, z, 0.05, 0.05, 0.22 * s, 6, hex("#f4efe4"));
      addSphere(g, x, y + 0.24 * s, z, 0.17 * s, 8, 5, hex("#c4373a"));
      addSphere(glow, x, y + 0.3 * s, z + 0.1 * s, 0.03, 4, 3, hex("#fff4d8"));
    }
  } else {
    const cols2 = ["#c4373a", "#2a4f86", "#e0b15a", "#6aaa48", "#c9b6e0"];
    for (let k = 0; k < 3; k++) {
      addBox(g, x - 0.2 * s + k * 0.02, y + k * 0.1, z - 0.15, x + 0.2 * s - k * 0.02, y + (k + 1) * 0.1, z + 0.15, hex(cols2[Math.floor(rnd() * 5)]!), { ny: false });
    }
  }
  void pal;
}

/* ------------------------------------------------------------------ fundo */

function buildBackdrop(g: Geo, glow: Geo, level: Level, world: WorldDef, pal: Palette) {
  const rnd = mulberry(1234 + level.index * 17 + world.id * 101);
  const cols = level.cols;
  const w = world.id;
  const x0 = -22;
  const x1 = cols + 22;

  // piso corrido atrás da pista
  addBox(g, x0, -2, -70, x1, ROWS - GROUND - 0.001, -1.05, mix3(pal.hill, pal.groundDark, 0.5), { px: false, nx: false, py: true, pz: false, ny: false });

  // meio-plano: peças pequenas logo atrás da pista, a cada poucos tiles
  const stage = level.index % 5;
  for (let x = x0 + 4; x < x1; x += 7 + rnd() * (9 - stage)) {
    midProp(g, glow, w, x, -2.2 - rnd() * 1.6, 0.8 + rnd() * 0.5 + stage * 0.05, rnd, pal);
  }

  const dm = [1, 0.8, 1.15, 0.9, 1.3][stage]!; // densidade do fundo muda por nível
  const layers = [
    { z: -7, dens: 11 * dm, scale: 0.8, col: mix3(pal.hill2, pal.fog, 0.1), jit: 3 },
    { z: -17, dens: 8 * dm, scale: 1.2, col: mix3(pal.hill2, pal.fog, 0.35), jit: 5 },
    { z: -32, dens: 12 * dm, scale: 1.8, col: mix3(pal.hill, pal.fog, 0.55), jit: 8 },
    { z: -52, dens: 16 * dm, scale: 2.8, col: mix3(pal.hill, pal.fog, 0.75), jit: 14 },
  ];
  for (const L of layers) {
    for (let x = x0; x < x1; x += L.dens * (0.7 + rnd() * 0.6)) {
      const z = L.z - rnd() * L.jit;
      const s = L.scale * (0.7 + rnd() * 0.7);
      prop(g, glow, w, x, z, s, rnd, L.col, pal, L.z, level.index % 5);
    }
  }
}

function propLegacy(g: Geo, glow: Geo, w: number, x: number, z: number, s: number, rnd: () => number, col: Vec3, pal: Palette, layerZ: number, force: number) {
  const gy = ROWS - GROUND - 0.05; // topo do chão
  const near = layerZ > -10;
  const tint = (c: Vec3, k = 0.25) => mix3(col, c, near ? k : k * 0.5);
  if (w === 0) {
    const pick = force < 0 ? rnd() : [0.2, 0.72, 0.95][force]!;
    if (pick < 0.55) {
      // tenda de circo
      addCone(g, x, gy, z, 2.2 * s, 2.2 * s, 2.0 * s, 10, tint(pal.accent, 0.3));
      addCone(g, x, gy + 2.0 * s, z, 2.7 * s, 0.0, 2.6 * s, 10, tint(pal.trim, 0.35));
      addCone(g, x, gy + 4.5 * s, z, 0.05, 0.05, 0.9 * s, 5, tint(pal.trim, 0.5));
      addCone(g, x + 0.3 * s, gy + 5.0 * s, z, 0.5 * s, 0, 0.3 * s, 5, tint(pal.accent, 0.5));
      addBox(glow, x - 0.5 * s, gy + 0.1, z + 2.15 * s, x + 0.5 * s, gy + 1.5 * s, z + 2.2 * s, mix3(pal.trim, [0, 0, 0], 0.35), { px: false, nx: false, py: false, ny: false, pz: true });
    } else if (pick < 0.8) {
      // mastro com luzes
      addCone(g, x, gy, z, 0.18 * s, 0.14 * s, 7 * s, 6, tint([0.3, 0.2, 0.2], 0.4));
      for (let k = 0; k < 6; k++) addSphere(glow, x + Math.sin(k) * 0.9 * s, gy + (6 - k * 0.3) * s, z, 0.14 * s, 5, 4, k % 2 ? pal.trim : pal.accent);
    } else if (rnd() < 0.5 || layerZ < -25) {
      // roda-gigante
      const wheel = newGeo();
      const R = 5.5 * s;
      addCone(wheel, 0, 0, 0, 0.35 * s, 0.35 * s, 0.4 * s, 8, tint(pal.trim, 0.3));
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const cx = Math.cos(a) * R;
        const cy = Math.sin(a) * R;
        addBox(wheel, cx - 0.22 * s, cy - 0.22 * s, -0.2, cx + 0.22 * s, cy + 0.22 * s, 0.2, tint(k % 2 ? pal.accent : pal.trim, 0.45), { ny: true, nz: true });
        const spoke = newGeo();
        addBox(spoke, 0, -0.05 * s, -0.08, R, 0.05 * s, 0.08, tint([0.3, 0.25, 0.3], 0.3), { ny: true, nz: true });
        bake(wheel, spoke, [0, 0, 0], [0, 0, a]);
      }
      bake(g, wheel, [x, gy + R + 1.4 * s, z]);
      addBox(g, x - 0.3 * s, gy, z - 0.2, x + 0.3 * s, gy + R + 1.4 * s, z + 0.2, tint([0.3, 0.2, 0.2], 0.3));
    }
  } else if (w === 1) {
    const pick = force < 0 ? rnd() : [0.2, 0.72, 0.95][force]!;
    if (pick < 0.5) {
      // arco de pedra
      const hh = (5 + rnd() * 2) * s;
      for (const sx of [-1, 1]) {
        addBox(g, x + sx * 1.8 * s - 0.45 * s, gy, z - 0.5, x + sx * 1.8 * s + 0.45 * s, gy + hh, z + 0.5, tint(pal.trim, 0.12));
        addBox(g, x + sx * 1.8 * s - 0.6 * s, gy + hh, z - 0.62, x + sx * 1.8 * s + 0.6 * s, gy + hh + 0.4 * s, z + 0.62, tint(pal.trim, 0.2));
      }
      addBox(g, x - 2.4 * s, gy + hh + 0.3 * s, z - 0.5, x + 2.4 * s, gy + hh + 1.0 * s, z + 0.5, tint(pal.trim, 0.15));
      addSphere(glow, x, gy + hh * 0.55, z, 0.2 * s, 6, 5, pal.accent);
    } else if (pick < 0.8) {
      // estalactites
      for (let k = 0; k < 4; k++) {
        const len = (3.5 + rnd() * 3) * s;
        addCone(g, x + k * 1.1 * s, ROWS + 7 - len, z, 0, 0.55 * s, len, 6, tint(pal.hill2, 0.2));
      }
    } else {
      // pilha de ossos
      for (let k = 0; k < 6; k++) addSphere(g, x + (rnd() - 0.5) * 3 * s, gy + 0.3 * s + rnd() * 0.5, z + rnd(), 0.45 * s, 6, 5, tint([0.9, 0.88, 0.8], 0.25));
    }
  } else if (w === 2) {
    const pick = force < 0 ? rnd() : [0.2, 0.72, 0.95][force]!;
    if (pick < 0.42) {
      // chaminé
      const hh = (7 + rnd() * 5) * s;
      addCone(g, x, gy, z, 1.2 * s, 0.9 * s, hh, 9, tint([0.25, 0.2, 0.2], 0.2));
      addCone(g, x, gy + hh - 1.0 * s, z, 0.95 * s, 0.95 * s, 0.6 * s, 9, tint(pal.accent, 0.5));
      for (let k = 0; k < 4; k++) addSphere(g, x + k * 0.5 * s, gy + hh + (0.8 + k * 1.1) * s, z, (0.8 + k * 0.25) * s, 7, 5, mix3(col, [0.4, 0.4, 0.42], 0.2));
      addSphere(glow, x, gy + hh - 0.7 * s, z + 0.95 * s, 0.25 * s, 5, 4, pal.trim);
    } else if (pick < 0.75) {
      // engrenagem gigante
      const gear = newGeo();
      const R = (2.4 + rnd()) * s;
      addCone(gear, 0, -0.4, 0, R, R, 0.8, 16, tint([0.35, 0.3, 0.28], 0.3));
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const tooth = newGeo();
        addBox(tooth, -0.3 * s, R - 0.1, -0.4, 0.3 * s, R + 0.55 * s, 0.4, tint([0.4, 0.34, 0.3], 0.3), { ny: true });
        bake(gear, tooth, [0, 0, 0], [0, a, 0]);
      }
      addCone(gear, 0, 0.35, 0, R * 0.3, R * 0.3, 0.12, 10, tint(pal.trim, 0.4));
      bake(g, gear, [x, gy + R + 0.5 * s + rnd() * 3, z], [Math.PI / 2, 0, 0]);
    } else {
      // tubulação horizontal
      const pipe = newGeo();
      addCone(pipe, 0, -5 * s, 0, 0.5 * s, 0.5 * s, 10 * s, 9, tint([0.3, 0.26, 0.26], 0.25));
      bake(g, pipe, [x, gy + (2 + rnd() * 5) * s, z], [0, 0, Math.PI / 2]);
      addBox(g, x - 0.35 * s, gy, z - 0.3, x + 0.35 * s, gy + 5 * s, z + 0.3, tint([0.3, 0.26, 0.26], 0.2));
    }
  } else if (w === 3) {
    const pick = force < 0 ? rnd() : [0.2, 0.72, 0.95][force]!;
    if (pick < 0.7) {
      const hh = (4 + rnd() * 3) * s;
      addCone(g, x, gy, z, 0.5 * s, 0.38 * s, hh, 7, tint([0.3, 0.2, 0.14], 0.3));
      for (let k = 0; k < 3; k++) addCone(g, x, gy + hh * (0.45 + k * 0.22), z, (2.3 - k * 0.55) * s, 0, 2.4 * s, 8, tint(k % 2 ? pal.accent : [0.2, 0.45, 0.25], 0.35));
    } else if (pick < 0.88) {
      addCone(g, x, gy, z, 0.35 * s, 0.35 * s, 2.6 * s, 7, tint([0.9, 0.9, 0.8], 0.2));
      addSphere(g, x, gy + 2.7 * s, z, 1.7 * s, 9, 6, tint(pal.accent, 0.45));
      addSphere(glow, x + 0.3 * s, gy + 3 * s, z + 1.2 * s, 0.14 * s, 5, 4, [1, 0.95, 0.75]);
    } else {
      for (let k = 0; k < 5; k++) addSphere(g, x + (rnd() - 0.5) * 3 * s, gy + 0.6 * s, z + (rnd() - 0.5) * 2, 0.9 * s, 7, 5, tint([0.25, 0.4, 0.25], 0.3));
    }
  } else {
    const pick = force < 0 ? rnd() : [0.2, 0.72, 0.95][force]!;
    if (pick < 0.55) {
      // estante de livros
      const hh = (6 + rnd() * 3) * s;
      const ww = 2.6 * s;
      addBox(g, x - ww / 2, gy, z - 0.8, x + ww / 2, gy + hh, z + 0.1, tint([0.28, 0.2, 0.15], 0.2));
      const rows = Math.floor(hh / (1.1 * s));
      for (let r = 0; r < rows; r++) {
        let bx = x - ww / 2 + 0.12 * s;
        while (bx < x + ww / 2 - 0.2 * s) {
          const bw = (0.12 + rnd() * 0.16) * s;
          const bh = (0.7 + rnd() * 0.3) * s;
          const colb = [pal.accent, pal.trim, hex("#c4373a"), hex("#2a4f86"), hex("#6aaa48")][Math.floor(rnd() * 5)]!;
          addBox(g, bx, gy + 0.15 * s + r * 1.1 * s, z + 0.1, bx + bw, gy + 0.15 * s + r * 1.1 * s + bh, z + 0.55 * s, tint(colb, 0.5), { px: false, nx: false, py: false, ny: false, pz: true });
          bx += bw + 0.02 * s;
        }
      }
    } else if (pick < 0.8) {
      // páginas flutuando
      for (let k = 0; k < 5; k++) {
        const page = newGeo();
        addBox(page, -0.6 * s, -0.8 * s, -0.02, 0.6 * s, 0.8 * s, 0.02, tint([0.95, 0.92, 0.85], 0.3), { ny: true, nz: true });
        bake(g, page, [x + (rnd() - 0.5) * 6 * s, gy + (3 + rnd() * 6) * s, z + (rnd() - 0.5) * 3], [rnd() - 0.5, rnd() * 2, rnd() - 0.5]);
      }
    } else {
      // lampião
      addCone(g, x, gy, z, 0.12 * s, 0.1 * s, 4 * s, 6, tint([0.25, 0.2, 0.2], 0.3));
      addSphere(glow, x, gy + 4.3 * s, z, 0.5 * s, 8, 6, mix3(pal.trim, [1, 1, 1], 0.3));
    }
  }
}


/* --------------------------------------------------------- novos elementos */

type Ctx = { g: Geo; glow: Geo; x: number; z: number; s: number; rnd: () => number; col: Vec3; pal: Palette; gy: number; tint: (c: Vec3, k?: number) => Vec3 };

const NEW_PROPS: ((c: Ctx) => void)[][] = [
  // 0 · Carnaval de Verniz
  [
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // carrossel
      addCone(g, x, gy, z, 2.6 * s, 2.6 * s, 0.35 * s, 14, tint(pal.trim, 0.3));
      addCone(g, x, gy + 0.35 * s, z, 0.25 * s, 0.25 * s, 3.2 * s, 8, tint(pal.accent, 0.4));
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        addCone(g, x + Math.cos(a) * 2.2 * s, gy + 0.35 * s, z + Math.sin(a) * 2.2 * s, 0.07 * s, 0.07 * s, 3.0 * s, 5, tint(pal.trim, 0.5));
        addSphere(g, x + Math.cos(a) * 2.2 * s, gy + (1.1 + (k % 2) * 0.5) * s, z + Math.sin(a) * 2.2 * s, 0.34 * s, 6, 5, tint(k % 2 ? [0.95, 0.9, 0.8] : pal.accent, 0.4));
        addSphere(glow, x + Math.cos(a) * 2.7 * s, gy + 3.45 * s, z + Math.sin(a) * 2.7 * s, 0.12 * s, 4, 3, k % 2 ? pal.trim : [1, 0.9, 0.7]);
      }
      addCone(g, x, gy + 3.5 * s, z, 3.0 * s, 0, 1.6 * s, 14, tint(pal.accent, 0.45));
    },
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // varal de bandeirolas entre dois mastros
      const h = 5.2 * s;
      for (const sx of [-1, 1]) addCone(g, x + sx * 3.4 * s, gy, z, 0.14 * s, 0.1 * s, h, 6, tint([0.3, 0.2, 0.2], 0.3));
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        const px = x - 3.4 * s + u * 6.8 * s;
        const py = gy + h - Math.sin(u * Math.PI) * 0.9 * s;
        addCone(g, px, py - 0.5 * s, z, 0.22 * s, 0, 0.5 * s, 4, tint(k % 3 === 0 ? pal.accent : k % 3 === 1 ? pal.trim : [0.3, 0.5, 0.85], 0.55));
        addSphere(glow, px, py, z + 0.05, 0.08 * s, 4, 3, [1, 0.9, 0.6]);
      }
    },
    ({ g, glow, x, z, s, rnd, tint, pal, gy }) => {
      // canhão de palco + fogos congelados no céu
      addCone(g, x, gy, z, 0.9 * s, 0.9 * s, 0.5 * s, 8, tint([0.25, 0.2, 0.2], 0.3));
      const barrel = newGeo();
      addCone(barrel, 0, 0, 0, 0.5 * s, 0.4 * s, 2.4 * s, 9, tint(pal.trim, 0.35));
      bake(g, barrel, [x, gy + 0.5 * s, z], [0, 0, -0.9]);
      const cx = x + 3.5 * s;
      const cy = gy + (10 + rnd() * 5) * s;
      const cc = [pal.accent, pal.trim, [0.4, 0.7, 1] as Vec3][Math.floor(rnd() * 3)]!;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        for (let r = 1; r <= 2; r++) addSphere(glow, cx + Math.cos(a) * r * 0.9 * s, cy + Math.sin(a) * r * 0.9 * s, z, (0.22 - r * 0.05) * s, 4, 3, cc);
      }
      addSphere(glow, cx, cy, z, 0.35 * s, 5, 4, [1, 0.95, 0.8]);
    },
  ],
  // 1 · Catacumbas de Medula
  [
    ({ g, glow, x, z, s, rnd, tint, pal, gy }) => {
      // colunas com velas
      const hh = (5.5 + rnd() * 2) * s;
      for (const sx of [-1, 1]) {
        addCone(g, x + sx * 1.4 * s, gy, z, 0.5 * s, 0.42 * s, hh, 8, tint(pal.trim, 0.14));
        addBox(g, x + sx * 1.4 * s - 0.7 * s, gy + hh, z - 0.7 * s, x + sx * 1.4 * s + 0.7 * s, gy + hh + 0.35 * s, z + 0.7 * s, tint(pal.trim, 0.22));
        addSphere(glow, x + sx * 1.4 * s, gy + hh + 0.8 * s, z, 0.22 * s, 5, 4, [1, 0.75, 0.35]);
      }
    },
    ({ g, x, z, s, tint, pal, gy }) => {
      // fileira de sarcófagos
      for (let k = 0; k < 3; k++) {
        const bx = x + k * 2.6 * s;
        addBox(g, bx, gy, z - 0.8 * s, bx + 2.0 * s, gy + 1.0 * s, z + 0.8 * s, tint(pal.trim, 0.1), { ny: false });
        addBox(g, bx - 0.1 * s, gy + 1.0 * s, z - 0.9 * s, bx + 2.1 * s, gy + 1.25 * s, z + 0.9 * s, tint(pal.trim, 0.2), { ny: false });
        addBox(g, bx + 0.9 * s, gy + 1.25 * s, z - 0.08, bx + 1.1 * s, gy + 1.9 * s, z + 0.08, tint(pal.accent, 0.4));
        addBox(g, bx + 0.7 * s, gy + 1.55 * s, z - 0.08, bx + 1.3 * s, gy + 1.7 * s, z + 0.08, tint(pal.accent, 0.4));
      }
    },
    ({ g, glow, x, z, s, rnd, tint, pal, gy }) => {
      // cristais da medula
      for (let k = 0; k < 7; k++) {
        const c = newGeo();
        const hh = (1.6 + rnd() * 2.4) * s;
        addCone(c, 0, 0, 0, 0.38 * s, 0, hh, 5, tint(pal.accent, 0.55));
        bake(g, c, [x + (rnd() - 0.5) * 3 * s, gy - 0.05, z + (rnd() - 0.5) * 1.5], [0, rnd() * 3, (rnd() - 0.5) * 0.6]);
        addSphere(glow, x + (rnd() - 0.5) * 3 * s, gy + hh * 0.7, z + 0.1, 0.16 * s, 4, 3, pal.accent);
      }
    },
  ],
  // 2 · Forja dos Golens
  [
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // fornalha com boca em brasa
      addBox(g, x - 2.2 * s, gy, z - 1.5 * s, x + 2.2 * s, gy + 3.6 * s, z + 1.5 * s, tint([0.28, 0.22, 0.2], 0.2), { ny: false });
      addBox(glow, x - 1.0 * s, gy + 0.4 * s, z + 1.5 * s, x + 1.0 * s, gy + 2.0 * s, z + 1.55 * s, [1, 0.45, 0.12], { px: false, nx: false, py: false, ny: false, pz: true });
      addCone(g, x, gy + 3.6 * s, z, 1.0 * s, 0.7 * s, 3.2 * s, 8, tint([0.25, 0.2, 0.2], 0.2));
      addSphere(glow, x, gy + 6.9 * s, z, 0.45 * s, 5, 4, pal.trim);
    },
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // guindaste com corrente e gancho
      addBox(g, x - 0.3 * s, gy, z - 0.3 * s, x + 0.3 * s, gy + 9 * s, z + 0.3 * s, tint([0.3, 0.26, 0.24], 0.25));
      addBox(g, x - 0.3 * s, gy + 8.6 * s, z - 0.25, x + 4.4 * s, gy + 9.1 * s, z + 0.25, tint([0.3, 0.26, 0.24], 0.25));
      for (let k = 0; k < 6; k++) addSphere(g, x + 3.8 * s, gy + (8.4 - k * 0.45) * s, z, 0.14 * s, 5, 4, tint([0.4, 0.36, 0.34], 0.2));
      addCone(g, x + 3.8 * s, gy + 5.5 * s, z, 0.4 * s, 0.1 * s, 0.7 * s, 6, tint(pal.trim, 0.4));
      addSphere(glow, x + 3.8 * s, gy + 5.3 * s, z, 0.18 * s, 4, 3, pal.trim);
    },
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // poço de lava no fundo
      addBox(glow, x - 4.5 * s, gy + 0.02, z - 1.5, x + 4.5 * s, gy + 0.08, z + 1.5, mix3(pal.trim, [1, 0.3, 0.05], 0.5), { px: false, nx: false, ny: false, pz: false, py: true });
      for (let k = 0; k < 4; k++) addSphere(glow, x + (k - 1.5) * 2.2 * s, gy + 0.5 * s + (k % 2) * 0.5, z, 0.22 * s, 4, 3, [1, 0.6, 0.2]);
      addCone(g, x - 4.8 * s, gy, z, 0.5 * s, 0.3 * s, 1.1 * s, 6, tint([0.22, 0.18, 0.18], 0.2));
      addCone(g, x + 4.8 * s, gy, z, 0.5 * s, 0.3 * s, 1.3 * s, 6, tint([0.22, 0.18, 0.18], 0.2));
    },
  ],
  // 3 · Mata Cega
  [
    ({ g, x, z, s, rnd, tint, pal, gy }) => {
      // árvore retorcida
      const hh = (5 + rnd() * 3) * s;
      const tr = newGeo();
      addCone(tr, 0, 0, 0, 0.7 * s, 0.35 * s, hh, 7, tint([0.28, 0.2, 0.15], 0.3));
      bake(g, tr, [x, gy - 0.1, z], [0, 0, 0.08]);
      for (let k = 0; k < 3; k++) {
        const br = newGeo();
        addCone(br, 0, 0, 0, 0.22 * s, 0.1 * s, 2.4 * s, 5, tint([0.28, 0.2, 0.15], 0.3));
        bake(g, br, [x, gy + hh * (0.5 + k * 0.17), z], [0, k * 2.1, (k % 2 ? 1 : -1) * 1.0]);
      }
      addSphere(g, x - 0.6 * s, gy + hh + 0.5 * s, z, 1.7 * s, 8, 6, tint(pal.accent, 0.45));
      addSphere(g, x + 1.1 * s, gy + hh - 0.4 * s, z, 1.3 * s, 8, 6, tint([0.2, 0.42, 0.24], 0.4));
    },
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // tronco observador: olhos acesos
      addCone(g, x, gy, z, 1.3 * s, 0.95 * s, 6 * s, 9, tint([0.25, 0.18, 0.14], 0.3));
      addSphere(glow, x - 0.35 * s, gy + 4.1 * s, z + 0.85 * s, 0.22 * s, 5, 4, [1, 0.95, 0.6]);
      addSphere(glow, x + 0.35 * s, gy + 4.1 * s, z + 0.85 * s, 0.22 * s, 5, 4, [1, 0.95, 0.6]);
      addSphere(g, x, gy + 6.4 * s, z, 2.1 * s, 8, 6, tint(pal.accent, 0.4));
    },
    ({ g, glow, x, z, s, rnd, tint, pal, gy }) => {
      // ruínas cobertas de musgo e vagalumes
      for (let k = 0; k < 3; k++) {
        const hh = (1.5 + rnd() * 3) * s;
        addBox(g, x + k * 1.9 * s, gy, z - 0.5 * s, x + k * 1.9 * s + 0.9 * s, gy + hh, z + 0.5 * s, tint([0.5, 0.5, 0.46], 0.2), { ny: false });
        addSphere(g, x + k * 1.9 * s + 0.4 * s, gy + hh, z, 0.55 * s, 6, 4, tint(pal.accent, 0.4));
      }
      for (let k = 0; k < 6; k++) addSphere(glow, x + rnd() * 5 * s, gy + (1 + rnd() * 3) * s, z + rnd() - 0.5, 0.07 * s, 4, 3, [0.85, 1, 0.5]);
    },
  ],
  // 4 · Arquivo do Contrato
  [
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // pilar com pergaminho e runa
      addBox(g, x - 0.8 * s, gy, z - 0.8 * s, x + 0.8 * s, gy + 7 * s, z + 0.8 * s, tint([0.3, 0.24, 0.22], 0.2));
      addBox(g, x - 1.1 * s, gy + 7 * s, z - 1.1 * s, x + 1.1 * s, gy + 7.4 * s, z + 1.1 * s, tint(pal.trim, 0.25));
      const sc = newGeo();
      addCone(sc, 0, -0.9 * s, 0, 0.22 * s, 0.22 * s, 1.8 * s, 8, tint([0.95, 0.9, 0.78], 0.3));
      bake(g, sc, [x, gy + 5 * s, z + 0.95 * s], [0, 0, 0.35]);
      addSphere(glow, x, gy + 3.2 * s, z + 0.9 * s, 0.3 * s, 5, 4, pal.accent);
    },
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // ampulheta gigante
      for (const sy of [0, 1]) {
        addCone(g, x, gy + 1.0 * s + sy * 2.6 * s, z, sy ? 0.12 * s : 1.5 * s, sy ? 1.5 * s : 0.12 * s, 2.6 * s, 10, tint(pal.accent, 0.35));
      }
      addBox(g, x - 1.9 * s, gy + 0.7 * s, z - 1.0 * s, x + 1.9 * s, gy + 1.0 * s, z + 1.0 * s, tint(pal.trim, 0.3));
      addBox(g, x - 1.9 * s, gy + 6.2 * s, z - 1.0 * s, x + 1.9 * s, gy + 6.5 * s, z + 1.0 * s, tint(pal.trim, 0.3));
      addSphere(glow, x, gy + 1.6 * s, z, 0.6 * s, 6, 5, [1, 0.85, 0.5]);
    },
    ({ g, glow, x, z, s, tint, pal, gy }) => {
      // lustre pendurado
      const top = ROWS + 6;
      addCone(g, x, top - 4.2 * s, z, 0.05 * s, 0.05 * s, 4.2 * s, 4, tint([0.3, 0.25, 0.22], 0.3));
      addCone(g, x, top - 4.6 * s, z, 1.6 * s, 1.6 * s, 0.22 * s, 14, tint(pal.trim, 0.4));
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        addSphere(glow, x + Math.cos(a) * 1.5 * s, top - 4.2 * s, z + Math.sin(a) * 1.5 * s, 0.14 * s, 4, 3, [1, 0.88, 0.55]);
      }
      void gy;
    },
  ],
];

/** peças no meio-plano (perto da pista, atrás dela): dão profundidade sem cobrir o herói */
function midProp(g: Geo, glow: Geo, w: number, x: number, z: number, s: number, rnd: () => number, pal: Palette) {
  const gy = ROWS - GROUND - 0.02;
  const tint = (c: Vec3, k = 0.3) => mix3(mix3(pal.hill2, pal.fog, 0.15), c, k);
  if (w === 0) {
    addCone(g, x, gy, z, 0.1 * s, 0.1 * s, 2.6 * s, 6, tint([0.3, 0.2, 0.2], 0.5));
    addCone(g, x, gy + 2.6 * s, z, 0.42 * s, 0, 0.5 * s, 5, tint(rnd() < 0.5 ? pal.accent : pal.trim, 0.6));
    addSphere(glow, x, gy + 2.2 * s, z + 0.12, 0.09 * s, 4, 3, pal.trim);
  } else if (w === 1) {
    addBox(g, x - 0.35 * s, gy, z - 0.3 * s, x + 0.35 * s, gy + 2.6 * s, z + 0.3 * s, tint(pal.trim, 0.2));
    addSphere(glow, x, gy + 2.9 * s, z + 0.1, 0.12 * s, 4, 3, [1, 0.72, 0.3]);
  } else if (w === 2) {
    addBox(g, x - 0.18 * s, gy, z - 0.18 * s, x + 0.18 * s, gy + 3.2 * s, z + 0.18 * s, tint([0.3, 0.26, 0.24], 0.4));
    addSphere(glow, x, gy + 3.35 * s, z + 0.1, 0.16 * s, 4, 3, [1, 0.5, 0.15]);
  } else if (w === 3) {
    addCone(g, x, gy, z, 0.28 * s, 0.18 * s, 3.2 * s, 6, tint([0.28, 0.2, 0.15], 0.4));
    addSphere(g, x, gy + 3.4 * s, z, 0.85 * s, 7, 5, tint(pal.accent, 0.5));
  } else {
    addBox(g, x - 0.7 * s, gy, z - 0.3 * s, x + 0.7 * s, gy + 2.6 * s, z + 0.3 * s, tint([0.28, 0.2, 0.15], 0.3));
    addBox(g, x - 0.6 * s, gy + 0.2 * s, z + 0.3 * s, x + 0.6 * s, gy + 0.5 * s, z + 0.4 * s, tint(pal.accent, 0.5), { px: false, nx: false, py: false, ny: false, pz: true });
    addBox(g, x - 0.6 * s, gy + 1.4 * s, z + 0.3 * s, x + 0.6 * s, gy + 1.7 * s, z + 0.4 * s, tint(pal.trim, 0.5), { px: false, nx: false, py: false, ny: false, pz: true });
  }
}

function prop(g: Geo, glow: Geo, w: number, x: number, z: number, s: number, rnd: () => number, col: Vec3, pal: Palette, layerZ: number, variant: number) {
  const gy = ROWS - GROUND - 0.05;
  const near = layerZ > -10;
  const tint = (c: Vec3, k = 0.25) => mix3(col, c, near ? k : k * 0.5);
  // 6 tipos por mundo (3 clássicos + 3 novos); cada nível favorece um subconjunto diferente
  const kinds = 6;
  const bias = [0, 2, 4, 1, 3][variant % 5]!;
  const k = Math.floor((rnd() * 0.65 + (bias / kinds) * 0.35 + (rnd() < 0.4 ? rnd() * 0.5 : 0)) * kinds) % kinds;
  if (k < 3) propLegacy(g, glow, w, x, z, s, rnd, col, pal, layerZ, k);
  else NEW_PROPS[w]![k - 3]!({ g, glow, x, z, s, rnd, col, pal, gy, tint });
}
