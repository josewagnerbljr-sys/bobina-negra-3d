/** miniatura real do mapa da fase: o terreno (cores do chão, relevo, estradas, vilas, lagos) desenhado numa imagem */
import { LV, biomeAt, groundColor, terrainH, POOL_COLOR, POOL_STYLE, styleOf } from "./openworld";
import { roadDist } from "./village";

const cache = new Map<string, string>();
const N = 168;

export function terrainImage(): { url: string; R: number } | null {
  if (!LV.on || !LV.lay) return null;
  const R = LV.lay.R * 1.05;
  const key = `${LV.realm}:${LV.lay.seed}`;
  let url = cache.get(key);
  if (!url) {
    try {
      const cv = document.createElement("canvas");
      cv.width = N;
      cv.height = N;
      const cx = cv.getContext("2d");
      if (!cx) return null;
      const img = cx.createImageData(N, N);
      const pool = POOL_COLOR[POOL_STYLE[styleOf(LV.realm)]];
      const hAt = (x: number, z: number) => terrainH(x, z);
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const wx = ((i + 0.5) / N - 0.5) * 2 * R;
          const wz = ((j + 0.5) / N - 0.5) * 2 * R;
          const o = (j * N + i) * 4;
          const d = Math.hypot(wx, wz);
          if (d > LV.lay.R * 1.02) { img.data[o] = 14; img.data[o + 1] = 12; img.data[o + 2] = 16; img.data[o + 3] = 255; continue; }
          let c = groundColor(wx, wz, biomeAt(wx, wz)) as [number, number, number];
          const step = (2 * R) / N;
          // relevo: luz vinda do noroeste
          const sh = (hAt(wx - step, wz - step) - hAt(wx + step, wz + step)) * 0.09;
          const h = hAt(wx, wz);
          let k = 1 + sh + Math.min(0.25, h * 0.02);
          let r = c[0] * k, g = c[1] * k, b = c[2] * k;
          // estradas de terra
          const rd = roadDist(LV.lay, wx, wz);
          if (rd < 55) { const t = Math.min(1, (55 - rd) / 25) * 0.8; r = r + (0.62 - r) * t; g = g + (0.5 - g) * t; b = b + (0.34 - b) * t; }
          // vilas, mansão e castelo
          for (const p of LV.lay.places) {
            const dd = Math.hypot(wx - p.x, wz - p.z);
            const rr = p.kind === "village" || p.kind === "start" ? 560 : p.kind === "hamlet" ? 340 : 300;
            if (dd < rr) { const t = Math.min(1, (rr - dd) / 140) * 0.7; const tone = p.kind === "castle" ? 0.34 : p.kind === "mansion" ? 0.3 : 0.52; r += (tone + 0.06 - r) * t; g += (tone - 0.06 - g) * t; b += (tone - 0.14 - b) * t; }
          }
          // clareia o conjunto para ler bem em tamanho pequeno
          r = Math.min(1, r * 1.08 + 0.03); g = Math.min(1, g * 1.08 + 0.03); b = Math.min(1, b * 1.08 + 0.03);
          void pool;
          img.data[o] = r * 255; img.data[o + 1] = g * 255; img.data[o + 2] = b * 255; img.data[o + 3] = 255;
        }
      }
      cx.putImageData(img, 0, 0);
      url = cv.toDataURL("image/png");
      cache.set(key, url);
    } catch {
      return null;
    }
  }
  return { url, R };
}
