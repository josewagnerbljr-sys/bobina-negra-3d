import { heroById, WORLDS, type WorldDef } from "./content";
import { TILE, Tile, type HeroId, type Kind, type Level } from "./types";

export type Paint = {
  x: number;
  y: number;
  w: number;
  h: number;
  facing: number;
  phase: number;
  kind: Kind | "hero";
  hero: HeroId;
  form: boolean;
  hurt: boolean;
  world: number;
};

export type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number };

const INK = "#14080c";

function strokeInk(ctx: CanvasRenderingContext2D, w = 4) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  strokeInk(ctx, 3);
  ctx.stroke();
}

function limb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  color: string,
) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  strokeInk(ctx, radius * 2 + 3.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = radius * 2;
  ctx.stroke();
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, look: number) {
  disc(ctx, x, y, s, s * 1.15, "#f7f1e4");
  ctx.beginPath();
  ctx.ellipse(x + look, y + s * 0.1, s * 0.38, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + look + s * 0.12, y - s * 0.15, s * 0.12, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fff8ea";
  ctx.fill();
}

function grin(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, teeth = true) {
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.55, 0, 0, Math.PI);
  ctx.fillStyle = "#3a1014";
  ctx.fill();
  strokeInk(ctx, 2);
  ctx.stroke();
  if (!teeth) return;
  ctx.fillStyle = "#f4efe4";
  const n = 4;
  for (let i = 0; i < n; i++) {
    const tx = x - w * 0.65 + (i * w * 1.3) / n;
    ctx.fillRect(tx, y, w * 0.22, w * 0.38);
  }
}

