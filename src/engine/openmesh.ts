/** Malha de um bloco do mundo aberto: chão com cor misturada entre biomas + objetos + perigos. */
import { addBox, addCone, addSphere, newGeo, type Geo, type Vec3 } from "./gl";
import { CH, biomeAt, chunkAt, groundColor, palOf, styleOf, POOL_COLOR, type Prop } from "../game/openworld";
import { ROWS, GROUND, TILE } from "../game/types";

const GY = ROWS - GROUND;
const dim = (c: Vec3, k: number): Vec3 => [c[0] * k, c[1] * k, c[2] * k];
const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function leafColor(style: string, v: number): Vec3 {
  if (style === "garden" || style === "mansion") return mix([0.16, 0.42, 0.18], [0.3, 0.55, 0.2], v);
  if (style === "swamp") return mix([0.2, 0.3, 0.14], [0.3, 0.38, 0.18], v);
  if (style === "ice") return mix([0.7, 0.85, 0.95], [0.5, 0.7, 0.86], v);
  if (style === "cloud") return mix([0.95, 0.95, 1], [0.8, 0.86, 1], v);
  if (style === "gold") return mix([0.8, 0.65, 0.2], [0.95, 0.8, 0.3], v);
  return mix([0.25, 0.2, 0.2], [0.35, 0.25, 0.25], v);
}

