// Mini motor 3D em WebGL2 puro (sem bibliotecas externas).
// Cuida de: matrizes, malhas primitivas, shader "cel" (estilo desenho), contorno de tinta,
// céu em gradiente, lotes estáticos (cenário) e névoa.

export type Vec3 = [number, number, number];
export type Mat4 = Float32Array;

/* ------------------------------------------------------------------ matrizes */

export const m4 = {
  create(): Mat4 {
    const o = new Float32Array(16);
    o[0] = o[5] = o[10] = o[15] = 1;
    return o;
  },
  mul(out: Mat4, a: Mat4, b: Mat4): Mat4 {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] =
          a[r]! * b[c * 4]! + a[4 + r]! * b[c * 4 + 1]! + a[8 + r]! * b[c * 4 + 2]! + a[12 + r]! * b[c * 4 + 3]!;
      }
    }
    return out;
  },
  perspective(out: Mat4, fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },
  lookAt(out: Mat4, eye: Vec3, at: Vec3, up: Vec3): Mat4 {
    let zx = eye[0] - at[0];
    let zy = eye[1] - at[1];
    let zz = eye[2] - at[2];
    let l = Math.hypot(zx, zy, zz) || 1;
    zx /= l;
    zy /= l;
    zz /= l;
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz) || 1;
    xx /= l;
    xy /= l;
    xz /= l;
    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;
    out[0] = xx;
    out[1] = yx;
    out[2] = zx;
    out[3] = 0;
    out[4] = xy;
    out[5] = yy;
    out[6] = zy;
    out[7] = 0;
    out[8] = xz;
    out[9] = yz;
    out[10] = zz;
    out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
  },
  /** M = T * Ry * Rx * Rz * S */
  compose(out: Mat4, p: Vec3, r: Vec3, s: Vec3): Mat4 {
    const cx = Math.cos(r[0]);
    const sx = Math.sin(r[0]);
    const cy = Math.cos(r[1]);
    const sy = Math.sin(r[1]);
    const cz = Math.cos(r[2]);
    const sz = Math.sin(r[2]);
    // Ry * Rx * Rz
    const r00 = cy * cz + sy * sx * sz;
    const r01 = -cy * sz + sy * sx * cz;
    const r02 = sy * cx;
    const r10 = cx * sz;
    const r11 = cx * cz;
    const r12 = -sx;
    const r20 = -sy * cz + cy * sx * sz;
    const r21 = sy * sz + cy * sx * cz;
    const r22 = cy * cx;
    out[0] = r00 * s[0];
    out[1] = r10 * s[0];
    out[2] = r20 * s[0];
    out[3] = 0;
    out[4] = r01 * s[1];
    out[5] = r11 * s[1];
    out[6] = r21 * s[1];
    out[7] = 0;
    out[8] = r02 * s[2];
    out[9] = r12 * s[2];
    out[10] = r22 * s[2];
    out[11] = 0;
    out[12] = p[0];
    out[13] = p[1];
    out[14] = p[2];
    out[15] = 1;
    return out;
  },
  /** inversa transposta da parte 3x3 (para normais com escala não uniforme) */
  normal(out: Float32Array, m: Mat4): Float32Array {
    const a = m[0]!, b = m[1]!, c = m[2]!;
    const d = m[4]!, e = m[5]!, f = m[6]!;
    const g = m[8]!, h = m[9]!, i = m[10]!;
    const A = e * i - f * h;
    const B = f * g - d * i;
    const C = d * h - e * g;
    const det = a * A + b * B + c * C || 1;
    const k = 1 / det;
    // cofactor / det == inversa transposta
    out[0] = A * k;
    out[1] = B * k;
    out[2] = C * k;
    out[3] = (c * h - b * i) * k;
    out[4] = (a * i - c * g) * k;
    out[5] = (b * g - a * h) * k;
    out[6] = (b * f - c * e) * k;
    out[7] = (c * d - a * f) * k;
    out[8] = (a * e - b * d) * k;
    return out;
  },
};

