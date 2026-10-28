/* Áudio 100% sintetizado (Web Audio): trilha de rock original, uma por mundo,
   inspirada nos anos 70 (boogie/psicodélico), 80 (metal/synth) e 90 (grunge/industrial).
   Nada é amostrado nem copiado: as músicas são compostas aqui, nota por nota, então
   não há direitos autorais de terceiros. */

type Buses = {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  delay: GainNode;
  distCurve: Float32Array<ArrayBuffer>;
  softCurve: Float32Array<ArrayBuffer>;
  noiseBuf: AudioBuffer;
};

type Style = "boogie" | "gallop" | "chug" | "pluck" | "synth";

type Song = {
  name: string;
  era: string;
  bpm: number;
  prog: number[]; // fundamental (MIDI) de cada compasso, 8 compassos
  scale: number[];
  leadRoot: number;
  style: Style;
  kick: string;
  snare: string;
  hat: string;
  seed: number;
  leadWave: OscillatorType;
  swing: number;
};

const BASE_SONGS: Song[] = [
  // 0 · Carnaval de Verniz — boogie de palco, anos 70
  { name: "Picadeiro Elétrico", era: "70s", bpm: 126, prog: [40, 40, 45, 40, 47, 45, 40, 40], scale: [0, 3, 5, 6, 7, 10, 12], leadRoot: 64, style: "boogie", kick: "x...x..xx..xx...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", seed: 11, leadWave: "sawtooth", swing: 0.16 },
  // 1 · Catacumbas de Medula — metal gótico, anos 80
  { name: "Missa de Ossos", era: "80s", bpm: 108, prog: [38, 38, 34, 36, 38, 38, 31, 33], scale: [0, 2, 3, 5, 7, 8, 11, 12], leadRoot: 62, style: "gallop", kick: "x.xxx.xxx.xxx.xx", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", seed: 23, leadWave: "sawtooth", swing: 0 },
  // 2 · Forja dos Golens — industrial/grunge, anos 90
  { name: "Bigorna Quente", era: "90s", bpm: 96, prog: [38, 38, 41, 36, 38, 38, 43, 41], scale: [0, 3, 5, 7, 10, 12], leadRoot: 62, style: "chug", kick: "x..x..x.x..x..x.", snare: "....x.......x...", hat: "..x...x...x...xx", seed: 37, leadWave: "square", swing: 0.05 },
  // 3 · Mata Cega — rock psicodélico sulista, anos 70
  { name: "Seiva e Ruído", era: "70s", bpm: 92, prog: [45, 50, 45, 52, 45, 50, 52, 45], scale: [0, 2, 4, 7, 9, 12], leadRoot: 69, style: "pluck", kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", seed: 41, leadWave: "triangle", swing: 0.12 },
  // 4 · Arquivo do Contrato — synth-rock progressivo, anos 80
  { name: "Cláusula Final", era: "80s", bpm: 120, prog: [48, 44, 51, 46, 48, 44, 43, 46], scale: [0, 2, 3, 5, 7, 8, 10, 12], leadRoot: 72, style: "synth", kick: "x...x...x...x...", snare: "....x.......x..x", hat: "x.xxx.xxx.xxx.xx", seed: 53, leadWave: "sawtooth", swing: 0 },
  // 5 · Dunas do Sol Morto — hard rock árabe, anos 80
  { name: "Sol de Papiro", era: "80s", bpm: 104, prog: [40, 41, 40, 45, 40, 41, 44, 40], scale: [0, 1, 4, 5, 7, 8, 10, 12], leadRoot: 64, style: "gallop", kick: "x..xx..xx..xx..x", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", seed: 61, leadWave: "sawtooth", swing: 0.04 },
  // 6 · Geleira Silenciosa — synth gélido, anos 80
  { name: "Cristal Fino", era: "80s", bpm: 86, prog: [45, 41, 43, 40, 45, 41, 38, 40], scale: [0, 2, 3, 5, 7, 8, 10, 12], leadRoot: 76, style: "synth", kick: "x.......x...x...", snare: "........x.......", hat: "x.x.x.x.x.x.x.xx", seed: 67, leadWave: "triangle", swing: 0 },
  // 7 · Lagoa dos Náufragos — surf rock, anos 60/70
  { name: "Maré Alta", era: "70s", bpm: 134, prog: [45, 45, 50, 45, 52, 50, 45, 52], scale: [0, 2, 4, 7, 9, 12], leadRoot: 69, style: "pluck", kick: "x...x...x...x.x.", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", seed: 71, leadWave: "square", swing: 0.08 },
  // 8 · Cidadela Celeste — rock progressivo sinfônico, anos 70
  { name: "Coro de Trombetas", era: "70s", bpm: 112, prog: [48, 50, 52, 47, 48, 50, 55, 52], scale: [0, 2, 4, 5, 7, 9, 11, 12], leadRoot: 72, style: "synth", kick: "x.....x.x.....x.", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", seed: 79, leadWave: "triangle", swing: 0.06 },
  // 9 · Palácio do Empresário — metal industrial, anos 90
  { name: "Contrato de Ferro", era: "90s", bpm: 138, prog: [36, 36, 39, 38, 36, 36, 43, 41], scale: [0, 2, 3, 5, 7, 8, 11, 12], leadRoot: 60, style: "chug", kick: "x.xxx.xxx.xx.xxx", snare: "....x.......x..x", hat: "x.x.x.x.x.x.xxxx", seed: 83, leadWave: "sawtooth", swing: 0 },
];

const KICKS = ["x...x..xx..xx...", "x.xxx.xxx.xxx.xx", "x..x..x.x..x..x.", "x.....x.x.......", "x...x...x...x...", "x..x..x..x..x.x.", "x.x...x.x.x...x."];
const SNARES = ["....x.......x...", "....x.......x..x", "....x..x....x...", "........x......."];
const HATS = ["x.x.x.x.x.x.x.x.", "x.xxx.xxx.xxx.xx", "..x...x...x...xx", "xxxxxxxxxxxxxxxx"];
const ROMAN = ["I", "II", "III", "IV", "V"];
const SHIFT = [0, 2, -2, 3, 5];
const BPMK = [1, 1.04, 0.95, 1.08, 1.12];

/** 60 faixas: 10 mundos x 5 fases + 10 mapas-bônus, todas derivadas das bases */
const songCache = new Map<number, Song>();
function songFor(track: number): Song {
  let sg = songCache.get(track);
  if (sg) return sg;
  const bonus = track >= 50;
  const w = bonus ? track - 50 : Math.floor(track / 5);
  const st = bonus ? 2 : track % 5;
  const base = BASE_SONGS[Math.max(0, Math.min(9, w))]!;
  const sh = SHIFT[st]! + (bonus ? 7 : 0);
  const rot = (st * 2) % 8;
  const prog = base.prog.map((_, i) => base.prog[(i + rot) % 8]! + sh);
  const pick = (list: string[], cur: string, k: number) => (st === 0 ? cur : list[(Math.max(0, list.indexOf(cur)) + st * k + (bonus ? 1 : 0)) % list.length]!);
  sg = {
    ...base,
    name: bonus ? `Bis: ${base.name}` : st === 0 ? base.name : `${base.name} ${ROMAN[st]}`,
    bpm: Math.round(base.bpm * BPMK[st]! * (bonus ? 1.18 : 1)),
    prog,
    leadRoot: base.leadRoot + sh,
    kick: pick(KICKS, base.kick, 2),
    snare: pick(SNARES, base.snare, 1),
    hat: pick(HATS, base.hat, 1),
    seed: base.seed + st * 17 + (bonus ? 101 : 0),
    leadWave: bonus ? "square" : base.leadWave,
  };
  songCache.set(track, sg);
  return sg;
}
const leadCache = new Map<number, number[][]>();
function leadFor(track: number): number[][] {
  let l = leadCache.get(track);
  if (!l) {
    l = makeLead(songFor(track));
    leadCache.set(track, l);
  }
  return l;
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** melodia de guitarra solo: 8 compassos x 16 passos, fixa por música (-1 = pausa) */
function makeLead(song: Song): number[][] {
  const r = rng(song.seed);
  const bars: number[][] = [];
  const motif = Array.from({ length: 6 }, () => Math.floor(r() * song.scale.length));
  for (let b = 0; b < 8; b++) {
    const bar = new Array<number>(16).fill(-1);
    const slots = b % 2 === 0 ? [0, 3, 6, 8, 11, 14] : [0, 2, 4, 8, 10, 12];
    let idx = motif[b % 6]!;
    for (const st of slots) {
      if (r() < 0.2) continue;
      idx = Math.max(0, Math.min(song.scale.length - 1, idx + Math.floor(r() * 5) - 2));
      bar[st] = idx;
    }
    bar[b % 4 === 3 ? 12 : 0] = b % 2 === 0 ? 0 : 2;
    bars.push(bar);
  }
  return bars;
}


export function createAudio() {
  let bus: Buses | null = null;
  let muted = false;
  let world = 0;
  let track = 0;
  let boss = false;
  let mood: "play" | "menu" = "play";
  let musicOn = false;
  let nextAt = 0;
  let stepNo = 0;
  let voices = 0;
  let lastSong = -1;

  function curve(k: number): Float32Array<ArrayBuffer> {
    const n = 1024;
    const c = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(x * k) / Math.tanh(k);
    }
    return c;
  }

  function ensure(): Buses | null {
    if (bus) return bus;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    const music = ctx.createGain();
    const sfx = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    music.gain.value = 0.65;
    sfx.gain.value = 0.85;
    // eco do solo
    const delay = ctx.createGain();
    const dl = ctx.createDelay(1);
    dl.delayTime.value = 0.34;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter();
    dlp.type = "lowpass";
    dlp.frequency.value = 2400;
    delay.connect(dl);
    dl.connect(dlp);
    dlp.connect(fb);
    fb.connect(dl);
    dlp.connect(music);
    music.connect(comp);
    sfx.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    bus = { ctx, master, music, sfx, delay, distCurve: curve(7), softCurve: curve(2.2), noiseBuf: nb };
    return bus;
  }

  function unlock() {
    const b = ensure();
    if (b && b.ctx.state === "suspended") void b.ctx.resume();
  }

  function setMuted(m: boolean) {
    muted = m;
    if (!bus) return;
    bus.master.gain.setTargetAtTime(m ? 0 : 0.9, bus.ctx.currentTime, 0.03);
  }

  function setWorld(w: number, stage = 0, bonus = false) {
    const t = bonus ? 50 + Math.max(0, Math.min(9, w)) : Math.max(0, Math.min(9, w)) * 5 + Math.max(0, Math.min(4, stage));
    if (t !== track) stepNo = 0;
    world = Math.max(0, Math.min(9, w));
    track = t;
  }
  function setBoss(on: boolean) {
    boss = on;
  }
  function setMusic(on: boolean, m: "play" | "menu" = "play") {
    musicOn = on;
    mood = m;
  }

  /* --------------------------------------------------------- instrumentos */

  function cleanup(nodes: AudioNode[], src: AudioScheduledSourceNode[]) {
    voices += 1;
    const last = src[src.length - 1];
    if (last)
      last.onended = () => {
        voices = Math.max(0, voices - 1);
        for (const n of nodes) {
          try {
            n.disconnect();
          } catch {
            /* já solto */
          }
        }
      };
  }

  function env(g: GainNode, t: number, peak: number, a: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function osc(b: Buses, type: OscillatorType, f: number, t: number, dur: number, dest: AudioNode, peak: number, o: { a?: number; slideTo?: number; detune?: number; filter?: number } = {}) {
    if (voices > 40) return;
    const ctx = b.ctx;
    const os = ctx.createOscillator();
    const g = ctx.createGain();
    os.type = type;
    os.frequency.setValueAtTime(f, t);
    if (o.slideTo) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + dur);
    if (o.detune) os.detune.value = o.detune;
    env(g, t, peak, o.a ?? 0.008, dur);
    const nodes: AudioNode[] = [os, g];
    if (o.filter) {
      const fl = ctx.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.value = o.filter;
      os.connect(fl);
      fl.connect(g);
      nodes.push(fl);
    } else os.connect(g);
    g.connect(dest);
    os.start(t);
    os.stop(t + (o.a ?? 0.008) + dur + 0.05);
    cleanup(nodes, [os]);
  }

  function noiseHit(b: Buses, t: number, dur: number, peak: number, dest: AudioNode, o: { type?: BiquadFilterType; freq?: number; q?: number; to?: number } = {}) {
    if (voices > 40) return;
    const ctx = b.ctx;
    const src = ctx.createBufferSource();
    src.buffer = b.noiseBuf;
    src.loop = true;
    const fl = ctx.createBiquadFilter();
    fl.type = o.type ?? "highpass";
    fl.frequency.setValueAtTime(o.freq ?? 6000, t);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    fl.Q.value = o.q ?? 0.7;
    const g = ctx.createGain();
    env(g, t, peak, 0.002, dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
    cleanup([src, fl, g], [src]);
  }

  const kick = (b: Buses, t: number, v = 1) => {
    osc(b, "sine", 160, t, 0.16, b.music, 0.95 * v, { slideTo: 42 });
    noiseHit(b, t, 0.02, 0.18 * v, b.music, { freq: 2500 });
  };
  const snare = (b: Buses, t: number, v = 1, metal = false) => {
    noiseHit(b, t, 0.16, 0.5 * v, b.music, { type: "bandpass", freq: 1900, q: 0.6 });
    osc(b, "triangle", 190, t, 0.1, b.music, 0.4 * v, { slideTo: 120 });
    if (metal) osc(b, "square", 2300, t, 0.06, b.music, 0.07 * v, { slideTo: 1900 });
  };
  const hat = (b: Buses, t: number, open = false, v = 1) => noiseHit(b, t, open ? 0.14 : 0.04, 0.16 * v, b.music, { freq: 7800 });

  const bass = (b: Buses, t: number, m: number, dur: number, v = 1) => {
    osc(b, "sawtooth", mtof(m), t, dur, b.music, 0.22 * v, { filter: 520 });
    osc(b, "sine", mtof(m - 12), t, dur, b.music, 0.3 * v);
  };

  /** acorde de força (fundamental + quinta + oitava) com distorção */
  const power = (b: Buses, t: number, m: number, dur: number, v = 1, bright = 2600) => {
    if (voices > 38) return;
    const ctx = b.ctx;
    const sh = ctx.createWaveShaper();
    sh.curve = b.distCurve;
    const fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = bright;
    const g = ctx.createGain();
    env(g, t, 0.17 * v, 0.004, dur);
    sh.connect(fl);
    fl.connect(g);
    g.connect(b.music);
    const oscs: OscillatorNode[] = [];
    for (const [off, det] of [[0, -7], [7, 5], [12, -3]] as const) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = mtof(m + off);
      o.detune.value = det;
      o.connect(sh);
      o.start(t);
      o.stop(t + dur + 0.06);
      oscs.push(o);
    }
    cleanup([sh, fl, g, ...oscs], [oscs[oscs.length - 1]!]);
  };

  const lead = (b: Buses, t: number, m: number, dur: number, wave: OscillatorType, v = 1) => {
    if (voices > 38) return;
    const ctx = b.ctx;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(mtof(m), t);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(7, t + dur * 0.7);
    lfo.connect(lg);
    lg.connect(o.detune);
    const sh = ctx.createWaveShaper();
    sh.curve = b.softCurve;
    const g = ctx.createGain();
    env(g, t, 0.11 * v, 0.01, dur);
    const fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = 3200;
    o.connect(sh);
    sh.connect(fl);
    fl.connect(g);
    g.connect(b.music);
    g.connect(b.delay);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.08);
    lfo.stop(t + dur + 0.08);
    cleanup([o, lfo, lg, sh, g, fl], [o]);
  };

  const pad = (b: Buses, t: number, m: number, dur: number, v = 1) => {
    for (const off of [0, 7, 12]) osc(b, "sawtooth", mtof(m + off), t, dur, b.music, 0.05 * v, { a: 0.25, filter: 1100, detune: off * 3 });
  };

  const pluck = (b: Buses, t: number, m: number, v = 1) => osc(b, "triangle", mtof(m), t, 0.35, b.music, 0.17 * v, { filter: 3200 });
  const synthArp = (b: Buses, t: number, m: number, dur: number, v = 1) => osc(b, "sawtooth", mtof(m), t, dur, b.music, 0.08 * v, { filter: 2400 });

  /* ------------------------------------------------------------ sequenciador */

  function playStep(b: Buses, song: Song, idx: number, step: number, t: number) {
    const bar = Math.floor(step / 16) % 8;
    const s = step % 16;
    const root = song.prog[bar]!;
    const intense = boss;
    const menu = mood === "menu";
    const sd = 60 / song.bpm / 4;
    const hit = (pat: string) => pat[s] === "x";

    if (!menu) {
      if (hit(song.kick)) kick(b, t);
      else if (intense && s % 4 === 2) kick(b, t, 0.7);
      if (hit(song.snare)) snare(b, t, 1, song.style === "chug");
      if (hit(song.hat)) hat(b, t, s % 8 === 6 && !intense);
      else if (intense && s % 2 === 1) hat(b, t, false, 0.6);
      if (song.style === "chug" && s === 14 && bar % 2 === 1) noiseHit(b, t, 0.22, 0.12, b.music, { type: "bandpass", freq: 2600, q: 8 }); // ferro na bigorna
      if (song.style === "chug" && s === 12 && bar % 4 === 3) osc(b, "sine", 2200, t, 0.25, b.music, 0.07);
    } else if (s % 8 === 0) kick(b, t, 0.5);

    const hitsGuitar = (() => {
      switch (song.style) {
        case "boogie":
          return s % 2 === 0;
        case "gallop":
          return [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(s);
        case "chug":
          return [0, 3, 6, 8, 11, 14].includes(s);
        default:
          return false;
      }
    })();

    if (hitsGuitar && !menu) {
      const long = s === 0 || (s === 8 && song.style !== "gallop");
      const palm = !long;
      let m = root + 12;
      if (song.style === "boogie" && s % 8 === 4) m = root + 12 + 2; // swing de boogie
      if (song.style === "boogie" && s % 8 === 6) m = root + 12 + 3;
      power(b, t, m, palm ? sd * 1.6 : sd * 6, palm ? 0.8 : 1.1, palm ? 1800 : 3000);
      bass(b, t, root, palm ? sd * 1.8 : sd * 5);
    }

    if (song.style === "pluck") {
      const chord = [0, 4, 7, 12, 7, 4, 0, 4];
      if (s % 2 === 0) pluck(b, t, root + 12 + chord[(s / 2) % chord.length]!, 0.9);
      if (s === 0 || s === 8) {
        bass(b, t, root, sd * 7);
        pad(b, t, root + 12, sd * 15, 0.9);
      }
      if (s === 10 || s === 14) bass(b, t, root + 7, sd * 3, 0.8);
    }
    if (song.style === "synth") {
      const arp = [0, 7, 12, 7, 3, 10, 15, 10];
      synthArp(b, t, root + 24 + (bar % 2 === 0 ? 0 : -12) + arp[s % 8]! - 12, sd * 1.4, intense ? 1.2 : 1);
      if (s % 2 === 0) bass(b, t, root, sd * 1.6);
      if (s === 0) pad(b, t, root + 12, sd * 15, 1.1);
    }
    if (menu && song.style !== "pluck" && song.style !== "synth") {
      if (s === 0) {
        pad(b, t, root + 12, sd * 15, 1.2);
        bass(b, t, root, sd * 14, 0.9);
      }
    }

    // solo: entra na segunda metade do ciclo (ou o tempo todo contra chefes)
    if (!menu && (bar >= 4 || intense)) {
      const n = leadFor(idx)[bar]![s]!;
      if (n >= 0) {
        const nxt = leadFor(idx)[bar]!.findIndex((v, i) => i > s && v >= 0);
        const len = ((nxt < 0 ? 16 : nxt) - s) * sd * 0.9;
        lead(b, t, song.leadRoot + song.scale[n]! - (song.style === "synth" ? 12 : 0) + (root - song.prog[0]!), Math.max(0.12, len), song.leadWave, intense ? 1.15 : 1);
      }
    }
  }

  function tick() {
    const b = bus;
    if (!b || !musicOn || muted) return;
    if (b.ctx.state !== "running") return;
    const now = b.ctx.currentTime;
    const idx = track;
    const song = songFor(idx);
    if (lastSong !== idx) {
      lastSong = idx;
      stepNo = 0;
      nextAt = 0;
    }
    if (nextAt === 0 || nextAt < now - 0.5) nextAt = now + 0.06;
    const bpm = song.bpm * (boss ? 1.12 : mood === "menu" ? 0.85 : 1);
    while (nextAt < now + 0.2) {
      const sd = 60 / bpm / 4;
      const swing = stepNo % 2 === 1 ? sd * song.swing : 0;
      playStep(b, song, idx, stepNo, nextAt + swing);
      stepNo += 1;
      nextAt += sd;
    }
  }

  /* ------------------------------------------------------------------- sfx */

  const S = () => ensure();

  return {
    unlock,
    setMuted,
    setWorld,
    setBoss,
    setMusic,
    tick,
    songName: () => `${songFor(track).name} (${songFor(track).era})`,
    jump() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      osc(b, "square", 380, t, 0.12, b.sfx, 0.07, { slideTo: 760 });
    },
    shot(hero: string = "ivo") {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      if (hero === "ivo") {
        noiseHit(b, t, 0.09, 0.4, b.sfx, { type: "bandpass", freq: 1800, q: 0.8 });
        osc(b, "sine", 150, t, 0.1, b.sfx, 0.35, { slideTo: 60 });
      } else if (hero === "lena") {
        osc(b, "sine", 1500, t, 0.14, b.sfx, 0.09, { slideTo: 500 });
        osc(b, "triangle", 2250, t, 0.1, b.sfx, 0.04, { slideTo: 800 });
      } else if (hero === "osso") {
        osc(b, "triangle", 900, t, 0.04, b.sfx, 0.12, { slideTo: 700 });
        osc(b, "triangle", 1250, t + 0.045, 0.05, b.sfx, 0.1, { slideTo: 900 });
      } else if (hero === "tito") {
        noiseHit(b, t, 0.18, 0.35, b.sfx, { type: "bandpass", freq: 700, to: 2600, q: 0.7 });
        osc(b, "sawtooth", 110, t, 0.16, b.sfx, 0.12, { slideTo: 220, filter: 900 });
      } else if (hero === "mari") {
        osc(b, "sine", 520, t, 0.1, b.sfx, 0.12, { slideTo: 980 });
        osc(b, "sine", 780, t + 0.05, 0.1, b.sfx, 0.08, { slideTo: 1300 });
      } else if (hero === "pia") {
        osc(b, "square", 90, t, 0.1, b.sfx, 0.16, { slideTo: 50 });
        noiseHit(b, t, 0.06, 0.3, b.sfx, { type: "lowpass", freq: 1200 });
      } else if (hero === "lumen") {
        osc(b, "sawtooth", 1800, t, 0.1, b.sfx, 0.08, { slideTo: 300, filter: 4000 });
        noiseHit(b, t, 0.07, 0.25, b.sfx, { type: "highpass", freq: 3000 });
      } else {
        osc(b, "sawtooth", 330, t, 0.16, b.sfx, 0.08, { slideTo: 190, filter: 1800 });
        noiseHit(b, t, 0.06, 0.1, b.sfx, { freq: 4000 });
      }
    },
    hit() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      noiseHit(b, t, 0.07, 0.3, b.sfx, { type: "bandpass", freq: 900, q: 0.9 });
      osc(b, "sawtooth", 200, t, 0.09, b.sfx, 0.12, { slideTo: 90 });
    },
    hurt() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      osc(b, "sawtooth", 260, t, 0.28, b.sfx, 0.16, { slideTo: 70, filter: 1600 });
      noiseHit(b, t, 0.12, 0.25, b.sfx, { type: "lowpass", freq: 1500 });
    },
    die() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      osc(b, "triangle", 330, t, 0.9, b.sfx, 0.2, { slideTo: 70 });
      osc(b, "sawtooth", 165, t, 0.9, b.sfx, 0.1, { slideTo: 40, filter: 900 });
      noiseHit(b, t, 0.5, 0.15, b.sfx, { type: "lowpass", freq: 1200, to: 200 });
    },
    transform() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      osc(b, "sawtooth", 80, t, 0.7, b.sfx, 0.16, { slideTo: 480, filter: 2500 });
      osc(b, "square", 160, t, 0.7, b.sfx, 0.06, { slideTo: 960, filter: 2500 });
      noiseHit(b, t, 0.7, 0.2, b.sfx, { type: "bandpass", freq: 300, to: 5000, q: 1.4 });
      osc(b, "sine", 60, t + 0.68, 0.45, b.sfx, 0.5, { slideTo: 35 });
      noiseHit(b, t + 0.68, 0.3, 0.3, b.sfx, { type: "lowpass", freq: 3000 });
    },
    skill(i: number) {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      if (i === 0) {
        osc(b, "sawtooth", 1400, t, 0.3, b.sfx, 0.08, { slideTo: 400, filter: 3000 });
        noiseHit(b, t, 0.2, 0.18, b.sfx, { type: "bandpass", freq: 3500, to: 800, q: 1.2 });
      } else if (i === 1) {
        noiseHit(b, t, 0.26, 0.5, b.sfx, { type: "bandpass", freq: 600, to: 5200, q: 1.1 });
        osc(b, "square", 220, t, 0.18, b.sfx, 0.09, { slideTo: 900 });
        osc(b, "sine", 120, t + 0.12, 0.2, b.sfx, 0.4, { slideTo: 50 });
      } else if (i === 2) {
        osc(b, "sine", 140, t, 0.5, b.sfx, 0.7, { slideTo: 38 });
        noiseHit(b, t, 0.45, 0.45, b.sfx, { type: "lowpass", freq: 3500, to: 200 });
        osc(b, "sawtooth", 98, t, 0.4, b.sfx, 0.12, { slideTo: 49, filter: 800 });
      } else {
        osc(b, "sawtooth", 60, t, 1.1, b.sfx, 0.2, { slideTo: 600, filter: 2800 });
        noiseHit(b, t, 1.1, 0.25, b.sfx, { type: "bandpass", freq: 250, to: 6000, q: 1.4 });
        const t2 = t + 0.9;
        osc(b, "sine", 120, t2, 0.9, b.sfx, 0.9, { slideTo: 30 });
        noiseHit(b, t2, 1.4, 0.55, b.sfx, { freq: 5500 }); // prato de ataque
        for (const [off, d] of [[0, -5], [7, 4], [12, -2]] as const) osc(b, "sawtooth", mtof(40 + off), t2, 0.9, b.sfx, 0.09, { filter: 2400, detune: d });
      }
    },
    pickup() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      osc(b, "triangle", 660, t, 0.1, b.sfx, 0.08, { slideTo: 990 });
      osc(b, "triangle", 990, t + 0.07, 0.14, b.sfx, 0.07, { slideTo: 1320 });
    },
    loot(rarity = 0) {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      const notes = [72, 76, 79, 84].slice(0, 2 + rarity);
      notes.forEach((m, i) => osc(b, "triangle", mtof(m), t + i * 0.06, 0.16, b.sfx, 0.08));
    },
    chest() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      noiseHit(b, t, 0.18, 0.25, b.sfx, { type: "bandpass", freq: 700, to: 2400, q: 1.2 });
      osc(b, "sine", 180, t, 0.2, b.sfx, 0.3, { slideTo: 90 });
      for (const [i, m] of [[0, 67], [1, 72], [2, 76], [3, 79]] as const) osc(b, "triangle", mtof(m), t + 0.1 + i * 0.07, 0.2, b.sfx, 0.08);
    },
    levelup() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      for (const [i, m] of [[0, 60], [1, 64], [2, 67], [3, 72], [4, 76]] as const) {
        osc(b, "sawtooth", mtof(m), t + i * 0.08, 0.3, b.sfx, 0.07, { filter: 2600 });
        osc(b, "triangle", mtof(m + 12), t + i * 0.08, 0.3, b.sfx, 0.06);
      }
    },
    drink() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      for (let i = 0; i < 3; i++) osc(b, "sine", 300 + i * 90, t + i * 0.07, 0.1, b.sfx, 0.1, { slideTo: 520 + i * 90 });
    },
    land() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      noiseHit(b, t, 0.07, 0.14, b.sfx, { type: "lowpass", freq: 900 });
    },
    ui() {
      const b = S();
      if (!b) return;
      osc(b, "square", 440, b.ctx.currentTime, 0.05, b.sfx, 0.04);
    },
    fanfare() {
      const b = S();
      if (!b) return;
      const t = b.ctx.currentTime;
      for (const [i, m] of [[0, 55], [1, 59], [2, 62], [3, 67]] as const) {
        osc(b, "sawtooth", mtof(m), t + i * 0.12, 0.35, b.sfx, 0.09, { filter: 2400 });
        osc(b, "triangle", mtof(m + 12), t + i * 0.12, 0.35, b.sfx, 0.07);
      }
    },
  };
}

export type AudioApi = ReturnType<typeof createAudio>;
