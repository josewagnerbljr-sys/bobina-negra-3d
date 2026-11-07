import { m4, type Engine, type GpuMesh, type Mat4, type Vec3 } from "./gl";
import { G, type DrawState, type Model, type Pose } from "./models";
import { SkinRig, type CharAsset, type Clip } from "./skin";
import { rinvOf, type SkinPart } from "./skinhero";

/* Modelos texturizados de verdade (Quaternius Bestiary e Modular Outfits, licença do pacote Standard)
   no esqueleto Unreal, com as animações UAL1/UAL2 (CC0). Conversor: tools/glb2ue.py */

type RawPart = { n: number; pos: Float32Array; nor: Float32Array; col: Float32Array; ji: Uint8Array; w: Uint8Array; idx: Uint16Array; color: string | null; emis: string | null; estr: number };
export type TexAsset = CharAsset & { parts: RawPart[]; gpu: Map<Engine, { mesh: GpuMesh; tex: WebGLTexture; emis: WebGLTexture | null; estr: number }[]> };

let base: { names: string[]; index: Map<string, number>; parent: Int16Array; rot: Int16Array; hip: Float32Array; clips: Map<string, Clip>; restT: Float32Array; restR: Float32Array } | null = null;
const assets = new Map<string, TexAsset>();
let loading: Promise<boolean> | null = null;
let dirBase = "";

export const TEX_MODELS = ["imp", "puglin", "male_ranger", "female_ranger", "male_peasant", "female_peasant"];

export function texReady(name: string) {
  return assets.has(name);
}

export function loadUE(e: Engine): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    try {
      dirBase = new URL("./models/ue/", document.baseURI).href;
      const q = typeof __BUILD__ === "string" ? "?v=" + __BUILD__ : "";
      const [jr, br] = await Promise.all([fetch(dirBase + "ue.json" + q), fetch(dirBase + "ue.bin" + q)]);
      if (!jr.ok || !br.ok) return false;
      const info = await jr.json();
      const buf = await br.arrayBuffer();
      const J = info.joints.length as number;
      const parent = new Int16Array(J);
      const restT = new Float32Array(J * 3);
      const restR = new Float32Array(J * 4);
      const names: string[] = [];
      const index = new Map<string, number>();
      info.joints.forEach((j: { name: string; parent: number; t: number[]; r: number[] }, i: number) => {
        parent[i] = j.parent;
        restT.set(j.t, i * 3);
        restR.set(j.r, i * 4);
        names.push(j.name);
        index.set(j.name, i);
      });
      const clips = new Map<string, Clip>();
      for (const c of info.clips as Clip[]) clips.set(c.name, c);
      base = { names, index, parent, rot: new Int16Array(buf, 0, info.rotN), hip: new Float32Array(buf, info.hipOff, info.hipN), clips, restT, restR };
      await Promise.all(TEX_MODELS.map((n) => loadModel(n, q)));
      void e;
      return true;
    } catch {
      return false;
    }
  })();
  return loading;
}

