import type { SkinRig } from "./skin";
import type { HeroId } from "../game/types";

/** proporções por herói: mesmo esqueleto, corpos diferentes (anime: cabeça, cintura, ombros, quadris) */
type Body = { root: number; hips: number; waist: [number, number]; chest: [number, number]; head: number; arm: number; thigh: number; neck?: number };

export const BODY: Record<HeroId, Body> = {
  ivo: { root: 1.0, hips: 1.0, waist: [1.0, 1.0], chest: [1.12, 1.08], head: 1.0, arm: 1.08, thigh: 1.02 },
  lena: { root: 0.95, hips: 1.14, waist: [0.76, 0.82], chest: [0.9, 0.95], head: 1.05, arm: 0.82, thigh: 1.04 },
  osso: { root: 1.1, hips: 0.78, waist: [0.68, 0.68], chest: [0.82, 0.74], head: 1.03, arm: 0.6, thigh: 0.6 },
  syl: { root: 0.91, hips: 1.08, waist: [0.8, 0.86], chest: [0.88, 0.92], head: 1.06, arm: 0.84, thigh: 0.98 },
  tito: { root: 1.13, hips: 1.1, waist: [1.15, 1.1], chest: [1.36, 1.2], head: 0.95, arm: 1.32, thigh: 1.2 },
  mari: { root: 0.94, hips: 1.14, waist: [0.76, 0.82], chest: [0.9, 0.95], head: 1.09, arm: 0.8, thigh: 1.06 },
  pia: { root: 0.88, hips: 1.2, waist: [1.1, 1.1], chest: [1.42, 1.25], head: 1.12, arm: 1.36, thigh: 1.26 },
  lumen: { root: 1.07, hips: 0.9, waist: [0.84, 0.84], chest: [0.92, 0.9], head: 1.0, arm: 0.78, thigh: 0.8 },
};

export function applyBody(rig: SkinRig, J: (n: string) => number, id: HeroId) {
  const b = BODY[id];
  rig.setScale(J("root"), b.root);
  rig.setScale(J("DEF-hips"), b.hips, 1, 1);
  rig.setScale(J("DEF-spine.001"), b.waist[0] / b.hips, 1, b.waist[1]);
  rig.setScale(J("DEF-spine.002"), b.chest[0] / b.waist[0], 1, b.chest[1] / b.waist[1]);
  rig.setScale(J("DEF-neck"), 1 / b.chest[0], 1, 1 / b.chest[1]);
  rig.setScale(J("DEF-head"), b.head, b.head, b.head);
  for (const s of ["L", "R"]) {
    rig.setScale(J(`DEF-upper_arm.${s}`), b.arm, 1, b.arm);
    rig.setScale(J(`DEF-hand.${s}`), 1 / b.arm, 1, 1 / b.arm);
    rig.setScale(J(`DEF-thigh.${s}`), b.thigh / b.hips, 1, 1);
    rig.setScale(J(`DEF-foot.${s}`), 1 / b.thigh, 1, 1);
  }
}