export function hex(c: string): Vec3 {
  const h = c.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function mix3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/* --------------------------------------------------------------- geometria */

export type Geo = { pos: number[]; nor: number[]; col: number[]; idx: number[] };

export function newGeo(): Geo {
  return { pos: [], nor: [], col: [], idx: [] };
}

function pushQuad(g: Geo, a: Vec3, b: Vec3, c: Vec3, d: Vec3, n: Vec3, col: Vec3) {
  const base = g.pos.length / 3;
  for (const v of [a, b, c, d]) {
    g.pos.push(v[0], v[1], v[2]);
    g.nor.push(n[0], n[1], n[2]);
    g.col.push(col[0], col[1], col[2]);
  }
  g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export type BoxFaces = { px?: boolean; nx?: boolean; py?: boolean; ny?: boolean; pz?: boolean; nz?: boolean };

/** Caixa alinhada aos eixos. Faces podem ser desligadas. Cores por face opcionais. */
export function addBox(
  g: Geo,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  col: Vec3,
  faces: BoxFaces = {},
  topCol?: Vec3,
) {
  const f = { px: true, nx: true, py: true, ny: true, pz: true, nz: false, ...faces };
  if (f.pz) pushQuad(g, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col);
  if (f.nz) pushQuad(g, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col);
  if (f.px) pushQuad(g, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col);
  if (f.nx) pushQuad(g, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col);
  if (f.py) pushQuad(g, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], topCol ?? col);
  if (f.ny) pushQuad(g, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col);
}

/** Cone/cilindro em torno do eixo Y (base em y0). r1 = raio no topo (0 = cone). */
export function addCone(
  g: Geo,
  cx: number,
  y0: number,
  cz: number,
  r0: number,
  r1: number,
  h: number,
  seg: number,
  col: Vec3,
  tipCol?: Vec3,
  cap = true,
) {
  const slope = (r0 - r1) / (h || 1);
  const base = g.pos.length / 3;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const nl = Math.hypot(1, slope);
    const n: Vec3 = [ca / nl, slope / nl, sa / nl];
    g.pos.push(cx + ca * r0, y0, cz + sa * r0);
    g.nor.push(...n);
    g.col.push(...col);
    g.pos.push(cx + ca * r1, y0 + h, cz + sa * r1);
    g.nor.push(...n);
    g.col.push(...(tipCol ?? col));
  }
  for (let i = 0; i < seg; i++) {
    const a = base + i * 2;
    g.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  if (cap && r1 > 0.0001) {
    const cBase = g.pos.length / 3;
    g.pos.push(cx, y0 + h, cz);
    g.nor.push(0, 1, 0);
    g.col.push(...(tipCol ?? col));
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      g.pos.push(cx + Math.cos(a) * r1, y0 + h, cz + Math.sin(a) * r1);
      g.nor.push(0, 1, 0);
      g.col.push(...(tipCol ?? col));
    }
    for (let i = 0; i < seg; i++) g.idx.push(cBase, cBase + 2 + i, cBase + 1 + i);
  }
}

