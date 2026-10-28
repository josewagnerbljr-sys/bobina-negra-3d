import { createAudio } from "./audio";
import {
  bossIntro,
  clearLine,
  deathLine,
  ending,
  entDef,
  heroById,
  MODES,
  midEnding,
  miniIntro,
  MINI_NAMES,
  POOLS,
  prologue,
  reelWorld,
  SKILLS,
  SKILL_CD,
  SKILL_KEYS,
  SKILL_KINDS,
  SKILL_LV,
  transformLine,
  worldIntro,
  WORLDS,
} from "./content";
import { buildLevel } from "./maps";
import { baseOf, bagUsed, canFit, compareItem, countPotions, equipKeyFor, itemName, itemSize, makeItem, modText, peekUid, rollDrops, RARITY_COLOR, SLOT_NAME } from "./items";
import { derive, derivedLines, totalStats, type Derived } from "./stats";
import type { GearLook } from "../engine/models";
import { createRenderer, type Fx, type LootPaint, type Paint, type Spark } from "./render3d";
import { G_FALL, G_RISE, JUMP_V, TERM, moveBody, overlaps, touchesSpike, type Body } from "./physics";
import { clearSave, emptySave, loadMute, loadSave, writeMute, writeSave, type Save } from "./save";
import {
  BAG_SIZE,
  EQUIP_KEYS,
  GROUND,
  HERO_IDS,
  MAIN_LEVELS,
  MAX_LEVEL,
  POINTS_PER_LEVEL,
  STAT_KEYS,
  TILE,
  VIEW_H,
  VIEW_W,
  isSolidTile,
  tileAt,
  xpToNext,
  type Action,
  type BuffKind,
  type EquipKey,
  type HeroId,
  type Item,
  type Kind,
  type Level,
  type Screen,
  type Snap,
  type StatKey,
} from "./types";

const STEP = 1 / 60;

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
  mini: boolean;
  seq: number;
  atkT: number;
  dashT: number;
  slamT: number;
  dyT: number;
};

type Loot = Body & { item: Item; age: number; t: number };

type Shot = Body & {
  life: number;
  color: string;
  dmg: number;
  foe: boolean;
  pierce: number;
  hit: Set<Actor>;
  home?: Actor | null;
  seek?: boolean;
  el?: string;
};

/** elemento de cada herói: define o visual dos tiros e poderes */
const ELEMENT: Record<string, string> = { ivo: "lunar", lena: "blood", osso: "spirit", syl: "nature", tito: "fire", mari: "water", pia: "stone", lumen: "lightning" };

