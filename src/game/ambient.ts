import { m4, type Engine, type Lighting, type Vec3 } from "../engine/gl";

/* Vida do cenário: humor do dia por fase (amanhecer, dia, entardecer, noite, tempestade),
   relâmpagos suaves, criaturas e coisas que passam ao fundo e efeitos próprios de cada mundo.
   Tudo é desenhado por quadro com poucos objetos (sem custo de geometria estática). */

export type Mood = {
  /** multiplicadores de cor para céu, névoa e luz */
  tint: Vec3;
  bright: number;
  stars: number;
  storm: number;
  /** 0..1 clarão de relâmpago neste instante */
  flash: number;
  name: string;
};

const MOODS: { tint: Vec3; bright: number; stars: number; storm: number; name: string }[] = [
  { tint: [1.16, 0.96, 0.9], bright: 1.0, stars: 0.0, storm: 0, name: "amanhecer" },
  { tint: [1.0, 1.0, 1.0], bright: 1.08, stars: 0.0, storm: 0, name: "dia" },
  { tint: [1.26, 0.9, 0.72], bright: 0.96, stars: 0.0, storm: 0, name: "entardecer" },
  { tint: [0.72, 0.82, 1.22], bright: 0.82, stars: 0.7, storm: 0, name: "noite" },
  { tint: [0.84, 0.92, 0.96], bright: 0.84, stars: 0.1, storm: 1, name: "tempestade" },
];

const mixV = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** humor da fase: cada fase de um mundo tem um clima; ao longo do caminho ele vai virando o próximo */
export function moodFor(stage: number, progress: number, t: number): Mood {
  const a = MOODS[stage % 5]!;
  const b = MOODS[(stage + 1) % 5]!;
  const k = Math.max(0, Math.min(1, progress)) * 0.45;
  const storm = a.storm * (1 - k) + b.storm * k;
  // relâmpago: raro e suave (um clarão curto a cada ~11 s, só quando há tempestade)
  let flash = 0;
  if (storm > 0.3) {
    const ph = (t % 11.3) / 11.3;
    if (ph > 0.92) flash = Math.sin(((ph - 0.92) / 0.08) * Math.PI) * 0.22;
    if (ph > 0.5 && ph < 0.53) flash = Math.max(flash, Math.sin(((ph - 0.5) / 0.03) * Math.PI) * 0.12);
  }
  return {
    tint: mixV(a.tint, b.tint, k),
    bright: a.bright + (b.bright - a.bright) * k,
    stars: a.stars + (b.stars - a.stars) * k,
    storm,
    flash,
    name: a.name,
  };
}

export function tintSky(c: Vec3, m: Mood): Vec3 {
  const f = m.bright + m.flash;
  return [Math.min(1, c[0] * m.tint[0] * f + m.flash * 0.3), Math.min(1, c[1] * m.tint[1] * f + m.flash * 0.3), Math.min(1, c[2] * m.tint[2] * f + m.flash * 0.35)];
}

export function tintLight(l: Lighting, m: Mood, out: Lighting): Lighting {
  const f = m.bright + m.flash * 1.5;
  const t = (c: Vec3, k = 1): Vec3 => [c[0] * m.tint[0] * f * k, c[1] * m.tint[1] * f * k, c[2] * m.tint[2] * f * k];
  out.sun = t(l.sun);
  out.sunDir = l.sunDir;
  out.sky = t(l.sky);
  out.ground = t(l.ground);
  out.fog = tintSky(l.fog, m);
  out.fogNear = l.fogNear;
  out.fogFar = l.fogFar;
  return out;
}

export type AmbientCtx = {
  e: Engine;
  wid: number;
  t: number;
  cx: number;
  cy: number;
  halfW: number;
  mood: Mood;
  /** cor escura para silhuetas */
  dark: Vec3;
  accent: Vec3;
  fog: Vec3;
  /** posição do herói em unidades (para peças que reagem) */
  hero: { x: number; y: number } | null;
  glow: (x: number, y: number, z: number, size: number, c: Vec3, a: number) => void;
  tmp: Float32Array;
};

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** posição de algo que cruza a tela: dá a volta a cada `period` segundos */
function lane(c: AmbientCtx, i: number, period: number, speed: number) {
  const span = c.halfW * 2 + 10;
  const u = ((c.t * speed + i * 7.31) % span + span) % span;
  return c.cx - c.halfW - 5 + u + 0 * period;
}