/** Esfera (UV) centrada em (cx,cy,cz). */
export function addSphere(g: Geo, cx: number, cy: number, cz: number, r: number, seg: number, rings: number, col: Vec3) {
  const base = g.pos.length / 3;
  for (let j = 0; j <= rings; j++) {
    const v = j / rings;
    const phi = v * Math.PI;
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(th);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(th);
      g.pos.push(cx + nx * r, cy + ny * r, cz + nz * r);
      g.nor.push(nx, ny, nz);
      g.col.push(...col);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < seg; i++) {
      const a = base + j * (seg + 1) + i;
      const b = a + seg + 1;
      g.idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
}

type V3 = [number, number, number];
/** malha facetada: cada face é um polígono convexo, normal para fora (a origem fica dentro do sólido) */
export function polyGeo(faces: V3[][]): Geo {
  const g = newGeo();
  for (const f of faces) {
    const [a, b, c] = [f[0]!, f[1]!, f[2]!];
    const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const cen: V3 = [0, 0, 0];
    for (const q of f) { cen[0] += q[0] / f.length; cen[1] += q[1] / f.length; cen[2] += q[2] / f.length; }
    let flip = n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0;
    const L = Math.hypot(n[0], n[1], n[2]) || 1;
    n = [n[0] / L, n[1] / L, n[2] / L];
    if (flip) n = [-n[0], -n[1], -n[2]];
    const base = g.pos.length / 3;
    for (const q of f) { g.pos.push(q[0], q[1], q[2]); g.nor.push(n[0], n[1], n[2]); g.col.push(1, 1, 1); }
    for (let i = 1; i < f.length - 1; i++) {
      if (flip) g.idx.push(base, base + i + 1, base + i);
      else g.idx.push(base, base + i, base + i + 1);
    }
  }
  return g;
}
/** lâmina: base em losango, ombros e ponta (y de -0.5 a 0.5) */
function bladeFaces(): V3[][] {
  const ring = (y: number, k: number): V3[] => [[0.5 * k, y, 0], [0, y, 0.5 * k], [-0.5 * k, y, 0], [0, y, -0.5 * k]];
  const lo = ring(-0.5, 0.78), mid = ring(0.28, 1), tip: V3 = [0, 0.5, 0];
  const f: V3[][] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    f.push([lo[i]!, lo[j]!, mid[j]!, mid[i]!]);
    f.push([mid[i]!, mid[j]!, tip]);
  }
  f.push([lo[0]!, lo[3]!, lo[2]!, lo[1]!]);
  return f;
}
/** prisma triangular: ápice em cima, base embaixo, profundidade em z */
function shardFaces(): V3[][] {
  const A: V3 = [-0.5, -0.5, 0.5], B: V3 = [0.5, -0.5, 0.5], C: V3 = [0, 0.5, 0.5];
  const a: V3 = [-0.5, -0.5, -0.5], b: V3 = [0.5, -0.5, -0.5], c: V3 = [0, 0.5, -0.5];
  return [[A, B, C], [a, c, b], [A, a, b, B], [B, b, c, C], [C, c, a, A]];
}
/** caixa com quinas chanfradas */
function plateFaces(c: number): V3[][] {
  const o = 0.5, i = 0.5 - c;
  const f: V3[][] = [];
  const mk = (ax: number, s: number, r1: number, r2: number): V3 => {
    const p: V3 = [0, 0, 0];
    p[ax] = s * o;
    p[(ax + 1) % 3] = r1 * i;
    p[(ax + 2) % 3] = r2 * i;
    return p;
  };
  for (let ax = 0; ax < 3; ax++) for (const s of [-1, 1]) f.push([mk(ax, s, -1, -1), mk(ax, s, 1, -1), mk(ax, s, 1, 1), mk(ax, s, -1, 1)]);
  const at = (vals: number[]): V3 => [vals[0]!, vals[1]!, vals[2]!];
  // arestas
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3, d = (a + 2) % 3;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const q = (e: number): V3 => { const v = [0, 0, 0]; v[a] = sa * o; v[b] = sb * i; v[d] = e * i; return at(v); };
      const r = (e: number): V3 => { const v = [0, 0, 0]; v[b] = sb * o; v[a] = sa * i; v[d] = e * i; return at(v); };
      f.push([q(-1), q(1), r(1), r(-1)]);
    }
  }
  // cantos
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    f.push([[x * o, y * i, z * i], [x * i, y * o, z * i], [x * i, y * i, z * o]]);
  }
  return f;
}
function gemFaces(): V3[][] {
  const f: V3[][] = [];
  const ring: V3[] = [[0.5, 0, 0], [0, 0, 0.5], [-0.5, 0, 0], [0, 0, -0.5]];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    f.push([ring[i]!, ring[j]!, [0, 0.5, 0]]);
    f.push([ring[j]!, ring[i]!, [0, -0.5, 0]]);
  }
  return f;
}
/** meia esfera (domo): base plana em y=-0.5, topo em y=0.5 */
function hemiGeo(): Geo {
  const g = newGeo();
  const seg = 14, rings = 7;
  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * (Math.PI / 2);
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(th), ny = Math.cos(phi), nz = Math.sin(phi) * Math.sin(th);
      g.pos.push(nx * 0.5, -0.5 + ny, nz * 0.5);
      g.nor.push(nx, ny * 0.5, nz);
      g.col.push(1, 1, 1);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + seg + 1;
    g.idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const base = g.pos.length / 3;
  g.pos.push(0, -0.5, 0); g.nor.push(0, -1, 0); g.col.push(1, 1, 1);
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; g.pos.push(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5); g.nor.push(0, -1, 0); g.col.push(1, 1, 1); }
  for (let i = 0; i < seg; i++) g.idx.push(base, base + 1 + i, base + 2 + i);
  return g;
}