function propGeo(g: Geo, glow: Geo, p: Prop, style: string, realm: number) {
  const pal = palOf(realm);
  const x = p.x / TILE;
  const z = p.z / TILE;
  const y = GY;
  const s = p.s;
  const v = p.v;
  const stone = mix(dim(pal.g, 0.9), [0.55, 0.55, 0.58], 0.35 + v * 0.2);
  const dark = dim(pal.d, 1.1);
  const trunk: Vec3 = [0.3, 0.2, 0.14];
  const leaf = leafColor(style, v);
  switch (p.k) {
    case "tree": {
      addCone(g, x, y, z, 0.13 * s, 0.09 * s, 1.0 * s, 6, trunk);
      addCone(g, x, y + 0.7 * s, z, 0.78 * s, 0.0, 1.0 * s, 8, dim(leaf, 0.85), leaf);
      addCone(g, x, y + 1.25 * s, z, 0.58 * s, 0.0, 0.9 * s, 8, leaf, mix(leaf, [1, 1, 0.8], 0.25));
      break;
    }
    case "pine": {
      addCone(g, x, y, z, 0.1 * s, 0.08 * s, 0.6 * s, 5, trunk);
      for (let k = 0; k < 3; k++) addCone(g, x, y + (0.4 + k * 0.55) * s, z, (0.7 - k * 0.18) * s, 0, 0.85 * s, 7, dim(leaf, 0.9 + k * 0.05), [1, 1, 1]);
      break;
    }
    case "dead": {
      addCone(g, x, y, z, 0.12 * s, 0.04 * s, 1.5 * s, 5, dim(trunk, 0.7));
      addCone(g, x + 0.2 * s, y + 0.8 * s, z, 0.06 * s, 0.0, 0.7 * s, 4, dim(trunk, 0.7));
      addCone(g, x - 0.18 * s, y + 1.0 * s, z + 0.1 * s, 0.05 * s, 0.0, 0.6 * s, 4, dim(trunk, 0.7));
      break;
    }
    case "rock": {
      addCone(g, x, y, z, 0.55 * s, 0.22 * s, 0.55 * s, 6, stone, mix(stone, [1, 1, 1], 0.25));
      addCone(g, x + 0.4 * s, y, z + 0.2 * s, 0.3 * s, 0.12 * s, 0.3 * s, 5, dim(stone, 0.85));
      break;
    }
    case "pillar": {
      const h = (0.8 + v * 1.1) * s;
      addCone(g, x, y, z, 0.3 * s, 0.26 * s, h, 8, stone, mix(stone, [1, 1, 1], 0.2));
      addBox(g, x - 0.38 * s, y, z - 0.38 * s, x + 0.38 * s, y + 0.14 * s, z + 0.38 * s, dim(stone, 0.85));
      if (v > 0.45) addBox(g, x - 0.36 * s, y + h, z - 0.36 * s, x + 0.36 * s, y + h + 0.16 * s, z + 0.36 * s, dim(stone, 0.95));
      else addCone(g, x, y + h, z, 0.26 * s, 0.05 * s, 0.18 * s, 5, dim(stone, 0.8));
      break;
    }
    case "crystal": {
      const c = pal.a;
      addCone(g, x, y, z, 0.28 * s, 0.0, 1.3 * s, 5, dim(c, 0.55), mix(c, [1, 1, 1], 0.5));
      addCone(g, x + 0.3 * s, y, z + 0.1 * s, 0.18 * s, 0.0, 0.8 * s, 5, dim(c, 0.5), c);
      addCone(g, x - 0.25 * s, y, z - 0.12 * s, 0.16 * s, 0.0, 0.7 * s, 5, dim(c, 0.5), c);
      addCone(glow, x, y + 0.6 * s, z, 0.1 * s, 0, 0.3 * s, 5, dim(c, 0.9), c);
      break;
    }
    case "spire": {
      addCone(g, x, y, z, 0.5 * s, 0.0, (1.6 + v) * s, 6, dark, mix(dark, pal.a, 0.35));
      addCone(g, x + 0.45 * s, y, z - 0.1 * s, 0.25 * s, 0, 0.9 * s, 5, dim(dark, 0.9));
      break;
    }
    case "bones": {
      addSphere(g, x, y + 0.14 * s, z, 0.14 * s, 6, 4, [0.9, 0.88, 0.8]);
      addBox(g, x + 0.15 * s, y, z - 0.05 * s, x + 0.65 * s, y + 0.06 * s, z + 0.03 * s, [0.85, 0.83, 0.75]);
      addBox(g, x - 0.3 * s, y, z + 0.1 * s, x + 0.1 * s, y + 0.06 * s, z + 0.17 * s, [0.85, 0.83, 0.75]);
      break;
    }
    case "wall": {
      const w = 0.7 * s;
      const d = 0.16 * s;
      const h = (0.5 + v * 0.7) * s;
      if (v > 0.5) addBox(g, x - w, y, z - d, x + w, y + h, z + d, stone, {}, mix(stone, [1, 1, 1], 0.15));
      else addBox(g, x - d, y, z - w, x + d, y + h, z + w, stone, {}, mix(stone, [1, 1, 1], 0.15));
      break;
    }
    case "bush": {
      const c = leaf;
      addSphere(g, x, y + 0.28 * s, z, 0.38 * s, 7, 5, dim(c, 0.9));
      addSphere(g, x + 0.3 * s, y + 0.2 * s, z + 0.1 * s, 0.26 * s, 6, 4, c);
      break;
    }
    case "flower": {
      for (let k = 0; k < 3; k++) {
        const ox = (k - 1) * 0.2 * s;
        const oz = ((k * 7) % 3) * 0.1 * s - 0.1;
        addCone(g, x + ox, y, z + oz, 0.02 * s, 0.02 * s, 0.35 * s, 4, [0.2, 0.5, 0.2]);
        addSphere(g, x + ox, y + 0.38 * s, z + oz, 0.07 * s, 5, 4, mix(pal.a, [1, 1, 0.6], k * 0.3));
      }
      break;
    }
    case "puff": {
      addSphere(g, x, y + 0.45 * s, z, 0.55 * s, 8, 6, [0.97, 0.97, 1]);
      addSphere(g, x + 0.45 * s, y + 0.35 * s, z + 0.1 * s, 0.4 * s, 7, 5, [0.9, 0.93, 1]);
      addSphere(g, x - 0.4 * s, y + 0.3 * s, z - 0.1 * s, 0.35 * s, 7, 5, [0.92, 0.94, 1]);
      break;
    }
    case "tomb": {
      addBox(g, x - 0.25 * s, y, z - 0.08 * s, x + 0.25 * s, y + 0.7 * s, z + 0.08 * s, stone);
      addSphere(g, x, y + 0.7 * s, z, 0.1 * s, 5, 3, dim(stone, 1.05));
      break;
    }
    case "lamp": {
      addCone(g, x, y, z, 0.05 * s, 0.04 * s, 1.3 * s, 5, [0.2, 0.18, 0.18]);
      addSphere(glow, x, y + 1.38 * s, z, 0.16 * s, 6, 4, mix(pal.t, [1, 0.9, 0.6], 0.5));
      break;
    }
    case "mush": {
      addCone(g, x, y, z, 0.07 * s, 0.06 * s, 0.4 * s, 5, [0.85, 0.82, 0.7]);
      addCone(g, x, y + 0.36 * s, z, 0.34 * s, 0.05 * s, 0.22 * s, 7, mix(pal.a, [0.6, 0.2, 0.3], 0.5), pal.a);
      break;
    }
    case "arch": {
      const h = 1.5 * s;
      addCone(g, x - 0.6 * s, y, z, 0.2 * s, 0.17 * s, h, 7, stone);
      addCone(g, x + 0.6 * s, y, z, 0.2 * s, 0.17 * s, h, 7, stone);
      addBox(g, x - 0.8 * s, y + h, z - 0.2 * s, x + 0.8 * s, y + h + 0.22 * s, z + 0.2 * s, dim(stone, 0.95));
      break;
    }
  }
}