async function loadModel(name: string, q: string) {
  const b = base!;
  const [jr, br] = await Promise.all([fetch(dirBase + name + ".json" + q), fetch(dirBase + name + ".bin" + q)]);
  if (!jr.ok || !br.ok) return;
  const info = await jr.json();
  const buf = await br.arrayBuffer();
  const J = b.names.length;
  const restT = new Float32Array(J * 3);
  const restR = new Float32Array(J * 4);
  info.joints.forEach((j: { t: number[]; r: number[] }, i: number) => {
    restT.set(j.t, i * 3);
    restR.set(j.r, i * 4);
  });
  const parts: RawPart[] = (info.parts as Record<string, number | string | null>[]).map((m) => {
    const n = m.n as number;
    const f32 = (off: number, len: number) => new Float32Array(buf.slice(off, off + len * 4));
    const uv = f32(m.uv as number, n * 2);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = uv[i * 2]!;
      col[i * 3 + 1] = uv[i * 2 + 1]!;
    }
    return {
      n,
      pos: f32(m.pos as number, n * 3),
      nor: f32(m.nor as number, n * 3),
      col,
      ji: new Uint8Array(buf.slice(m.ji as number, (m.ji as number) + n * 4)),
      w: new Uint8Array(buf.slice(m.w as number, (m.w as number) + n * 4)),
      idx: new Uint16Array(buf.slice(m.idx as number, (m.idx as number) + (m.ni as number) * 2)),
      color: (m.color as string | null) ?? null,
      emis: (m.emis as string | null) ?? null,
      estr: (m.estr as number) ?? 0,
    };
  });
  const ual0 = Math.hypot(b.restT[3]!, b.restT[4]!, b.restT[5]!);
  const pl = info.pelvis as number[];
  const mod0 = Math.hypot(pl[0]!, pl[1]!, pl[2]!);
  const a = {
    J,
    parent: b.parent,
    restT,
    restR,
    names: b.names,
    index: b.index,
    inv: new Float32Array(info.inv as number[]),
    rot: b.rot,
    hip: b.hip,
    clips: b.clips,
    mesh: null as unknown as GpuMesh,
    raw: null as unknown as CharAsset["raw"],
    meshes: new Map(),
    height: info.height as number,
    version: 1,
    hipK: ual0 > 0 ? mod0 / ual0 : 1,
    parts,
    gpu: new Map(),
  } as TexAsset;
  // imagens
  const imgs = new Map<string, ImageBitmap>();
  const want = new Set<string>();
  for (const p of parts) {
    if (p.color) want.add(p.color);
    if (p.emis) want.add(p.emis);
  }
  await Promise.all(
    [...want].map(async (u) => {
      const r = await fetch(dirBase + u + q);
      if (r.ok) imgs.set(u, await createImageBitmap(await r.blob()));
    }),
  );
  (a as unknown as { imgs: Map<string, ImageBitmap> }).imgs = imgs;
  assets.set(name, a);
}

function gpuFor(e: Engine, a: TexAsset) {
  let g = a.gpu.get(e);
  if (!g) {
    const imgs = (a as unknown as { imgs: Map<string, ImageBitmap> }).imgs;
    const white = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 2;
      const x = c.getContext("2d")!;
      x.fillStyle = "#bbb";
      x.fillRect(0, 0, 2, 2);
      return c;
    })();
    g = a.parts.map((p) => ({
      mesh: e.uploadSkin(p.pos, p.nor, p.col, p.ji, p.w, p.idx),
      tex: e.makeTexture(p.color && imgs.get(p.color) ? imgs.get(p.color)! : white),
      emis: p.emis && imgs.get(p.emis) ? e.makeTexture(imgs.get(p.emis)!) : null,
      estr: p.estr,
    }));
    a.gpu.set(e, g);
  }
  return g;
}

export type TexLook = {
  /** multiplicador de tamanho sobre o padrão (herói = 1) */
  scale: number;
  tint?: Vec3;
  /** luz de contorno e brilho da textura de emissão */
  rim?: Vec3;
  emisK?: number;
  emis?: Vec3;
  ghost?: boolean;
  /** conjunto de clipes */
  anim?: "human" | "zombie" | "imp" | "brute";
  caster?: boolean;
};

const ANIM = {
  human: { idle: "Idle_Loop", walk: "Walk_Loop", run: "Jog_Fwd_Loop", atk: ["Sword_Attack"], hit: "Hit_Chest", death: "Death01" },
  zombie: { idle: "Zombie_Idle_Loop", walk: "Zombie_Walk_Fwd_Loop", run: "Zombie_Walk_Fwd_Loop", atk: ["Zombie_Scratch"], hit: "Hit_Chest", death: "Death01" },
  imp: { idle: "Idle_Loop", walk: "Walk_Loop", run: "Sprint_Loop", atk: ["Punch_Jab", "Punch_Cross"], hit: "Hit_Chest", death: "Death01" },
  brute: { idle: "Idle_Loop", walk: "Walk_Loop", run: "Jog_Fwd_Loop", atk: ["Sword_Regular_A", "Sword_Regular_B"], hit: "Hit_Chest", death: "Death01" },
} as const;

