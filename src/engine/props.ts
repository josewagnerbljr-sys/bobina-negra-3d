import { m4, type Engine, type GpuMesh, type Mat4, type Vec3 } from "./gl";

/* Props texturizados estáticos (Victorian Study, HorrorPack, Horror Farm): carregados de public/models/props.
   Cada peça é desenhada com o mesmo programa de malha com pele (um osso identidade). */

type Raw = { n: number; pos: Float32Array; nor: Float32Array; col: Float32Array; ji: Uint8Array; w: Uint8Array; idx: Uint16Array; tex: string | null };
type PropDef = { parts: Raw[]; gpu: Map<Engine, { mesh: GpuMesh; tex: WebGLTexture }[]> };

const defs = new Map<string, PropDef>();
const imgs = new Map<string, ImageBitmap>();
let loading: Promise<boolean> | null = null;
const ID = new Float32Array(16);
ID[0] = ID[5] = ID[10] = ID[15] = 1;
const mm = m4.create();
const sm = m4.create();

export function propReady(name: string) {
  return defs.has(name);
}

export function loadProps(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const base = new URL("./models/props/", document.baseURI).href;
      const q = typeof __BUILD__ === "string" ? "?v=" + __BUILD__ : "";
      for (const pack of ["interior", "farm"]) {
        const [jr, br] = await Promise.all([fetch(base + pack + ".json" + q), fetch(base + pack + ".bin" + q)]);
        if (!jr.ok || !br.ok) continue;
        const meta = (await jr.json()) as Record<string, { parts: Record<string, number | string | null>[] }>;
        const buf = await br.arrayBuffer();
        const want = new Set<string>();
        for (const [name, m] of Object.entries(meta)) {
          const parts: Raw[] = m.parts.map((p) => {
            const n = p.n as number;
            const f32 = (off: number, len: number) => new Float32Array(buf.slice(off, off + len * 4));
            const uv = f32(p.uv as number, n * 2);
            const col = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) {
              col[i * 3] = uv[i * 2]!;
              col[i * 3 + 1] = uv[i * 2 + 1]!;
            }
            const ji = new Uint8Array(n * 4);
            const w = new Uint8Array(n * 4);
            for (let i = 0; i < n; i++) w[i * 4] = 255;
            if (p.tex) want.add(p.tex as string);
            return { n, pos: f32(p.pos as number, n * 3), nor: f32(p.nor as number, n * 3), col, ji, w, idx: new Uint16Array(buf.slice(p.idx as number, (p.idx as number) + (p.ni as number) * 2)), tex: (p.tex as string | null) ?? null };
          });
          defs.set(name, { parts, gpu: new Map() });
        }
        await Promise.all(
          [...want].map(async (u) => {
            if (imgs.has(u)) return;
            const r = await fetch(base + u + q);
            if (r.ok) imgs.set(u, await createImageBitmap(await r.blob()));
          }),
        );
      }
      return defs.size > 0;
    } catch {
      return false;
    }
  })();
  return loading;
}

const white = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  const x = c.getContext("2d")!;
  x.fillStyle = "#c8c8c8";
  x.fillRect(0, 0, 2, 2);
  return c;
})();

/** desenha um prop: (x,y,z) em unidades de mundo (tiles), yaw em rad, escala em tiles por metro */
export function drawProp(e: Engine, name: string, x: number, y: number, z: number, yaw: number, scale: number, o: { color?: Vec3; emis?: Vec3; flash?: number } = {}) {
  const d = defs.get(name);
  if (!d) return;
  let g = d.gpu.get(e);
  if (!g) {
    g = d.parts.map((p) => ({ mesh: e.uploadSkin(p.pos, p.nor, p.col, p.ji, p.w, p.idx), tex: e.makeTexture(p.tex && imgs.get(p.tex) ? imgs.get(p.tex)! : white) }));
    d.gpu.set(e, g);
  }
  m4.compose(mm, [x, y, z], [0, yaw, 0], [scale, scale, scale]);
  void sm;
  for (const p of g) e.drawSkinTex(p.mesh, mm as Mat4, ID, 1, p.tex, null, { color: o.color ?? [1, 1, 1], emis: o.emis ?? [0, 0, 0], flash: o.flash ?? 0, rim: [0.05, 0.05, 0.06] });
}
