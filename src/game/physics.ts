import { isSolidTile, tileAt, TILE, type Level } from "./types";

export const JUMP_V = 820;
export const G_RISE = 2100;
export const G_FALL = 4600;
export const TERM = 1080;

export type Body = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  /** profundidade (px); só usada nas mansões */
  z?: number;
};

export function overlaps(a: Body, b: Body) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function resolveX(body: Body, level: Level) {
  const r0 = Math.floor((body.y + 4) / TILE);
  const r1 = Math.floor((body.y + body.h - 6) / TILE);
  const c0 = Math.floor(body.x / TILE);
  const c1 = Math.floor((body.x + body.w - 0.01) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (!isSolidTile(tileAt(level, c, r))) continue;
      const left = c * TILE;
      const right = left + TILE;
      const pushLeft = body.x + body.w - left;
      const pushRight = right - body.x;
      if (pushLeft < pushRight) {
        body.x -= pushLeft;
        if (body.vx > 0) body.vx = 0;
      } else {
        body.x += pushRight;
        if (body.vx < 0) body.vx = 0;
      }
    }
  }
}

export function resolveY(body: Body, level: Level, drop: number, prevBottom: number) {
  let grounded = false;
  let onOneWay = false;
  let spring = false;
  let spike = false;
  const c0 = Math.floor((body.x + 3) / TILE);
  const c1 = Math.floor((body.x + body.w - 3) / TILE);
  const r0 = Math.floor(body.y / TILE);
  const r1 = Math.floor((body.y + body.h - 0.01) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = tileAt(level, c, r);
      const top = r * TILE;
      const bot = top + TILE;
      if (isSolidTile(t)) {
        const fromAbove = prevBottom <= top + 4 && body.y + body.h > top && body.y < top + 8;
        if ((body.vy >= 0 && fromAbove) || (body.vy >= 0 && body.y + body.h - top < 16 && body.y < top)) {
          body.y = top - body.h;
          body.vy = 0;
          grounded = true;
          if (t === 3) spike = true;
          if (t === 4) spring = true;
        } else if (body.vy < 0 && body.y < bot && body.y + body.h > bot) {
          body.y = bot;
          if (body.vy < 0) body.vy = 0;
        }
      } else if (t === 2 && drop <= 0 && body.vy >= 0 && prevBottom <= top + 3 && body.y + body.h >= top && body.y < top) {
        body.y = top - body.h;
        body.vy = 0;
        grounded = true;
        onOneWay = true;
      }
    }
  }
  return { grounded, onOneWay, spring, spike };
}

function overlapsSolid(body: Body, level: Level) {
  const r0 = Math.floor((body.y + 4) / TILE);
  const r1 = Math.floor((body.y + body.h - 6) / TILE);
  const c0 = Math.floor(body.x / TILE);
  const c1 = Math.floor((body.x + body.w - 0.01) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (isSolidTile(tileAt(level, c, r))) return true;
  return false;
}

/** deslocamento vertical do último degrau automático (px), para o visual suavizar */
export const stepInfo = { lift: 0 };

export function moveBody(body: Body, level: Level, dt: number, drop: number, stepUp = false) {
  const xSteps = Math.max(1, Math.ceil(Math.abs(body.vx * dt) / 16));
  const xPart = (body.vx * dt) / xSteps;
  stepInfo.lift = 0;
  for (let i = 0; i < xSteps; i++) {
    const ox = body.x;
    body.x += xPart;
    resolveX(body, level);
    if (stepUp && body.vy >= 0 && Math.abs(body.x - (ox + xPart)) > 0.01) {
      // degrau automático: sobe blocos de 1 tile quando está andando no chão
      const bottom = body.y + body.h;
      const rem = bottom % TILE;
      if (rem < 3 || rem > TILE - 3) {
        const keepVx = xPart > 0 ? Math.abs(body.vx) : -Math.abs(body.vx);
        const sx = body.x;
        const sy = body.y;
        body.x = ox + xPart;
        body.y = Math.round(bottom / TILE) * TILE - TILE - body.h;
        if (overlapsSolid(body, level)) {
          body.x = sx;
          body.y = sy;
        } else {
          stepInfo.lift += sy - body.y;
          body.vx = keepVx;
        }
      }
    }
  }
  const yDist = body.vy * dt;
  const ySteps = Math.max(1, Math.ceil(Math.abs(yDist) / 16));
  const yPart = yDist / ySteps;
  let grounded = false;
  let onOneWay = false;
  let spring = false;
  let spike = false;
  for (let i = 0; i < ySteps; i++) {
    const prevBottom = body.y + body.h;
    body.y += yPart;
    const hit = resolveY(body, level, drop, prevBottom);
    grounded = grounded || hit.grounded;
    onOneWay = onOneWay || hit.onOneWay;
    spring = spring || hit.spring;
    spike = spike || hit.spike;
    if (hit.grounded && yPart > 0) break;
  }
  return { grounded, onOneWay, spring, spike };
}

export function touchesSpike(body: Body, level: Level) {
  // caixa menor que o corpo: só conta se o herói realmente afundou nos espinhos
  const c0 = Math.floor((body.x + 9) / TILE);
  const c1 = Math.floor((body.x + body.w - 9) / TILE);
  const r0 = Math.floor((body.y + 6) / TILE);
  const r1 = Math.floor((body.y + body.h - 10) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (tileAt(level, c, r) === 3) return true;
    }
  }
  return false;
}