const JOB: Record<string, string> = {
  farm: "Farm_Harvest",
  wood: "TreeChopping_Loop",
  smith: "Sword_Regular_A",
  baker: "Interact",
  potion: "Farm_PlantSeed",
  bard: "Dance_Loop",
  priest: "Idle_FoldArms_Loop",
  patrol: "Idle_Loop",
  stall: "Idle_Talking_Loop",
  fish: "Idle_Torch_Loop",
};

export function buildTexModel(name: string, look: TexLook, kind: Model["kind"]): Model | null {
  const a = assets.get(name);
  if (!a) return null;
  const rig = new SkinRig(a, "Idle_Loop");
  const rinv: Mat4[] = Array.from({ length: a.J }, (_, j) => rinvOf(a, j));
  const anim = ANIM[look.anim ?? "human"];
  const sk: SkinPart = {
    rig,
    a,
    mounts: [],
    rinv,
    tex: {
      scale: look.scale,
      draw(e: Engine, world: Mat4, bones: Float32Array, st: DrawState) {
        const g = gpuFor(e, a);
        const tint: Vec3 = st.tint ? [st.tint[0] * (look.tint?.[0] ?? 1), st.tint[1] * (look.tint?.[1] ?? 1), st.tint[2] * (look.tint?.[2] ?? 1)] : look.tint ?? [1, 1, 1];
        for (const p of g) {
          e.drawSkinTex(p.mesh, world, bones, a.J, p.tex, p.emis, {
            color: tint,
            emis: look.emis ?? st.emis ?? [0, 0, 0],
            emisK: (look.emisK ?? 1) * (p.estr || 1),
            alpha: st.alphaMul,
            flash: st.flash,
            ghost: look.ghost,
            rim: look.rim,
          });
        }
      },
    },
  };
  void m4;
  const root = G();
  let last = -1;
  let hurtPrev = false;
  let atkPrev = 0;
  let busy = 0;
  let alt = 0;
  let dead = false;
  const model: Model = {
    root,
    kind,
    parts: {},
    yaw: Math.PI / 2 - 0.5,
    formNodes: [],
    fly: false,
    skin: sk,
    update(p: Pose) {
      const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, p.t - last));
      last = p.t;
      const sp = p.speed;
      const dy = p.dying ?? 0;
      if (dy > 0 && !dead) {
        dead = true;
        rig.play(anim.death, 2.2, 0.05, true, true);
      }
      if (dy <= 0) dead = false;
      if (!dead) {
        if (p.hurt && !hurtPrev) {
          rig.play(anim.hit, 1.3, 0.05, true);
          busy = 0.28;
        }
        hurtPrev = p.hurt;
        if (p.attack > 0 && atkPrev <= 0) {
          alt = (alt + 1) % anim.atk.length;
          rig.play(look.caster ? "Spell_Simple_Shoot" : anim.atk[alt]!, 1.5, 0.05, true);
          busy = 0.45;
        }
        atkPrev = p.attack;
        busy = Math.max(0, busy - dt);
        if (busy > 0) {
          // golpe ou dano em andamento
        } else if (sp > 0.08) {
          rig.playSync(sp > 0.7 ? anim.run : anim.walk, 0.8 + sp * 0.7);
        } else if (p.working && p.job && JOB[p.job]) {
          rig.play(JOB[p.job]!, 1, 0.25, rig.finished && rig.clipName === JOB[p.job]);
        } else {
          rig.play(anim.idle, 0.9, 0.2);
        }
      }
      rig.advance(dt);
      rig.solve();
    },
  };
  return model;
}