/** Anel (toro) no plano XZ, raio maior R e espessura r. */
export function addTorus(g: Geo, R: number, r: number, seg: number, rseg: number, col: Vec3) {
  const base = g.pos.length / 3;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let j = 0; j <= rseg; j++) {
      const b = (j / rseg) * Math.PI * 2;
      const cb = Math.cos(b);
      const sb = Math.sin(b);
      g.pos.push((R + r * cb) * ca, r * sb, (R + r * cb) * sa);
      g.nor.push(cb * ca, sb, cb * sa);
      g.col.push(...col);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < rseg; j++) {
      const a = base + i * (rseg + 1) + j;
      const b = a + rseg + 1;
      g.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
}

/* ----------------------------------------------------------------- shaders */

const LIT_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec3 aCol;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat3 uNor;
uniform float uOutline;
out vec3 vN;
out vec3 vCol;
out vec3 vW;
void main(){
  vec3 p = aPos * (1.0 + uOutline);
  vec4 w = uModel * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(uNor * aNor);
  vCol = aCol;
  gl_Position = uVP * w;
}`;

const LIT_FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vCol;
in vec3 vW;
uniform vec3 uColor;
uniform vec3 uEmis;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uFog;
uniform vec3 uCam;
uniform vec2 uFogRange;
uniform float uAlpha;
uniform float uFlash;
uniform float uUnlit;
uniform float uCel;
uniform float uSoft;
out vec4 outColor;
void main(){
  vec3 n = normalize(vN);
  vec3 base = vCol * uColor;
  vec3 col;
  if (uUnlit > 0.5) {
    col = base;
  } else {
    vec3 L = normalize(uSunDir);
    vec3 v = normalize(uCam - vW);
    float ndl = dot(n, L) * 0.5 + 0.5;
    vec3 hemi = mix(uGround, uSky, n.y * 0.5 + 0.5);
    if (uCel > 0.5) {
      // anime: 3 faixas duras, sombra fria e saturada, brilho de gloss e luz de contorno
      float b1 = smoothstep(0.35, 0.39, ndl);
      float b2 = smoothstep(0.64, 0.68, ndl);
      float band = b1 * 0.55 + b2 * 0.45;
      float lum = dot(base, vec3(0.299, 0.587, 0.114));
      vec3 sat = clamp(mix(vec3(lum), base, 1.18), 0.0, 1.0);
      vec3 shade = sat * mix(vec3(0.5, 0.46, 0.8), uSky * 1.4, 0.3);
      vec3 lit = sat * (hemi * 0.85 + uSun * (0.1 + band));
      col = mix(shade * (hemi * 0.9 + 0.12), lit, b1);
      float ndv = max(dot(n, v), 0.0);
      float rimk = smoothstep(0.6, 0.66, 1.0 - ndv) * smoothstep(0.35, 0.7, ndl);
      col += rimk * mix(uSun, vec3(1.0), 0.4) * 0.32;
      float sp = pow(max(dot(n, normalize(L + v)), 0.0), 40.0);
      col += smoothstep(0.55, 0.6, sp) * 0.16 * (0.4 + lum) * b1;
      col += uEmis;
    } else {
      float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.22;
      col = base * (hemi + uSun * ndl) + uEmis + rim * uSky;
    }
  }
  col = mix(col, vec3(1.0, 0.96, 0.9), uFlash);
  float d = length(vW - uCam);
  float f = clamp((d - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
  col = mix(col, uFog, f * f * (3.0 - 2.0 * f));
  float al = uAlpha;
  if (uSoft > 0.5) {
    float fr = max(dot(n, normalize(uCam - vW)), 0.0);
    al *= fr * fr;
  }
  outColor = vec4(col, al);
}`;