function flap(c: AmbientCtx, x: number, y: number, z: number, s: number, ph: number, col: Vec3, dir: number) {
  const w = Math.sin(c.t * 9 + ph) * 0.55;
  const e = c.e;
  const body = { color: col, emis: [0, 0, 0] as Vec3, unlit: true };
  e.prim("sphere", [x, y, z], [0, 0, 0], [0.5 * s, 0.22 * s, 0.22 * s], body);
  for (const sd of [-1, 1]) e.prim("cube", [x - dir * 0.05 * s, y + 0.12 * s * sd * 0, z + sd * 0.36 * s], [0, 0, 0], [0.34 * s, 0.03 * s, 0.7 * s], body, undefined, 0);
  void w;
}

/** parte opaca: silhuetas, balões, engrenagens, papéis */
export function drawAmbientOpaque(c: AmbientCtx) {
  const { e, wid, t, cy } = c;
  const dark = c.dark;
  const night = c.mood.stars > 0.3 ? 1 : 0.7;
  const body = { color: dark, unlit: true } as const;
  // bandos de criaturas que cruzam o fundo
  const kind = wid === 1 || wid === 2 || wid === 9 ? "bat" : wid === 5 || wid === 3 ? "bird" : wid === 7 || wid === 6 ? "gull" : "";
  if (kind) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = lane(c, i, 40, 0.9 + i * 0.07);
      const y = cy + 3.6 + Math.sin(t * 0.6 + i * 1.7) * 0.7 + (i % 2) * 0.9;
      const z = -7 - (i % 3) * 2.2;
      const wing = Math.sin(t * (kind === "bat" ? 14 : 7) + i * 2) * (kind === "bat" ? 0.7 : 0.5);
      const s = kind === "gull" ? 0.9 : 0.75;
      e.prim("sphere", [x, y, z], [0, 0, 0], [0.42 * s, 0.2 * s, 0.2 * s], body);
      for (const sd of [-1, 1]) e.prim("cube", [x, y + 0.08, z], [sd * 0.2, 0, sd * wing], [0.1 * s, 0.03 * s, 0.9 * s], body);
    }
  }
  if (wid === 0 || wid === 8) {
    // balões e lanternas subindo
    for (let i = 0; i < 5; i++) {
      const x = c.cx - c.halfW + ((i * 9.7 + t * 0.25 * (0.6 + (i % 3) * 0.25)) % (c.halfW * 2));
      const y = cy - 3 + ((t * (0.35 + (i % 3) * 0.12) + i * 3.3) % 12);
      const col: Vec3 = wid === 0 ? ([[0.9, 0.2, 0.3], [0.95, 0.75, 0.2], [0.3, 0.6, 0.95]][i % 3] as Vec3) : [1, 0.85, 0.5];
      e.prim("sphere", [x, y, -6 - (i % 3)], [0, 0, 0], [0.5, 0.62, 0.5], { color: col, emis: col.map((v) => v * (wid === 8 ? 0.8 : 0.35)) as Vec3, unlit: wid === 8 });
      if (wid === 0) e.prim("cube", [x, y - 0.8, -6 - (i % 3)], [0, 0, 0], [0.02, 0.9, 0.02], body);
    }
  }
  if (wid === 2) {
    // engrenagens girando no fundo da forja
    for (let i = 0; i < 4; i++) {
      const x = c.cx - c.halfW * 0.8 + i * (c.halfW * 0.55) + Math.floor((c.cx / (c.halfW * 2.2)) + 0) * 0;
      const gx = x - ((c.cx * 0.15) % (c.halfW * 0.55));
      const y = cy + 1.2 + (i % 2) * 2.4;
      const r = 1.2 + (i % 3) * 0.5;
      const rot = t * (0.4 + (i % 2) * 0.3) * (i % 2 ? 1 : -1);
      e.prim("ring", [gx, y, -13], [Math.PI / 2, 0, 0], [r * 2, 1, r * 2], body);
      for (let k = 0; k < 8; k++) {
        const a = rot + (k / 8) * Math.PI * 2;
        e.prim("cube", [gx + Math.cos(a) * r, y + Math.sin(a) * r, -13], [0, 0, a], [0.34, 0.26, 0.5], body);
      }
    }
  }
  if (wid === 4) {
    // páginas soltas levadas pelo vento
    for (let i = 0; i < 6; i++) {
      const x = c.cx - c.halfW + ((i * 6.3 + t * (0.7 + (i % 3) * 0.2)) % (c.halfW * 2));
      const y = cy + 1 + Math.sin(t * 0.9 + i * 1.9) * 2.2 + (i % 3);
      e.prim("cube", [x, y, -5 - (i % 4) * 1.2], [t * 1.4 + i, t * 0.9 + i * 2, t * 0.5], [0.42, 0.56, 0.02], { color: [0.95, 0.92, 0.82], emis: [0.2, 0.19, 0.16] });
    }
  }
  void night;
}

