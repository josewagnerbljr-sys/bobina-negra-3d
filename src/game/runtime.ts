import { createAudio } from "./audio";
import {
  bossIntro,
  buildLevel,
  clearLine,
  deathLine,
  ending,
  entDef,
  heroById,
  prologue,
  REEL_NAMES,
  reelWorld,
  transformLine,
  UPGRADES,
  worldIntro,
  WORLDS,
} from "./content";
import { drawPreview, drawWorld, type Paint, type Spark } from "./draw";
import { clearSave, emptySave, loadMute, loadSave, writeMute, writeSave, type Save } from "./save";
import {
  GROUND,
  TILE,
  VIEW_H,
  VIEW_W,
  isSolidTile,
  tileAt,
  xpToNext,
  type Action,
  type HeroId,
  type Kind,
  type Level,
  type Screen,
  type Snap,
  type StatKey,
} from "./types";

const STEP = 1 / 60;
const JUMP_V = 820;
const G_RISE = 2100;
const G_FALL = 4600;
const TERM = 1080;

type Body = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};

type Actor = Body & {
  kind: Kind;
  hp: number;
  maxHp: number;
  facing: number;
  phase: number;
  speed: number;
  behavior: string;
  touch: number;
  xp: number;
  ally: boolean;
  dead: boolean;
  cd: number;
  hop: number;
  hurt: number;
  boss: boolean;
};

type Shot = Body & {
  life: number;
  color: string;
  dmg: number;
  foe: boolean;
  pierce: number;
  hit: Set<Actor>;
};

export type Runtime = {
  destroy: () => void;
  newGame: (hero: HeroId) => void;
  continueGame: () => void;
  pickHero: (hero: HeroId) => void;
  enterReel: (index0: number) => void;
  advanceDialogue: () => void;
  skipDialogue: () => void;
  chooseUpgrade: (id: StatKey) => void;
  resume: () => void;
  pause: () => void;
  toggleMute: () => void;
  quitToMap: () => void;
  skipDead: () => void;
  openHelp: (on: boolean) => void;
  openCast: () => void;
  setHold: (action: Action, down: boolean) => void;
  backTitle: () => void;
};