export function drawHero(
  ctx: CanvasRenderingContext2D,
  heroId: HeroId,
  feetX: number,
  feetY: number,
  facing: number,
  phase: number,
  form: boolean,
  hurt: boolean,
  run: number,
) {
  const hero = heroById(heroId);
  ctx.save();
  if (hurt) ctx.globalAlpha = 0.55 + Math.sin(phase * 18) * 0.2;
  ctx.translate(feetX, feetY);
  const squash = 1 + Math.sin(phase * 2) * 0.04 * run;
  ctx.scale(facing * (form && heroId === "ivo" ? 1.08 : 1), squash);
  const swing = Math.sin(phase) * (8 + run * 6);
  const arm = Math.cos(phase) * 7 * Math.max(0.35, run);

  if (form && heroId === "lena") {
    // bat wings behind
    ctx.fillStyle = "#2a1830";
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.quadraticCurveTo(-48, -70 + Math.sin(phase * 8) * 8, -36, -18);
    ctx.quadraticCurveTo(-16, -30, 0, -36);
    ctx.fill();
    strokeInk(ctx, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.quadraticCurveTo(48, -70 + Math.cos(phase * 8) * 8, 36, -18);
    ctx.quadraticCurveTo(16, -30, 0, -36);
    ctx.fill();
    ctx.stroke();
  }

  const shoe = hero.shoe;
  const leg = form && heroId === "ivo" ? "#6e4636" : hero.cloth2;
  limb(ctx, -8, -18, -10 + swing, -2, 5, leg);
  limb(ctx, 8, -18, 8 - swing, -2, 5, leg);
  disc(ctx, -10 + swing, 0, 8, 5, shoe);
  disc(ctx, 8 - swing, 0, 8, 5, shoe);

  // torso
  ctx.beginPath();
  ctx.ellipse(0, -34, form && heroId === "ivo" ? 18 : 14, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = hero.cloth;
  ctx.fill();
  strokeInk(ctx, 3.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-4, -38, 4, 8, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = hero.cloth2;
  ctx.fill();

  const glove = "#f4efe4";
  limb(ctx, -12, -36, -22 + arm, -24 + swing * 0.3, 4.5, hero.skin);
  limb(ctx, 12, -36, 22 - arm, -22, 4.5, hero.skin);
  disc(ctx, -22 + arm, -24 + swing * 0.3, 6, 5, form && heroId === "ivo" ? "#c4373a" : glove);
  disc(ctx, 22 - arm, -22, 6, 5, form && heroId === "syl" ? hero.accent : glove);

  if (form && heroId === "syl") {
    // bow
    ctx.beginPath();
    ctx.arc(18, -36, 16, -1.2, 1.2);
    strokeInk(ctx, 3);
    ctx.strokeStyle = "#6b3a22";
    ctx.stroke();
  }

  // head
  const headY = form && heroId === "osso" ? -62 : -58;
  const hr = form && heroId === "ivo" ? 20 : 17;
  if (form && heroId === "osso") {
    disc(ctx, 0, headY, 16, 18, "#efe8dc");
    eye(ctx, -6, headY - 1, 4.2, 1);
    eye(ctx, 6, headY - 1, 4.2, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(-6, headY + 6, 12, 3);
  } else if (form && heroId === "ivo") {
    disc(ctx, 4, headY, 22, 18, "#8a5a40");
    disc(ctx, 16, headY + 2, 10, 8, "#6e4634");
    ctx.beginPath();
    ctx.moveTo(-8, headY - 16);
    ctx.lineTo(-2, headY - 28);
    ctx.lineTo(2, headY - 12);
    ctx.fillStyle = "#6e4634";
    ctx.fill();
    strokeInk(ctx, 2);
    ctx.stroke();
    eye(ctx, 2, headY - 2, 4, 2);
    grin(ctx, 10, headY + 6, 8, true);
  } else if (form && heroId === "lena") {
    disc(ctx, 0, headY, 15, 16, hero.skin);
    ctx.beginPath();
    ctx.moveTo(-12, headY - 8);
    ctx.lineTo(-4, headY - 26);
    ctx.lineTo(0, headY - 8);
    ctx.fillStyle = hero.hair;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, headY - 8);
    ctx.lineTo(4, headY - 26);
    ctx.lineTo(0, headY - 8);
    ctx.fill();
    eye(ctx, -5, headY, 4.4, 1);
    eye(ctx, 6, headY, 4.4, 1);
    ctx.fillStyle = "#c4373a";
    ctx.beginPath();
    ctx.moveTo(-2, headY + 8);
    ctx.lineTo(0, headY + 14);
    ctx.lineTo(2, headY + 8);
    ctx.fill();
  } else {
    disc(ctx, 0, headY, hr, hr * 1.05, hero.skin);
    // hair
    ctx.beginPath();
    ctx.ellipse(0, headY - 6, hr * 0.95, hr * 0.72, 0, Math.PI, 0);
    ctx.fillStyle = hero.hair;
    ctx.fill();
    if (heroId === "syl" && form) {
      ctx.beginPath();
      ctx.moveTo(-hr, headY - 2);
      ctx.lineTo(-hr - 8, headY - 16);
      ctx.lineTo(-hr + 4, headY - 6);
      ctx.fill();
    }
    if (heroId === "lena") {
      ctx.fillStyle = "#c4373a";
      ctx.fillRect(-8, headY + 10, 16, 3);
    }
    eye(ctx, -6, headY - 1, 5, facing > 0 ? 1.4 : -0.2);
    eye(ctx, 6, headY - 1, 5, facing > 0 ? 1.4 : -0.2);
    grin(ctx, 0, headY + 8, heroId === "osso" ? 6 : 8, heroId !== "lena");
    if (heroId === "osso") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-6, headY - 1, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (heroId === "syl") {
      // quiver hint
      ctx.fillStyle = hero.cloth2;
      ctx.fillRect(10, -48, 6, 16);
    }
  }

  if (form && heroId === "ivo") {
    limb(ctx, -8, -28, -22, -8, 3, "#6e4634");
  }

  ctx.restore();
}

function drawFoe(ctx: CanvasRenderingContext2D, p: Paint) {
  const x = p.x + p.w / 2;
  const y = p.y + p.h;
  const f = p.facing || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f, 1);
  const bob = Math.sin(p.phase * 2) * 2;
  const kind = p.kind;
  if (kind === "candle") {
    ctx.fillStyle = "#e0b15a";
    ctx.fillRect(-3, -22, 6, 12);
    ctx.beginPath();
    ctx.ellipse(0, -26, 5, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f2d48a";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -32 + Math.sin(p.phase * 6), 3, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#c4373a";
    ctx.fill();
    ctx.restore();
    return;
  }
  if (kind === "imp") {
    disc(ctx, 0, -20 + bob, 12, 11, "#e23b3b");
    disc(ctx, 0, -34 + bob, 11, 10, "#f0c39a");
    eye(ctx, -4, -36 + bob, 3, 1);
    eye(ctx, 4, -36 + bob, 3, 1);
    grin(ctx, 0, -30 + bob, 5, true);
    ctx.fillStyle = "#f4efe4";
    ctx.beginPath();
    ctx.moveTo(-6, -42 + bob);
    ctx.lineTo(-2, -50 + bob);
    ctx.lineTo(0, -40 + bob);
    ctx.fill();
    strokeInk(ctx, 2);
    ctx.stroke();
  } else if (kind === "mask") {
    disc(ctx, 0, -28 + bob, 14, 16, "#f4e4c8");
    eye(ctx, -5, -30 + bob, 3.5, 1);
    eye(ctx, 5, -30 + bob, 3.5, 1);
    grin(ctx, 0, -20 + bob, 7, true);
    limb(ctx, -8, -16, -14, -4, 3, "#c4373a");
    limb(ctx, 8, -16, 14, -4, 3, "#c4373a");
  } else if (kind === "balloon") {
    disc(ctx, 0, -28 + bob, 16, 18, "#e0b15a");
    eye(ctx, -5, -30 + bob, 3.2, 1);
    grin(ctx, 1, -22 + bob, 7, true);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(2, 0);
    strokeInk(ctx, 2);
    ctx.stroke();
  } else if (kind === "skel") {
    disc(ctx, 0, -40, 10, 12, "#f4efe4");
    eye(ctx, -4, -42, 2.4, 1);
    eye(ctx, 4, -42, 2.4, 1);
    ctx.fillStyle = INK;
    ctx.fillRect(-5, -34, 10, 2);
    limb(ctx, -6, -28, -10 + Math.sin(p.phase) * 4, -2, 3, "#f4efe4");
    limb(ctx, 6, -28, 8, -2, 3, "#f4efe4");
    ctx.strokeStyle = "#f4efe4";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, -26 + i * 5, 6, 0, Math.PI);
      ctx.stroke();
    }
  } else if (kind === "witch" || kind === "dryad" || kind === "clerk") {
    const robe = kind === "dryad" ? "#6b4a32" : kind === "clerk" ? "#2a2e44" : "#3d2458";
    const skin = kind === "dryad" ? "#c4d48a" : kind === "witch" ? "#b7d36a" : "#f4efe4";
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(-10, -36);
    ctx.lineTo(10, -36);
    ctx.lineTo(14, -6);
    ctx.closePath();
    ctx.fillStyle = robe;
    ctx.fill();
    strokeInk(ctx, 3);
    ctx.stroke();
    disc(ctx, 0, -46, 10, 11, skin);
    eye(ctx, -4, -48, 2.8, 1);
    eye(ctx, 4, -48, 2.8, 1);
    if (kind === "witch") {
      ctx.beginPath();
      ctx.moveTo(-12, -52);
      ctx.lineTo(0, -74);
      ctx.lineTo(12, -52);
      ctx.fillStyle = "#241430";
      ctx.fill();
      ctx.stroke();
    } else if (kind === "clerk") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -50, 7, 5);
      ctx.strokeRect(1, -50, 7, 5);
    } else {
      ctx.fillStyle = "#2f6a3a";
      ctx.beginPath();
      ctx.ellipse(0, -58, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "undead") {
    disc(ctx, 0, -28 + bob, 14, 16, "#7f8a62");
    eye(ctx, -4, -30, 2.5, 0);
    eye(ctx, 5, -28, 2.5, 1);
    grin(ctx, 1, -20, 6, false);
    limb(ctx, -8, -16, -16, -2, 4, "#667256");
    limb(ctx, 8, -16, 12, -4, 4, "#667256");
  } else if (kind === "golem") {
    ctx.fillStyle = "#8a8e98";
    ctx.fillRect(-18, -48, 36, 40);
    strokeInk(ctx, 4);
    ctx.strokeRect(-18, -48, 36, 40);
    eye(ctx, -6, -34, 3, 1);
    eye(ctx, 8, -34, 3, 1);
    ctx.fillStyle = "#e0b15a";
    ctx.beginPath();
    ctx.arc(0, -22, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "troll") {
    disc(ctx, 0, -30, 20, 18, "#6d7a45");
    eye(ctx, -6, -34, 3, 1);
    grin(ctx, 2, -24, 8, true);
    limb(ctx, 12, -20, 28, -8, 5, "#5c6840");
    disc(ctx, 30, -6, 8, 8, "#4a4038");
  } else if (kind === "thorn") {
    ctx.fillStyle = "#2f6a3a";
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(16, -4);
    ctx.lineTo(-16, -4);
    ctx.closePath();
    ctx.fill();
    strokeInk(ctx, 3);
    ctx.stroke();
    disc(ctx, 0, -24, 8, 7, "#c4373a");
    grin(ctx, 0, -22, 5, true);
  } else if (kind === "hound") {
    ctx.beginPath();
    ctx.ellipse(0, -14, 18, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#4a2e36";
    ctx.fill();
    strokeInk(ctx, 3);
    ctx.stroke();
    disc(ctx, 14, -22 + bob, 8, 8, "#4a2e36");
    eye(ctx, 16, -24 + bob, 2, 1);
    grin(ctx, 18, -18 + bob, 4, true);
  } else if (kind === "wraith") {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#d7e4ea";
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.quadraticCurveTo(-16, -40, 0, -48);
    ctx.quadraticCurveTo(16, -40, 14, -8 + Math.sin(p.phase * 3) * 3);
    ctx.closePath();
    ctx.fill();
    strokeInk(ctx, 3);
    ctx.stroke();
    eye(ctx, -5, -32, 3, 1);
    eye(ctx, 5, -32, 3, 1);
  } else if (kind === "boss") {
    const pal = ["#c4373a", "#e7e1d6", "#8a8e98", "#2f6a3a", "#24182e"][p.world] ?? "#c4373a";
    disc(ctx, 0, -52, 28, 26, pal);
    eye(ctx, -8, -56, 6, 2);
    eye(ctx, 10, -56, 6, 2);
    grin(ctx, 2, -40, 12, true);
    limb(ctx, -16, -32, -36, -8 + Math.sin(p.phase) * 4, 7, pal);
    limb(ctx, 16, -32, 36, -10, 7, pal);
    if (p.world === 0) {
      ctx.fillStyle = "#e0b15a";
      ctx.fillRect(-16, -86, 32, 8);
      strokeInk(ctx, 2);
      ctx.strokeRect(-16, -86, 32, 8);
    } else if (p.world === 1) {
      ctx.fillStyle = "#f4efe4";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(-20, -70);
      ctx.lineTo(0, -30);
      ctx.lineTo(20, -70);
      ctx.fill();
    } else if (p.world === 4) {
      ctx.fillStyle = "#e0b15a";
      ctx.fillRect(18, -70, 16, 12);
      strokeInk(ctx, 2);
      ctx.strokeRect(18, -70, 16, 12);
    }
  } else {
    disc(ctx, 0, -24, 12, 14, "#c4373a");
    eye(ctx, -4, -28, 3, 1);
    eye(ctx, 4, -28, 3, 1);
  }
  ctx.restore();
}

export function drawActor(ctx: CanvasRenderingContext2D, p: Paint, run: number) {
  if (p.kind === "hero") {
    drawHero(ctx, p.hero, p.x + p.w / 2, p.y + p.h, p.facing, p.phase, p.form, p.hurt, run);
    return;
  }
  drawFoe(ctx, p);
}

let noiseCanvas: HTMLCanvasElement | null = null;
function noiseTile() {
  if (noiseCanvas) return noiseCanvas;
  const c = document.createElement("canvas");
  c.width = 96;
  c.height = 96;
  const g = c.getContext("2d");
  if (!g) return c;
  const img = g.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 20 + Math.random() * 40;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = Math.random() > 0.82 ? 40 : 0;
  }
  g.putImageData(img, 0, 0);
  noiseCanvas = c;
  return c;
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  world: WorldDef,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  t: number,
) {
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, world.sky0);
  g.addColorStop(0.55, world.sky1);
  g.addColorStop(1, world.sky2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  const moonX = viewW * 0.78 - camX * 0.02;
  const moonY = 54 - camY * 0.02 + Math.sin(t * 0.4) * 2;
  disc(ctx, moonX, moonY, 26, 26, "#efe6c8");
  eye(ctx, moonX - 8, moonY - 2, 3, 0);
  eye(ctx, moonX + 7, moonY - 2, 3, 0);
  ctx.beginPath();
  ctx.arc(moonX, moonY + 6, 8, 0.15, Math.PI - 0.15);
  strokeInk(ctx, 2);
  ctx.stroke();

  // far hills
  ctx.fillStyle = world.hill;
  ctx.beginPath();
  ctx.moveTo(0, viewH);
  const base = viewH * 0.72 - camY * 0.08;
  for (let x = -40; x <= viewW + 40; x += 8) {
    const wx = x + camX * 0.15;
    const y = base + Math.sin(wx * 0.01) * 18 + Math.sin(wx * 0.03) * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(viewW, viewH);
  ctx.fill();

  // mid structures
  const span = 220;
  const start = Math.floor((camX * 0.35) / span) - 1;
  const end = start + Math.ceil(viewW / span) + 3;
  for (let i = start; i < end; i++) {
    const x = i * span - camX * 0.35;
    const groundY = viewH * 0.78 - camY * 0.12;
    if (world.id === 0) {
      ctx.fillStyle = i % 2 === 0 ? "#6a2438" : "#2a3f74";
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 36, groundY - 70);
      ctx.lineTo(x + 72, groundY);
      ctx.closePath();
      ctx.fill();
      strokeInk(ctx, 3);
      ctx.stroke();
      ctx.strokeStyle = world.trim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 18, groundY - 20);
      ctx.lineTo(x + 36, groundY - 58);
      ctx.stroke();
      // wheel
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(x + 120, groundY - 36, 28, 0, Math.PI * 2);
        strokeInk(ctx, 3);
        ctx.stroke();
        ctx.save();
        ctx.translate(x + 120, groundY - 36);
        ctx.rotate(t * 0.3 + i);
        for (let s = 0; s < 6; s++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 28);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (world.id === 1) {
      ctx.fillStyle = "#2a2630";
      ctx.fillRect(x + 20, groundY - 64, 28, 64);
      strokeInk(ctx, 3);
      ctx.strokeRect(x + 20, groundY - 64, 28, 64);
      ctx.beginPath();
      ctx.arc(x + 34, groundY - 64, 16, Math.PI, 0);
      ctx.fillStyle = "#3a3440";
      ctx.fill();
      ctx.stroke();
    } else if (world.id === 2) {
      ctx.strokeStyle = "#3a3028";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 20, groundY - 80);
      ctx.lineTo(x + 80, groundY - 50);
      ctx.stroke();
      ctx.fillStyle = "#e08a3a";
      ctx.globalAlpha = 0.35 + Math.sin(t * 3 + i) * 0.1;
      ctx.fillRect(x + 30, groundY - 20, 40, 12);
      ctx.globalAlpha = 1;
    } else if (world.id === 3) {
      ctx.fillStyle = "#163222";
      ctx.beginPath();
      ctx.moveTo(x + 30, groundY);
      ctx.lineTo(x + 10, groundY - 30);
      ctx.lineTo(x + 30, groundY - 90);
      ctx.lineTo(x + 50, groundY - 28);
      ctx.closePath();
      ctx.fill();
      strokeInk(ctx, 3);
      ctx.stroke();
      disc(ctx, x + 30, groundY - 96, 16, 10, "#2f6a3a");
    } else {
      ctx.fillStyle = "#2a221c";
      for (let s = 0; s < 3; s++) {
        ctx.fillRect(x + 10 + s * 18, groundY - 40 - (s % 2) * 16, 14, 50);
        strokeInk(ctx, 2);
        ctx.strokeRect(x + 10 + s * 18, groundY - 40 - (s % 2) * 16, 14, 50);
      }
    }
  }

  // pipes
  ctx.strokeStyle = "#6e6870";
  ctx.lineWidth = 8;
  ctx.beginPath();
  const py = viewH * 0.4 - camY * 0.2;
  ctx.moveTo(0, py);
  for (let x = 0; x <= viewW; x += 20) {
    ctx.lineTo(x, py + Math.sin((x + camX * 0.25) * 0.02) * 10);
  }
  ctx.stroke();
  strokeInk(ctx, 2);
}

export function drawWorld(opts: {
  ctx: CanvasRenderingContext2D;
  level: Level | null;
  camX: number;
  camY: number;
  viewW: number;
  viewH: number;
  actors: Paint[];
  shots: { x: number; y: number; w: number; h: number; color: string; vx: number }[];
  sparks: Spark[];
  exit: { x: number; y: number; w: number; h: number; open: boolean } | null;
  lit: Set<number>;
  t: number;
  attract: boolean;
  shake: number;
}) {
  const { ctx, viewW, viewH } = opts;
  const world = WORLDS[opts.level?.world ?? 0] ?? WORLDS[0]!;
  ctx.save();
  if (opts.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * opts.shake, (Math.random() - 0.5) * opts.shake);
  }
  drawBackdrop(ctx, world, opts.camX, opts.camY, viewW, viewH, opts.t);

  if (opts.level) {
    ctx.save();
    ctx.translate(-Math.round(opts.camX), -Math.round(opts.camY));
    const level = opts.level;
    const c0 = Math.max(0, Math.floor(opts.camX / TILE) - 1);
    const c1 = Math.min(level.cols - 1, Math.floor((opts.camX + viewW) / TILE) + 1);
    const r0 = Math.max(0, Math.floor(opts.camY / TILE) - 1);
    const r1 = Math.min(level.rows - 1, Math.floor((opts.camY + viewH) / TILE) + 1);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = level.tiles[r * level.cols + c] ?? 0;
        const x = c * TILE;
        const y = r * TILE;
        if (t === Tile.Air) continue;
        if (t === Tile.Checkpoint) {
          const on = opts.lit.has(r * level.cols + c);
          ctx.fillStyle = "#4a4038";
          ctx.fillRect(x + 20, y + 10, 6, 36);
          disc(ctx, x + 23, y + 8, 8, 8, on ? "#e0b15a" : "#6a645c");
          if (on) {
            ctx.globalAlpha = 0.35;
            disc(ctx, x + 23, y + 8, 16, 16, "#e0b15a");
            ctx.globalAlpha = 1;
          }
          continue;
        }
        if (t === Tile.OneWay) {
          ctx.fillStyle = world.groundDark;
          ctx.fillRect(x, y + 6, TILE, 14);
          strokeInk(ctx, 3);
          ctx.strokeRect(x + 1, y + 6, TILE - 2, 14);
          ctx.fillStyle = world.trim;
          ctx.fillRect(x + 6, y + 8, 8, 4);
          ctx.fillRect(x + 28, y + 8, 8, 4);
          continue;
        }
        if (t === Tile.Spike) {
          ctx.fillStyle = world.groundDark;
          ctx.fillRect(x, y + 28, TILE, 20);
          ctx.fillStyle = "#d9d4cc";
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 6 + i * 14, y + 30);
            ctx.lineTo(x + 12 + i * 14, y + 6);
            ctx.lineTo(x + 18 + i * 14, y + 30);
            ctx.closePath();
            ctx.fill();
            strokeInk(ctx, 2);
            ctx.stroke();
          }
          continue;
        }
        ctx.fillStyle = t === Tile.Spring ? "#5a4030" : world.ground;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = world.groundDark;
        ctx.fillRect(x, y + 30, TILE, 18);
        strokeInk(ctx, 3);
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        ctx.fillStyle = world.trim;
        ctx.globalAlpha = 0.55;
        if ((c + r) % 2 === 0) ctx.fillRect(x + 6, y + 6, TILE - 12, 4);
        ctx.globalAlpha = 1;
        if (t === Tile.Spring) {
          ctx.strokeStyle = "#e0b15a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            ctx.arc(x + 24, y + 10 + i * 8, 7, Math.PI, 0, i % 2 === 0);
          }
          ctx.stroke();
        }
      }
    }

    if (opts.exit) {
      const d = opts.exit;
      ctx.fillStyle = opts.exit.open ? "#3a2418" : "#1a1214";
      ctx.fillRect(d.x, d.y, d.w, d.h);
      strokeInk(ctx, 4);
      ctx.strokeRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = opts.exit.open ? "#e0b15a" : "#4a3a32";
      for (let i = 0; i < 4; i++) ctx.fillRect(d.x + 6, d.y + 8 + i * 16, d.w - 12, 6);
      if (opts.exit.open) {
        ctx.globalAlpha = 0.25 + Math.sin(opts.t * 4) * 0.08;
        ctx.fillStyle = "#f4e4c8";
        ctx.fillRect(d.x - 6, d.y - 6, d.w + 12, d.h + 8);
        ctx.globalAlpha = 1;
      }
    }

    for (const s of opts.shots) {
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.rotate(Math.atan2(0, s.vx || 1));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      strokeInk(ctx, 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const a of opts.actors) {
      const run = a.kind === "hero" ? 1 : 0.8;
      drawActor(ctx, a, run);
    }

    for (const p of opts.sparks) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  } else if (opts.attract) {
    // parade on empty
    const ids: HeroId[] = ["ivo", "lena", "osso", "syl"];
    ids.forEach((id, i) => {
      drawHero(ctx, id, 70 + i * 100, viewH * 0.78, 1, opts.t * 3 + i, false, false, 0.4);
    });
  }

  // vignette
  const vg = ctx.createRadialGradient(viewW / 2, viewH / 2, viewW * 0.3, viewW / 2, viewH / 2, viewW * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(8,4,8,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, viewW, viewH);

  const n = noiseTile();
  ctx.globalAlpha = 0.16;
  const nx = -((opts.t * 20) % 96);
  for (let x = nx; x < viewW; x += 96) {
    for (let y = 0; y < viewH; y += 96) ctx.drawImage(n, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawPreview(
  canvas: HTMLCanvasElement,
  hero: HeroId,
  t: number,
  form: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cssW = canvas.clientWidth || 120;
  const cssH = canvas.clientHeight || 100;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.floor(cssW * dpr);
  const ph = Math.floor(cssH * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const g = ctx.createLinearGradient(0, 0, 0, cssH);
  g.addColorStop(0, "#2a1824");
  g.addColorStop(1, "#140c10");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#3a241c";
  ctx.fillRect(0, cssH - 18, cssW, 18);
  strokeInk(ctx, 3);
  ctx.strokeRect(0.5, cssH - 18, cssW - 1, 18);
  drawHero(ctx, hero, cssW / 2, cssH - 16, 1, t * 3, form, false, 0.35);
}