export type Runtime = {
  gl: boolean;
  destroy: () => void;
  newGame: (hero: HeroId) => void;
  openMode: (hero: HeroId | null) => void;
  setMode: (m: number) => void;
  continueGame: () => void;
  pickHero: (hero: HeroId) => void;
  enterReel: (index0: number) => void;
  advanceDialogue: () => void;
  skipDialogue: () => void;
  openChar: () => void;
  closeChar: () => void;
  allocate: (id: StatKey, n?: number) => void;
  respec: () => void;
  equipItem: (uid: number) => void;
  unequip: (slot: EquipKey) => void;
  useItem: (uid: number) => void;
  discardItem: (uid: number) => void;
  quickPotion: () => void;
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

export function createRuntime(canvas: HTMLCanvasElement, onSnap: (s: Snap) => void): Runtime {
  const audio = createAudio();
  const renderer = createRenderer(canvas);
  let attract: Level = buildLevel(Math.floor(Math.random() * 10) * 5);
  renderer.setAttract(attract);
  audio.setWorld(attract.world, 0);
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
  let atkT = 0;
  let formT = 0;
  let formCd = 0;
  let airJumps = 0;
  let wasGround = false;
  let loot: Loot[] = [];
  let buffs: { kind: BuffKind; left: number }[] = [];
  let charFrom: Screen = "map";
  let fullToast = 0;
  const opened = new Set<number>();
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
    s1: false,
    s2: false,
    s3: false,
    s4: false,
    potion: false,
    melee: false,
  };
  let meleeCd = 0;
  let meleeMax = 0.4;
  let wantMelee = false;
  let prevMelee = false;
  let cine: Actor | null = null;
  const seenCine = new Set<number>();
  let pendingHero: HeroId | null = null;
  let modeFrom: Screen = "title";
  let prevPotion = false;
  let wantPotion = false;
  let auraT = 0;
  let lastVy = 0;
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

  /* ---- poderes novos ---- */
  const allSkills = qaBoot || (typeof location !== "undefined" && new URLSearchParams(location.search).has("all"));
  let fx: Fx[] = [];
  let skillCd = [0, 0, 0, 0];
  let prevSkill = [false, false, false, false];
  const wantSkill = [false, false, false, false];
  let dashT = 0;
  let flashT = 0;

  function skillUnlocked(i: number) {
    return allSkills || save.level >= SKILL_LV[i]!;
  }

  /* ---- atributos / buffs ---- */
  function D(): Derived {
    return derive(totalStats(save.hero, save.alloc, save.equip), save.level);
  }
  const hasBuff = (k: BuffKind) => buffs.some((b) => b.kind === k && b.left > 0);
  function dmgPhys() {
    return D().phys * (hasBuff("fury") ? 1.5 : 1);
  }
  function dmgMagic() {
    return D().magic * (hasBuff("fury") ? 1.5 : 1);
  }
  function crit(d: number): number {
    return Math.random() < D().crit ? d * 1.8 : d;
  }

  const inert = (a: Actor) => a.kind === "candle" || a.kind === "chest";

  function hurtFoe(a: Actor, dmg: number, color: string) {
    if (a.dead || a.ally || inert(a)) return;
    a.hp -= crit(dmg);
    a.hurt = 0.14;
    burst(a.x + a.w / 2, a.y + a.h / 2, color, 8, 140);
    audio.hit();
    if (a.hp <= 0) killActor(a);
  }

  /** efeito de impacto do tiro: bola de fogo explode em área, raio salta para outro inimigo */
  function shotImpact(s: Shot, a: Actor) {
    const ax = a.x + a.w / 2;
    const ay = a.y + a.h / 2;
    if (s.el === "fire") {
      fx.push({ kind: "blast", x: ax, y: ay, t: 0, max: 0.5, color: "#ff8a2a", r: 90, dir: 0, el: "fire" });
      for (const o of foesNear(ax, ay, 90, 70)) if (o !== a) hurtFoe(o, s.dmg * 0.5, "#ff8a2a");
      shake = Math.max(shake, 3);
    } else if (s.el === "lightning") {
      fx.push({ kind: "bolt", x: ax, y: a.y + a.h, t: 0, max: 0.35, color: "#ffee6a", r: 0, dir: 0, el: "lightning" });
      let near: Actor | null = null;
      let nd = 190;
      for (const o of actors) {
        if (o === a || o.dead || o.ally || inert(o)) continue;
        const dd = Math.hypot(o.x + o.w / 2 - ax, o.y + o.h / 2 - ay);
        if (dd < nd) {
          nd = dd;
          near = o;
        }
      }
      if (near) {
        hurtFoe(near, s.dmg * 0.5, "#ffee6a");
        fx.push({ kind: "bolt", x: near.x + near.w / 2, y: near.y + near.h, t: -0.06, max: 0.35, color: "#ffee6a", r: 0, dir: 0, el: "lightning" });
      }
    } else if (s.el === "water") {
      fx.push({ kind: "wave", x: ax, y: ay, t: 0, max: 0.35, color: "#8fe4ff", r: 46, dir: 0, el: "water" });
    }
  }

  function foesNear(cx: number, cy: number, rx: number, ry: number) {
    return actors.filter((a) => !a.dead && !a.ally && !inert(a) && Math.abs(a.x + a.w / 2 - cx) < rx && Math.abs(a.y + a.h / 2 - cy) < ry);
  }

  function useSkill(i: number) {
    if (!level || screen !== "play" || !skillUnlocked(i) || skillCd[i]! > 0) return;
    const def = SKILLS[save.hero][i]!;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const d = D();
    skillCd[i] = SKILL_CD[i]! * (1 - d.cdr);
    atkT = 0.3;
    audio.skill(i);
    if (i === 0) {
      // unitário perseguidor
      let best: Actor | null = null;
      let bd = 640;
      for (const a of actors) {
        if (a.dead || a.ally || inert(a)) continue;
        const dist = Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy);
        const dxf = (a.x + a.w / 2 - cx) * player.facing;
        const front = dxf > 20 && dxf < 460 && Math.abs(a.y + a.h / 2 - cy) < 110;
        if (front && dist < bd) {
          bd = dist;
          best = a;
        }
      }
      shots.push({
        x: cx - 9 + player.facing * 14,
        y: cy - 9,
        w: 18,
        h: 18,
        vx: player.facing * 420,
        vy: -90,
        life: 1.7,
        color: def.color,
        dmg: 3.4 * dmgPhys(),
        foe: false,
        pierce: 0,
        hit: new Set(),
        home: best,
        el: ELEMENT[save.hero],
      });
      fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.35, color: def.color, r: 40, dir: player.facing });
    } else if (i === 1) {
      dashT = 0.17;
      iframe = Math.max(iframe, 0.3);
      fx.push({ kind: "slash", x: cx, y: cy, t: 0, max: 0.3, color: def.color, r: 150, dir: player.facing });
    } else if (i === 2) {
      const R = 175 * d.radius;
      const el = ELEMENT[save.hero];
      fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.55, color: def.color, r: R, dir: 0, el });
      if (el === "fire" || el === "stone") fx.push({ kind: "blast", x: cx, y: cy, t: 0, max: 0.75, color: def.color, r: R, dir: 0, el });
      let nb = 0;
      for (const a of foesNear(cx, cy, R, R * 0.8)) {
        if (el === "lightning" && nb < 6) fx.push({ kind: "bolt", x: a.x + a.w / 2, y: a.y + a.h, t: -nb++ * 0.07, max: 0.4, color: def.color, r: 0, dir: 0, el });
        else if (el !== "fire" && el !== "lightning" && nb < 6) fx.push({ kind: "pillar", x: a.x + a.w / 2, y: a.y + a.h, t: -nb++ * 0.05, max: 0.6, color: def.color, r: 0, dir: 0, el });
        hurtFoe(a, 2.1 * dmgMagic(), def.color);
        if (!a.boss && a.behavior !== "still") a.x += Math.sign(a.x + a.w / 2 - cx || 1) * 30;
      }
      for (const sh of shots) if (sh.foe && Math.hypot(sh.x - cx, sh.y - cy) < R) sh.life = 0;
      shake = 6;
    } else {
      // super especial: tela inteira
      const hit = foesNear(cx, cy, 560 * d.radius, 380 * d.radius);
      fx.push({ kind: "nova", x: cx, y: cy, t: 0, max: 1.0, color: def.color, r: 640 * d.radius, dir: 0, el: ELEMENT[save.hero] });
      if (ELEMENT[save.hero] === "lightning") for (let k = 0; k < 9; k++) fx.push({ kind: "bolt", x: cx + (Math.random() - 0.5) * 900, y: cy + 60, t: -k * 0.07, max: 0.45, color: def.color, r: 0, dir: 0, el: "lightning" });
      if (ELEMENT[save.hero] === "fire") for (let k = 0; k < 7; k++) fx.push({ kind: "blast", x: cx + (Math.random() - 0.5) * 800, y: cy + 20, t: -k * 0.08, max: 0.6, color: "#ff8a2a", r: 110, dir: 0, el: "fire" });
      for (const a of hit) {
        fx.push({ kind: "pillar", x: a.x + a.w / 2, y: a.y + a.h, t: -Math.random() * 0.25, max: 0.9, color: def.color, r: 0, dir: 0, el: ELEMENT[save.hero] });
        hurtFoe(a, 7.5 * dmgMagic(), def.color);
      }
      for (const sh of shots) if (sh.foe) sh.life = 0;
      shake = 16;
      hitStop = 0.14;
      flashT = 1;
      iframe = Math.max(iframe, 0.6);
    }
  }

  function maxHp() {
    return D().maxHp;
  }
  function speedMul() {
    const f = formT > 0;
    const wolf = f ? (save.hero === "ivo" ? 1.38 : save.hero === "lumen" ? 1.35 : save.hero === "tito" ? 1.1 : save.hero === "pia" ? 0.85 : 1) : 1;
    return D().speed * wolf * (hasBuff("haste") ? 1.2 : 1);
  }
  function formDur() {
    return D().formDur * (save.hero === "pia" ? 0.6 : 1);
  }
  function formCool() {
    return D().formCool;
  }
  function attackCd() {
    const fast = formT > 0 ? (save.hero === "syl" || save.hero === "lena" ? 0.82 : save.hero === "lumen" ? 0.7 : 1) : 1;
    return D().atkCd * fast * (hasBuff("haste") ? 0.8 : 1);
  }
  const bonusBoost = () => D().potion - 2;

  function persist() {
    save.uid = peekUid();
    writeSave(save);
    hasSave = true;
  }

  function showToast(text: string) {
    toast = text;
    toastT = 2.8;
  }

  function makeSnap(): Snap {
    const world = level ? reelWorld(level.index) : WORLDS[0]!;
    const boss = actors.find((a) => (a.boss || a.mini) && !a.dead);
    const stats = totalStats(save.hero, save.alloc, save.equip);
    const d = D();
    return {
      screen,
      hasSave,
      hero: save.hero,
      selectedHero: selected,
      next: save.next,
      bonusOpen: Math.min(10, Math.floor((save.next - 1) / 5)),
      mode: save.mode,
      meleeCd: Math.max(0, meleeCd),
      meleeMax: meleeMax,
      cine: cine !== null,
      level: save.level,
      xp: save.xp,
      xpNeed: xpToNext(save.level),
      stats,
      alloc: { ...save.alloc },
      points: save.points,
      hp: player.hp,
      maxHp: maxHp(),
      reel: level ? level.index + 1 : 0,
      reelName: level?.name ?? "",
      worldName: level ? world.name : "",
      bonus: Boolean(level?.bonus),
      bossAlive: Boolean(boss),
      bossName: level?.boss ? world.boss : level?.mini ? (MINI_NAMES[level.world] ?? "Mini-chefe") : "",
      bossHp: boss ? Math.max(0, boss.hp) : 0,
      bossMax: boss ? boss.maxHp : 0,
      formActive: formT > 0,
      formLeft: Math.max(0, formT),
      formCd: Math.max(0, formCd),
      formDur: formDur(),
      lines,
      lineIndex,
      deadLine: deadLineText,
      toast: toastT > 0 ? toast : "",
      mute,
      clearText,
      time: reelTime,
      best: level ? (save.best[level.index] ?? 0) : 0,
      hint: hint && screen === "play" && reelTime < 9,
      progress: level ? Math.max(0, Math.min(1, (player.x + player.w) / (level.cols * TILE))) : 0,
      skills: SKILLS[save.hero].map((sd, i) => ({ name: sd.name, kind: SKILL_KINDS[i]!, key: SKILL_KEYS[i]!, cd: skillCd[i]!, cdMax: SKILL_CD[i]! * (1 - d.cdr), lv: SKILL_LV[i]!, unlocked: skillUnlocked(i) })),
      bag: save.bag,
      equip: save.equip,
      bagUsed: bagUsed(save.bag),
      potions: countPotions(save.bag),
      buffs: buffs.map((b) => ({ kind: b.kind, left: b.left })),
      derived: derivedLines(d),
      levelupFresh: save.points > 0,
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

  function spawnActor(kind: Kind, c: number, foot: number, ally = false, mini = false): Actor {
    const world = level?.world ?? 0;
    const def = entDef(kind, world, mini, save.mode);
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
      boss: kind === "boss" && !ally && !mini,
      mini: kind === "boss" && !ally && mini,
      seq: 0,
      atkT: 0,
      dashT: 0,
      slamT: 0,
      dyT: 0,
    };
    return actor;
  }

  function loadLevel(index0: number) {
    level = buildLevel(index0);
    lit = new Set();
    shots = [];
    sparks = [];
    actors = level.ents.map((e) => spawnActor(e.kind, e.c, e.foot, false, Boolean(e.mini)));
    loot = [];
    buffs = [];
    opened.clear();
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
    // começa parado: solta qualquer tecla/botão que ficou "preso" da fase anterior
    keys.clear();
    for (const k of Object.keys(touch) as Action[]) touch[k] = false;
    wantJump = false;
    wantForm = false;
    wantPotion = false;
    wantMelee = false;
    meleeCd = 0;
    cine = null;
    seenCine.clear();
    wantSkill.fill(false);
    shake = 0;
    hitStop = 0;
    hint = index0 === 0 && save.level === 1;
    formT = 0;
    iframe = 1;
    skillCd = [0, 0, 0, 0];
    dashT = 0;
    fx = [];
    bossAlive = actors.some((a) => a.boss);
    prevPotion = true;
    audio.setWorld(level.world, level.index % 5, level.bonus);
    audio.setBoss(level.boss);
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
    save.xp += Math.round(n * D().xp);
    let up = 0;
    while (save.level < MAX_LEVEL && save.xp >= xpToNext(save.level)) {
      save.xp -= xpToNext(save.level);
      save.level += 1;
      save.points += POINTS_PER_LEVEL;
      up += 1;
    }
    if (save.level >= MAX_LEVEL) save.xp = 0;
    if (up > 0) {
      audio.levelup();
      showToast(`Nível ${save.level}! +${up * POINTS_PER_LEVEL} pontos (C)`);
      if (player.hp > 0) player.hp = Math.min(maxHp(), player.hp + 1);
      burst(player.x + player.w / 2, player.y + 10, "#ffe27a", 18, 200);
    }
  }

  function hurtPlayer(fromX: number, dmg = 1, scaled = true) {
    if (iframe > 0 || screen !== "play" || hasBuff("ward")) return;
    player.hp -= scaled ? dmg + ((MODES[save.mode]?.dmg ?? 1) - 1) : 1;
    iframe = D().iframe;
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

  function dropLoot(items: Item[], x: number, y: number) {
    items.forEach((item, i) => {
      loot.push({ x: x - 10, y: y - 10, w: 20, h: 20, vx: (i - (items.length - 1) / 2) * 90 + (Math.random() - 0.5) * 30, vy: -380 - Math.random() * 120, item, age: 0, t: Math.random() * 6 });
    });
    if (loot.length > 40) loot.splice(0, loot.length - 40);
  }

  function killActor(a: Actor) {
    if (a.dead) return;
    a.dead = true;
    a.hp = 0;
    a.dyT = 0.45;
    burst(a.x + a.w / 2, a.y + a.h / 2, "#f4e4c8", 12, 160);
    audio.hit();
    shake = a.boss || a.mini ? 10 : 4;
    if (!a.ally && !inert(a)) {
      lastKill = a.kind === "boss" ? lastKill : a.kind;
      gainXp(a.xp);
      showToast(`+${Math.round(a.xp * D().xp)} XP`);
      if (a.boss) showToast("A saída destrancou. O carimbo rangeu.");
      if (a.mini) showToast("Mini-chefe caiu! Tesouro no chão.");
      const src = a.boss ? "boss" : a.mini ? "mini" : "mob";
      const drops = rollDrops(src, level?.world ?? 0, D().luck * (MODES[save.mode]?.luck ?? 1), Math.random);
      if (drops.length) dropLoot(drops, a.x + a.w / 2, a.y + a.h / 2);
    }
  }

  function openChest(a: Actor) {
    a.dead = true;
    a.dyT = 0.25;
    opened.add(Math.round(a.x));
    audio.chest();
    shake = 3;
    const items = rollDrops("chest", level?.world ?? 0, D().luck, Math.random);
    dropLoot(items, a.x + a.w / 2, a.y);
    burst(a.x + a.w / 2, a.y, "#ffd36a", 16, 180);
    showToast("Baú aberto!");
  }

  /* ---- itens ---- */
  function addToBag(it: Item): boolean {
    if (!canFit(save.bag, it)) return false;
    save.bag.push(it);
    return true;
  }

  function applyPotion(it: Item): boolean {
    const b = baseOf(it);
    if (b.slot !== "potion") return false;
    if (b.heal) {
      if (player.hp >= maxHp() || player.hp <= 0) {
        showToast("Corações cheios.");
        return false;
      }
      player.hp = Math.min(maxHp(), player.hp + b.heal + bonusBoost());
      burst(player.x + player.w / 2, player.y + 14, "#ff6a8a", 10, 100);
    } else if (b.buff) {
      const dur = b.buff === "ward" ? 8 : 25;
      buffs = buffs.filter((x) => x.kind !== b.buff);
      buffs.push({ kind: b.buff, left: dur });
      burst(player.x + player.w / 2, player.y + 14, b.color, 12, 120);
    }
    audio.drink();
    return true;
  }

  function consume(uid: number) {
    const i = save.bag.findIndex((x) => x.uid === uid);
    if (i < 0) return;
    if (applyPotion(save.bag[i]!)) {
      save.bag.splice(i, 1);
      persist();
    }
  }

  function quick() {
    if (screen !== "play") return;
    const heal = save.bag.find((x) => baseOf(x).heal);
    if (!heal) {
      showToast("Sem poção de cura na mochila.");
      return;
    }
    consume(heal.uid);
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
      el: owner === "foe" ? undefined : ELEMENT[save.hero],
    });
    if (shots.length > 48) shots.splice(0, shots.length - 48);
  }

  /** golpe corpo a corpo com a arma equipada (alcance, dano e recarga dependem da arma) */
  const MELEE: Record<string, { reach: number; cd: number; dmg: number; hits: number; knock: number; arc: number }> = {
    none: { reach: 62, cd: 0.34, dmg: 0.9, hits: 1, knock: 40, arc: 0.9 },
    knife: { reach: 70, cd: 0.26, dmg: 1.2, hits: 2, knock: 30, arc: 0.9 },
    sword: { reach: 104, cd: 0.4, dmg: 1.9, hits: 3, knock: 60, arc: 1.2 },
    axe: { reach: 100, cd: 0.7, dmg: 3.2, hits: 9, knock: 110, arc: 1.4 },
    staff: { reach: 118, cd: 0.5, dmg: 1.6, hits: 3, knock: 90, arc: 1.0 },
    scepter: { reach: 112, cd: 0.46, dmg: 1.7, hits: 4, knock: 70, arc: 1.2 },
    bow: { reach: 80, cd: 0.36, dmg: 1.2, hits: 2, knock: 40, arc: 0.9 },
  };

  function meleeAttack() {
    if (!level || screen !== "play" || meleeCd > 0) return;
    const w = save.equip.weapon;
    const id = w ? baseOf(w).id : "none";
    const def = MELEE[id] ?? MELEE.none!;
    const tierK = w ? (1 + 0.14 * (w.tier - 1)) * (1 + 0.28 * w.rarity) : 1;
    const dmg = def.dmg * tierK * dmgPhys();
    meleeMax = def.cd * (hasBuff("haste") ? 0.8 : 1) * Math.max(0.6, D().atkCd / 0.36);
    meleeCd = meleeMax;
    atkT = 0.28;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const color = w ? RARITY_COLOR[w.rarity]! : "#f4e4c8";
    const reach = def.reach;
    fx.push({ kind: "slash", x: cx + player.facing * 10, y: cy, t: 0, max: 0.26, color, r: reach * def.arc, dir: player.facing });
    audio.skill(1);
    let hit = 0;
    for (const a of actors) {
      if (a.dead || a.ally || inert(a)) continue;
      const ax = a.x + a.w / 2;
      const front = (ax - cx) * player.facing > -14;
      if (!front || Math.abs(ax - cx) - a.w / 2 > reach || Math.abs(a.y + a.h / 2 - cy) > 56 + a.h / 2) continue;
      if (hit >= def.hits) break;
      hit += 1;
      hurtFoe(a, dmg, color);
      if (!a.boss && !a.mini && a.behavior !== "still") {
        a.x += player.facing * def.knock * 0.4;
        a.vy = Math.min(a.vy, -140);
      }
    }
    for (const sh of shots) {
      if (!sh.foe) continue;
      const sx = sh.x + sh.w / 2;
      if ((sx - cx) * player.facing > 0 && Math.abs(sx - cx) < reach + 10 && Math.abs(sh.y - cy) < 60) {
        sh.life = 0;
        burst(sh.x, sh.y, color, 5, 90);
      }
    }
    if (hit > 0) {
      shake = Math.max(shake, 3 + hit);
      hitStop = Math.max(hitStop, 0.04);
    }
    // dá um passinho à frente: o golpe tem peso
    player.vx += player.facing * 120;
  }

  function playerAttack() {
    if (shotCd > 0) return;
    shotCd = attackCd();
    atkT = 0.18;
    const hero = save.hero;
    const formed = formT > 0;
    const color = heroById(hero).accent;
    audio.shot(save.hero);
    if (hero === "ivo" && formed) {
      fire("player", { ...player, x: player.x + player.facing * 8 }, player.facing, 280, 1.7 * dmgPhys(), "#e0b15a", 0, 0);
      shots[shots.length - 1]!.w = 28;
      shots[shots.length - 1]!.h = 18;
      shots[shots.length - 1]!.life = 0.18;
    } else if (hero === "syl" && formed) {
      fire("player", player, player.facing, 560, 0.85 * dmgPhys(), color, -90);
      fire("player", player, player.facing, 560, 0.85 * dmgPhys(), color, 0);
      fire("player", player, player.facing, 560, 0.85 * dmgPhys(), color, 90);
    } else if (hero === "tito") {
      fire("player", player, player.facing, 500, (formed ? 1.3 : 1) * dmgPhys(), "#ff8a2a", 0, formed ? 2 : 0);
      const sh = shots[shots.length - 1]!;
      sh.w = formed ? 24 : 16;
      sh.h = formed ? 16 : 12;
    } else if (hero === "mari") {
      const arc = formed ? [-70, 70] : [-110];
      for (const vy of arc) {
        fire("player", player, player.facing, 430, 1.1 * dmgPhys(), "#8fe4ff", vy, 0);
        const sh = shots[shots.length - 1]!;
        sh.w = 18;
        sh.h = 18;
        sh.life = 1.1;
      }
    } else if (hero === "pia") {
      fire("player", player, player.facing, 420, (formed ? 1.9 : 1.5) * dmgPhys(), "#c0c8d4", 0, formed ? 1 : 0);
      const sh = shots[shots.length - 1]!;
      sh.w = 20;
      sh.h = 16;
    } else if (hero === "lumen") {
      const sp = formed ? [-70, 0, 70] : [0];
      for (const vy of sp) fire("player", player, player.facing, 700, (formed ? 0.85 : 1.05) * dmgPhys(), "#ffee6a", vy, 1);
    } else if (hero === "osso") {
      fire("player", player, player.facing, 500, dmgPhys(), "#f4efe4", 0, formed ? 3 : 1);
    } else if (hero === "lena" && formed) {
      fire("player", player, player.facing, 480, 1.15 * dmgPhys(), "#c4373a");
    } else {
      fire("player", player, player.facing, 540, dmgPhys(), color);
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
      const kind = lastKill && lastKill !== "boss" && lastKill !== "candle" && lastKill !== "chest" ? lastKill : "skel";
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
    atkT = Math.max(0, atkT - dt);
    formCd = Math.max(0, formCd - dt);
    skillCd = skillCd.map((c) => Math.max(0, c - dt));
    coyote = Math.max(0, coyote - dt);
    buffer = Math.max(0, buffer - dt);
    cutLock = Math.max(0, cutLock - dt);
    if (toastT > 0) toastT -= dt;
    fullToast = Math.max(0, fullToast - dt);
    for (const b of buffs) b.left -= dt;
    buffs = buffs.filter((b) => b.left > 0);

    const hold = readHold();
    if (wantPotion || (hold.potion && !prevPotion)) quick();
    wantPotion = false;
    prevPotion = hold.potion;
    meleeCd = Math.max(0, meleeCd - dt);
    if (wantMelee || (hold.melee && !prevMelee)) meleeAttack();
    wantMelee = false;
    prevMelee = hold.melee;
    if (wantJump || (hold.jump && !prevJump)) buffer = 0.13;
    if (wantForm || (hold.form && !prevForm)) activateForm();
    wantJump = false;
    wantForm = false;
    prevJump = hold.jump;
    prevForm = hold.form;
    if (hold.attack) playerAttack();
    for (let k = 0; k < 4; k++) {
      if (wantSkill[k] || (hold.s[k] && !prevSkill[k])) useSkill(k);
      wantSkill[k] = false;
      prevSkill[k] = hold.s[k]!;
    }

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
    if (dashT > 0) {
      dashT -= dt;
      player.vx = player.facing * 1150;
      const dmgDash = 4.6 * dmgPhys();
      const sd = SKILLS[save.hero][1]!;
      for (const a of actors) {
        if (a.dead || a.ally || inert(a)) continue;
        if (player.x + player.w + 16 > a.x && player.x - 16 < a.x + a.w && player.y + player.h > a.y && player.y < a.y + a.h) {
          hurtFoe(a, dmgDash, sd.color);
          fx.push({ kind: "wave", x: a.x + a.w / 2, y: a.y + a.h / 2, t: 0, max: 0.4, color: sd.color, r: 70, dir: 0 });
          shake = 8;
          hitStop = 0.08;
          dashT = 0;
          player.vx = player.facing * 200;
          break;
        }
      }
    }
    player.phase += dt * (4 + Math.abs(player.vx) / 50);

    if (hasBuff("ward")) iframe = Math.max(iframe, 0.1);
    const bat = formed && save.hero === "lena";
    const skull = formed && (save.hero === "osso" || save.hero === "mari");
    if (formed && save.hero === "pia") iframe = Math.max(iframe, 0.1);
    if (formed && save.hero === "tito") {
      auraT -= dt;
      if (auraT <= 0) {
        auraT = 0.45;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        fx.push({ kind: "wave", x: px, y: py, t: 0, max: 0.4, color: "#ff7a2a", r: 110, dir: 0 });
        for (const a of foesNear(px, py, 115, 90)) hurtFoe(a, 1.1 * dmgMagic(), "#ff7a2a");
      }
    }
    let g = player.vy < 0 ? G_RISE : G_FALL;
    if (player.vy < 0 && Math.abs(player.vy) < 80) g *= 0.48;
    if (bat) g *= 0.32;
    if (skull) g *= 0.4;
    player.vy += g * dt;
    if (bat && hold.jump) player.vy -= 980 * dt;
    if (skull && hold.jump) player.vy -= 640 * dt;
    if (player.vy > TERM) player.vy = TERM;
    if (bat) player.vy = Math.max(-300, Math.min(360, player.vy));
    if (skull) player.vy = Math.max(-320, player.vy);
    if (dashT > 0) player.vy = 0;

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
    // teto de altura: o herói nunca sai da tela em super-pulos/voos
    const ceilY = (GROUND - 7) * TILE;
    if (player.y < ceilY) {
      player.y = ceilY;
      if (player.vy < 0) player.vy = 0;
    }
    if (hit.grounded && !wasGround && lastVy > 620 && formed && save.hero === "pia") {
      const px = player.x + player.w / 2;
      const py = player.y + player.h;
      fx.push({ kind: "wave", x: px, y: py, t: 0, max: 0.5, color: "#c0c8d4", r: 150, dir: 0 });
      for (const a of foesNear(px, py, 150, 90)) hurtFoe(a, 3 * dmgMagic(), "#c0c8d4");
      shake = 9;
    }
    lastVy = player.vy;
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
    if ((hit.spike || touchesSpike(player, level)) && iframe <= 0) hurtPlayer(player.x + (player.facing > 0 ? 40 : -40), 1, false);
    if (player.y > level.rows * TILE) hurtPlayer(player.x, 1, false);

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
          if (player.hp < maxHp()) player.hp = Math.min(maxHp(), player.hp + 1 + bonusBoost());
          audio.pickup();
          showToast("Lanterna acesa. O rolo lembra daqui.");
        }
      }
    }

    if (!cine && screen === "play") {
      for (const a of actors) {
        if ((!a.boss && !a.mini) || a.dead || seenCine.has(Math.round(a.x))) continue;
        if (Math.abs(a.x - player.x) < 640) {
          seenCine.add(Math.round(a.x));
          cine = a;
          lines = a.boss ? bossIntro(level.world) : miniIntro(level.world);
          lineIndex = 0;
          screen = "talk";
          afterTalk = "play";
          player.vx = 0;
          burst(a.x + a.w / 2, a.y + a.h, WORLDS[level.world]?.accent ?? "#e0b15a", 16, 200);
          shake = 8;
          audio.setBoss(true);
          emit();
          break;
        }
      }
    }

    for (const a of actors) {
      if (a.dead) {
        if (a.dyT > 0) a.dyT -= dt;
        continue;
      }
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
        } else if (a.behavior === "boss") {
          bossAI(a, dx, dt);
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

      if (!a.ally && !inert(a) && a.behavior !== "boss" && (a.behavior === "shoot" || a.behavior === "still" || a.kind === "golem" || a.kind === "cherub")) {
        if (a.cd <= 0 && Math.abs(dx) < 460 && Math.abs(player.y - a.y) < 180) {
          a.cd = a.behavior === "still" ? 1.5 : 1.9;
          a.facing = dx >= 0 ? 1 : -1;
          fire("foe", a, a.facing, 220, (level?.world ?? 0) >= 5 ? 2 : 1, a.kind === "snowman" ? "#bfe6ff" : a.kind === "cherub" ? "#ffe9a0" : "#e08a3a", 0);
        }
      }

      if (a.kind === "candle" && overlaps(player, a)) {
        a.dead = true;
        if (player.hp < maxHp()) player.hp = Math.min(maxHp(), player.hp + 1 + bonusBoost());
        audio.pickup();
        burst(a.x, a.y, "#e0b15a", 6, 70);
      } else if (a.kind === "chest" && overlaps(player, a)) {
        openChest(a);
      } else if (!a.ally && a.touch > 0 && iframe <= 0 && overlaps(player, a)) {
        hurtPlayer(a.x + a.w / 2, a.boss || a.mini ? 2 : (level?.world ?? 0) >= 5 ? 2 : 1);
      }
    }

    for (let i = loot.length - 1; i >= 0; i--) {
      const lt = loot[i]!;
      lt.age += dt;
      lt.vy = Math.min(TERM, lt.vy + 1500 * dt);
      const lh = moveBody(lt, level, dt, 0);
      if (lh.grounded) lt.vx *= 0.8;
      if (lt.y > level.rows * TILE) {
        loot.splice(i, 1);
        continue;
      }
      if (lt.age > 0.5 && overlaps(player, lt)) {
        if (addToBag(lt.item)) {
          audio.loot(lt.item.rarity);
          showToast(lootLine(lt.item));
          burst(lt.x + 10, lt.y + 10, RARITY_COLOR[lt.item.rarity]!, 8, 90);
          loot.splice(i, 1);
          persist();
        } else if (fullToast <= 0) {
          fullToast = 2.2;
          showToast(`Mochila cheia (${BAG_SIZE} blocos). Descarte algo (C).`);
        }
      }
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]!;
      s.life -= dt;
      if (s.seek) {
        const tx = player.x + player.w / 2 - (s.x + s.w / 2);
        const ty = player.y + player.h / 2 - (s.y + s.h / 2);
        const dd = Math.hypot(tx, ty) || 1;
        const k2 = 1 - Math.exp(-2.2 * dt);
        s.vx += ((tx / dd) * 210 - s.vx) * k2;
        s.vy += ((ty / dd) * 210 - s.vy) * k2;
      }
      if (s.home && !s.home.dead) {
        const tx = s.home.x + s.home.w / 2 - (s.x + s.w / 2);
        const ty = s.home.y + s.home.h / 2 - (s.y + s.h / 2);
        const d = Math.hypot(tx, ty) || 1;
        const sp = 520;
        // só corrige a mira enquanto o alvo está à frente; passou do alvo, segue em linha reta
        if (tx * Math.sign(s.vx || 1) <= 0) s.home = null;
        const k = s.home ? 1 - Math.exp(-5 * dt) : 0;
        s.vx += ((tx / d) * sp - s.vx) * k;
        s.vy += ((ty / d) * sp - s.vy) * k;
      }
      if (s.home) burst(s.x + s.w / 2, s.y + s.h / 2, s.color, 1, 30);
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
          hurtPlayer(s.x, s.dmg);
          shots.splice(i, 1);
        }
        continue;
      }
      for (const a of actors) {
        if (a.dead || a.ally || inert(a) || s.hit.has(a)) continue;
        if (!overlaps(s, a)) continue;
        a.hp -= crit(s.dmg);
        a.hurt = 0.08;
        s.hit.add(a);
        burst(a.x + a.w / 2, a.y + a.h / 2, s.color, 5, 90);
        audio.hit();
        shotImpact(s, a);
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

    if (screen !== "play") emit();
  }

  const BOSS_PATTERNS: string[][] = [
    ["spread", "aimed"],
    ["dash", "aimed", "spread"],
    ["slam", "spread", "dash"],
    ["rain", "aimed", "slam"],
    ["summon", "homing", "rain"],
    ["dash", "rain", "spread"],
    ["spread", "slam", "homing"],
    ["slam", "aimed", "summon"],
    ["homing", "rain", "dash"],
    ["spread", "slam", "summon", "rain", "homing", "dash"],
  ];

  function foeShot(x: number, y: number, vx: number, vy: number, color: string, life = 1.6, seek = false) {
    shots.push({ x, y, w: 14, h: 12, vx, vy, life, color, dmg: (level?.world ?? 0) >= 3 ? 2 : 1, foe: true, pierce: 0, hit: new Set(), seek });
    if (shots.length > 60) shots.splice(0, shots.length - 60);
  }

  function bossAI(a: Actor, dx: number, dt: number) {
    if (!level) return;
    const w = level.world;
    const frac = a.hp / a.maxHp;
    const rage = frac < 0.5 ? 1.35 : 1;
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h * 0.4;
    const accent = WORLDS[w]?.accent ?? "#e08a3a";
    a.facing = dx >= 0 ? 1 : -1;
    const near = Math.abs(dx) < 720;
    if (a.dashT > 0) {
      a.dashT -= dt;
      a.vx = a.facing * a.speed * 3.4;
    } else {
      a.vx = near ? a.facing * (a.speed + w * 8) * (a.mini ? 0.8 : 1) * (Math.abs(dx) < 90 ? 0.2 : 1) : 0;
    }
    if (a.hop <= 0 && wasGroundActor(a)) {
      a.vy = -620;
      a.hop = (a.mini ? 2.4 : 2.0) / rage;
    } else a.hop -= dt;
    if (a.slamT > 0) {
      a.slamT -= dt;
      if (a.slamT <= 0) {
        for (const dir of [-1, 1]) foeShot(cx + dir * 30, a.y + a.h - 26, dir * 270, 0, accent, 1.8);
        shake = 9;
        audio.skill(2);
      }
    }
    if (a.cd > 0 || !near) return;
    const list = BOSS_PATTERNS[Math.min(9, w)]!;
    const usable = a.mini ? list.slice(0, 2) : list;
    const pat = usable[a.seq++ % usable.length]!;
    a.cd = (a.mini ? 2.3 : 1.7) / rage;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    if (pat === "spread") {
      const n = frac < 0.5 ? 5 : 3;
      for (let i = 0; i < n; i++) foeShot(cx + a.facing * 30, cy, a.facing * 250, (i - (n - 1) / 2) * 80, accent);
    } else if (pat === "aimed") {
      const ang = Math.atan2(py - cy, px - cx);
      const k = frac < 0.5 ? 2 : 1;
      for (let i = 0; i < k; i++) foeShot(cx, cy, Math.cos(ang + (i - (k - 1) / 2) * 0.18) * 300, Math.sin(ang + (i - (k - 1) / 2) * 0.18) * 300, accent);
    } else if (pat === "dash") {
      a.dashT = 0.55;
    } else if (pat === "slam") {
      a.vy = -760;
      a.slamT = 0.82;
    } else if (pat === "rain") {
      const n = frac < 0.5 ? 7 : 5;
      for (let i = 0; i < n; i++) foeShot(px + (i - (n - 1) / 2) * 62, py - 330 - Math.random() * 60, 0, 300, accent, 1.8);
    } else if (pat === "homing") {
      foeShot(cx, cy - 20, a.facing * 120, -90, accent, 3.2, true);
      if (frac < 0.5) foeShot(cx, cy - 20, -a.facing * 120, -90, accent, 3.2, true);
    } else if (pat === "summon") {
      const live = actors.filter((o) => !o.dead && !o.boss && !o.mini && !o.ally && !inert(o)).length;
      if (live < 4) {
        const pool = POOLS[Math.min(9, w)] ?? POOLS[0]!;
        const kind = pool.find((k) => k !== "boss") ?? "imp";
        const m = spawnActor(kind, Math.floor(cx / TILE) + a.facing * 2, GROUND);
        m.xp = Math.round(m.xp * 0.4);
        actors.push(m);
        burst(m.x + m.w / 2, m.y + m.h / 2, accent, 12, 140);
      }
    }
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
      if (o.dead || o.ally || inert(o) || o === a) continue;
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
    const first = !level.bonus && save.next <= idx + 1;
    if (!level.bonus && save.next < idx + 2) save.next = Math.min(MAIN_LEVELS + 1, idx + 2);
    gainXp(level.bonus ? 160 + level.world * 30 : 50 + idx * 4);
    clears += 1;
    clearText = clearLine(save.hero, clears);
    audio.fanfare();
    persist();
    if (first && idx === MAIN_LEVELS - 1) {
      lines = ending();
      lineIndex = 0;
      screen = "talk";
      afterTalk = "ending";
    } else if (first && idx === 24) {
      lines = midEnding();
      lineIndex = 0;
      screen = "talk";
      afterTalk = "map";
    } else {
      screen = "clear";
    }
    emit();
  }

  function doRespawn() {
    if (!level) return;
    actors = blueprint.filter((a) => !(a.kind === "chest" && opened.has(Math.round(a.x)))).map((a) => ({ ...a }));
    buffs = [];
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
      s: [touch.s1 || down("KeyU") || down("Digit1"), touch.s2 || down("KeyI") || down("Digit2"), touch.s3 || down("KeyO") || down("Digit3"), touch.s4 || down("KeyP") || down("Digit4")],
      potion: touch.potion || down("KeyQ"),
      melee: touch.melee || down("KeyH") || down("KeyX"),
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
    const ky = 1 - Math.exp(-3.4 * dt);
    const dz = 30;
    const dyc = ty - camY;
    const ty2 = Math.abs(dyc) > dz ? camY + dyc - Math.sign(dyc) * dz : camY;
    camX += (tx - camX) * kx;
    camY += (ty2 - camY) * ky;
    shake = Math.max(0, shake - dt * 16);
  }

  /** linha do aviso de drop: nome, espaço, tamanho e o que ele melhora em relação ao equipado */
  function lootLine(it: Item): string {
    const b = baseOf(it);
    if (b.slot === "potion") return `${itemName(it)} · consumível (${itemSize(it)} bl.)`;
    const cmp = compareItem(it, save.equip);
    let tag = "";
    if (cmp) {
      const sum = Object.values(cmp.diff).reduce((a, v) => a + (v ?? 0), 0);
      tag = !cmp.current ? " · espaço livre, equipe!" : sum > 0 ? " · melhor que o equipado" : sum < 0 ? " · pior que o equipado" : "";
    }
    return `${itemName(it)} · ${SLOT_NAME[b.slot]} · ${modText(it)}${tag}`;
  }

  function gearLook(): GearLook {
    const eq = save.equip;
    const out = {} as GearLook;
    for (const k of EQUIP_KEYS) out[k] = eq[k] ? { base: eq[k]!.base, rarity: eq[k]!.rarity, color: baseOf(eq[k]!).color, fam: baseOf(eq[k]!).fam, acc: baseOf(eq[k]!).acc } : null;
    return out;
  }

  function paintList(): Paint[] {
    const list: Paint[] = [];
    for (const a of actors) {
      if (a.dead && a.dyT <= 0) continue;
      list.push({
        ref: a,
        x: a.x,
        y: a.y,
        w: a.w,
        h: a.h,
        vx: a.vx,
        vy: a.vy,
        speed: Math.max(1, a.speed),
        // o monstro olha para onde anda (nunca de costas); chefes e parados olham para o herói
        facing: !a.boss && a.behavior !== "still" && Math.abs(a.vx) > 14 ? (a.vx > 0 ? 1 : -1) : a.facing,
        phase: a.phase,
        kind: a.kind,
        hero: save.hero,
        form: false,
        hurt: a.hurt > 0,
        ally: a.ally,
        world: level?.world ?? 0,
        attack: 0,
        fly: a.behavior === "fly",
        dying: a.dead ? 1 - Math.max(0, a.dyT) / 0.45 : 0,
        mini: a.mini,
      });
    }
    if (screen === "play" || screen === "pause" || screen === "char" || screen === "dead" || screen === "clear" || screen === "talk") {
      list.push({
        ref: player,
        x: player.x,
        y: player.y,
        w: player.w,
        h: player.h,
        vx: player.vx,
        vy: player.vy,
        speed: 268,
        facing: player.facing,
        phase: player.phase,
        kind: "hero",
        hero: save.hero,
        form: formT > 0,
        gear: gearLook(),
        hurt: iframe > 0 && screen === "play",
        ally: false,
        world: level?.world ?? 0,
        attack: Math.max(0, Math.min(1, atkT / 0.18)),
      });
    }
    return list;
  }

  function draw(dt: number) {
    const playing =
      screen === "play" ||
      screen === "pause" ||
      screen === "char" ||
      screen === "dead" ||
      screen === "clear" ||
      (screen === "talk" && level !== null);
    const door = exitRect();
    const open = !actors.some((a) => a.boss && !a.dead);
    renderer.render({
      level: playing ? level : attract,
      camX,
      camY,
      focus: playing ? { x: player.x + player.w / 2, y: player.y + player.h / 2, vy: player.vy, facing: player.facing, grounded: wasGround } : null,
      shake,
      t: clock,
      playing,
      actors: playing ? paintList() : [],
      shots: shots.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, color: s.color, vx: s.vx, foe: s.foe, el: s.el })),
      sparks,
      exit: playing && door ? { x: door.x, y: door.y, w: door.w, h: door.h, open } : null,
      lit,
      attractHero: selected,
      fx,
      flash: flashT,
      cam: playing
        ? {
            t: reelTime,
            moving: Math.min(1, Math.abs(player.vx) / 240),
            boss: (() => {
              const b = actors.find((a) => (a.boss || a.mini) && !a.dead);
              return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null;
            })(),
            cine: cine ? { x: cine.x + cine.w / 2, y: cine.y + cine.h / 2 } : null,
          }
        : undefined,
      loot: playing ? loot.map<LootPaint>((l) => ({ x: l.x + l.w / 2, y: l.y + l.h / 2, color: l.item.rarity > 0 ? RARITY_COLOR[l.item.rarity]! : baseOf(l.item).color, rarity: l.item.rarity, t: l.t, slot: baseOf(l.item).slot, fam: baseOf(l.item).fam, acc: baseOf(l.item).acc ?? baseOf(l.item).color })) : [],
    });

    if (screen === "cast" || screen === "title" || screen === "char") {
      document.querySelectorAll<HTMLCanvasElement>("[data-hero-preview]").forEach((node) => {
        const id = node.dataset.heroPreview as HeroId;
        if (HERO_IDS.includes(id)) renderer.previewHero(node, id, clock, new URLSearchParams(location.search).has("pvf"), screen === "char" ? gearLook() : undefined);
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
    for (const f of fx) f.t += dt;
    fx = fx.filter((f) => f.t < f.max);
    flashT = Math.max(0, flashT - dt * 1.6);
    // o tremor decai em qualquer tela (antes só decaía jogando: ficava tremendo no portal/telas de fim)
    shake = Math.max(0, shake - dt * 16);
    if (screen !== "play") {
      hitStop = 0;
      // botões de toque desmontam fora do jogo e podem não soltar: garante que nada fica pressionado
      if (screen !== "dead") for (const k of Object.keys(touch) as Action[]) touch[k] = false;
    }

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
      audio.setMusic(true, screen === "title" || screen === "help" || screen === "cast" ? "menu" : "play");
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
      } else if ((e.code === "KeyC" || e.code === "KeyB" || e.code === "Tab") && !e.repeat && (screen === "play" || screen === "pause" || screen === "char")) {
        e.preventDefault();
        if (screen === "char") api.closeChar();
        else api.openChar();
      } else if (e.code === "Escape" && screen === "char") {
        api.closeChar();
      } else if ((e.code === "Enter" || e.code === "Space") && screen === "talk" && down) {
        e.preventDefault();
        bridge.advance();
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
    gl: renderer.ok,
    destroy() {
      alive = false;
      renderer.destroy();
      window.removeEventListener("keydown", downL);
      window.removeEventListener("keyup", upL);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", vis);
      const probe = window as unknown as { __controlsTest?: unknown };
      delete probe.__controlsTest;
    },
    openMode(hero: HeroId | null) {
      audio.ui();
      pendingHero = hero;
      modeFrom = screen;
      screen = "mode";
      emit();
    },
    setMode(m: number) {
      audio.ui();
      const mode = Math.max(0, Math.min(4, Math.floor(m)));
      if (pendingHero) {
        const h = pendingHero;
        pendingHero = null;
        api.newGame(h);
        save.mode = mode;
        persist();
        return;
      }
      save.mode = mode;
      persist();
      screen = modeFrom === "pause" ? "pause" : "map";
      emit();
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
      const total = MAIN_LEVELS + 10;
      if (index0 < 0 || index0 >= total) return;
      if (index0 < MAIN_LEVELS) {
        if (index0 + 1 > save.next) return;
      } else if (save.next - 1 < (index0 - MAIN_LEVELS + 1) * 5) return;
      afterTalk = "play";
      loadLevel(index0);
      const world = level?.world ?? 0;
      const fresh: Snap["lines"] = [];
      if (index0 < MAIN_LEVELS && world > 0 && (save.seen & (1 << world)) === 0) {
        fresh.push(...worldIntro(world));
        save.seen |= 1 << world;
        persist();
      }
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
      cine = null;
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
    openChar() {
      if (screen === "char") return;
      charFrom = screen;
      screen = "char";
      audio.ui();
      emit();
    },
    closeChar() {
      if (screen !== "char") return;
      screen = charFrom === "play" || charFrom === "pause" || charFrom === "map" || charFrom === "clear" ? charFrom : "map";
      if (screen === "play") {
        prevJump = true;
        prevForm = true;
        buffer = 0;
      }
      audio.ui();
      persist();
      emit();
    },
    allocate(id: StatKey, n = 1) {
      const k = Math.min(n, save.points);
      if (k <= 0 || !STAT_KEYS.includes(id)) return;
      save.alloc[id] += k;
      save.points -= k;
      audio.ui();
      persist();
      emit();
    },
    respec() {
      let sum = 0;
      for (const k of STAT_KEYS) {
        sum += save.alloc[k];
        save.alloc[k] = 0;
      }
      save.points += sum;
      player.hp = Math.min(player.hp, maxHp());
      audio.ui();
      persist();
      emit();
    },
    equipItem(uid: number) {
      const i = save.bag.findIndex((x) => x.uid === uid);
      if (i < 0) return;
      const it = save.bag[i]!;
      const slot = equipKeyFor(it, save.equip);
      if (!slot) return;
      const old = save.equip[slot];
      save.bag.splice(i, 1);
      if (old && !canFit(save.bag, old)) {
        save.bag.splice(i, 0, it);
        showToast("Sem espaço na mochila para trocar.");
        emit();
        return;
      }
      save.equip[slot] = it;
      if (old) save.bag.push(old);
      player.hp = Math.min(player.hp, maxHp());
      audio.pickup();
      persist();
      emit();
    },
    unequip(slot: EquipKey) {
      const it = save.equip[slot];
      if (!it) return;
      if (!canFit(save.bag, it)) {
        showToast("Mochila cheia.");
        emit();
        return;
      }
      save.equip[slot] = null;
      save.bag.push(it);
      player.hp = Math.min(player.hp, maxHp());
      audio.ui();
      persist();
      emit();
    },
    useItem(uid: number) {
      consume(uid);
      emit();
    },
    discardItem(uid: number) {
      const i = save.bag.findIndex((x) => x.uid === uid);
      if (i < 0) return;
      save.bag.splice(i, 1);
      audio.ui();
      persist();
      emit();
    },
    quickPotion() {
      quick();
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
      if (down && (action === "s1" || action === "s2" || action === "s3" || action === "s4")) wantSkill[Number(action[1]) - 1] = true;
      if (down && action === "potion") wantPotion = true;
      if (down && action === "melee") wantMelee = true;
      if (down) audio.unlock();
    },
    backTitle() {
      if (screen === "mode" && !pendingHero) {
        screen = "map";
        emit();
        return;
      }
      pendingHero = null;
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
    // modo de teste: ?qa=<fase 0-24>&hero=<ivo|lena|osso|syl>
    const q = new URLSearchParams(location.search);
    const h = q.get("hero");
    const hid: HeroId = (HERO_IDS as readonly string[]).includes(h ?? "") ? (h as HeroId) : "ivo";
    save = emptySave(hid);
    save.next = 51;
    const lvq = Number(q.get("lv"));
    if (lvq > 1) {
      save.level = Math.min(MAX_LEVEL, lvq);
      save.points = 0;
    }
    selected = hid;
    const idx = Math.max(0, Math.min(MAIN_LEVELS + 9, Number(q.get("qa")) || 0));
    loadLevel(idx);
    const at = Number(q.get("at"));
    const lv = level as Level | null;
    if (q.has("at") && lv) {
      const col = at < 0 ? lv.cols + at : at;
      player.x = col * TILE;
      player.y = (GROUND - 1) * TILE;
      camX = Math.max(0, player.x - 200);
    }
    screen = "play";
  }

  const probe = {
    getYaw: () => (player.facing > 0 ? 0 : Math.PI),
    getSpeed: () => player.vx,
    getX: () => player.x,
    getCols: () => level?.cols ?? 0,
    getFoes: () => actors.filter((a) => !a.dead && !a.ally && !inert(a)).length,
    setGear: (ids: string, rarity: number) => {
      for (const k of EQUIP_KEYS) save.equip[k] = null;
      for (const id of ids.split(",").filter(Boolean)) {
        const it = makeItem(id, rarity as 0 | 1 | 2 | 3, 3, Math.random);
        const key = equipKeyFor(it, save.equip);
        if (key) save.equip[key] = it;
      }
    },
    getLoot: () => loot.length,
    dropShow: (ids: string, rarity: number) => {
      const list = ids.split(",").filter(Boolean).map((id) => makeItem(id, rarity as 0 | 1 | 2 | 3, 3, Math.random));
      list.forEach((item, i) => loot.push({ x: player.x + 90 + i * 70, y: player.y - 10, w: 20, h: 20, vx: 0, vy: 0, item, age: 0, t: i }));
    },
    killAll: () => {
      for (const a of actors) if (!a.dead && !a.ally && !inert(a) && !a.boss) killActor(a);
    },
    warpToLoot: () => {
      const l = loot[0];
      if (l) {
        player.x = l.x;
        player.y = l.y - 20;
        player.vy = 0;
      }
      return loot.length;
    },
    info: () => ({ lvl: save.level, points: save.points, hp: player.hp, bagUsed: bagUsed(save.bag), screen }),
    getBag: () => save.bag.length,
    giveItems: (n: number) => {
      for (let i = 0; i < n; i++) {
        const kinds = ["pot", "staff", "plate", "ring", "sword", "elx_fury", "bow", "orb"];
        addToBag(makeItem(kinds[i % kinds.length]!, (i % 4) as 0 | 1 | 2 | 3, 3, Math.random));
      }
    },
    setKeys: (codes: string[]) => {
      qa = new Set(codes);
    },
    setSteer: (_v: number) => {},
  };
  (window as unknown as { __controlsTest?: typeof probe }).__controlsTest = probe;

  bridge.advance = () => api.advanceDialogue();

  emit();
  requestAnimationFrame(frame);
  return api;
}