function overlaps(a: Body, b: Body) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveX(body: Body, level: Level) {
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

function resolveY(body: Body, level: Level, drop: number, prevBottom: number) {
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

function moveBody(body: Body, level: Level, dt: number, drop: number) {
  const xSteps = Math.max(1, Math.ceil(Math.abs(body.vx * dt) / 16));
  const xPart = (body.vx * dt) / xSteps;
  for (let i = 0; i < xSteps; i++) {
    body.x += xPart;
    resolveX(body, level);
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

function touchesSpike(body: Body, level: Level) {
  const c0 = Math.floor(body.x / TILE);
  const c1 = Math.floor((body.x + body.w) / TILE);
  const r0 = Math.floor(body.y / TILE);
  const r1 = Math.floor((body.y + body.h) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (tileAt(level, c, r) === 3) return true;
    }
  }
  return false;
}

export function createRuntime(canvas: HTMLCanvasElement, onSnap: (s: Snap) => void): Runtime {
  const audio = createAudio();
  let alive = true;
  let save: Save = loadSave() ?? emptySave("ivo");
  let hasSave = loadSave() !== null;
  let mute = loadMute();
  audio.setMuted(mute);

  let screen: Screen = "title";
  let selected: HeroId = save.hero;
  let level: Level | null = null;
  let actors: Actor[] = [];
  let blueprint: Actor[] = [];
  let shots: Shot[] = [];
  let sparks: Spark[] = [];
  let lit = new Set<number>();
  let respawn = { x: 80, y: 400 };
  let camX = 0;
  let camY = 0;
  let shake = 0;
  let hitStop = 0;
  let dropT = 0;
  let coyote = 0;
  let buffer = 0;
  let cutLock = 0;
  let iframe = 0;
  let shotCd = 0;
  let formT = 0;
  let formCd = 0;
  let airJumps = 0;
  let wasGround = false;
  let pendingLevels = 0;
  let choices: StatKey[] = [];
  let lines: Snap["lines"] = [];
  let lineIndex = 0;
  let afterTalk: "play" | "first" | "map" | "ending" = "play";
  let deadLineText = "";
  let deadT = 0;
  let toast = "";
  let toastT = 0;
  let clearText = "";
  let reelTime = 0;
  let hint = true;
  let bossAlive = false;
  let clock = 0;
  let acc = 0;
  let snapAcc = 0;
  let lastHp = -1;
  let deaths = 0;
  let clears = 0;
  let lastKill: Kind | null = null;
  let summon: Actor | null = null;
  const keys = new Set<string>();
  let qa: Set<string> | null = null;
  const touch: Record<Action, boolean> = {
    left: false,
    right: false,
    down: false,
    jump: false,
    attack: false,
    form: false,
  };
  let prevJump = false;
  let prevForm = false;
  let wantJump = false;
  let wantForm = false;
  let cutDone = true;

  const player: Body & {
    facing: number;
    hp: number;
    phase: number;
    onOneWay: boolean;
  } = {
    x: 64,
    y: 400,
    w: 26,
    h: 42,
    vx: 0,
    vy: 0,
    facing: 1,
    hp: 5,
    phase: 0,
    onOneWay: false,
  };

  const qaBoot = typeof location !== "undefined" && new URLSearchParams(location.search).has("qa");

  function maxHp() {
    return Math.min(10, 5 + save.stats.vit);
  }
  function dmgMul() {
    return 1 + save.stats.impeto * 0.22;
  }
  function speedMul() {
    const wolf = formT > 0 && save.hero === "ivo" ? 1.38 : 1;
    return (1 + save.stats.passo * 0.06) * wolf;
  }
  function formDur() {
    return 7 + save.stats.folego * 0.5;
  }
  function formCool() {
    return Math.max(4.2, 11 - save.stats.folego * 0.45);
  }
  function attackCd() {
    const fast = formT > 0 && (save.hero === "syl" || save.hero === "lena") ? 0.82 : 1;
    return Math.max(0.15, (0.36 - save.stats.mira * 0.025) * fast);
  }

  function persist() {
    writeSave(save);
    hasSave = true;
  }

  function showToast(text: string) {
    toast = text;
    toastT = 2.8;
  }

  function makeSnap(): Snap {
    const world = level ? reelWorld(level.index) : WORLDS[0]!;
    const boss = actors.find((a) => a.boss && !a.dead);
    return {
      screen,
      hasSave,
      hero: save.hero,
      selectedHero: selected,
      next: save.next,
      level: save.level,
      xp: save.xp,
      xpNeed: xpToNext(save.level),
      stats: { ...save.stats },
      hp: player.hp,
      maxHp: maxHp(),
      reel: level ? level.index + 1 : 0,
      reelName: level?.name ?? "",
      worldName: level ? world.name : "",
      bossAlive: Boolean(boss),
      bossName: level?.boss ? world.boss : "",
      bossHp: boss ? Math.max(0, boss.hp) : 0,
      bossMax: boss ? boss.maxHp : 0,
      formActive: formT > 0,
      formLeft: Math.max(0, formT),
      formCd: Math.max(0, formCd),
      formDur: formDur(),
      lines,
      lineIndex,
      choices,
      deadLine: deadLineText,
      toast: toastT > 0 ? toast : "",
      mute,
      clearText,
      time: reelTime,
      best: level ? (save.best[level.index] ?? 0) : 0,
      hint: hint && screen === "play" && reelTime < 9,
      progress: level ? Math.max(0, Math.min(1, (player.x + player.w) / (level.cols * TILE))) : 0,
    };
  }

  function emit() {
    if (!alive) return;
    onSnap(makeSnap());
  }

  function burst(x: number, y: number, color: string, n: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random());
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0.35 + Math.random() * 0.25,
        max: 0.6,
        color,
        r: 2 + Math.random() * 2.5,
      });
    }
    if (sparks.length > 180) sparks.splice(0, sparks.length - 180);
  }

  function spawnActor(kind: Kind, c: number, foot: number, ally = false): Actor {
    const world = level?.world ?? 0;
    const def = entDef(kind === "boss" ? "boss" : kind, world);
    const hp = ally ? Math.max(2, Math.round(def.hp * 0.7)) : def.hp;
    const actor: Actor = {
      kind,
      x: c * TILE + (TILE - def.w) / 2,
      y: foot * TILE - def.h,
      w: def.w,
      h: def.h,
      vx: ally ? 80 : def.behavior === "fly" ? def.speed : (c % 2 === 0 ? -1 : 1) * def.speed,
      vy: 0,
      hp,
      maxHp: hp,
      facing: 1,
      phase: Math.random() * 4,
      speed: def.speed,
      behavior: ally ? "walk" : def.behavior,
      touch: ally ? 0 : def.touch,
      xp: ally ? 0 : def.xp,
      ally,
      dead: false,
      cd: 0.6 + Math.random(),
      hop: 0.4,
      hurt: 0,
      boss: kind === "boss" && !ally,
    };
    return actor;
  }

  function loadLevel(index0: number) {
    level = buildLevel(index0);
    lit = new Set();
    shots = [];
    sparks = [];
    actors = level.ents.map((e) => spawnActor(e.kind, e.c, e.foot));
    blueprint = actors.map((a) => ({ ...a, hit: undefined }) as Actor);
    const spawnX = level.spawn.c * TILE + 8;
    const spawnY = level.spawn.foot * TILE - player.h;
    player.x = spawnX;
    player.y = spawnY;
    player.vx = 0;
    player.vy = 0;
    player.hp = maxHp();
    player.facing = 1;
    respawn = { x: spawnX, y: spawnY };
    camX = Math.max(0, player.x - 80);
    camY = Math.max(0, player.y - 80);
    reelTime = 0;
    clearText = "";
    hint = index0 === 0;
    formT = 0;
    iframe = 1;
    bossAlive = actors.some((a) => a.boss);
    audio.setWorld(level.world);
    const mark = level.tiles;
    for (let i = 0; i < mark.length; i++) {
      if (mark[i] === 5) {
        const c = i % level.cols;
        const r = Math.floor(i / level.cols);
        if (Math.abs(c - level.spawn.c) < 8) lit.add(i);
        void r;
      }
    }
  }

  function gainXp(n: number) {
    save.xp += n;
    while (save.level < 20 && save.xp >= xpToNext(save.level)) {
      save.xp -= xpToNext(save.level);
      save.level += 1;
      pendingLevels += 1;
    }
  }

  function openLevelUp() {
    if (pendingLevels <= 0) return false;
    const bag = [...UPGRADES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = bag[i]!;
      bag[i] = bag[j]!;
      bag[j] = tmp;
    }
    choices = bag.slice(0, 3).map((u) => u.id);
    screen = "levelup";
    return true;
  }

  function hurtPlayer(fromX: number) {
    if (iframe > 0 || screen !== "play") return;
    player.hp -= 1;
    iframe = 0.95;
    player.vx = player.x + player.w / 2 < fromX ? -220 : 220;
    player.vy = -320;
    shake = 7;
    hitStop = 0.06;
    audio.hurt();
    burst(player.x + player.w / 2, player.y + 16, "#c4373a", 8, 120);
    if (player.hp <= 0) {
      deaths += 1;
      deadLineText = deathLine(save.hero, deaths);
      screen = "dead";
      deadT = 1.25;
      audio.die();
      formT = 0;
    }
  }

  function killActor(a: Actor) {
    if (a.dead) return;
    a.dead = true;
    a.hp = 0;
    burst(a.x + a.w / 2, a.y + a.h / 2, "#f4e4c8", 12, 160);
    audio.hit();
    shake = a.boss ? 10 : 4;
    if (!a.ally && a.kind !== "candle") {
      lastKill = a.kind === "boss" ? lastKill : a.kind;
      gainXp(a.xp);
      showToast(`+${a.xp}`);
      if (a.boss) showToast("A saída destrancou. O carimbo rangeu.");
    }
  }

  function fire(owner: "player" | "foe" | "ally", origin: Body, facing: number, speed: number, dmg: number, color: string, vy = 0, pierce = 0) {
    shots.push({
      x: origin.x + (facing > 0 ? origin.w - 4 : -10),
      y: origin.y + origin.h * 0.35,
      w: 14,
      h: 8,
      vx: facing * speed,
      vy,
      life: 0.85,
      color,
      dmg,
      foe: owner === "foe",
      pierce,
      hit: new Set(),
    });
    if (shots.length > 48) shots.splice(0, shots.length - 48);
  }

  function playerAttack() {
    if (shotCd > 0) return;
    shotCd = attackCd();
    const hero = save.hero;
    const formed = formT > 0;
    const color = heroById(hero).accent;
    audio.shot();
    if (hero === "ivo" && formed) {
      fire("player", { ...player, x: player.x + player.facing * 8 }, player.facing, 280, 1.7 * dmgMul(), "#e0b15a", 0, 0);
      shots[shots.length - 1]!.w = 28;
      shots[shots.length - 1]!.h = 18;
      shots[shots.length - 1]!.life = 0.18;
    } else if (hero === "syl" && formed) {
      fire("player", player, player.facing, 560, 0.85 * dmgMul(), color, -90);
      fire("player", player, player.facing, 560, 0.85 * dmgMul(), color, 0);
      fire("player", player, player.facing, 560, 0.85 * dmgMul(), color, 90);
    } else if (hero === "osso") {
      fire("player", player, player.facing, 500, dmgMul(), "#f4efe4", 0, formed ? 3 : 1);
    } else if (hero === "lena" && formed) {
      fire("player", player, player.facing, 480, 1.15 * dmgMul(), "#c4373a");
    } else {
      fire("player", player, player.facing, 540, dmgMul(), color);
    }
    burst(player.x + (player.facing > 0 ? player.w : 0), player.y + 16, color, 4, 80);
  }

  function activateForm() {
    if (formT > 0 || formCd > 0) return;
    formT = formDur();
    audio.transform();
    showToast(transformLine(save.hero));
    shake = 5;
    if (save.hero === "osso") {
      const kind = lastKill && lastKill !== "boss" && lastKill !== "candle" ? lastKill : "skel";
      const c = Math.floor((player.x + player.w / 2) / TILE);
      const ally = spawnActor(kind, c, GROUND, true);
      ally.x = player.x + player.facing * 28;
      ally.y = player.y;
      ally.hp = Math.max(3, ally.maxHp);
      ally.maxHp = ally.hp;
      actors.push(ally);
      summon = ally;
    }
  }

  function stepPlay(dt: number) {
    if (!level) return;
    if (hitStop > 0) {
      hitStop -= dt;
      dt *= 0.2;
    }
    reelTime += dt;
    dropT = Math.max(0, dropT - dt);
    iframe = Math.max(0, iframe - dt);
    shotCd = Math.max(0, shotCd - dt);
    formCd = Math.max(0, formCd - dt);
    coyote = Math.max(0, coyote - dt);
    buffer = Math.max(0, buffer - dt);
    cutLock = Math.max(0, cutLock - dt);
    if (toastT > 0) toastT -= dt;

    const hold = readHold();
    if (wantJump || (hold.jump && !prevJump)) buffer = 0.13;
    if (wantForm || (hold.form && !prevForm)) activateForm();
    wantJump = false;
    wantForm = false;
    prevJump = hold.jump;
    prevForm = hold.form;
    if (hold.attack) playerAttack();

    if (formT > 0) {
      formT -= dt;
      if (formT <= 0) {
        formT = 0;
        formCd = formCool();
        if (summon && !summon.dead) {
          summon.dead = true;
          summon = null;
        }
      }
    }

    const formed = formT > 0;
    let move = (hold.right ? 1 : 0) - (hold.left ? 1 : 0);
    if (hold.left && hold.right) move = 0;
    const speed = 268 * speedMul();
    const accel = (wasGround ? 3200 : 1800) * dt;
    const target = move * speed;
    const delta = target - player.vx;
    if (Math.abs(delta) <= accel) player.vx = target;
    else player.vx += Math.sign(delta) * accel;
    if (move !== 0) player.facing = move;
    player.phase += dt * (4 + Math.abs(player.vx) / 50);

    const bat = formed && save.hero === "lena";
    const skull = formed && save.hero === "osso";
    let g = player.vy < 0 ? G_RISE : G_FALL;
    if (player.vy < 0 && Math.abs(player.vy) < 80) g *= 0.48;
    if (bat) g *= 0.32;
    if (skull) g *= 0.4;
    player.vy += g * dt;
    if (bat && hold.jump) player.vy -= 980 * dt;
    if (skull && hold.jump) player.vy -= 640 * dt;
    if (player.vy > TERM) player.vy = TERM;
    if (bat) player.vy = Math.max(-300, Math.min(360, player.vy));

    const canGround = wasGround || coyote > 0;
    const elfAir = formed && save.hero === "syl" && airJumps > 0;
    if (buffer > 0 && (canGround || elfAir)) {
      if (hold.down && player.onOneWay && canGround) {
        dropT = 0.22;
        player.vy = 80;
        buffer = 0;
      } else {
        player.vy = -JUMP_V * (formed && save.hero === "ivo" ? 1.1 : 1);
        buffer = 0;
        coyote = 0;
        cutDone = false;
        if (!canGround && elfAir) airJumps -= 1;
        audio.jump();
        burst(player.x + player.w / 2, player.y + player.h, "#f4e4c8", 4, 60);
      }
    }
    if (!hold.jump && player.vy < 0 && !cutDone && cutLock <= 0) {
      player.vy *= 0.5;
      cutDone = true;
    }

    const hit = moveBody(player, level, dt, dropT);
    wasGround = hit.grounded;
    player.onOneWay = hit.onOneWay;
    if (hit.grounded) {
      coyote = 0.11;
      airJumps = formed && save.hero === "syl" ? 1 : 0;
      if (hit.spring) {
        player.vy = -1100;
        cutLock = 0.22;
        cutDone = true;
        audio.jump();
      }
    }
    if ((hit.spike || touchesSpike(player, level)) && iframe <= 0) hurtPlayer(player.x + (player.facing > 0 ? 40 : -40));
    if (player.y > level.rows * TILE) hurtPlayer(player.x);

    // checkpoints
    const c0 = Math.floor(player.x / TILE);
    const c1 = Math.floor((player.x + player.w) / TILE);
    const r0 = Math.floor(player.y / TILE);
    const r1 = Math.floor((player.y + player.h) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (tileAt(level, c, r) !== 5) continue;
        const idx = r * level.cols + c;
        if (!lit.has(idx)) {
          lit.add(idx);
          respawn = { x: c * TILE, y: r * TILE - player.h + TILE };
          if (player.hp < maxHp()) player.hp += 1;
          audio.pickup();
          showToast("Lanterna acesa. O rolo lembra daqui.");
        }
      }
    }

    for (const a of actors) {
      if (a.dead) continue;
      a.phase += dt;
      a.hurt = Math.max(0, a.hurt - dt);
      a.cd = Math.max(0, a.cd - dt);
      const dx = player.x - a.x;
      if (a.behavior === "fly") {
        a.facing = dx >= 0 ? 1 : -1;
        a.vx = a.facing * a.speed * (a.ally ? 1.1 : 1);
        a.vy = Math.sin(a.phase * 2) * 36;
        if (!a.ally) a.vx = Math.sign(dx || 1) * a.speed;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        if (a.y < 20) a.y = 20;
        if (a.y > GROUND * TILE - a.h) a.y = GROUND * TILE - a.h;
      } else if (a.behavior !== "item" && a.behavior !== "still") {
        if (a.behavior === "charge" && Math.abs(dx) < 260 && Math.abs(player.y - a.y) < 50) {
          a.facing = dx >= 0 ? 1 : -1;
          a.vx = a.facing * a.speed * 2.4;
        } else if (a.behavior === "jump") {
          a.hop -= dt;
          if (wasGroundActor(a) && a.hop <= 0) {
            a.vy = -560;
            a.hop = 1.3 + Math.random() * 0.5;
            a.facing = dx >= 0 ? 1 : -1;
            a.vx = a.facing * a.speed;
          }
        } else if (a.ally) {
          const foe = nearestFoe(a);
          if (foe) {
            a.facing = foe.x >= a.x ? 1 : -1;
            a.vx = a.facing * Math.max(70, a.speed);
            if (a.cd <= 0 && Math.abs(foe.x - a.x) < 280) {
              a.cd = 0.8;
              fire("ally", a, a.facing, 420, 1, "#9fd4d8");
            }
          } else a.vx = 0;
        } else {
          // patrol, turn at walls handled by vx zeroing
          if (Math.abs(a.vx) < 8) a.vx = a.facing * a.speed;
          const ahead = a.x + (a.vx > 0 ? a.w + 4 : -4);
          const foot = Math.floor((a.y + a.h + 6) / TILE);
          const ac = Math.floor(ahead / TILE);
          const under = tileAt(level, ac, foot);
          const surface = under === 1 || under === 2 || under === 4;
          if (!surface) {
            a.vx *= -1;
            a.facing *= -1;
          }
        }
        if (a.behavior !== "fly") {
          let gActor = 3000;
          a.vy = Math.min(TERM, a.vy + gActor * dt);
          const landed = moveBody(a, level, dt, 0);
          if (!landed.grounded && a.behavior === "walk" && Math.abs(a.vx) > 0 && a.y > level.rows * TILE) {
            a.dead = true;
          }
          if (a.vx === 0 && a.behavior === "walk") {
            a.facing *= -1;
            a.vx = a.facing * a.speed;
          }
        }
      } else if (a.behavior === "still") {
        a.vx = 0;
      }

      if (!a.ally && a.kind !== "candle" && (a.behavior === "shoot" || a.behavior === "still" || a.behavior === "boss" || a.kind === "golem")) {
        if (a.cd <= 0 && Math.abs(dx) < 460 && Math.abs(player.y - a.y) < 180) {
          a.cd = a.boss ? 1.35 : a.behavior === "still" ? 1.5 : 1.9;
          a.facing = dx >= 0 ? 1 : -1;
          const spread = a.boss ? [-80, 0, 80] : [0];
          for (const vy of spread) fire("foe", a, a.facing, a.boss ? 250 : 220, 1, "#e08a3a", vy);
        }
      }
      if (a.boss) {
        a.facing = dx >= 0 ? 1 : -1;
        a.vx = a.facing * (70 + (level.world ?? 0) * 12);
        if (a.hop <= 0) {
          a.vy = -620;
          a.hop = 2.1;
        } else a.hop -= dt;
      }

      if (a.kind === "candle" && overlaps(player, a)) {
        a.dead = true;
        if (player.hp < maxHp()) player.hp += 1;
        audio.pickup();
        burst(a.x, a.y, "#e0b15a", 6, 70);
      } else if (!a.ally && a.touch > 0 && iframe <= 0 && overlaps(player, a)) {
        hurtPlayer(a.x + a.w / 2);
      }
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]!;
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const tc = Math.floor((s.x + s.w / 2) / TILE);
      const tr = Math.floor((s.y + s.h / 2) / TILE);
      if (isSolidTile(tileAt(level, tc, tr)) || s.life <= 0) {
        if (s.life > 0) burst(s.x, s.y, s.color, 3, 40);
        shots.splice(i, 1);
        continue;
      }
      if (s.foe) {
        if (iframe <= 0 && overlaps(player, s)) {
          hurtPlayer(s.x);
          shots.splice(i, 1);
        }
        continue;
      }
      for (const a of actors) {
        if (a.dead || a.ally || a.kind === "candle" || s.hit.has(a)) continue;
        if (!overlaps(s, a)) continue;
        a.hp -= s.dmg;
        a.hurt = 0.08;
        s.hit.add(a);
        burst(a.x + a.w / 2, a.y + a.h / 2, s.color, 5, 90);
        audio.hit();
        if (a.hp <= 0) killActor(a);
        s.pierce -= 1;
        if (s.pierce < 0) {
          shots.splice(i, 1);
          break;
        }
      }
    }

    // exit
    const door = exitRect();
    if (door && overlaps(player, door)) {
      const bossUp = actors.some((a) => a.boss && !a.dead);
      if (bossUp) {
        if (toastT <= 0) showToast("O carimbo ainda não saiu. Derruba o dono do picadeiro.");
      } else {
        finishReel();
      }
    }

    if (player.hp > 0 && pendingLevels > 0 && screen === "play") openLevelUp();
    if (screen !== "play") emit();
  }

  function wasGroundActor(a: Actor) {
    if (!level) return false;
    const r = Math.floor((a.y + a.h + 2) / TILE);
    const c0 = Math.floor((a.x + 2) / TILE);
    const c1 = Math.floor((a.x + a.w - 2) / TILE);
    for (let c = c0; c <= c1; c++) {
      const t = tileAt(level, c, r);
      if (t === 1 || t === 2 || t === 4) return true;
    }
    return false;
  }

  function nearestFoe(a: Actor) {
    let best: Actor | null = null;
    let bestD = 1e9;
    for (const o of actors) {
      if (o.dead || o.ally || o.kind === "candle" || o === a) continue;
      const d = Math.abs(o.x - a.x);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  function exitRect() {
    if (!level) return null;
    return {
      x: level.exit.c * TILE,
      y: level.exit.foot * TILE - 86,
      w: 46,
      h: 86,
      vx: 0,
      vy: 0,
    };
  }

  function finishReel() {
    if (!level || screen !== "play") return;
    const idx = level.index;
    const t = reelTime;
    if (!save.best[idx] || t < save.best[idx]) save.best[idx] = t;
    if (save.next < idx + 2) save.next = Math.min(26, idx + 2);
    gainXp(50 + idx * 3);
    clears += 1;
    clearText = clearLine(save.hero, clears);
    audio.fanfare();
    persist();
    if (openLevelUp()) {
      afterTalk = idx >= 24 ? "ending" : "map";
      return;
    }
    if (idx >= 24) {
      lines = ending();
      lineIndex = 0;
      screen = "talk";
      afterTalk = "ending";
    } else {
      screen = "clear";
    }
    emit();
  }

  function doRespawn() {
    if (!level) return;
    actors = blueprint.map((a) => ({ ...a }));
    summon = null;
    shots = [];
    player.x = respawn.x;
    player.y = respawn.y;
    player.vx = 0;
    player.vy = 0;
    player.hp = maxHp();
    iframe = 1.2;
    formT = 0;
    formCd = 0;
    screen = "play";
    emit();
  }

  function readHold() {
    const down = (code: string) => keys.has(code) || (qa ? qa.has(code) : false);
    return {
      left: touch.left || down("KeyA") || down("ArrowLeft"),
      right: touch.right || down("KeyD") || down("ArrowRight"),
      down: touch.down || down("KeyS") || down("ArrowDown"),
      jump: touch.jump || down("Space") || down("KeyW") || down("ArrowUp"),
      attack: touch.attack || down("KeyJ") || down("KeyZ"),
      form: touch.form || down("KeyK") || down("KeyL") || down("ShiftLeft"),
    };
  }

  function camera(dt: number) {
    if (!level) return;
    const look = player.facing * 64;
    let tx = player.x + player.w / 2 + look - VIEW_W * 0.42;
    let ty = player.y + player.h / 2 - VIEW_H * 0.62;
    const maxX = Math.max(0, level.cols * TILE - VIEW_W);
    const maxY = Math.max(0, level.rows * TILE - VIEW_H);
    tx = Math.min(maxX, Math.max(0, tx));
    ty = Math.min(maxY, Math.max(0, ty));
    const kx = 1 - Math.exp(-4.5 * dt);
    const ky = 1 - Math.exp(-3 * dt);
    camX += (tx - camX) * kx;
    camY += (ty - camY) * ky;
    shake = Math.max(0, shake - dt * 16);
  }

  function paintList(): Paint[] {
    const list: Paint[] = [];
    for (const a of actors) {
      if (a.dead && a.kind !== "candle") continue;
      if (a.dead) continue;
      list.push({
        x: a.x,
        y: a.y,
        w: a.w,
        h: a.h,
        facing: a.facing,
        phase: a.phase,
        kind: a.kind,
        hero: save.hero,
        form: false,
        hurt: a.hurt > 0,
        world: level?.world ?? 0,
      });
    }
    if (screen === "play" || screen === "pause" || screen === "levelup" || screen === "dead" || screen === "clear" || screen === "talk") {
      list.push({
        x: player.x,
        y: player.y,
        w: player.w,
        h: player.h,
        facing: player.facing,
        phase: player.phase,
        kind: "hero",
        hero: save.hero,
        form: formT > 0,
        hurt: iframe > 0,
        world: level?.world ?? 0,
      });
    }
    return list;
  }

  function draw(dt: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssW = canvas.clientWidth || 480;
    const cssH = canvas.clientHeight || 270;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pw = Math.max(1, Math.floor(cssW * dpr));
    const ph = Math.max(1, Math.floor(cssH * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#10080c";
    ctx.fillRect(0, 0, cssW, cssH);
    const scale = Math.min(cssW / VIEW_W, cssH / VIEW_H);
    const dw = VIEW_W * scale;
    const dh = VIEW_H * scale;
    const ox = (cssW - dw) / 2;
    const oy = (cssH - dh) / 2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.clip();
    const playing =
      screen === "play" ||
      screen === "pause" ||
      screen === "levelup" ||
      screen === "dead" ||
      screen === "clear" ||
      (screen === "talk" && level);
    const door = exitRect();
    const open = !actors.some((a) => a.boss && !a.dead);
    drawWorld({
      ctx,
      level: playing ? level : null,
      camX,
      camY,
      viewW: VIEW_W,
      viewH: VIEW_H,
      actors: playing ? paintList() : [],
      shots: shots.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, color: s.color, vx: s.vx })),
      sparks,
      exit: playing && door ? { x: door.x, y: door.y, w: door.w, h: door.h, open } : null,
      lit,
      t: clock,
      attract: !playing,
      shake,
    });
    ctx.restore();

    if (screen === "cast" || screen === "title") {
      document.querySelectorAll<HTMLCanvasElement>("[data-hero-preview]").forEach((node) => {
        const id = node.dataset.heroPreview as HeroId;
        if (id === "ivo" || id === "lena" || id === "osso" || id === "syl") {
          drawPreview(node, id, clock, false);
        }
      });
    }
    void dt;
  }

  let last = performance.now();
  function frame(now: number) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    for (const s of sparks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 400 * dt;
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i]!.life <= 0) sparks.splice(i, 1);

    if (screen === "play") {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 5 && screen === "play") {
        stepPlay(STEP);
        acc -= STEP;
        steps += 1;
      }
      if (steps === 5) acc = 0;
      camera(dt);
      audio.setMusic(true);
    } else if (screen === "dead") {
      deadT -= dt;
      camera(dt);
      if (deadT <= 0) doRespawn();
      audio.setMusic(true);
    } else {
      acc = 0;
      audio.setMusic(screen !== "title" && screen !== "help");
      player.phase += dt * 3;
    }
    audio.tick();
    draw(dt);
    snapAcc += dt;
    const hpChanged = player.hp !== lastHp;
    if (hpChanged || snapAcc > 0.2) {
      lastHp = player.hp;
      snapAcc = 0;
      if (screen === "play" || screen === "dead" || hpChanged) emit();
    }
    requestAnimationFrame(frame);
  }

  const bridge = {
    advance: () => {},
    upgrade: (_id: StatKey) => {},
  };

  function onKey(e: KeyboardEvent, down: boolean) {
    if (down) {
      const block = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (block.includes(e.code)) e.preventDefault();
      keys.add(e.code);
      if (!e.repeat && screen === "play") {
        if (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp") wantJump = true;
        if (e.code === "KeyK" || e.code === "KeyL" || e.code === "ShiftLeft") wantForm = true;
      }
      if (e.code === "Escape" && screen === "play") {
        screen = "pause";
        emit();
      } else if (e.code === "Escape" && screen === "pause") {
        screen = "play";
        emit();
      } else if ((e.code === "Enter" || e.code === "Space") && screen === "talk" && down) {
        e.preventDefault();
        bridge.advance();
      } else if (screen === "levelup" && down) {
        const map: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2 };
        const idx = map[e.code];
        const choice = idx === undefined ? undefined : choices[idx];
        if (choice) bridge.upgrade(choice);
      }
    } else keys.delete(e.code);
  }
  const downL = (e: KeyboardEvent) => onKey(e, true);
  const upL = (e: KeyboardEvent) => onKey(e, false);
  window.addEventListener("keydown", downL);
  window.addEventListener("keyup", upL);
  const unlock = () => audio.unlock();
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  const vis = () => {
    if (document.visibilityState === "visible") audio.unlock();
    else keys.clear();
  };
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("blur", () => keys.clear());

  const api: Runtime = {
    destroy() {
      alive = false;
      window.removeEventListener("keydown", downL);
      window.removeEventListener("keyup", upL);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", vis);
      const probe = window as unknown as { __controlsTest?: unknown };
      delete probe.__controlsTest;
    },
    newGame(hero: HeroId) {
      audio.unlock();
      audio.ui();
      save = emptySave(hero);
      selected = hero;
      clearSave();
      hasSave = false;
      lines = prologue();
      lineIndex = 0;
      screen = "talk";
      afterTalk = "first";
      level = null;
      emit();
    },
    continueGame() {
      audio.unlock();
      audio.ui();
      const loaded = loadSave();
      if (!loaded) return;
      save = loaded;
      hasSave = true;
      selected = save.hero;
      screen = "map";
      emit();
    },
    pickHero(hero: HeroId) {
      selected = hero;
      audio.ui();
      emit();
    },
    enterReel(index0: number) {
      audio.unlock();
      if (index0 < 0 || index0 > 24) return;
      if (index0 + 1 > save.next) return;
      afterTalk = "play";
      loadLevel(index0);
      const world = Math.floor(index0 / 5);
      const fresh: Snap["lines"] = [];
      if (world > 0 && (save.seen & (1 << world)) === 0) {
        fresh.push(...worldIntro(world));
        save.seen |= 1 << world;
        persist();
      }
      if (index0 % 5 === 4) fresh.push(...bossIntro(world));
      if (fresh.length) {
        lines = fresh;
        lineIndex = 0;
        screen = "talk";
        afterTalk = "play";
      } else screen = "play";
      emit();
    },
    advanceDialogue() {
      audio.ui();
      if (lineIndex < lines.length - 1) {
        lineIndex += 1;
        emit();
        return;
      }
      if (afterTalk === "first") {
        save.hero = selected;
        persist();
        api.enterReel(0);
        return;
      }
      if (afterTalk === "ending") {
        screen = "ending";
        emit();
        return;
      }
      if (afterTalk === "map") {
        screen = "clear";
        emit();
        return;
      }
      screen = "play";
      prevJump = true;
      prevForm = true;
      buffer = 0;
      emit();
    },
    skipDialogue() {
      if (screen !== "talk") return;
      lineIndex = Math.max(0, lines.length - 1);
      api.advanceDialogue();
    },
    chooseUpgrade(id: StatKey) {
      audio.ui();
      save.stats[id] = Math.min(12, save.stats[id] + 1);
      if (id === "vit") player.hp = Math.min(maxHp(), player.hp + 1);
      pendingLevels = Math.max(0, pendingLevels - 1);
      persist();
      if (pendingLevels > 0) {
        openLevelUp();
        emit();
        return;
      }
      choices = [];
      if (afterTalk === "ending" && level && level.index >= 24 && screen === "levelup") {
        lines = ending();
        lineIndex = 0;
        screen = "talk";
      } else if (clearText && level && !actors.some((a) => a.boss && !a.dead) && playerOverlapsExit()) {
        screen = "clear";
      } else screen = "play";
      emit();
    },
    resume() {
      if (screen === "pause") {
        screen = "play";
        emit();
      }
    },
    pause() {
      if (screen === "play") {
        screen = "pause";
        emit();
      }
    },
    toggleMute() {
      mute = !mute;
      writeMute(mute);
      audio.setMuted(mute);
      if (!mute) audio.unlock();
      emit();
    },
    quitToMap() {
      screen = "map";
      persist();
      emit();
    },
    skipDead() {
      if (screen === "dead") doRespawn();
    },
    openHelp(on: boolean) {
      screen = on ? "help" : "title";
      emit();
    },
    openCast() {
      audio.unlock();
      selected = save.hero;
      screen = "cast";
      emit();
    },
    setHold(action: Action, down: boolean) {
      touch[action] = down;
      if (down && action === "jump") wantJump = true;
      if (down && action === "form") wantForm = true;
      if (down) audio.unlock();
    },
    backTitle() {
      screen = "title";
      emit();
    },
  };

  function playerOverlapsExit() {
    const door = exitRect();
    return Boolean(door && overlaps(player, door));
  }

  // boss hop timer lives on the actor
  if (qaBoot) {
    save = emptySave("ivo");
    loadLevel(0);
    screen = "play";
  }

  const probe = {
    getYaw: () => (player.facing > 0 ? 0 : Math.PI),
    getSpeed: () => player.vx,
    getX: () => player.x,
    getCols: () => level?.cols ?? 0,
    getFoes: () => actors.filter((a) => !a.dead && !a.ally && a.kind !== "candle").length,
    setKeys: (codes: string[]) => {
      qa = new Set(codes);
    },
    setSteer: (_v: number) => {},
  };
  (window as unknown as { __controlsTest?: typeof probe }).__controlsTest = probe;

  bridge.advance = () => api.advanceDialogue();
  bridge.upgrade = (id) => api.chooseUpgrade(id);

  emit();
  requestAnimationFrame(frame);
  return api;
}