const SKIN_VS = `#version 300 es
precision highp float;
precision highp sampler2D;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec3 aCol;
layout(location=3) in vec4 aJoints;
layout(location=4) in vec4 aWeights;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat3 uNor;
uniform float uOutline;
uniform sampler2D uBones;
uniform vec3 uRegion[9];
out vec3 vN;
out vec3 vCol;
out vec3 vW;
mat4 bone(int j){
  return mat4(texelFetch(uBones, ivec2(0, j), 0), texelFetch(uBones, ivec2(1, j), 0), texelFetch(uBones, ivec2(2, j), 0), texelFetch(uBones, ivec2(3, j), 0));
}
void main(){
  mat4 sk = bone(int(aJoints.x + 0.5)) * aWeights.x + bone(int(aJoints.y + 0.5)) * aWeights.y + bone(int(aJoints.z + 0.5)) * aWeights.z + bone(int(aJoints.w + 0.5)) * aWeights.w;
  vec3 n = normalize(mat3(sk) * aNor);
  vec3 p = (sk * vec4(aPos, 1.0)).xyz + n * uOutline;
  vec4 w = uModel * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(uNor * n);
  vCol = uRegion[int(aCol.x + 0.5)] * aCol.y;
  gl_Position = uVP * w;
}`;

const SKY_VS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.9999, 1.0);
}`;

const SKY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBot;
uniform float uTime;
uniform float uStars;
uniform vec2 uMoon;
uniform vec3 uMoonCol;
uniform float uAspect;
uniform vec2 uScroll;
out vec4 outColor;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  float y = vUv.y;
  vec3 c = y > 0.5 ? mix(uMid, uTop, (y - 0.5) * 2.0) : mix(uBot, uMid, y * 2.0);
  // estrelas
  vec2 g = (vUv + uScroll) * vec2(uAspect, 1.0) * 70.0;
  vec2 id = floor(g);
  float h = hash(id);
  vec2 f = fract(g) - 0.5;
  float star = step(0.965, h) * smoothstep(0.28, 0.0, length(f)) * (0.55 + 0.45 * sin(uTime * 2.0 + h * 40.0));
  c += vec3(1.0, 0.95, 0.85) * star * uStars * smoothstep(0.35, 0.85, y);
  // lua
  vec2 d = (vUv - uMoon) * vec2(uAspect, 1.0);
  float md = length(d);
  c += uMoonCol * smoothstep(0.075, 0.07, md) * 0.9;
  c += uMoonCol * 0.18 * smoothstep(0.35, 0.0, md);
  outColor = vec4(c, 1.0);
}`;

/* ------------------------------------------------------------------ motor */

export type GpuMesh = {
  vao: WebGLVertexArrayObject;
  count: number;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
};

export type DrawOpts = {
  color?: Vec3;
  emis?: Vec3;
  alpha?: number;
  flash?: number;
  unlit?: boolean;
  outline?: number;
  cel?: boolean;
  soft?: boolean;
};

export type Lighting = {
  sun: Vec3;
  sunDir: Vec3;
  sky: Vec3;
  ground: Vec3;
  fog: Vec3;
  fogNear: number;
  fogFar: number;
};

export class Engine {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  private lit: WebGLProgram;
  private sky: WebGLProgram;
  private skinP: WebGLProgram;
  private us2: Record<string, WebGLUniformLocation | null> = {};
  private boneTex: WebGLTexture;
  private light: Lighting | null = null;
  private skinFresh = false;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private us: Record<string, WebGLUniformLocation | null> = {};
  private emptyVao: WebGLVertexArrayObject;
  vp = m4.create();
  view = m4.create();
  proj = m4.create();
  camPos: Vec3 = [0, 0, 10];
  private model = m4.create();
  private nmat = new Float32Array(9);
  private ident = m4.create();
  private identN = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  prims: { cube: GpuMesh; sphere: GpuMesh; cone: GpuMesh; cyl: GpuMesh; quad: GpuMesh; ring: GpuMesh; hemi: GpuMesh; blade: GpuMesh; shard: GpuMesh; plate: GpuMesh; gem: GpuMesh };
  drawCalls = 0;
  lost = false;