export type ChunkMesh = { solid: Geo; glow: Geo };

export function buildChunkMesh(ci: number, cj: number): ChunkMesh {
  const g = newGeo();
  const glow = newGeo();
  const ch = chunkAt(ci, cj);
  const N = 8;
  const step = CH / N;
  const base = ROWS * 0; // sem uso
  void base;
  // chão
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const wx = ci * CH + i * step;
      const wz = cj * CH + j * step;
      const c = groundColor(wx, wz);
      g.pos.push(wx / TILE, GY, wz / TILE);
      g.nor.push(0, 1, 0);
      g.col.push(c[0], c[1], c[2]);
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      g.idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2);
    }
  }
  // objetos
  for (const p of ch.props) {
    const b = biomeAt(p.x, p.z);
    propGeo(g, glow, p, styleOf(b.a), b.a);
  }
  // tufos de capim / cascalho: dão textura ao chão e sensação de velocidade
  for (let k = 0; k < 46; k++) {
    const wx = ci * CH + (((k * 37) % 23) / 23 + ((k * 7) % 5) * 0.01) * CH * 0.96 + 12;
    const wz = cj * CH + (((k * 53) % 29) / 29) * CH * 0.96 + 12;
    const gc = groundColor(wx, wz);
    const lite: Vec3 = [Math.min(1, gc[0] * 1.35 + 0.05), Math.min(1, gc[1] * 1.4 + 0.05), Math.min(1, gc[2] * 1.25 + 0.03)];
    addCone(g, wx / TILE, GY, wz / TILE, 0.07, 0, 0.2 + (k % 4) * 0.05, 4, gc, lite);
    addCone(g, wx / TILE + 0.08, GY, wz / TILE + 0.03, 0.05, 0, 0.14, 4, gc, lite);
  }
  // perigos: disco brilhante com borda escura
  for (const q of ch.pools) {
    const c = POOL_COLOR[q.kind];
    addCone(g, q.x / TILE, GY + 0.012, q.z / TILE, (q.r + 7) / TILE, (q.r + 7) / TILE, 0.02, 22, dim(c, 0.28), undefined, true);
    addCone(glow, q.x / TILE, GY + 0.035, q.z / TILE, q.r / TILE, q.r / TILE, 0.02, 22, dim(c, 0.78), undefined, true);
    addCone(glow, q.x / TILE, GY + 0.06, q.z / TILE, (q.r * 0.55) / TILE, (q.r * 0.55) / TILE, 0.02, 18, c, undefined, true);
  }
  // pontos de interesse
  for (const s of ch.sites) {
    const x = s.x / TILE;
    const z = s.z / TILE;
    const b = biomeAt(s.x, s.z);
    const pal = palOf(b.a);
    if (s.kind === "camp") {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        addCone(g, x + Math.cos(a) * 0.5, GY, z + Math.sin(a) * 0.5, 0.07, 0.06, 0.5, 5, [0.3, 0.2, 0.12]);
      }
      addCone(glow, x, GY + 0.05, z, 0.28, 0, 0.8, 6, [1, 0.45, 0.1], [1, 0.9, 0.4]);
    } else if (s.kind === "shrine") {
      addCone(g, x, GY, z, 0.5, 0.4, 0.3, 8, [0.5, 0.5, 0.55]);
      addCone(g, x, GY + 0.3, z, 0.18, 0.14, 1.4, 8, [0.6, 0.6, 0.65]);
      addSphere(glow, x, GY + 1.9, z, 0.24, 8, 6, mix(pal.t, [0.7, 1, 0.9], 0.6));
    } else if (s.kind === "ruin") {
      addBox(g, x - 1.2, GY, z - 1.0, x - 0.9, GY + 1.5, z + 1.0, [0.5, 0.5, 0.52]);
      addBox(g, x + 0.9, GY, z - 1.0, x + 1.2, GY + 1.0, z + 1.0, [0.46, 0.46, 0.48]);
      addBox(g, x - 1.2, GY, z + 0.9, x + 1.2, GY + 0.7, z + 1.1, [0.5, 0.5, 0.52]);
    } else if (s.kind === "elite") {
      // marca no chão: círculo escuro com brilho vermelho
      addCone(glow, x, GY + 0.03, z, 1.6, 1.6, 0.02, 22, [0.35, 0.05, 0.08], undefined, true);
    }
  }
  return { solid: g, glow };
}