/** parte translúcida: nuvens/névoa em parallax, aurora, holofotes, bolhas, chuva da tempestade */
export function drawAmbientBlend(c: AmbientCtx) {
  const { e, wid, t, cx, cy, tmp } = c;
  const fog = c.fog;
  // névoa/nuvens à deriva em camadas (o vento muda de força devagar)
  const wind = 0.25 + 0.15 * Math.sin(t * 0.07);
  const clouds = wid === 6 || wid === 8 ? 6 : wid === 3 || wid === 1 ? 5 : 3;
  for (let i = 0; i < clouds; i++) {
    const layer = i % 3;
    const sp = (0.18 + layer * 0.1) * (1 + wind);
    const span = c.halfW * 2 + 24;
    const x = cx - c.halfW - 12 + (((i * 11.7 + t * sp) % span) + span) % span;
    const y = cy + 3.2 + layer * 1.1 + Math.sin(t * 0.08 + i) * 0.4 + (i % 2) * 0.5;
    const z = -14 - layer * 5;
    const cc: Vec3 = [Math.min(1, fog[0] * 1.15 + 0.1), Math.min(1, fog[1] * 1.15 + 0.1), Math.min(1, fog[2] * 1.15 + 0.1)];
    for (let k = 0; k < 4; k++) {
      m4.compose(tmp, [x + k * 2.2 - 3.3, y + Math.sin(k * 1.7) * 0.35, z], [0, 0, 0], [4.2 - Math.abs(k - 1.5) * 0.7, 1.5, 1.2]);
      e.draw(e.prims.sphere, tmp, { color: cc, unlit: true, soft: true, alpha: 0.13 + c.mood.storm * 0.08 });
    }
  }
  // névoa baixa que sobe e desce
  const mist = 0.5 + 0.5 * Math.sin(t * 0.11);
  for (let i = 0; i < 4; i++) {
    const x = cx - c.halfW + (i + 0.5) * (c.halfW / 2) + Math.sin(t * 0.2 + i) * 1.4;
    m4.compose(tmp, [x, cy - 3.9 + mist * 0.4, -2.5 - i * 0.4], [0, 0, 0], [7, 1.6 + mist * 0.5, 2]);
    e.draw(e.prims.sphere, tmp, { color: fog, unlit: true, soft: true, alpha: 0.1 + 0.05 * mist });
  }
  if (wid === 6 || (wid === 3 && c.mood.stars > 0.3)) {
    // aurora: fitas de luz ondulando no céu
    for (let r = 0; r < 3; r++) {
      const col: Vec3 = wid === 6 ? ([[0.3, 1, 0.7], [0.4, 0.8, 1], [0.7, 0.5, 1]][r] as Vec3) : ([[0.5, 1, 0.5], [0.6, 1, 0.8], [0.9, 0.7, 1]][r] as Vec3);
      for (let k = 0; k < 16; k++) {
        const x = cx - c.halfW + (k / 15) * c.halfW * 2;
        const y = cy + 5.2 + r * 0.9 + Math.sin(k * 0.55 + t * 0.35 + r * 2) * 0.9;
        const a = (0.08 + 0.06 * Math.sin(t * 0.5 + k * 0.4 + r)) * (wid === 6 ? 1 : 0.7);
        m4.compose(tmp, [x, y, -26 - r], [0, 0, 0], [3.2, 2.8 + Math.sin(k + t) * 0.5, 1]);
        e.draw(e.prims.sphere, tmp, { color: col, unlit: true, soft: true, alpha: a });
      }
    }
  }
  if (wid === 0 || wid === 9) {
    // holofotes varrendo o céu
    for (let i = 0; i < 3; i++) {
      const bx = cx - c.halfW * 0.7 + i * c.halfW * 0.7;
      const ang = Math.sin(t * 0.5 + i * 2.1) * 0.55;
      const len = 11;
      m4.compose(tmp, [bx + Math.sin(ang) * len * 0.5, cy - 3 + Math.cos(ang) * len * 0.5, -9], [0, 0, -ang], [0.9, len, 0.4]);
      e.draw(e.prims.sphere, tmp, { color: wid === 9 ? [1, 0.9, 0.55] : [0.9, 0.95, 1], unlit: true, soft: true, alpha: 0.1 });
    }
  }
  if (wid === 7) {
    // bolhas e águas-vivas
    for (let i = 0; i < 8; i++) {
      const x = cx - c.halfW + ((i * 5.9 + Math.sin(t * 0.5 + i) * 0.8) % (c.halfW * 2));
      const y = cy - 5 + ((t * (0.4 + (i % 3) * 0.15) + i * 2.1) % 11);
      e.prim("ring", [x, y, -3 - (i % 4)], [Math.PI / 2, 0, 0], [0.34, 1, 0.34], { color: [0.8, 1, 1], unlit: true, alpha: 0.5 });
    }
    for (let i = 0; i < 2; i++) {
      const x = cx - c.halfW * 0.6 + i * c.halfW * 0.9 + Math.sin(t * 0.3 + i * 3) * 1.5;
      const y = cy + 1.5 + Math.sin(t * 0.7 + i * 2) * 1.2;
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.4 + i);
      c.glow(x, y, -8, 1.8 * pulse, [0.5, 0.9, 1], 0.45);
      c.glow(x, y - 0.8, -8, 0.5, [0.7, 1, 1], 0.35);
    }
  }
  if (wid === 2) {
    // faíscas de forja subindo em arcos
    for (let i = 0; i < 14; i++) {
      const u = ((t * (0.3 + (i % 4) * 0.1) + i * 0.37) % 1);
      const x = cx - c.halfW + hash(i * 3.1) * c.halfW * 2 + Math.sin(u * 5 + i) * 0.8;
      const y = cy - 4.5 + u * 9;
      c.glow(x, y, -2 - (i % 5), 0.18 + (1 - u) * 0.12, u < 0.5 ? [1, 0.7, 0.25] : [1, 0.4, 0.15], 0.9 * (1 - u));
    }
  }
  if (wid === 8) {
    // raios de luz celeste e penas
    for (let i = 0; i < 4; i++) {
      const x = cx - c.halfW * 0.8 + i * c.halfW * 0.55 + Math.sin(t * 0.2 + i) * 0.8;
      m4.compose(tmp, [x, cy + 1.5, -10], [0, 0, 0.18], [0.7, 13, 0.4]);
      e.draw(e.prims.sphere, tmp, { color: [1, 0.95, 0.7], unlit: true, soft: true, alpha: 0.07 + 0.03 * Math.sin(t * 0.6 + i * 2) });
    }
  }
  if (wid === 9) {
    // moedas e cédulas brilhando ao fundo
    for (let i = 0; i < 10; i++) {
      const x = cx - c.halfW + ((i * 5.1 + t * 0.3) % (c.halfW * 2));
      const y = cy - 3 + ((t * (0.4 + (i % 3) * 0.1) + i * 1.9) % 10);
      const tw = Math.max(0, Math.sin(t * 3 + i * 2));
      c.glow(x, y, -4 - (i % 3), 0.2 + tw * 0.25, [1, 0.85, 0.35], 0.4 + tw * 0.5);
    }
  }
  if (wid === 1 || wid === 4) {
    // poeira de luz entrando pela abertura
    for (let i = 0; i < 3; i++) {
      const x = cx - c.halfW * 0.6 + i * c.halfW * 0.6;
      m4.compose(tmp, [x, cy + 1, -9], [0, 0, 0.3], [1.1, 12, 0.4]);
      e.draw(e.prims.sphere, tmp, { color: wid === 1 ? [0.7, 0.9, 1] : [1, 0.9, 0.6], unlit: true, soft: true, alpha: 0.05 });
    }
  }
  if (wid === 5) {
    // calor tremulando e redemoinhos de areia
    for (let i = 0; i < 12; i++) {
      const x = cx - c.halfW + ((i * 3.9 + t * 1.1) % (c.halfW * 2));
      const y = cy - 4.2 + Math.sin(t * 2 + i) * 0.2 + (i % 3) * 0.12;
      c.glow(x, y, -1.2 - (i % 4) * 0.5, 0.35, [0.95, 0.8, 0.5], 0.28);
    }
  }
  // tempestade: chuva fina em diagonal e clarão no horizonte
  if (c.mood.storm > 0.3 && wid !== 6) {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const sp = 7 + (i % 4);
      const x = cx - c.halfW + ((i * 7.13 + t * 2.0) % (c.halfW * 2));
      const y = cy + 5 - ((i * 3.37 + t * sp) % 11);
      m4.compose(tmp, [x, y, -1 - (i % 6) * 0.9], [0, 0, 0.25], [0.025, 0.55, 0.025]);
      e.draw(e.prims.cube, tmp, { color: [0.75, 0.85, 1], unlit: true, alpha: 0.35 * c.mood.storm });
    }
  }
  if (c.mood.flash > 0.01) c.glow(cx, cy + 3, -30, 40, [0.85, 0.9, 1], c.mood.flash * 0.5);
  void flap;
}