  constructor(canvas: HTMLCanvasElement, opts: { alpha?: boolean; preserve?: boolean } = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      antialias: true,
      alpha: opts.alpha ?? false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: opts.preserve ?? false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 indisponível");
    this.gl = gl;
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
    });
    this.lit = this.program(LIT_VS, LIT_FS);
    this.sky = this.program(SKY_VS, SKY_FS);
    for (const n of [
      "uVP", "uModel", "uNor", "uOutline", "uColor", "uEmis", "uSun", "uSunDir", "uSky", "uGround",
      "uFog", "uCam", "uFogRange", "uAlpha", "uFlash", "uUnlit", "uCel", "uSoft",
    ]) {
      this.u[n] = gl.getUniformLocation(this.lit, n);
    }
    this.skinP = this.program(SKIN_VS, LIT_FS);
    for (const n of [...Object.keys(this.u), "uBones", "uRegion"]) this.us2[n] = gl.getUniformLocation(this.skinP, n);
    this.boneTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.boneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, 96, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (const n of ["uTop", "uMid", "uBot", "uTime", "uStars", "uMoon", "uMoonCol", "uAspect", "uScroll"]) {
      this.us[n] = gl.getUniformLocation(this.sky, n);
    }
    this.emptyVao = gl.createVertexArray()!;
    this.prims = {
      cube: this.cubeMesh(),
      sphere: this.sphereMesh(),
      cone: this.coneMesh(0),
      cyl: this.coneMesh(1),
      quad: this.quadMesh(),
      ring: this.ringMesh(),
      hemi: this.upload(hemiGeo()),
      blade: this.upload(polyGeo(bladeFaces())),
      shard: this.upload(polyGeo(shardFaces())),
      plate: this.upload(polyGeo(plateFaces(0.14))),
      gem: this.upload(polyGeo(gemFaces())),
    };
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  private program(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    return p;
  }

  upload(g: Geo): GpuMesh {
    const gl = this.gl;
    const n = g.pos.length / 3;
    const data = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      data[i * 9] = g.pos[i * 3]!;
      data[i * 9 + 1] = g.pos[i * 3 + 1]!;
      data[i * 9 + 2] = g.pos[i * 3 + 2]!;
      data[i * 9 + 3] = g.nor[i * 3]!;
      data[i * 9 + 4] = g.nor[i * 3 + 1]!;
      data[i * 9 + 5] = g.nor[i * 3 + 2]!;
      data[i * 9 + 6] = g.col[i * 3]!;
      data[i * 9 + 7] = g.col[i * 3 + 1]!;
      data[i * 9 + 8] = g.col[i * 3 + 2]!;
    }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    for (let a = 0; a < 3; a++) {
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 36, a * 12);
    }
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    const idx = n > 65535 ? new Uint32Array(g.idx) : new Uint16Array(g.idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: g.idx.length, vbo, ibo, ...(n > 65535 ? { big: true } : {}) } as GpuMesh;
  }

  free(m: GpuMesh | null | undefined) {
    if (!m) return;
    const gl = this.gl;
    gl.deleteBuffer(m.vbo);
    gl.deleteBuffer(m.ibo);
    gl.deleteVertexArray(m.vao);
  }

  private isBig(m: GpuMesh) {
    return Boolean((m as unknown as { big?: boolean }).big);
  }

  private cubeMesh() {
    const g = newGeo();
    addBox(g, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, [1, 1, 1], { nz: true });
    return this.upload(g);
  }
  private sphereMesh() {
    const g = newGeo();
    addSphere(g, 0, 0, 0, 0.5, 14, 10, [1, 1, 1]);
    return this.upload(g);
  }
  /** cone: topo 0 ; cilindro: topo = base. Centrados em y=0, altura 1, raio base 0.5 */
  private ringMesh() {
    const g = newGeo();
    addTorus(g, 0.5, 0.06, 32, 8, [1, 1, 1]);
    return this.upload(g);
  }
  private coneMesh(kind: 0 | 1) {
    const g = newGeo();
    addCone(g, 0, -0.5, 0, 0.5, kind === 0 ? 0 : 0.5, 1, 14, [1, 1, 1], undefined, true);
    const base = g.pos.length / 3;
    g.pos.push(0, -0.5, 0);
    g.nor.push(0, -1, 0);
    g.col.push(1, 1, 1);
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.pos.push(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5);
      g.nor.push(0, -1, 0);
      g.col.push(1, 1, 1);
    }
    for (let i = 0; i < 14; i++) g.idx.push(base, base + 1 + i, base + 2 + i);
    return this.upload(g);
  }
  /** quadrado no plano XY, voltado para +Z, de -0.5 a 0.5 */
  private quadMesh() {
    const g = newGeo();
    pushQuad(g, [-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0], [0, 0, 1], [1, 1, 1]);
    return this.upload(g);
  }

  /* ------------------------------------------------------------ quadro */

  resize(cssW: number, cssH: number, dprMax = 2): boolean {
    const dpr = Math.min(dprMax, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(cssW * dpr));
    const h = Math.max(1, Math.floor(cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      return true;
    }
    return false;
  }

  begin(clear: Vec3 = [0, 0, 0]) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(clear[0], clear[1], clear[2], 1);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.drawCalls = 0;
  }

  setCamera(eye: Vec3, at: Vec3, fovy: number, near = 0.5, far = 220) {
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    m4.perspective(this.proj, fovy, aspect, near, far);
    m4.lookAt(this.view, eye, at, [0, 1, 0]);
    m4.mul(this.vp, this.proj, this.view);
    this.camPos = eye;
  }

  drawSky(top: Vec3, mid: Vec3, bot: Vec3, t: number, stars: number, moon: Vec3, moonPos: [number, number], scroll: [number, number]) {
    const gl = this.gl;
    gl.useProgram(this.sky);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.uniform3fv(this.us.uTop!, top);
    gl.uniform3fv(this.us.uMid!, mid);
    gl.uniform3fv(this.us.uBot!, bot);
    gl.uniform1f(this.us.uTime!, t);
    gl.uniform1f(this.us.uStars!, stars);
    gl.uniform2f(this.us.uMoon!, moonPos[0], moonPos[1]);
    gl.uniform3fv(this.us.uMoonCol!, moon);
    gl.uniform1f(this.us.uAspect!, this.canvas.width / Math.max(1, this.canvas.height));
    gl.uniform2f(this.us.uScroll!, scroll[0], scroll[1]);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    this.drawCalls++;
  }

  useLit(l: Lighting) {
    const gl = this.gl;
    this.light = l;
    this.skinFresh = false;
    gl.useProgram(this.lit);
    gl.uniformMatrix4fv(this.u.uVP!, false, this.vp);
    gl.uniform3fv(this.u.uSun!, l.sun);
    gl.uniform3fv(this.u.uSunDir!, l.sunDir);
    gl.uniform3fv(this.u.uSky!, l.sky);
    gl.uniform3fv(this.u.uGround!, l.ground);
    gl.uniform3fv(this.u.uFog!, l.fog);
    gl.uniform3fv(this.u.uCam!, this.camPos);
    gl.uniform2f(this.u.uFogRange!, l.fogNear, l.fogFar);
  }

  private setMat(opts: DrawOpts, u: Record<string, WebGLUniformLocation | null> = this.u) {
    const gl = this.gl;
    gl.uniform3fv(u.uColor!, opts.color ?? [1, 1, 1]);
    gl.uniform3fv(u.uEmis!, opts.emis ?? [0, 0, 0]);
    gl.uniform1f(u.uAlpha!, opts.alpha ?? 1);
    gl.uniform1f(u.uFlash!, opts.flash ?? 0);
    gl.uniform1f(u.uUnlit!, opts.unlit ? 1 : 0);
    gl.uniform1f(u.uCel!, opts.cel === false ? 0 : 1);
    gl.uniform1f(u.uOutline!, opts.outline ?? 0);
    gl.uniform1f(u.uSoft!, opts.soft ? 1 : 0);
  }

  /** malha com pele (ossos numa textura float): vértices, normais, [região, sombra, junta], ossos, pesos */
  uploadSkin(pos: Float32Array, nor: Float32Array, col: Float32Array, joints: Uint8Array, weights: Uint8Array, idx: Uint16Array): GpuMesh {
    const gl = this.gl;
    const n = pos.length / 3;
    const buf = new ArrayBuffer(n * 44);
    const f = new Float32Array(buf);
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < n; i++) {
      f.set(pos.subarray(i * 3, i * 3 + 3), i * 11);
      f.set(nor.subarray(i * 3, i * 3 + 3), i * 11 + 3);
      f.set(col.subarray(i * 3, i * 3 + 3), i * 11 + 6);
      u8.set(joints.subarray(i * 4, i * 4 + 4), i * 44 + 36);
      u8.set(weights.subarray(i * 4, i * 4 + 4), i * 44 + 40);
    }
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
    for (let a = 0; a < 3; a++) {
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 44, a * 12);
    }
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, false, 44, 36);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, 44, 40);
    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: idx.length, vbo, ibo };
  }

  /** desenha malha com pele; `bones` = J matrizes 4x4 (colunas), `region` = 9 cores */
  drawSkin(mesh: GpuMesh, model: Mat4, bones: Float32Array, nBones: number, region: Float32Array, opts: DrawOpts, ink: Vec3, thick: number) {
    const gl = this.gl;
    const u = this.us2;
    gl.useProgram(this.skinP);
    if (!this.skinFresh && this.light) {
      const l = this.light;
      gl.uniformMatrix4fv(u.uVP!, false, this.vp);
      gl.uniform3fv(u.uSun!, l.sun);
      gl.uniform3fv(u.uSunDir!, l.sunDir);
      gl.uniform3fv(u.uSky!, l.sky);
      gl.uniform3fv(u.uGround!, l.ground);
      gl.uniform3fv(u.uFog!, l.fog);
      gl.uniform3fv(u.uCam!, this.camPos);
      gl.uniform2f(u.uFogRange!, l.fogNear, l.fogFar);
      gl.uniform1i(u.uBones!, 3);
      this.skinFresh = true;
    }
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.boneTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, nBones, gl.RGBA, gl.FLOAT, bones);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniformMatrix4fv(u.uModel!, false, model);
    gl.uniformMatrix3fv(u.uNor!, false, m4.normal(this.nmat, model));
    gl.uniform3fv(u.uRegion!, region);
    gl.bindVertexArray(mesh.vao);
    if (thick > 0) {
      gl.cullFace(gl.FRONT);
      this.setMat({ color: ink, unlit: true, outline: thick, alpha: opts.alpha ?? 1 }, u);
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      gl.cullFace(gl.BACK);
      this.drawCalls++;
    }
    this.setMat(opts, u);
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    this.drawCalls++;
    gl.useProgram(this.lit);
  }

  /** desenha uma malha com a matriz de modelo informada */
  draw(mesh: GpuMesh, model: Mat4 | null, opts: DrawOpts = {}) {
    const gl = this.gl;
    const mdl = model ?? this.ident;
    gl.uniformMatrix4fv(this.u.uModel!, false, mdl);
    gl.uniformMatrix3fv(this.u.uNor!, false, model ? m4.normal(this.nmat, model) : this.identN);
    this.setMat(opts);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.count, this.isBig(mesh) ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
    this.drawCalls++;
  }

  /** corpo + contorno de tinta (casco invertido) */
  drawInked(mesh: GpuMesh, model: Mat4, opts: DrawOpts, ink: Vec3, thick: number) {
    const gl = this.gl;
    if (thick > 0) {
      gl.cullFace(gl.FRONT);
      this.draw(mesh, model, { color: ink, unlit: true, outline: thick, alpha: opts.alpha ?? 1 });
      gl.cullFace(gl.BACK);
    }
    this.draw(mesh, model, opts);
  }

  prim(kind: keyof Engine["prims"], p: Vec3, r: Vec3, s: Vec3, opts: DrawOpts = {}, ink?: Vec3, thick = 0.06) {
    m4.compose(this.model, p, r, s);
    if (ink) this.drawInked(this.prims[kind], this.model, opts, ink, thick);
    else this.draw(this.prims[kind], this.model, opts);
  }

  blend(on: boolean) {
    const gl = this.gl;
    if (on) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    } else {
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
  }

  additive(on: boolean) {
    const gl = this.gl;
    if (on) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
    } else {
      gl.disable(gl.BLEND);
      gl.depthMask(true);
    }
  }

  destroy() {
    const ext = this.gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  }
}
