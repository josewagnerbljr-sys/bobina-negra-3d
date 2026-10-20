type Buses = {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
};

const NOTES = [
  [110, 130.81, 164.81, 196, 146.83],
  [98, 116.54, 146.83, 174.61, 130.81],
  [92.5, 110, 138.59, 164.81, 123.47],
  [87.31, 110, 130.81, 174.61, 98],
  [82.41, 98, 123.47, 164.81, 110],
];

export function createAudio() {
  let bus: Buses | null = null;
  let muted = false;
  let world = 0;
  let musicOn = false;
  let step = 0;
  let nextAt = 0;
  let voices = 0;

  function ensure(): Buses | null {
    if (bus) return bus;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const music = ctx.createGain();
    const sfx = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    music.gain.value = 0.22;
    sfx.gain.value = 0.8;
    music.connect(master);
    sfx.connect(master);
    master.connect(ctx.destination);
    bus = { ctx, master, music, sfx };
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

  function setWorld(w: number) {
    world = w;
  }

  function setMusic(on: boolean) {
    musicOn = on;
  }

  function tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: GainNode,
    slide = 0,
  ) {
    if (!bus || muted || voices > 16) return;
    const t0 = bus.ctx.currentTime;
    const osc = bus.ctx.createOscillator();
    const g = bus.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest);
    voices += 1;
    osc.onended = () => {
      voices = Math.max(0, voices - 1);
      osc.disconnect();
      g.disconnect();
    };
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur: number, gain: number) {
    if (!bus || muted || voices > 16) return;
    const t0 = bus.ctx.currentTime;
    const n = Math.floor(bus.ctx.sampleRate * dur);
    const buffer = bus.ctx.createBuffer(1, n, bus.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = bus.ctx.createBufferSource();
    src.buffer = buffer;
    const g = bus.ctx.createGain();
    const filter = bus.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 900;
    g.gain.setValueAtTime(gain, t0);
    src.connect(filter);
    filter.connect(g);
    g.connect(bus.sfx);
    voices += 1;
    src.onended = () => {
      voices = Math.max(0, voices - 1);
      src.disconnect();
    };
    src.start(t0);
  }

  function tick() {
    const b = bus;
    if (!b || !musicOn || muted) return;
    if (b.ctx.state !== "running") return;
    const now = b.ctx.currentTime;
    if (nextAt === 0) nextAt = now + 0.05;
    const scale = NOTES[world] ?? NOTES[0]!;
    while (nextAt < now + 0.12) {
      const freq = scale[step % scale.length] ?? 110;
      const bass = step % 4 === 0;
      tone(bass ? freq / 2 : freq, bass ? 0.28 : 0.14, bass ? "triangle" : "square", bass ? 0.05 : 0.03, b.music);
      if (step % 2 === 0) noise(0.03, 0.015);
      step += 1;
      nextAt += 0.42;
    }
  }

  return {
    unlock,
    setMuted,
    setWorld,
    setMusic,
    tick,
    jump() {
      const b = ensure();
      if (!b) return;
      tone(520, 0.09, "square", 0.06, b.sfx, 180);
    },
    shot() {
      const b = ensure();
      if (!b) return;
      noise(0.05, 0.05);
      tone(680 + Math.random() * 80, 0.06, "square", 0.04, b.sfx, -200);
    },
    hit() {
      const b = ensure();
      if (!b) return;
      tone(180, 0.08, "sawtooth", 0.05, b.sfx, -60);
    },
    hurt() {
      const b = ensure();
      if (!b) return;
      tone(140, 0.16, "sawtooth", 0.07, b.sfx, -80);
    },
    die() {
      const b = ensure();
      if (!b) return;
      tone(220, 0.35, "triangle", 0.08, b.sfx, -160);
    },
    transform() {
      const b = ensure();
      if (!b) return;
      tone(90, 0.4, "sawtooth", 0.06, b.sfx, 220);
    },
    pickup() {
      const b = ensure();
      if (!b) return;
      tone(660, 0.08, "triangle", 0.05, b.sfx, 200);
    },
    ui() {
      const b = ensure();
      if (!b) return;
      tone(440, 0.05, "square", 0.03, b.sfx);
    },
    fanfare() {
      const b = ensure();
      if (!b) return;
      tone(392, 0.12, "triangle", 0.06, b.sfx);
      tone(523, 0.18, "triangle", 0.05, b.sfx, 40);
    },
  };
}

export type AudioApi = ReturnType<typeof createAudio>;
