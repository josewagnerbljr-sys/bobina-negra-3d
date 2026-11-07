/** clima dinâmico do mundo aberto: névoa em manchas que vagam, tempestades com relâmpagos, vento e neve nas geleiras */
import { glacier } from "./openworld";
import { LV } from "./openworld";

export type Weather = { fog: number; storm: number; flash: number; wind: number; snow: number };
export const WX: Weather = { fog: 0, storm: 0, flash: 0, wind: 1, snow: 0 };

const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** densidade de névoa 0..1 numa posição: manchas que se movem; vilarejos ganham um véu extra de manhã cedo e à noite */
export function fogAt(wx: number, wz: number, t: number): number {
  const a = Math.sin(wx * 0.0008 + wz * 0.0006 + t * 0.016);
  const b = Math.sin(wx * 0.0005 - wz * 0.0009 - t * 0.011 + 2.0);
  let f = ss(0.3, 0.9, (a + b) * 0.5);
  if (LV.on && LV.lay) {
    for (const pl of LV.lay.places) {
      const d = Math.hypot(wx - pl.x, wz - pl.z);
      if (d < pl.r) f = Math.max(f, (1 - d / pl.r) * 0.75 * ss(0.1, 0.8, 0.5 + 0.5 * Math.sin(t * 0.009 + pl.x * 0.01)));
    }
  }
  return f;
}

/** intensidade da tempestade 0..1 (ciclo irregular, dura alguns minutos) */
export function stormAt(t: number): number {
  const v = 0.5 + 0.5 * Math.sin(t * 0.0042 + 1.3) * Math.sin(t * 0.0013 + 0.4);
  return ss(0.6, 0.85, v);
}

/** teste: força valores de clima */
export const FORCE: Partial<Weather> = {};
let nextBolt = 6;
let boltT = 0;
export function updateWeather(t: number, dt: number, wx: number, wz: number) {
  WX.fog += ((FORCE.fog ?? fogAt(wx, wz, t)) - WX.fog) * Math.min(1, dt * 0.8);
  WX.storm += ((FORCE.storm ?? stormAt(t)) - WX.storm) * Math.min(1, dt * 0.5);
  WX.snow += (glacier(wx, wz) - WX.snow) * Math.min(1, dt * 1.2);
  WX.wind = 0.8 + WX.storm * 2.2 + WX.snow * 0.8;
  if (WX.storm > 0.35) {
    nextBolt -= dt;
    if (nextBolt <= 0) { boltT = 0.38; nextBolt = 3 + Math.random() * 8 * (1.3 - WX.storm); }
  }
  boltT = Math.max(0, boltT - dt);
  // clarão duplo: dois pulsos rápidos
  const ph = boltT / 0.38;
  WX.flash = boltT > 0 ? Math.max(0, Math.sin(ph * Math.PI * 3)) * 0.55 * Math.min(1, WX.storm * 1.5) : 0;
}
