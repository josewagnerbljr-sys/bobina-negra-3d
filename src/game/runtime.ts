import { createAudio } from "./audio";
import {
  bossIntro,
  clearLine,
  deathLine,
  ending,
  ENT,
  entDef,
  heroById,
  MODES,
  midEnding,
  REALM_PREFACE,
  REGIONS,
  miniIntro,
  MINI_NAMES,
  POOLS,
  prologue,
  reelWorld,
  REEL_NAMES,
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
import { createNet } from "./net";
import { COMBOS, HERO_KITS, combosKnown, SPELLS, SPELL_MAX_LV, spellUpCost, type SpellDef } from "./spells";
import { DG_NAMES, REALM_THEMES } from "./realms";
import { FORCE } from "./weather";
import { ACTIVE_MAX, ADULT_LV, BAG_MAX, FIGHT_LV, HOUND_MAX, LV_MAX, PET_NAMES, SERV_MAX, SOUL_HEROES, canFight, houndCount, isAdult, isHound, petDmg, petMaxHp, petNeed, petScale, petSlotFor, petStatBonus, petUid, petsFive, servCount, type Pet } from "./pets";
import type { BaseDef } from "./items";
import { BASES, BASE_BY_ID } from "./items";
import { allocSupreme, forgeFuse, forgeUpgrade, socketGem, baseOf, bagUsed, canFit, compareItem, countPotions, equipKeyFor, itemName, itemSize, makeItem, modText, peekUid, rewardItem, rollDrops, RARITY_COLOR, SLOT_NAME } from "./items";
import { derive, derivedLines, totalStats, type Derived } from "./stats";
import type { GearLook } from "../engine/models";
import { CH, DG, LV, OW_ORIGIN_X, diffOf, glacier, setDungeon, floorElev, PORTALS_W, POOL_NAME, biomeAt, blockersNear, chunkAt, levelPortal, poolsNear, setLevel, styleOf, wallsNear, type Prop, type Spawn } from "./openworld";
import { createRenderer, type Fx, type LootPaint, type Paint, type Spark } from "./render3d";
import { G_FALL, G_RISE, JUMP_V, TERM, moveBody, stepInfo, overlaps, touchesSpike, type Body } from "./physics";
import { clearSave, emptySave, loadMute, loadSave, writeMute, writeSave, type Save } from "./save";
import {
  BAG_SIZE,
  EQUIP_KEYS,
  GROUND,
  HERO_IDS,
  CAM_MODES,
  Tile,
  MAIN_LEVELS,
  OPEN_INDEX,
  OPEN_Z,
  bonusUnlocked,
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
  type OpenHud,
  type NpcHud,
  type Rarity,
  type StatKey,
} from "./types";

const STEP = 1 / 60;

type Actor = Body & {
  el?: number;
  npc?: { id: string; role: string; name: string };
  garb?: number;
  /** morador em trabalho agora */
  wk?: boolean;
  body?: HeroId;
  outfit?: GearLook;
  home?: { x: number; z: number; tx: number; tz: number };
  /** rotina de trabalho do NPC */
  jb?: { k: string; st: number; t: number; wp: { x: number; z: number }[]; hit: number };
  /** companheiro: id do Pet; efeito visual (1 inferno, 2 nefelin, 3 sombra) */
  pet?: string;
  pfx?: number;
  petCd?: number;
  /** alma: tipo do monstro; tempo de vida; monstro portador de alma; recarga da submissão */
  soulKind?: Kind;
  life?: number;
  soulC?: boolean;
  ice?: boolean;
  subCd?: number;
  vz?: number;
  room?: number;
  look?: Kind;
  name?: string;
  zOff: number;
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
  /** mundo aberto: direção do corpo, id de geração, estado de IA */
  yaw?: number;
  oid?: string;
  ai?: number;
};

type Loot = Body & { item: Item; age: number; t: number; el?: number };

type Shot = Body & {
  life: number;
  color: string;
  dmg: number;
  foe: boolean;
  pierce: number;
  hit: Set<Actor>;
  home?: Actor | null;
  vz?: number;
  seek?: boolean;
  el?: string;
};

/** elemento de cada herói: define o visual dos tiros e poderes */
const ELEMENT: Record<string, string> = { ivo: "lunar", lena: "blood", osso: "spirit", syl: "nature", tito: "fire", mari: "water", pia: "stone", lumen: "lightning", kael: "lunar", nyx: "spirit", brann: "water", skadi: "fire" };

export type Runtime = {
  gl: boolean;
  destroy: () => void;
  newGame: (hero: HeroId) => void;
  openMode: (hero: HeroId | null) => void;
  setMode: (m: number) => void;
  continueGame: () => void;
  pickHero: (hero: HeroId) => void;
  enterReel: (index0: number) => void;
  playOpen: () => void;
  interact: () => void;
  netHost: () => Promise<string>;
  netJoin: (code: string) => Promise<string>;
  netFinish: (code: string) => Promise<void>;
  netClose: () => void;
  npcBuy: (i: number) => void;
  spellBuy: (id: number) => void;
  spiritBuy: (id: string) => void;
  spellEquip: (id: number, slot: number) => void;
  npcSell: (uid: number) => void;
  npcQuest: (tier?: number) => void;
  npcQuestAbandon: () => void;
  npcClose: () => void;
  advanceDialogue: () => void;
  skipDialogue: () => void;
  openChar: () => void;
  openPets: () => void;
  closePets: () => void;
  petToggle: (id: string) => void;
  petStore: (id: string, uid: number) => void;
  petTake: (id: string, uid: number) => void;
  petEquip: (id: string, uid: number) => void;
  petUnequip: (id: string, slot: number) => void;
  closeChar: () => void;
  allocate: (id: StatKey, n?: number) => void;
  respec: () => void;
  equipItem: (uid: number) => void;
  unequip: (slot: EquipKey) => void;
  useItem: (uid: number) => void;
  discardItem: (uid: number) => void;
  forgeUpgrade: (uid: number) => void;
  forgeFuse: (uidA: number, uidB: number) => void;
  forgeSocket: (uidA: number, uidGem: number) => void;
  forgeAlloc: (uid: number, key: "str" | "int" | "dex" | "wis" | "rec") => void;
  quickPotion: () => void;
  resume: () => void;
  pause: () => void;
  toggleMute: () => void;
  cycleCam: () => void;
  camRot: (d: number) => void;
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
  let camMode = (() => { try { const v = Number(localStorage.getItem("bn_cam")); return v >= 0 && v <= 4 && localStorage.getItem("bn_cam") !== null ? v : 3; } catch { return 3; } })();
  let padName = "";
  let padPrev: boolean[] = [];
  const padHold: Record<Action, boolean> = { left: false, right: false, up: false, down: false, jump: false, attack: false, form: false, s1: false, s2: false, s3: false, s4: false, potion: false, melee: false };
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
  let swingT = 0;
  let formT = 0;
  let formCd = 0;
  let airJumps = 0;
  let wasGround = false;
  let stepVis = 0;
  let dustT = 0;
  const dust = (x: number, y: number, n: number, up: number) => {
    for (let i = 0; i < n; i++) {
      sparks.push({ x: x + (Math.random() - 0.5) * 16, y, vx: (Math.random() - 0.5) * 90, vy: -up * (0.3 + Math.random()), life: 0.3 + Math.random() * 0.25, max: 0.55, color: "#cdbfa6", r: 2 + Math.random() * 2.2 } as (typeof sparks)[number]);
    }
  };
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
    up: false,
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
  let mana = 0;
  let comboN = 0;
  let comboT = 0;
  let meleeMax = 0.4;
  let wantMelee = false;
  let prevMelee = false;
  let cine: Actor | null = null;
  let seenCine = new WeakSet<object>();
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
    vz?: number;
  } = {
    x: 64,
    y: 400,
    z: 0,
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
  let curRoom = -1;
  /** meia-profundidade andável nas mansões (px) */
  let ZW = 1.8 * TILE;
  let portalT = 0;
  let spawnWorld: number | null = null;
  const deep = () => Boolean(level?.rooms || level?.open);
  const zd = (a: Body, b: Body) => Math.abs((a.z ?? 0) - (b.z ?? 0));
  let skillCd = [0, 0, 0, 0];
  let prevSkill = [false, false, false, false];
  const wantSkill = [false, false, false, false];
  let dashT = 0;
  let rollT = 0;
  let rollCd = 0;
  let lastJumpAt = -9;
  let flashT = 0;

  const dxToPlayer = (z: { c: number; w: number }, pc: number) => z.c + z.w / 2 - pc;
  function updateRisers(dt: number) {
    const rs = level?.risers;
    if (!rs || !level) return;
    const pc = (player.x + player.w / 2) / TILE;
    for (const z of rs) {
      let want = 0;
      if (z.mode === 0) {
        const dx = z.c + z.w / 2 - pc;
        want = dx > -4 && dx < 11 ? z.h : 0;
      } else {
        const ph = Math.sin(reelTime * 1.25 + z.ph);
        want = ph > 0.1 ? z.h : 0;
      }
      let tgt = want;
      if (tgt > z.col) {
        // não sobe em cima de ninguém
        const fl = z.f ?? GROUND;
        const top = (fl - tgt) * TILE;
        const x0 = z.c * TILE - 2;
        const x1 = (z.c + z.w) * TILE + 2;
        const bodies: Body[] = [player, ...actors.filter((a) => !a.dead)];
        for (const b of bodies) {
          if (b.x + b.w > x0 && b.x < x1 && b.y + b.h > top - 6 && b.y < fl * TILE) { tgt = z.col; break; }
        }
      }
      const pv = z.vis;
      z.vis += Math.max(-5 * dt, Math.min(5 * dt, tgt - z.vis));
      if (Math.abs(z.vis - pv) > 0.02 && Math.random() < 0.35 && Math.abs(dxToPlayer(z, pc)) < 14) dust((z.c + z.w / 2) * TILE, (z.f ?? GROUND) * TILE - 2, 1, 60);
      const nc = Math.max(0, Math.min(z.h, Math.round(z.vis)));
      if (nc < z.col || (nc > z.col && tgt >= nc)) z.col = nc;
    }
  }

  function skillUnlocked(i: number) {
    return allSkills || save.level >= SKILL_LV[i]!;
  }

  /* ---- atributos / buffs ---- */
  /** dificuldade efetiva: com 5 cães o mundo sobe 2 níveis acima do herói */
  const dEff = (r: number) => diffOf(r) + (petsFive(save.pets) ? 4 : 0);
  function D(): Derived {
    return derive(totalStats(save.hero, save.alloc, save.equip, petStatBonus(save.pets)), save.level);
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

  const inert = (a: Actor) => a.kind === "candle" || a.kind === "chest" || Boolean(a.npc);

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
    if (level?.open) return actors.filter((a) => !a.dead && !a.ally && !inert(a) && Math.hypot(a.x + a.w / 2 - cx, (a.z ?? 0) - (player.z ?? 0)) < rx && Math.abs(a.y + a.h / 2 - cy) < ry + 80);
    return actors.filter((a) => !a.dead && !a.ally && !inert(a) && Math.abs(a.x + a.w / 2 - cx) < rx && Math.abs(a.y + a.h / 2 - cy) < ry && zd(a, player) < TILE * 1.15);
  }

  /** magia equipada no slot i (ou null: poder do herói) */
  function slotSpell(i: number) {
    const id = save.slot?.[i] ?? -1;
    if (id < 0 || (save.spells?.[id] ?? 0) <= 0) return null;
    return SPELLS[id]!;
  }
  function castSpell(sp: SpellDef, lv: number, i: number) {
    const d = D();
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const pw = sp.power * (1 + 0.28 * (lv - 1)) * dmgMagic();
    skillCd[i] = sp.cd * (1 - d.cdr);
    atkT = 0.3;
    if (level?.open) openAimNow();
    audio.skill(i);
    const R = (sp.kind === "quake" ? 230 : sp.kind === "drain" ? 190 : 175) * d.radius;
    const foes = () => foesNear(cx, cy, 560 * d.radius, 380 * d.radius);
    const nearestFirst = (list: Actor[]) => list.sort((a, b) => Math.hypot(a.x - cx, (a.z ?? 0) - (player.z ?? 0)) - Math.hypot(b.x - cx, (b.z ?? 0) - (player.z ?? 0)));
    switch (sp.kind) {
      case "nova2": {
        const el = ELEMENT[save.hero];
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.55, color: sp.color, r: R, dir: 0, el });
        fx.push({ kind: "blast", x: cx, y: cy, t: 0, max: 0.75, color: sp.color, r: R, dir: 0, el });
        let n = 0;
        for (const a of foesNear(cx, cy, R, R * 0.8)) {
          if (el === "lightning" && n < 6) fx.push({ kind: "bolt", x: a.x + a.w / 2, y: a.y + a.h, t: -n++ * 0.06, max: 0.4, color: sp.color, r: 0, dir: 0, el });
          hurtFoe(a, pw, sp.color);
          if (!a.boss && a.behavior !== "still") a.x += Math.sign(a.x + a.w / 2 - cx || 1) * 40;
        }
        for (const sh of shots) if (sh.foe && Math.hypot(sh.x - cx, sh.y - cy) < R) sh.life = 0;
        shake = 6;
        break;
      }
      case "bulwark": {
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.6, color: sp.color, r: R, dir: 0, el: "stone" });
        fx.push({ kind: "blast", x: cx, y: cy, t: 0, max: 0.7, color: sp.color, r: R * 0.8, dir: 0, el: "stone" });
        for (const a of foesNear(cx, cy, R, R * 0.8)) { hurtFoe(a, pw, sp.color); if (!a.boss && a.behavior !== "still") a.x += Math.sign(a.x + a.w / 2 - cx || 1) * 60; }
        iframe = Math.max(iframe, 1.6 + 0.25 * lv);
        shake = 8;
        break;
      }
      case "raise": {
        const kind = lastKill && lastKill !== "boss" && lastKill !== "candle" && lastKill !== "chest" ? lastKill : "skel";
        const c = Math.floor((player.x + player.w / 2) / TILE);
        const ally = spawnActor(kind, c, GROUND, true);
        ally.x = player.x + player.facing * 36;
        ally.y = player.y;
        ally.z = player.z;
        ally.hp = Math.max(4, ally.maxHp);
        ally.maxHp = ally.hp;
        actors.push(ally);
        fx.push({ kind: "pillar", x: ally.x + ally.w / 2, y: ally.y + ally.h, t: 0, max: 0.8, color: sp.color, r: 0, dir: 0, el: "spirit" });
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.6, color: sp.color, r: 90, dir: 0, el: "spirit" });
        break;
      }
      case "homing": {
        const t = nearestFirst(foesNear(cx, cy, 600, 300))[0] ?? null;
        shots.push({ x: cx - 9 + player.facing * 14, y: cy - 9, w: 18, h: 18, vx: player.facing * 420, vy: -90, life: 1.8, color: sp.color, dmg: pw, foe: false, pierce: sp.id === 4 ? 2 : 0, hit: new Set(), home: t, z: player.z, el: sp.id === 4 ? "fire" : ELEMENT[save.hero] });
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.35, color: sp.color, r: 40, dir: player.facing });
        break;
      }
      case "fan":
        for (const vy of [-150, -75, 0, 75, 150]) fire("player", player, player.facing, 560, pw * 0.5, sp.color, vy, 1);
        fx.push({ kind: "slash", x: cx, y: cy, t: 0, max: 0.3, color: sp.color, r: 120, dir: player.facing });
        break;
      case "chain": {
        const list = nearestFirst(foesNear(cx, cy, 520, 300)).slice(0, 5);
        list.forEach((a, k) => {
          fx.push({ kind: "bolt", x: a.x + a.w / 2, y: a.y + a.h, t: -k * 0.09, max: 0.4, color: sp.color, r: 0, dir: 0, el: "lightning" });
          hurtFoe(a, pw * (1 - k * 0.08), sp.color);
        });
        shake = 4;
        break;
      }
      case "ice":
      case "quake":
      case "drain": {
        const el = sp.kind === "ice" ? "water" : sp.kind === "quake" ? "stone" : ELEMENT[save.hero];
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.55, color: sp.color, r: R, dir: 0, el });
        if (sp.kind === "quake") fx.push({ kind: "blast", x: cx, y: cy, t: 0, max: 0.75, color: sp.color, r: R, dir: 0, el: "stone" });
        let n = 0;
        for (const a of foesNear(cx, cy, R, R * 0.8)) {
          if (n++ < 6) fx.push({ kind: "pillar", x: a.x + a.w / 2, y: a.y + a.h, t: -n * 0.05, max: 0.6, color: sp.color, r: 0, dir: 0, el });
          hurtFoe(a, pw, sp.color);
          if (!a.boss && a.behavior !== "still") a.x += Math.sign(a.x + a.w / 2 - cx || 1) * (sp.kind === "quake" ? 70 : 34);
        }
        if (sp.kind === "drain" && n > 0) player.hp = Math.min(maxHp(), player.hp + Math.min(3, 0.5 * n));
        for (const sh of shots) if (sh.foe && Math.hypot(sh.x - cx, sh.y - cy) < R) sh.life = 0;
        shake = sp.kind === "quake" ? 10 : 5;
        break;
      }
      case "dash": {
        dashT = 0.17;
        iframe = Math.max(iframe, 0.35);
        fx.push({ kind: "slash", x: cx, y: cy, t: 0, max: 0.3, color: sp.color, r: 150, dir: player.facing });
        const t = nearestFirst(foesNear(cx, cy, 200, 120))[0];
        if (t) hurtFoe(t, pw, sp.color);
        break;
      }
      case "heal":
        player.hp = Math.min(maxHp(), player.hp + sp.power + 0.6 * lv);
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.7, color: sp.color, r: 70, dir: 0 });
        burst(cx, cy, sp.color, 14, 120);
        break;
      case "ward":
        iframe = Math.max(iframe, sp.power + 0.7 * lv);
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.7, color: sp.color, r: 80, dir: 0 });
        break;
      case "haste":
        buffs.push({ kind: "haste", left: sp.power + 2.5 * lv });
        fx.push({ kind: "wave", x: cx, y: cy, t: 0, max: 0.5, color: sp.color, r: 60, dir: 0 });
        break;
      case "meteor": {
        const list = nearestFirst(foes()).slice(0, 5);
        list.forEach((a, k) => {
          fx.push({ kind: "blast", x: a.x + a.w / 2, y: a.y + a.h, t: -k * 0.12, max: 0.7, color: sp.color, r: 120, dir: 0, el: "fire" });
          hurtFoe(a, pw, sp.color);
        });
        shake = 9;
        break;
      }
      case "screen": {
        const hit = foes();
        fx.push({ kind: "nova", x: cx, y: cy, t: 0, max: 1.0, color: sp.color, r: 640 * d.radius, dir: 0, el: ELEMENT[save.hero] });
        if (ELEMENT[save.hero] === "lightning") for (let k = 0; k < 9; k++) fx.push({ kind: "bolt", x: cx + (Math.random() - 0.5) * 900, y: cy + 60, t: -k * 0.07, max: 0.45, color: sp.color, r: 0, dir: 0, el: "lightning" });
        if (ELEMENT[save.hero] === "fire") for (let k = 0; k < 7; k++) fx.push({ kind: "blast", x: cx + (Math.random() - 0.5) * 800, y: cy + 20, t: -k * 0.08, max: 0.6, color: "#ff8a2a", r: 110, dir: 0, el: "fire" });
        for (const a of hit) {
          fx.push({ kind: "pillar", x: a.x + a.w / 2, y: a.y + a.h, t: -Math.random() * 0.25, max: 0.9, color: sp.color, r: 0, dir: 0, el: ELEMENT[save.hero] });
          hurtFoe(a, pw, sp.color);
        }
        for (const sh of shots) if (sh.foe) sh.life = 0;
        shake = 16;
        hitStop = 0.14;
        flashT = 1;
        iframe = Math.max(iframe, 0.6);
        break;
      }
    }
  }

  function useSkill(i: number) {
    if (!level || screen !== "play" || !skillUnlocked(i) || skillCd[i]! > 0) return;
    const spx = slotSpell(i);
    const mc = manaCost(i, spx);
    if (mana < mc) { showToast("Sem mana."); return; }
    mana -= mc;
    if (spx) { castSpell(spx, save.spells[spx.id]!, i); return; }
    // kit da classe do herói: cada um dos 8 luta de um jeito (cone, cadeia, dreno, servos, escudo, meteoros…)
    const kit = HERO_KITS[save.hero]?.[i];
    if (kit) { castSpell(kit, 1 + Math.floor((save.level - 1) / 8), i); return; }
    const def = SKILLS[save.hero][i]!;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const d = D();
    skillCd[i] = SKILL_CD[i]! * (1 - d.cdr);
    atkT = 0.3;
    if (level.open) openAimNow();
    audio.skill(i);
    if (i === 0) {
      // unitário perseguidor
      let best: Actor | null = null;
      let bd = 640;
      for (const a of actors) {
        if (a.dead || a.ally || inert(a)) continue;
        const dist = Math.hypot(a.x + a.w / 2 - cx, a.y + a.h / 2 - cy);
        const dxf = (a.x + a.w / 2 - cx) * player.facing;
        const front = level?.open ? dist < 560 : dxf > 20 && dxf < 460 && Math.abs(a.y + a.h / 2 - cy) < 110 && zd(a, player) < TILE * 1.6;
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
        z: player.z,
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
  function maxMana() {
    const st = totalStats(save.hero, save.alloc, save.equip);
    return Math.round(40 + 6 * (st.int + st.wis) + save.level * 2);
  }
  const manaCost = (i: number, sp: SpellDef | null) => (sp ? Math.round(6 + sp.cd * 3 + sp.power * 2) : [6, 10, 16, 40][i]!);
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

  function nearBoss() {
    let best: Actor | undefined;
    let bd = 1e9;
    for (const a of actors) {
      if ((!a.boss && !a.mini) || a.dead) continue;
      const d = Math.hypot(a.x - player.x, level?.open ? (a.z ?? 0) - (player.z ?? 0) : 0);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  function makeSnap(): Snap {
    const world = level ? reelWorld(level.index) : WORLDS[0]!;
    const nb = nearBoss();
    const boss = nb && Math.abs(nb.x - player.x) < 1500 ? nb : undefined;
    const stats = totalStats(save.hero, save.alloc, save.equip);
    const d = D();
    return {
      screen,
      hasSave,
      hero: save.hero,
      selectedHero: selected,
      next: save.next,
      bonusOpen: bonusUnlocked(save.next),
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
      mana,
      maxMana: maxMana(),
      reel: level ? level.index + 1 : 0,
      reelName: DG.on ? DG_NAMES[DG.kind]! : level?.name ?? "",
      npc: screen === "npc" ? npcHud() : undefined,
      open: level?.open
        ? (() => {
            const k = Math.min(MAIN_LEVELS - 1, Math.max(0, save.next - 1));
            let pw: { x: number; z: number } = PORTALS_W[k]!;
            let tname = REEL_NAMES[k] ?? "";
            const lay = LV.on ? LV.lay : null;
            let map: OpenHud["map"];
            if (lay) {
              const got = save.parts[LV.realm] ?? 0;
              const wxp = g2w(player.x + player.w / 2);
              const wzp = player.z ?? 0;
              let best = 1e12;
              pw = lay.portal;
              tname = got === 7 ? "Portal do próximo reino" : "";
              lay.parts.forEach((m, i) => {
                if (got & (1 << i)) return;
                const d = Math.hypot(m.x - wxp, m.z - wzp);
                if (d < best) { best = d; pw = m; tname = m.name; }
              });
              map = {
                R: lay.R,
                places: lay.places.map((pl) => ({ x: pl.x, z: pl.z, k: pl.kind, n: pl.name })),
                marks: lay.parts.map((m, i) => ({ x: m.x, z: m.z, n: m.name, got: Boolean(got & (1 << i)) })),
                portal: { x: lay.portal.x, z: lay.portal.z, open: got === 7 },
              };
            }
            const vx = w2g(pw.x) - (player.x + player.w / 2);
            const vz = pw.z - (player.z ?? 0);
            const sy = Math.sin(ow.yaw);
            const cy = Math.cos(ow.yaw);
            return {
              region: REEL_NAMES[ow.region] ?? "",
              wx: Math.round(g2w(player.x) / TILE),
              wz: Math.round((player.z ?? 0) / TILE),
              night: ow.night,
              hazard: ow.hz,
              target: tname,
              talk: ow.talk?.npc ? `${ow.talk.npc.name}` : ow.sub ? "fera" : undefined,
              talkLabel: ow.talk?.npc ? (ow.talk.npc.role === "pup" ? "Adotar" : ow.talk.npc.role === "soul" ? "Amarrar alma" : "Conversar") : ow.sub ? "Submeter" : undefined,
              gold: save.gold,
              parts: LV.on ? partsGot(LV.realm) : 0,
              map,
              dist: Math.round(Math.hypot(vx, vz) / TILE),
              rel: Math.atan2(vx * cy + vz * sy, vx * sy - vz * cy),
            };
          })()
        : undefined,
      worldName: level ? (level.open ? (DG.on ? `${DG_NAMES[DG.kind]} · Andar ${DG.floor}` : LV.on ? `Reino ${LV.realm + 1}: ${REEL_NAMES[LV.realm] ?? ""}` : "Mundo Aberto") : !level.bonus && level.index < MAIN_LEVELS ? (REGIONS.find((r) => level!.index >= r.from && level!.index <= r.to)?.name ?? world.name) : world.name) : "",
      bonus: Boolean(level?.bonus),
      bossAlive: Boolean(boss),
      bossName: nb && boss ? (nb.boss ? (level && level.index < MAIN_LEVELS ? REALM_THEMES[level.index]!.boss : world.boss) : (nb.name ?? MINI_NAMES[level?.world ?? 0] ?? "Mini-chefe")) : "",
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
      net: net.status(),
      mute,
      clearText,
      time: reelTime,
      best: level ? (save.best[level.index] ?? 0) : 0,
      hint: hint && screen === "play" && reelTime < 9,
      progress: level ? Math.max(0, Math.min(1, (player.x + player.w) / (level.cols * TILE))) : 0,
      skills: SKILLS[save.hero].map((sd, i) => { const sp = slotSpell(i); const kt = HERO_KITS[save.hero]?.[i]; return sp ? { name: sp.name, kind: sp.tag, key: SKILL_KEYS[i]!, cd: skillCd[i]!, cdMax: sp.cd * (1 - d.cdr), lv: save.spells[sp.id]!, unlocked: true, icon: "📜", color: sp.color } : { name: kt?.name ?? sd.name, kind: kt?.tag ?? SKILL_KINDS[i]!, key: SKILL_KEYS[i]!, cd: skillCd[i]!, cdMax: (kt?.cd ?? SKILL_CD[i]!) * (1 - d.cdr), lv: SKILL_LV[i]!, unlocked: skillUnlocked(i), icon: kt?.icon ?? "✦", color: kt?.color ?? sd.color }; }),
      bag: save.bag,
      pets: save.pets,
      equip: save.equip,
      bagUsed: bagUsed(save.bag),
      potions: countPotions(save.bag),
      buffs: buffs.map((b) => ({ kind: b.kind, left: b.left })),
      derived: derivedLines(d),
      levelupFresh: save.points > 0,
      camMode,
      pad: padName,
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

  function spawnActor(kind: Kind, c: number, foot: number, ally = false, mini = false, look?: Kind, name?: string): Actor {
    const world = spawnWorld ?? level?.world ?? 0;
    const def = entDef(kind, world, mini, save.mode);
    if (mini && look && ENT[look]) {
      // mini-chefe: um monstro do reino em tamanho gigante, com nome próprio
      const ld = ENT[look];
      def.w = Math.max(48, Math.round(ld.w * 1.5));
      def.h = Math.max(64, Math.round(ld.h * 1.5));
    }
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
      zOff: ((c * 7 + foot * 3) % 9) / 9 - 0.5,
      atkT: 0,
      dashT: 0,
      slamT: 0,
      dyT: 0,
      look: mini && !ally ? look : undefined,
      name: mini && !ally ? name : undefined,
    };
    actor.z = (level?.rooms || level?.open) && !ally ? actor.zOff * ZW * 1.5 : 0;
    return actor;
  }

  function loadLevel(index0: number) {
    level = buildLevel(index0);
    ZW = (level.open ? OPEN_Z : 1.8) * TILE;
    portalT = 0;
    lit = new Set();
    shots = [];
    sparks = [];
    actors = level.ents.map((e) => { const a = spawnActor(e.kind, e.c, e.foot, false, Boolean(e.mini), e.look, e.name); a.room = e.room; return a; });
    loot = [];
    buffs = [];
    opened.clear();
    blueprint = actors.map((a) => ({ ...a, hit: undefined }) as Actor);
    const spawnX = level.spawn.c * TILE + 8;
    const spawnY = level.spawn.foot * TILE - player.h;
    player.x = spawnX;
    player.y = spawnY;
    player.z = 0;
    curRoom = -1;
    player.vx = 0;
    player.vy = 0;
    player.hp = maxHp();
    mana = maxMana();
    player.facing = 1;
    respawn = { x: spawnX, y: spawnY };
    if (level.open) resetOpen();
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
    seenCine = new WeakSet<object>();
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
    audio.setWorld(level.open ? 2 : !level.bonus && level.index < MAIN_LEVELS ? REALM_THEMES[level.index]!.music : level.world, level.index % 5, level.bonus);
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

  function dropLoot(items: Item[], x: number, y: number, z = 0) {
    items.forEach((item, i) => {
      loot.push({ el: level?.open ? elT(g2w(x), z, 0) : 0, x: x - 10, y: y - 10, w: 20, h: 20, vx: (i - (items.length - 1) / 2) * 90 + (Math.random() - 0.5) * 30, vy: -380 - Math.random() * 120, item, age: 0, t: Math.random() * 6, z });
    });
    if (loot.length > 40) loot.splice(0, loot.length - 40);
  }

  function killActor(a: Actor) {
    if (a.dead) return;
    a.dead = true;
    a.hp = 0;
    a.dyT = 0.45;
    if (a.oid) markDone(a.oid);
    burst(a.x + a.w / 2, a.y + a.h / 2, "#f4e4c8", 12, 160);
    audio.hit();
    shake = a.boss || a.mini ? 10 : 4;
    if (!a.ally && !inert(a)) {
      lastKill = a.kind === "boss" ? lastKill : a.kind;
      gainXp(a.xp);
      petsXp(a.xp);
      if (a.soulC && level?.open) spawnSoul(g2w(a.x + a.w / 2), a.z ?? 0, a.kind, a.name ?? ENT_NAME(a.kind));
      if (DG.on && a.oid === "dg:boss" && DG.floor % 5 === 0) grantNefelin();
      save.kills++;
      addGold((1 + dEff(a.room ?? 0) * 0.5 + Math.random() * 3) * (a.boss ? 20 : a.mini ? 8 : 1));
      if (a.oid === "castle:boss") grantPart(2, "guardião do castelo derrotado");
      showToast(`+${Math.round(a.xp * D().xp)} XP`);
      if (a.boss) showToast("A saída destrancou. O carimbo rangeu.");
      if (a.mini) showToast("Mini-chefe caiu! Tesouro no chão.");
      const src = a.boss ? "boss" : a.mini ? "mini" : "mob";
      const drops = rollDrops(src, level?.open ? (DG.on ? Math.min(9, Math.floor(DG.diff / 6)) : REALM_THEMES[a.room ?? 0]!.amb) : level?.world ?? 0, D().luck * (MODES[save.mode]?.luck ?? 1), Math.random);
      if (drops.length) dropLoot(drops, a.x + a.w / 2, a.y + a.h / 2, a.z ?? 0);
    }
  }

  const RESPAWN = 180;
  const markDone = (id: string) => { ow.done.set(id, ow.clock); };
  const isDone = (id: string) => { if (ow.opened.has(id)) return true; const t = ow.done.get(id); return t !== undefined && ow.clock - t < RESPAWN; };
  const partsGot = (realm: number) => { const m = save.parts[realm] ?? 0; return (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1); };
  function grantPart(i: number, why: string) {
    if (!LV.on) return;
    const m = save.parts[LV.realm] ?? 0;
    if (m & (1 << i)) return;
    save.parts[LV.realm] = m | (1 << i);
    persist();
    audio.fanfare();
    shake = 6;
    showToast(`Peça ${i + 1} do enigma conquistada (${why})! ${partsGot(LV.realm)}/3` + (partsGot(LV.realm) === 3 ? " O portal pode ser aberto." : ""));
  }
  function addGold(n: number) {
    if (n <= 0) return;
    save.gold += Math.round(n);
  }
  function openChest(a: Actor) {
    a.dead = true;
    a.dyT = 0.25;
    opened.add(Math.round(a.x));
    if (a.oid) { ow.opened.add(a.oid); if (/^m\d+c2$/.test(a.oid)) grantPart(1, "baú no alto da mansão"); }
    addGold(18 + (LV.on ? dEff(LV.realm) * 6 : 0) + Math.random() * 20);
    audio.chest();
    shake = 3;
    const items = rollDrops("chest", level?.world ?? 0, D().luck, Math.random);
    dropLoot(items, a.x + a.w / 2, a.y, a.z ?? 0);
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
    } else if (b.spell !== undefined) {
      const sp = SPELLS[b.spell]!;
      const lv = save.spells[sp.id] ?? 0;
      if (lv >= SPELL_MAX_LV) { showToast(`${sp.name} já está no máximo.`); return false; }
      save.spells[sp.id] = lv + 1;
      if (lv === 0) { const free = save.slot.indexOf(-1); if (free >= 0) save.slot[free] = sp.id; }
      showToast(lv === 0 ? `Grimório lido: magia ${sp.name} aprendida!` : `${sp.name} evoluiu para o nível ${lv + 1}!`);
      audio.fanfare();
      burst(player.x + player.w / 2, player.y + 14, sp.color, 18, 140);
      return true;
    } else if (b.buff) {
      const dur = b.dur ?? (b.buff === "ward" ? 8 : 25);
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
    if (level?.open && owner === "player") {
      shots.push({ x: origin.x + origin.w / 2 - 7 + aim.x * 20, y: origin.y + origin.h * 0.35, w: 14, h: 8, vx: aim.x * speed, vy, vz: aim.z * speed, life: 0.95, color, dmg, foe: false, pierce, hit: new Set(), z: (origin.z ?? 0) + aim.z * 20, el: ELEMENT[save.hero] });
      if (shots.length > 70) shots.splice(0, shots.length - 70);
      return;
    }
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
      z: origin.z ?? 0,
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
    swingT = 0.3;
    const w = save.equip.weapon;
    const id = w ? baseOf(w).id : "none";
    const base = MELEE[id] ?? MELEE.none!;
    // combos: golpes em sequência rápida avançam pela lista (13 no total, liberados por nível)
    const known = combosKnown(save.level);
    comboN = comboT > 0 ? (comboN + 1) % known : 0;
    const cb = COMBOS[comboN]!;
    const def = { ...base, dmg: base.dmg * cb.dmg, reach: base.reach * cb.reach, hits: base.hits + cb.hits, knock: base.knock * cb.knock };
    comboT = base.cd + 0.75;
    if (comboN > 0) showToast(`Combo ${comboN + 1}: ${cb.name}`);
    const tierK = w ? (1 + 0.14 * (w.tier - 1)) * (1 + 0.28 * w.rarity) : 1;
    const dmg = def.dmg * tierK * dmgPhys();
    meleeMax = def.cd * (hasBuff("haste") ? 0.8 : 1) * Math.max(0.6, D().atkCd / 0.36);
    meleeCd = meleeMax;
    atkT = 0.28;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const color = w ? RARITY_COLOR[w.rarity]! : "#f4e4c8";
    const reach = def.reach;
    const opn = Boolean(level.open);
    if (opn) openAimNow(220);
    fx.push({ kind: "slash", x: cx + (opn ? aim.x * 14 : player.facing * 10), y: cy, z: opn ? (player.z ?? 0) + aim.z * 14 : undefined, t: 0, max: 0.26, color, r: reach * def.arc, dir: player.facing });
    audio.skill(1);
    let hit = 0;
    for (const a of actors) {
      if (a.dead || a.ally || inert(a)) continue;
      const ax = a.x + a.w / 2;
      if (opn) {
        const ddx = ax - cx;
        const ddz = (a.z ?? 0) - (player.z ?? 0);
        const dd = Math.hypot(ddx, ddz) || 1;
        if (dd - a.w / 2 > reach || (ddx * aim.x + ddz * aim.z) / dd < Math.cos(Math.min(2.5, def.arc * 1.7)) || Math.abs(a.y + a.h / 2 - cy) > 70 + a.h / 2) continue;
      } else {
      const front = (ax - cx) * player.facing > -14;
      if (!front || Math.abs(ax - cx) - a.w / 2 > reach || Math.abs(a.y + a.h / 2 - cy) > 56 + a.h / 2) continue;
      }
      if (hit >= def.hits) break;
      hit += 1;
      hurtFoe(a, dmg, color);
      if (!a.boss && !a.mini && a.behavior !== "still") {
        a.x += (opn ? aim.x : player.facing) * def.knock * 0.4;
        if (opn) a.z = (a.z ?? 0) + aim.z * def.knock * 0.4;
        a.vy = Math.min(a.vy, -140);
      }
    }
    for (const sh of shots) {
      if (!sh.foe) continue;
      const sx = sh.x + sh.w / 2;
      if ((opn ? Math.hypot(sx - cx, (sh.z ?? 0) - (player.z ?? 0)) < reach + 10 : (sx - cx) * player.facing > 0 && Math.abs(sx - cx) < reach + 10) && Math.abs(sh.y - cy) < 60) {
        sh.life = 0;
        burst(sh.x, sh.y, color, 5, 90);
      }
    }
    if (hit > 0) {
      shake = Math.max(shake, 3 + hit);
      hitStop = Math.max(hitStop, 0.04);
    }
    // dá um passinho à frente: o golpe tem peso
    if (opn) { player.vx += aim.x * 120; player.vz = (player.vz ?? 0) + aim.z * 120; } else player.vx += player.facing * 120;
  }

  function playerAttack() {
    if (shotCd > 0) return;
    if (level?.open) openAimNow();
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

  /* ===================== MUNDO ABERTO ILIMITADO (v10) ===================== */
  type Tele = { x: number; z: number; r: number; t: number; max: number; c: string; kind: string };
  const ow = {
    offX: 0, yaw: 0, tyaw: 0, pitch: 0.5, dist: 11, look: 4, jump: 0,
    chunks: new Set<string>(), done: new Map<string, number>(), opened: new Set<string>(), stock: new Map<string, Item[]>(), npc: null as Actor | null, talk: null as Actor | null, sub: null as Actor | null, tele: [] as Tele[],
    evT: 14, dotT: 0, clock: 0, night: 0, rwx: 8, rwz: 0, scan: 0, slow: 1, shrines: new Set<string>(),
    region: 0, inside: null as { id: string; x0: number; z0: number; x1: number; z1: number } | null, msgT: 0, relIn: 0, moving: false, iy: 0, wave: 0, hz: "", nightT: 0, blk: [] as Prop[], walls: [] as { x0: number; z0: number; x1: number; z1: number; y0?: number; y1?: number }[],
  };
  /** elevação do piso sob o herói (px): colinas, pisos e escadas */
  let pEl = 0;
  const elT = (wx: number, wz: number, cur: number) => floorElev(wx, wz, cur / TILE) * TILE;
  function snapElev() {
    pEl = elT(g2w(player.x + player.w / 2), player.z ?? 0, 0);
    player.y = GROUND * TILE - player.h - pEl;
  }
  function actorElev(a: Actor, dt: number) {
    const cur = a.el ?? 0;
    const tgt = elT(g2w(a.x + a.w / 2), a.z ?? 0, cur);
    const d = Math.max(-800 * dt, Math.min(800 * dt, tgt - cur));
    a.y -= d;
    a.el = cur + d;
  }
  let aim = { x: 0, z: 1 };
  let padCamX = 0;
  /* ---- cooperativo ponto a ponto: o amigo aparece no seu mundo (cada um simula os próprios monstros) ---- */
  type Remote = { ref: object; x: number; z: number; el: number; yaw: number; facing: number; hero: HeroId; realm: number; vx: number; phase: number; t: number; tx: number; tz: number; tel: number };
  const net = createNet();
  let remote: Remote | null = null;
  let netT = 0;
  net.onStatus(() => { if (net.status() === "connected") showToast("Amigo conectado!"); else if (net.status() === "off") { remote = null; } emit(); });
  net.onMessage((m) => {
    if (m.k !== "p") return;
    const r = remote ?? (remote = { ref: {}, x: Number(m.x), z: Number(m.z), el: Number(m.el), yaw: 0, facing: 1, hero: "ivo", realm: -1, vx: 0, phase: 0, t: 0, tx: 0, tz: 0, tel: 0 });
    r.tx = Number(m.x);
    r.tz = Number(m.z);
    r.tel = Number(m.el) || 0;
    r.yaw = Number(m.yaw) || 0;
    r.facing = Number(m.f) || 1;
    r.hero = (m.h as HeroId) ?? "ivo";
    r.realm = Number(m.r);
    r.vx = Number(m.vx) || 0;
    r.t = performance.now();
  });
  const w2g = (wx: number) => wx + OW_ORIGIN_X - ow.offX;
  const g2w = (gx: number) => gx - OW_ORIGIN_X + ow.offX;
  const angDiff = (a: number, b: number) => ((((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

  function resetOpen() {
    ow.offX = 0;
    ow.yaw = 0;
    ow.tyaw = 0;
    ow.chunks.clear();
    ow.done.clear();
    ow.opened.clear();
    ow.npc = null;
    ow.talk = null;
    ow.tele = [];
    ow.evT = 14;
    ow.dotT = 0;
    ow.clock = 0;
    ow.rwx = 8;
    ow.rwz = 0;
    ow.shrines.clear();
    ow.jump++;
    aim = { x: 0, z: 1 };
    actors = [];
  }

  /* ---------------------------------------------------------------- companheiros */
  let inGlacier = false;
  const petDead = new Map<string, number>();
  const petOf = (id?: string) => (id ? save.pets.find((p) => p.id === id) : undefined);
  const ENT_NAME = (k: Kind) => (({ hound: "Cão", imp: "Diabrete", demon: "Demônio", devil: "Capeta", wraith: "Espectro", skel: "Esqueleto", undead: "Morto-vivo", ogre: "Ogro", troll: "Troll", knight: "Cavaleiro", golem: "Golem", shade: "Sombra" }) as Record<string, string>)[k] ?? "Fera";

  function spawnPetActor(p: Pet) {
    const a = spawnActor(p.kind === "hell" ? (p.lv >= ADULT_LV || p.final ? "cerberus3" : "cerberus") : p.kind === "nefelin" ? "lupin" : p.kind === "soul" ? "thrall" : p.look, 0, GROUND, true);
    const sc = petScale(p);
    a.w = Math.round(a.w * sc);
    a.h = Math.round(a.h * sc);
    a.pet = p.id;
    a.pfx = p.kind === "nefelin" ? 2 : p.kind === "hell" ? 1 : 3;
    a.maxHp = petMaxHp(p);
    a.hp = a.maxHp;
    a.speed = 150;
    a.touch = 0;
    a.x = player.x + (Math.random() - 0.5) * 80;
    a.z = (player.z ?? 0) + 40 + Math.random() * 40;
    a.el = pEl;
    a.y = GROUND * TILE - a.h - a.el;
    a.oid = `pet:${p.id}`;
    a.name = p.name;
    actors.push(a);
  }

  function petDeath(p: Pet, a: Actor) {
    a.dead = true;
    a.dyT = 0.45;
    burst(a.x + a.w / 2, a.y + a.h / 2, "#d8c8ff", 14, 170);
    if (!isAdult(p)) {
      save.pets = save.pets.filter((x) => x !== p);
      showToast(`${p.name} não resistiu. Filhotes não renascem.`);
    } else if (!p.final) {
      p.final = true;
      petDead.set(p.id, 5);
      showToast(`${p.name} caiu... e vai renascer em sua forma final!`);
    } else {
      petDead.set(p.id, 45);
      showToast(`${p.name} caiu e volta em 45 s.`);
    }
    persist();
    emit();
  }

  function updatePets(dt: number) {
    if (!level?.open) return;
    const act = new Set<string>();
    for (const p of save.pets) if (p.active) act.add(p.id);
    for (const a of actors) if (a.pet && !a.dead && !act.has(a.pet)) { a.dead = true; a.dyT = 0; }
    const px = player.x + player.w / 2;
    const pz = player.z ?? 0;
    for (const p of [...save.pets]) {
      if (!p.active) continue;
      const wait = petDead.get(p.id);
      if (wait !== undefined) {
        if (wait - dt > 0) { petDead.set(p.id, wait - dt); continue; }
        petDead.delete(p.id);
      }
      const a = actors.find((x) => x.pet === p.id && !x.dead);
      if (!a) { spawnPetActor(p); continue; }
      a.petCd = Math.max(0, (a.petCd ?? 0) - dt);
      if (Math.hypot(a.x + a.w / 2 - px, (a.z ?? 0) - pz) > 1100) { a.x = player.x - 30; a.z = pz + 30; }
      if (a.petCd <= 0) {
        for (const f of actors) {
          if (f.dead || f.ally || inert(f) || f.touch <= 0) continue;
          if (Math.hypot(f.x + f.w / 2 - (a.x + a.w / 2), (f.z ?? 0) - (a.z ?? 0)) < 54) {
            a.hp -= 3 + dEff(f.room ?? 0) * 0.9;
            a.hurt = 0.14;
            a.petCd = 0.8;
            burst(a.x + a.w / 2, a.y + a.h / 2, "#ff8a8a", 6, 100);
            break;
          }
        }
      }
      if (a.hp <= 0) petDeath(p, a);
    }
  }

  /** 35% do XP de cada monstro vai para os companheiros ativos */
  function petsXp(xp: number) {
    for (const p of save.pets) {
      if (!p.active || p.lv >= LV_MAX) continue;
      p.xp += xp * 0.35;
      let up = false;
      while (p.lv < LV_MAX && p.xp >= petNeed(p.lv)) {
        p.xp -= petNeed(p.lv);
        p.lv += 1;
        up = true;
        if (isHound(p) && p.lv === FIGHT_LV) showToast(`${p.name} já pode lutar ao seu lado!`);
        if (isHound(p) && p.lv === ADULT_LV) showToast(`${p.name} chegou à fase adulta!`);
      }
      if (up && p.lv % 5 === 0) { const a = actors.find((x) => x.pet === p.id); if (a) { a.dead = true; a.dyT = 0; } }
    }
  }

  function addPet(kind: Pet["kind"], look: Kind, name: string, lv = 1): Pet {
    const p: Pet = { id: petUid(), kind, look, name, lv, xp: 0, final: false, active: save.pets.filter((x) => x.active).length < ACTIVE_MAX, gear: [null, null, null], bag: [] };
    save.pets.push(p);
    audio.pickup();
    showToast(`${name} agora é seu companheiro!`);
    if (petsFive(save.pets)) showToast("Cinco cães! O mundo sente seu poder: monstros 2 níveis acima.");
    persist();
    emit();
    return p;
  }

  function adoptPup(a: Actor) {
    if (houndCount(save.pets) >= HOUND_MAX) { showToast("Limite de 5 cães (inferno + celestiais)."); emit(); return; }
    const names = PET_NAMES.hell;
    addPet("hell", "cerberus", names[(save.pets.length + Math.floor(Math.random() * 7)) % names.length]!);
    if (a.oid) ow.opened.add(a.oid);
    a.dead = true;
    a.dyT = 0;
    ow.talk = null;
  }

  function grantNefelin() {
    if (save.nef & (1 << DG.kind)) return;
    if (houndCount(save.pets) >= HOUND_MAX) { showToast("Um nefelin apareceu, mas você já tem 5 cães."); return; }
    save.nef |= 1 << DG.kind;
    const names = PET_NAMES.nefelin;
    addPet("nefelin", "lupin", names[houndCount(save.pets) % names.length]!);
    showToast("Dungeon completa! Um filhote de Nefelin celestial escolheu você.");
  }

  function spawnSoul(wx: number, z: number, kind: Kind, nm: string) {
    const a = spawnActor("thrall", 0, GROUND, false);
    a.npc = { id: `soul${Date.now()}`, role: "soul", name: `Alma de ${nm}` };
    a.pfx = 3;
    a.x = w2g(wx) - a.w / 2;
    a.z = z;
    a.el = elT(wx, z, 0);
    a.y = GROUND * TILE - a.h - a.el;
    a.life = 25;
    a.hp = a.maxHp = 9999;
    a.speed = 0;
    a.touch = 0;
    a.xp = 0;
    a.behavior = "still";
    a.oid = `soul:${a.npc.id}`;
    actors.push(a);
  }

  function bindSoul(a: Actor) {
    if (servCount(save.pets) >= SERV_MAX) { showToast("Limite de 5 servos."); emit(); return; }
    if (mana < 20) { showToast("Mana insuficiente para a Amarração da Alma (20)."); emit(); return; }
    mana -= 20;
    const base = a.npc!.name.replace("Alma de ", "");
    addPet("soul", "thrall", `${PET_NAMES.soul[Math.floor(Math.random() * 3)]} ${base}`, 3 + Math.floor(dEff(LV.on ? LV.realm : 0) / 3));
    a.dead = true;
    a.dyT = 0;
    ow.talk = null;
    fx.push({ kind: "pillar", x: a.x + a.w / 2, y: a.y + a.h, t: 0, max: 0.9, color: "#b488ff", r: 0, dir: 0, el: "spirit" });
  }

  function trySubmit(a: Actor) {
    a.subCd = ow.clock + 5;
    const ch = (a.boss ? 0.2 : a.mini ? 0.4 : 0.75) + Math.min(0.15, save.level * 0.002);
    if (Math.random() < ch) {
      const look: Kind = a.kind === "boss" ? (a.look ?? "ogre") : a.kind;
      const nm = a.name ?? ENT_NAME(look);
      addPet("tamed", look, `${PET_NAMES.tamed[Math.floor(Math.random() * 3)]} ${nm}`, Math.min(40, 2 + Math.floor(dEff(a.room ?? 0) / 2) + (a.boss ? 10 : a.mini ? 5 : 0)));
      if (a.oid) markDone(a.oid);
      a.dead = true;
      a.dyT = 0.2;
      burst(a.x + a.w / 2, a.y + a.h / 2, "#ffd07a", 14, 150);
    } else {
      a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.12);
      showToast("A fera resistiu à submissão!");
      emit();
    }
  }

  let dgRet: { realm: number; x: number; z: number } | null = null;
  /** entra (ou desce) numa dungeon: mapa aberto independente do reino atual */
  function enterDungeon(kind: number, floor: number, ret?: { realm: number; x: number; z: number }) {
    if (ret) dgRet = ret;
    audio.unlock();
    setDungeon(kind, floor);
    loadLevel(OPEN_INDEX);
    const th = REALM_THEMES[50 + kind]!;
    if (level) level.world = th.amb;
    player.z = 140;
    snapElev();
    ow.rwx = 0;
    ow.rwz = 140;
    audio.setWorld(th.music, kind % 5, false);
    screen = "play";
    showToast(`${DG_NAMES[kind]} · Andar ${floor}${floor % 5 === 0 ? " — Senhor do Andar!" : ""}`);
    emit();
  }
  function exitDungeon() {
    const r = dgRet ?? { realm: 0, x: 0, z: 0 };
    api.enterReel(r.realm);
    player.x = w2g(r.x) - player.w / 2;
    player.z = r.z + 90;
    snapElev();
    ow.rwx = r.x;
    ow.rwz = r.z + 90;
    dgRet = null;
    emit();
  }

  function openAimNow(range = 560) {
    let best: Actor | null = null;
    let bd = range;
    const cx = player.x + player.w / 2;
    const cz = player.z ?? 0;
    for (const a of actors) {
      if (a.dead || a.ally || inert(a)) continue;
      const d = Math.hypot(a.x + a.w / 2 - cx, (a.z ?? 0) - cz);
      if (d < bd) { bd = d; best = a; }
    }
    if (best) {
      const d = bd || 1;
      aim = { x: (best.x + best.w / 2 - cx) / d, z: ((best.z ?? 0) - cz) / d };
      if (Math.abs(aim.x) > 0.15) player.facing = aim.x >= 0 ? 1 : -1;
    }
  }

  function openMove(hold: ReturnType<typeof readHold>, dt: number, speed: number) {
    const ix = (hold.right ? 1 : 0) - (hold.left ? 1 : 0);
    const iy = (hold.up ? 1 : 0) - (hold.down ? 1 : 0);
    const sy = Math.sin(ow.yaw);
    const cy = Math.cos(ow.yaw);
    let dx = cy * ix + sy * iy;
    let dz = sy * ix - cy * iy;
    const m = Math.hypot(dx, dz);
    const moving = m > 0.01;
    if (moving) {
      dx /= m;
      dz /= m;
      aim = { x: dx, z: dz };
      if (Math.abs(dx) > 0.2) player.facing = dx >= 0 ? 1 : -1;
    }
    ow.moving = moving;
    ow.relIn = moving ? Math.atan2(ix, iy) : 0;
    ow.iy = iy;
    const sp = moving ? speed * ow.slow : 0;
    const acc = Math.min(1, dt * (wasGround ? 12 : 5));
    if (rollT > 0) {
      player.vx = aim.x * 640;
      player.vz = aim.z * 640;
    } else if (dashT > 0) player.vz = aim.z * 1150;
    else {
      player.vx += (dx * sp - player.vx) * acc;
      player.vz = (player.vz ?? 0) + (dz * sp - (player.vz ?? 0)) * acc;
    }
    player.z = (player.z ?? 0) + (player.vz ?? 0) * dt;
  }

  /** câmera orbital: , e . ou direita do analógico giram; cada modo tem seu ângulo, distância e antecipação */
  function openCamera(dt: number) {
    const rot = ((keys.has("Period") ? 1 : 0) - (keys.has("Comma") ? 1 : 0)) * 2.1 + padCamX * 2.4;
    ow.tyaw += rot * dt;
    const mv = ow.moving && ow.iy >= 0;
    if (camMode === 0) ow.tyaw += angDiff(ow.tyaw, 0) * Math.min(1, dt * 2.2);
    else if (camMode === 1 && mv) ow.tyaw += ow.relIn * 1.5 * dt;
    else if (camMode === 3 && mv) ow.tyaw += ow.relIn * 0.9 * dt;
    else if (camMode === 2 && mv) ow.tyaw += ow.relIn * 0.5 * dt;
    ow.yaw += angDiff(ow.yaw, ow.tyaw) * (1 - Math.exp(-5 * dt));
    let foes = 0;
    for (const a of actors) if (!a.dead && !a.ally && !inert(a) && Math.hypot(a.x - player.x, (a.z ?? 0) - (player.z ?? 0)) < 520) foes++;
    const spd = Math.min(1, Math.hypot(player.vx, player.vz ?? 0) / 260);
    const tp = camMode === 0 ? [0.44, 8.6, 1.6] : camMode === 1 ? [0.42, 9.6, 2.2] : camMode === 2 ? [0.5, 9.4, 1.8] : camMode === 4 ? [1.15, 16, 0.3] : [0.46 + 0.05 * spd, 9 + Math.min(2.5, foes * 0.5) + 0.8 * spd, 1.6 + 1.0 * spd];
    if (LV.on && camMode !== 4) {
      // câmera dinâmica: mais perto do herói; sobe e abre quando há monstros, desce e olha longe ao correr, aproxima ao atacar
      const fz = Math.min(1, foes / 4);
      const base = camMode === 0 ? 7.4 : camMode === 1 ? 8.2 : camMode === 2 ? 8.6 : 8.0;
      tp[0] = 0.4 + 0.11 * fz - 0.06 * spd;
      tp[1] = base + 1.8 * fz + 1.5 * spd - (atkT > 0 ? 0.8 : 0);
      tp[2] = 0.9 + 1.2 * spd + 0.3 * fz;
    }
    // dentro de uma casa: a câmera desce para dentro, fecha o exterior e mostra só o interior
    {
      const wxp = g2w(player.x + player.w / 2);
      const wzp = player.z ?? 0;
      const ci = Math.floor(wxp / CH);
      const cj = Math.floor(wzp / CH);
      let ins: typeof ow.inside = null;
      for (let j = cj - 1; j <= cj + 1 && !ins; j++) for (let i = ci - 1; i <= ci + 1 && !ins; i++) for (const h of chunkAt(i, j).houses) if (wxp > h.rect.x0 && wxp < h.rect.x1 && wzp > h.rect.z0 && wzp < h.rect.z1) { ins = { id: h.id, ...h.rect }; break; }
      ow.inside = ins;
      if (ins) { tp[0] = 1.05; tp[1] = Math.max(5.5, Math.min(9, (ins.x1 - ins.x0) / TILE * 0.9)); tp[2] = 0.3; }
    }
    const k = 1 - Math.exp(-(ow.inside ? 3.4 : 2.4) * dt);
    ow.pitch += (tp[0]! - ow.pitch) * k;
    ow.dist += (tp[1]! - ow.dist) * k;
    ow.look += (tp[2]! - ow.look) * k;
  }

  function spawnFromSpawn(sp: Spawn) {
    if (isDone(sp.id) || actors.length > 52 || actors.some((x) => x.oid === sp.id)) return;
    spawnWorld = REALM_THEMES[sp.realm]!.amb;
    const a = spawnActor(sp.kind, 0, GROUND, false, Boolean(sp.mini), sp.look, sp.name);
    spawnWorld = null;
    a.x = w2g(sp.x) - a.w / 2;
    a.z = sp.z;
    a.el = sp.h !== undefined ? sp.h * TILE : elT(sp.x, sp.z, 0);
    a.y = GROUND * TILE - a.h - a.el - (a.behavior === "fly" ? 60 : 0);
    a.oid = sp.id;
    a.room = sp.realm;
    a.ice = sp.ice;
    a.vx = 0;
    a.vz = 0;
    if (sp.kind !== "chest" && sp.kind !== "candle") {
      const k = 1 + 0.045 * dEff(sp.realm);
      a.maxHp = Math.round(a.maxHp * k);
      a.hp = a.maxHp;
      a.xp = Math.round(a.xp * (1 + 0.06 * dEff(sp.realm)));
      if (SOUL_HEROES.has(save.hero) && level?.open && !sp.mini && sp.kind !== "boss" && Math.random() < 0.07) a.soulC = true;
    }
    actors.push(a);
  }

  const NPC_KIND: Record<string, Kind> = { merchant: "clerk", smith: "knight", witch: "witch", quest: "clerk", guard: "knight", villager: "clerk", pup: "hound", soul: "clerk" };
  const CLOTH = ["#8a5a38", "#3a5a8a", "#7a2a3a", "#4a6a3a", "#c9b27a", "#5a4a6a", "#2a2a34", "#a86a2a", "#d8d0c0", "#2f6a6a", "#8a3a8a", "#6a6a2a"];
  /** roupa própria de cada NPC: corpo, peças e cores sorteados pelo id, com tendência por ofício */
  function npcOutfit(id: string, role: string, garb: number): { body: HeroId; gear: GearLook } {
    let h = 17;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const r = (n: number, k: number) => Math.abs(Math.imul(h ^ (k * 2654435761), 1597334677) >>> 0) % n;
    const bodies: HeroId[] = ["ivo", "lena", "syl", "lumen", "ivo", "lena"];
    const out = {} as GearLook;
    for (const k of EQUIP_KEYS) out[k] = null;
    const put = (slot: (typeof EQUIP_KEYS)[number], base: string, colorIdx = r(CLOTH.length, slot.length + base.length)) => {
      const b = BASE_BY_ID[base];
      if (!b) return;
      out[slot] = { base, rarity: 0, color: CLOTH[colorIdx % CLOTH.length]!, fam: b.fam, acc: b.acc };
    };
    const pick = <T,>(l: T[], k: number) => l[r(l.length, k)]!;
    const c0 = garb % CLOTH.length;
    if (role === "smith") { put("armor", "plate", 6); put("gloves", "gauntlet", 6); put("boots", "boots_iron", 6); put("weapon", "hammer"); put("pants", "greaves", 6); }
    else if (role === "witch") { put("armor", "robe", 5); put("helmet", "hood", 5); put("cape", "cloak_dark", 6); put("weapon", "staff"); put("boots", "slippers", 5); }
    else if (role === "guard") { put("armor", pick(["plate", "cuirass"], 1), 6); put("helmet", "helm", 6); put("cape", "cape", 2); put("weapon", pick(["spear", "sword"], 2)); put("offhand", "lid", 7); put("boots", "boots_iron", 6); put("pants", "greaves", 6); }
    else if (role === "merchant") { put("armor", pick(["tunic", "vest", "robe"], 1), c0); put("cape", "cape", (c0 + 3) % CLOTH.length); if (r(2, 3)) put("helmet", pick(["cap", "tophat"], 4), (c0 + 5) % CLOTH.length); put("boots", "boots", 0); put("pants", "pants", 6); put("offhand", pick(["lantern", "tome"], 5)); }
    else {
      put("armor", pick(["tunic", "vest", "robe", "coat_ring"], 1), c0);
      put("pants", pick(["pants", "pants_leather", "pants_silk"], 2), (c0 + 4) % CLOTH.length);
      put("boots", pick(["boots", "slippers", "boots_heel"], 3), 0);
      if (r(3, 4) === 0) put("cape", pick(["cape", "cloak_dark"], 5), (c0 + 6) % CLOTH.length);
      if (r(3, 6) === 0) put("helmet", pick(["cap", "hood", "tophat"], 7), (c0 + 2) % CLOTH.length);
      if (r(5, 8) === 0) put("weapon", pick(["knife", "axe", "bow", "staff"], 9));
      if (r(6, 10) === 0) put("offhand", pick(["lantern", "quiver", "tome"], 11));
    }
    return { body: bodies[r(bodies.length, 99)]!, gear: out };
  }
  function spawnNpc(n: { id: string; role: string; name: string; x: number; z: number; garb?: number }, key: string) {
    const oid = `${key}:npc:${n.id}`;
    if (actors.some((x) => x.oid === oid) || (n.role === "pup" && isDone(oid))) return;
    const a = spawnActor(NPC_KIND[n.role] ?? "clerk", 0, GROUND, false, false, undefined, n.name);
    a.x = w2g(n.x) - a.w / 2;
    a.z = n.z;
    a.el = elT(n.x, n.z, 0);
    a.y = GROUND * TILE - a.h - a.el;
    a.oid = oid;
    a.npc = { id: n.id, role: n.role, name: n.name };
    a.garb = n.garb ?? (n.id.length * 7 + n.id.charCodeAt(n.id.length - 1)) % 12;
    if (n.role === "pup") {
      a.garb = undefined;
      a.w = Math.round(a.w * 0.55);
      a.h = Math.round(a.h * 0.55);
      a.pfx = 1;
    } else {
      const ofit = npcOutfit(n.id, n.role, a.garb!);
      a.body = ofit.body;
      a.outfit = ofit.gear;
    }
    a.facing = (n.x + n.z) % 2 > 1 ? 1 : -1;
    a.behavior = "still";
    a.touch = 0;
    a.speed = 0;
    a.hp = a.maxHp = 9999;
    a.speed = 34;
    a.vx = 0;
    a.vz = 0;
    actors.push(a);
  }

  function streamChunks() {
    const wx = g2w(player.x + player.w / 2);
    const wz = player.z ?? 0;
    const ci0 = Math.floor(wx / CH);
    const cj0 = Math.floor(wz / CH);
    const want = new Set<string>();
    for (let j = cj0 - 2; j <= cj0 + 2; j++) {
      for (let i = ci0 - 2; i <= ci0 + 2; i++) {
        const key = `${i},${j}`;
        want.add(key);
        if (ow.chunks.has(key)) continue;
        ow.chunks.add(key);
        const ch = chunkAt(i, j);
        for (const sp of ch.spawns) spawnFromSpawn(sp);
        for (const n of ch.npcs) spawnNpc(n, key);
        for (const st of ch.sites) {
          if (st.kind === "chest") spawnFromSpawn({ id: st.id, kind: "chest", x: st.x, z: st.z, realm: biomeAt(st.x, st.z).a, h: st.h });
        }
      }
    }
    // longe demais: some da cena (volta ao chegar perto de novo, a não ser que já tenha sido vencido)
    for (const key of [...ow.chunks]) {
      const [a, b] = key.split(",").map(Number);
      if (Math.abs(a! - ci0) > 3 || Math.abs(b! - cj0) > 3) {
        ow.chunks.delete(key);
        actors = actors.filter((x) => !(x.oid && x.oid.startsWith(key + ":") && !x.ally));
      }
    }
    void want;
    // respawn: monstros derrotados voltam depois de 3 minutos
    for (const key of ow.chunks) {
      const [a, b] = key.split(",").map(Number);
      for (const sp of chunkAt(a!, b!).spawns) if (ow.done.has(sp.id)) spawnFromSpawn(sp);
    }
  }

  function pushOutOf(b: { x: number; w: number; z?: number }, rad: number, elT = 0) {
    const wx = g2w(b.x + b.w / 2);
    const wz = b.z ?? 0;
    let moved = false;
    let ox = 0;
    let oz = 0;
    for (const p of ow.blk) {
      const dx = wx + ox - p.x;
      const dz = wz + oz - p.z;
      const mn = p.r + rad;
      if (Math.abs(dx) > mn || Math.abs(dz) > mn) continue;
      const d = Math.hypot(dx, dz);
      if (d < mn) {
        const k = d > 0.01 ? (mn - d) / d : 0;
        ox += d > 0.01 ? dx * k : mn;
        oz += d > 0.01 ? dz * k : 0;
        moved = true;
      }
    }
    // paredes das casas (retângulos finos)
    for (const w of ow.walls) {
      if (w.y0 !== undefined && (elT < w.y0 || elT >= w.y1!)) continue;
      const cx = Math.max(w.x0, Math.min(wx + ox, w.x1));
      const cz = Math.max(w.z0, Math.min(wz + oz, w.z1));
      const dx = wx + ox - cx;
      const dz = wz + oz - cz;
      const d = Math.hypot(dx, dz);
      if (d < rad) {
        if (d > 0.01) { ox += (dx / d) * (rad - d); oz += (dz / d) * (rad - d); }
        else { const px = Math.min(wx + ox - w.x0, w.x1 - wx - ox); const pz = Math.min(wz + oz - w.z0, w.z1 - wz - oz); if (px < pz) ox += (wx + ox < (w.x0 + w.x1) / 2 ? -1 : 1) * (px + rad); else oz += (wz + oz < (w.z0 + w.z1) / 2 ? -1 : 1) * (pz + rad); }
        moved = true;
      }
    }
    if (moved) {
      b.x += ox;
      b.z = (b.z ?? 0) + oz;
    }
  }

  const FOE_COLOR = (a: Actor) => (a.kind === "snowman" ? "#bfe6ff" : a.kind === "cherub" || a.kind === "seraph" ? "#ffe9a0" : a.kind === "devil" || a.kind === "demon" ? "#ff5a2a" : "#e08a3a");

  function fireAt(owner: "foe" | "ally", from: Actor, tx: number, tz: number, speed: number, dmg: number, color: string) {
    const fx0 = from.x + from.w / 2;
    const fz0 = from.z ?? 0;
    const d = Math.hypot(tx - fx0, tz - fz0) || 1;
    shots.push({ x: fx0 - 7, y: from.y + from.h * 0.4, w: 14, h: 8, vx: ((tx - fx0) / d) * speed, vy: 0, vz: ((tz - fz0) / d) * speed, life: 1.9, color, dmg, foe: owner === "foe", pierce: 0, hit: new Set(), z: fz0 });
    if (shots.length > 70) shots.splice(0, shots.length - 70);
  }

  /** ofício do NPC a partir do título no nome */
  function npcJob(a: Actor): string {
    const n = a.npc!.name.toLowerCase();
    if (n.startsWith("alma")) return "stall";
    if (n.startsWith("ferreiro")) return "smith";
    if (n.startsWith("lenhador")) return "wood";
    if (n.startsWith("campon")) return "farm";
    if (n.startsWith("pescador")) return "fish";
    if (n.startsWith("vigia") || n.startsWith("guarda")) return "patrol";
    if (n.startsWith("bardo")) return "bard";
    if (n.startsWith("padre")) return "priest";
    if (n.startsWith("crian") || n.startsWith("menino")) return "kid";
    if (n.startsWith("padeiro")) return "baker";
    if (n.startsWith("bot") || n.startsWith("bruxa")) return "potion";
    if (n.startsWith("ca\u00e7adora") || n.startsWith("cacadora")) return "hunt";
    const r = a.npc!.role;
    if (r === "merchant" || r === "quest" || r === "armorer" || r === "spirit" || r === "smith" || r === "witch") return "stall";
    return "stroll";
  }

  /** cada NPC tem um ofício: ferreiro martela, lenhador corta, camponês cuida da roça, vigia patrulha...
   *  à noite todos recolhem para perto de casa */
  function npcTex(a: Actor): string {
    const id = a.npc!.id;
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    const fem = Math.abs(h) % 2 === 1;
    const r = a.npc!.role;
    if (r === "guard" || r === "hunter") return fem ? "female_ranger" : "male_ranger";
    if (r === "witch") return "female_ranger";
    if (r === "smith") return "male_peasant_hood";
    return fem ? "female_peasant_hood" : "male_peasant_hood";
  }

  function npcWander(a: Actor, dt: number) {
    const az = a.z ?? 0;
    const h = (a.home ??= { x: a.x, z: az, tx: a.x, tz: az });
    const j = (a.jb ??= (() => {
      const k = npcJob(a);
      const wp: { x: number; z: number }[] = [];
      const ring = (n: number, r: number, off = 0) => { for (let i = 0; i < n; i++) { const an = off + (i / n) * 6.283; wp.push({ x: h.x + Math.cos(an) * r, z: h.z + Math.sin(an) * r }); } };
      const seed = (a.npc!.id.length * 13 + a.npc!.id.charCodeAt(a.npc!.id.length - 1)) % 7;
      if (k === "patrol") ring(4, 70, seed);
      else if (k === "farm") { for (let i = 0; i < 3; i++) wp.push({ x: h.x + (i - 1) * 26, z: h.z + (i % 2 ? 16 : -10) }); }
      else if (k === "wood") ring(2, 54, seed);
      else if (k === "stroll") { wp.push({ x: h.x, z: h.z }); ring(3, 60 + seed * 8, seed); }
      else if (k === "priest" || k === "hunt") ring(2, 46, seed);
      else if (k === "kid") ring(5, 50, seed);
      else wp.push({ x: h.x, z: h.z });
      return { k, st: seed % Math.max(1, wp.length), t: 1 + seed * 0.4, wp, hit: 0 };
    })());
    a.atkT = Math.max(0, a.atkT - dt);
    if (a.life !== undefined) { a.life -= dt; if (a.life <= 0) { a.dead = true; a.dyT = 0; return; } }
    j.t -= dt;
    j.hit -= dt;
    const px = player.x + player.w / 2;
    const near = Math.hypot(a.x + a.w / 2 - px, az - (player.z ?? 0)) < 90 || ow.talk === a || screen === "npc";
    const night = ow.night > 0.6;
    const k = j.k;
    const still = k === "smith" || k === "baker" || k === "potion" || k === "stall" || k === "bard" || k === "fish";
    const fast = k === "kid" ? 66 : k === "patrol" || k === "hunt" ? 42 : 34;
    let want = 0;
    let tx = h.x;
    let tz = h.z;
    let work = false;
    if (night) {
      want = fast;
    } else if (still) {
      work = true;
    } else {
      const w = j.wp[j.st % j.wp.length]!;
      tx = w.x; tz = w.z;
      const d0 = Math.hypot(tx - a.x, tz - az);
      if (d0 <= 8) {
        work = true;
        if (j.t <= 0) { j.t = (k === "kid" ? 1.4 : 3.5) + Math.random() * 2; j.st++; }
      } else if (j.t <= 0) want = fast;
      else work = d0 < 14;
    }
    if (near) want = 0;
    const dx = tx - a.x;
    const dz = tz - az;
    const d = Math.hypot(dx, dz) || 1;
    if (d < 8) want = 0;
    a.vx = (dx / d) * want;
    a.vz = (dz / d) * want;
    a.x += a.vx * dt;
    a.z = az + a.vz * dt;
    pushOutOf(a, 10, (a.el ?? 0) / TILE);
    if (work && !near && !night && j.hit <= 0 && a.atkT <= 0) {
      const cx = a.x + a.w / 2;
      const hy = a.y + a.h * 0.55;
      if (k === "smith") { a.atkT = 0.42; j.hit = 1.5 + Math.random(); burst(cx + a.facing * 14, hy, "#ffb347", 7, 90); }
      else if (k === "wood") { a.atkT = 0.42; j.hit = 1.3 + Math.random(); burst(cx + a.facing * 14, hy, "#b58a5a", 5, 70); }
      else if (k === "farm") { a.atkT = 0.3; j.hit = 2 + Math.random() * 1.5; burst(cx, hy + 10, "#8fbf5a", 4, 40); }
      else if (k === "bard") { j.hit = 2.2; burst(cx, hy - 20, "#ffe27a", 4, 38); }
      else if (k === "potion") { j.hit = 3 + Math.random() * 2; burst(cx, hy - 10, "#b57aff", 3, 30); }
      else if (k === "baker") { a.atkT = 0.3; j.hit = 2.4 + Math.random() * 2; }
      else j.hit = 4;
    }
    a.wk = work && !near && !night;
    if (want > 0) a.yaw = Math.atan2(a.vx, a.vz ?? 0);
    else if (near) a.yaw = Math.atan2(player.x - a.x, (player.z ?? 0) - (a.z ?? 0));
    a.el = elT(g2w(a.x + a.w / 2), a.z ?? 0, a.el ?? 0);
    a.y = GROUND * TILE - a.h - a.el;
  }

  function openAI(a: Actor, dt: number) {
    if (a.npc) { npcWander(a, dt); return; }
    if (inert(a)) return;
    const px = player.x + player.w / 2;
    const pz = player.z ?? 0;
    const ax = a.x + a.w / 2;
    const az = a.z ?? 0;
    let tx = px - ax;
    let tz = pz - az;
    let tgt: Actor | null = null;
    if (a.ally) {
      const pet = petOf(a.pet);
      let f = pet && !canFight(pet) ? null : nearestFoe(a);
      if (f && pet && Math.hypot(f.x + f.w / 2 - ax, (f.z ?? 0) - az) > 560) f = null;
      if (f) { tgt = f; tx = f.x + f.w / 2 - ax; tz = (f.z ?? 0) - az; } else { tx -= pet && !canFight(pet) ? 90 : 50; tz -= 30; }
    }
    const d = Math.hypot(tx, tz) || 1;
    const nx = tx / d;
    const nz = tz / d;
    const strong = a.boss || a.mini;
    const aggro = strong ? 780 : 540 + ow.night * 120;
    const sp = a.speed * (strong ? 0.85 : 1) * (1 + ow.night * 0.12);
    const realm = dEff(a.room ?? 0);
    const shooter = !a.ally && (a.behavior === "shoot" || a.behavior === "still" || a.kind === "golem" || a.kind === "cherub" || a.kind === "seraph" || a.kind === "witch");
    let dirx = nx;
    let dirz = nz;
    let want = 0;
    const calm = !a.ally && d > aggro;
    if (a.ally) want = d > 70 ? Math.max(90, sp) : 0;
    if (a.pet && d > 70) want = Math.min(420, Math.max(sp, d * 2.4));
    else if (calm) {
      dirx = Math.cos(a.phase * 0.35 + a.seq * 3 + realm);
      dirz = Math.sin(a.phase * 0.31 + a.seq * 2);
      want = a.behavior === "still" ? 0 : sp * 0.22;
    } else if (a.behavior === "still") want = 0;
    else if (shooter) {
      if (d < 210) { dirx = -nx; dirz = -nz; want = sp; } else if (d > 330) want = sp; else { dirx = -nz; dirz = nx; want = sp * 0.5; }
    } else {
      want = sp;
      if (a.behavior === "charge" && d < 320 && a.dashT <= 0 && a.cd <= 0) { a.dashT = 0.55; a.cd = 2.4; }
      if (a.dashT > 0) { a.dashT -= dt; want = sp * 2.7; }
      if (d < a.w * 0.5 + 18) want = 0;
    }
    const dmgBase = 1 + Math.floor(realm / 6);
    if (!calm && !a.ally && a.cd <= 0) {
      if (strong && d < 640) {
        a.cd = 2.8;
        const n = 8 + Math.min(6, Math.floor(realm / 4));
        const off = Math.random() * 6.28;
        for (let k = 0; k < n; k++) {
          const an = off + (k / n) * Math.PI * 2;
          fireAt("foe", a, ax + Math.cos(an) * 100, az + Math.sin(an) * 100, 200, dmgBase + 1, "#ff6a3a");
        }
        fx.push({ kind: "wave", x: ax, y: a.y + a.h * 0.5, z: az, t: 0, max: 0.4, color: "#ff6a3a", r: 90, dir: 0 });
      } else if (shooter && d < 470) {
        a.cd = a.behavior === "still" ? 1.5 : 1.9;
        fireAt("foe", a, px, pz, 230, dmgBase, FOE_COLOR(a));
      }
    }
    if (a.ally && tgt && a.cd <= 0 && d < (a.pet ? 84 : 380)) {
      a.cd = 0.8;
      const pet = petOf(a.pet);
      if (pet) {
        a.atkT = 0.42;
        hurtFoe(tgt, petDmg(pet, D().phys), pet.kind === "nefelin" ? "#fff0a0" : pet.kind === "hell" ? "#ff6a2a" : "#b488ff");
      } else fireAt("ally", a, tgt.x + tgt.w / 2, tgt.z ?? 0, 430, 1, "#9fd4d8");
    }
    const k = Math.min(1, dt * 6);
    a.vx = (a.vx ?? 0) + (dirx * want - (a.vx ?? 0)) * k;
    a.vz = (a.vz ?? 0) + (dirz * want - (a.vz ?? 0)) * k;
    if (a.hurt > 0 && !strong) { a.vx *= 0.5; a.vz *= 0.5; }
    a.x += a.vx * dt;
    a.z = az + a.vz * dt;
    pushOutOf(a, Math.max(10, a.w * 0.32), (a.el ?? 0) / TILE);
    if (Math.abs(a.vx) > 8) a.facing = a.vx >= 0 ? 1 : -1;
    const spd = Math.hypot(a.vx, a.vz ?? 0);
    a.yaw = spd > 14 ? Math.atan2(a.vx, a.vz ?? 0) : Math.atan2(nx, nz);
    if (a.behavior === "fly") {
      a.y = (GROUND * TILE - (a.el ?? 0)) - a.h - 70 + Math.sin(a.phase * 2) * 14;
      a.vy = 0;
    } else {
      if (a.behavior === "jump") {
        a.hop -= dt;
        if (a.y + a.h >= (GROUND * TILE - (a.el ?? 0)) - 1 && a.hop <= 0 && !calm) { a.vy = -540; a.hop = 1.2 + Math.random() * 0.5; }
      }
      a.vy = Math.min(TERM, a.vy + 3000 * dt);
      a.y += a.vy * dt;
      if (a.y + a.h > (GROUND * TILE - (a.el ?? 0))) { a.y = (GROUND * TILE - (a.el ?? 0)) - a.h; a.vy = 0; }
    }
  }

  function strikeEvent() {
    const px = player.x + player.w / 2;
    const pz = player.z ?? 0;
    const wx = g2w(px);
    const b = biomeAt(wx, pz);
    const st = styleOf(b.a);
    const r = Math.random();
    if (r < 0.5) {
      const meteor = st === "cave" || st === "gold" || st === "city";
      const bolt = st === "cloud" || st === "swamp" || st === "ice";
      const c = meteor ? "#ff7a2a" : bolt ? "#bcd8ff" : "#c8a070";
      const kind = meteor ? "meteor" : bolt ? "bolt" : "quake";
      const n = 3 + Math.floor(Math.random() * 3) + Math.floor(b.a / 8);
      showToast(meteor ? "Chuva de meteoros!" : bolt ? "Tempestade! Raios caindo." : "O chão treme! Fuja das marcas.");
      for (let i = 0; i < n; i++) {
        const an = Math.random() * 6.28;
        const rr = i === 0 ? 40 + Math.random() * 60 : 90 + Math.random() * 300;
        ow.tele.push({ x: px + (player.vx ?? 0) * 0.5 + Math.cos(an) * rr, z: pz + (player.vz ?? 0) * 0.5 + Math.sin(an) * rr, r: kind === "bolt" ? 50 : 66, t: -i * 0.18, max: 1.5, c, kind });
      }
      audio.skill(2);
    } else if (r < 0.88) {
      const pl = REALM_THEMES[b.a]!.pool;
      const n = 4 + Math.floor(Math.random() * 3) + Math.floor(b.a / 8);
      showToast("Emboscada! Eles surgiram da escuridão.");
      for (let i = 0; i < n; i++) {
        const an = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        spawnFromSpawn({ id: `amb${Math.floor(ow.clock)}:${i}`, kind: pl[i % pl.length]!, x: wx + Math.cos(an) * 400, z: pz + Math.sin(an) * 400, realm: b.a });
      }
      shake = Math.max(shake, 6);
    } else if (b.a >= 2) {
      const th = REALM_THEMES[b.a]!;
      const m = th.minis[Math.floor(Math.random() * th.minis.length)]!;
      const an = Math.random() * 6.28;
      showToast(`${m.name} vagueia por perto…`);
      spawnFromSpawn({ id: `wan${Math.floor(ow.clock)}`, kind: "boss", x: wx + Math.cos(an) * 720, z: pz + Math.sin(an) * 720, mini: true, look: m.look, name: m.name, realm: b.a });
    }
  }

  function openStep(dt: number) {
    if (!level) return;
    ow.clock += dt;
    ow.night = Math.max(0, Math.min(1, (Math.sin(ow.clock * 0.015 + 4.0) - 0.1) * 1.4));
    const px = player.x + player.w / 2;
    const pz = player.z ?? 0;
    const wx = g2w(px);
    // reancora o mundo: o mapa nunca acaba
    if (Math.abs(player.x - OW_ORIGIN_X) > 3000 * TILE) {
      const d = player.x - OW_ORIGIN_X;
      for (const a of actors) a.x -= d;
      for (const s of shots) s.x -= d;
      for (const l of loot) l.x -= d;
      player.x -= d;
      ow.offX += d;
      fx = [];
      sparks = [];
      ow.jump++;
    }
    ow.blk = blockersNear(wx, pz, 1100).slice();
    ow.walls = wallsNear(wx, pz, 900).slice();
    pushOutOf(player, 13, pEl / TILE);
    if (LV.on && LV.lay) {
      // borda do mapa: montanhas intransponíveis
      const dd = Math.hypot(wx, pz);
      const lim = LV.lay.R - 120;
      if (dd > lim) { const k = lim / dd; player.x = w2g(wx * k) - player.w / 2; player.z = pz * k; }
    }
    // streaming dos blocos
    ow.scan -= dt;
    if (ow.scan <= 0) {
      ow.scan = 0.3;
      streamChunks();
      emit();
    }
    actors = actors.filter((a) => !a.dead || a.dyT > 0);
    // perigos do terreno
    let slow = 1;
    const airborne = player.y + player.h + pEl < GROUND * TILE - 34;
    ow.hz = "";
    for (const q of poolsNear(wx, pz, 400)) {
      if (Math.hypot(wx - q.x, pz - q.z) < q.r) {
        ow.hz = POOL_NAME[q.kind];
        if (q.kind === "frost" || q.kind === "sand") slow = 0.55;
        if (!airborne) {
          ow.dotT -= dt;
          if (ow.dotT <= 0) {
            ow.dotT = 0.9;
            showToast(`Cuidado: ${POOL_NAME[q.kind]}! Saia ou pule.`);
            hurtPlayer(px + (q.x > wx ? 20 : -20), 1);
          }
        }
      }
    }
    ow.slow = slow;
    // eventos aleatórios do mapa
    ow.evT -= dt * (1 + ow.night * 0.6);
    if (ow.evT <= 0 && screen === "play") {
      ow.evT = 16 + Math.random() * 18;
      strikeEvent();
    }
    // noite: mais monstros rondando
    ow.nightT -= dt;
    if (ow.night > 0.5 && ow.nightT <= 0 && actors.length < 46) {
      ow.nightT = 7;
      const b = biomeAt(wx, pz);
      const pl = REALM_THEMES[b.a]!.pool;
      const an = Math.random() * 6.28;
      spawnFromSpawn({ id: `nt${Math.floor(ow.clock)}`, kind: pl[Math.floor(Math.random() * pl.length)]!, x: wx + Math.cos(an) * 620, z: pz + Math.sin(an) * 620, realm: b.a });
    }
    // marcações dos ataques do ambiente
    for (let i = ow.tele.length - 1; i >= 0; i--) {
      const t = ow.tele[i]!;
      t.t += dt;
      if (t.t < t.max) continue;
      ow.tele.splice(i, 1);
      const gx = w2g(t.x);
      const gz = t.z;
      const col = t.c;
      fx.push({ kind: t.kind === "bolt" ? "bolt" : "blast", x: gx, y: GROUND * TILE - 10, z: gz, t: 0, max: 0.5, color: col, r: t.r * 1.4, dir: 0, el: t.kind === "bolt" ? "lightning" : "fire" });
      burst(gx, GROUND * TILE - 14, col, 12, 160);
      shake = Math.max(shake, 5);
      if (Math.hypot(px - gx, pz - gz) < t.r + 10 && !airborne) hurtPlayer(gx, 2);
      for (const a of actors) if (!a.dead && !a.ally && !inert(a) && Math.hypot(a.x + a.w / 2 - gx, (a.z ?? 0) - gz) < t.r + 12) hurtFoe(a, 3, col);
    }
    // santuários curam e guardam o ponto de retorno
    for (const key of ow.chunks) {
      const [a, b] = key.split(",").map(Number);
      for (const st of chunkAt(a!, b!).sites) {
        if (st.kind !== "shrine" || Math.hypot(wx - st.x, pz - st.z) > 80) continue;
        ow.rwx = st.x;
        ow.rwz = st.z;
        if (!ow.shrines.has(st.id) || (player.hp < maxHp() && ow.msgT <= 0)) {
          ow.shrines.add(st.id);
          player.hp = maxHp();
    mana = maxMana();
          ow.msgT = 12;
          showToast("Santuário: vida restaurada. Você volta aqui se cair.");
          audio.pickup();
        }
      }
    }
    ow.msgT = Math.max(0, ow.msgT - dt);
    // portais próximos (até 90 tiles)
    const near: NonNullable<Level["portals"]> = [];
    if (DG.on && LV.lay) {
      const lp = LV.lay.portal;
      const gx = w2g(lp.x);
      near.push({ c: gx / TILE - 0.5, z: lp.z / TILE, realm: -1, dg: 10 });
      const ex = LV.lay.exit!;
      near.push({ c: w2g(ex.x) / TILE - 0.5, z: ex.z / TILE, realm: -1, dg: 11 });
    } else if (LV.on) {
      for (const key of ow.chunks) {
        const [ca, cb] = key.split(",").map(Number);
        for (const st of chunkAt(ca!, cb!).sites) {
          if (st.kind !== "dungeon") continue;
          const gx = w2g(st.x);
          if (Math.abs(gx - px) < 90 * TILE && Math.abs(st.z - pz) < 90 * TILE) near.push({ c: gx / TILE - 0.5, z: st.z / TILE, realm: -1, dg: Number(st.id.split(":")[2]) });
        }
      }
      const lp = levelPortal();
      if (lp && LV.realm + 1 < MAIN_LEVELS) {
        const gx = w2g(lp.x);
        if (Math.abs(gx - px) < 90 * TILE && Math.abs(lp.z - pz) < 90 * TILE) near.push({ c: gx / TILE - 0.5, z: lp.z / TILE, realm: LV.realm + 1 });
      }
    } else for (let k = 0; k < PORTALS_W.length; k++) {
      const pw = PORTALS_W[k]!;
      const gx = w2g(pw.x);
      if (Math.abs(gx - px) < 90 * TILE && Math.abs(pw.z - pz) < 90 * TILE) near.push({ c: gx / TILE - 0.5, z: pw.z / TILE, realm: k });
    }
    level.portals = near;
    // região atual
    const rg = biomeAt(wx, pz).a;
    if (rg !== ow.region) {
      ow.region = rg;
      if (!DG.on) showToast(`Região: ${REEL_NAMES[rg] ?? "?"}`);
    }
    // NPC por perto: botão Falar
    ow.talk = null;
    if (screen === "play") {
      let bd = 95;
      for (const a of actors) {
        if (!a.npc || a.dead) continue;
        const d = Math.hypot(a.x + a.w / 2 - px, (a.z ?? 0) - pz);
        if (d < bd) { bd = d; ow.talk = a; }
        if (d < 160) a.facing = px >= a.x + a.w / 2 ? 1 : -1;
      }
    }
    // guerreiros: fera enfraquecida por perto pode ser submetida
    ow.sub = null;
    if (screen === "play" && !ow.talk && !SOUL_HEROES.has(save.hero) && servCount(save.pets) < SERV_MAX) {
      let bd = 95;
      for (const a of actors) {
        if (a.dead || a.ally || inert(a) || a.hp <= 0 || a.hp / a.maxHp > 0.3 || (a.subCd ?? 0) > ow.clock) continue;
        const d = Math.hypot(a.x + a.w / 2 - px, (a.z ?? 0) - pz);
        if (d < bd) { bd = d; ow.sub = a; }
      }
    }
    updatePets(dt);
    {
      const gz = glacier(wx, pz) > 0.4;
      if (gz !== inGlacier) { inGlacier = gz; if (gz) showToast("Geleira: monstros de gelo e frio cortante."); }
    }
    // padrão de câmera/controles
    openCamera(dt);
    // fx sem profundidade ganham a do dono (ou a do herói)
    for (const f of fx) {
      if (f.z !== undefined) continue;
      const m = actors.find((a) => Math.abs(a.x + a.w / 2 - f.x) < 0.6);
      f.z = m ? (m.z ?? 0) : pz;
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
    swingT = Math.max(0, swingT - dt);
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
    mana = Math.min(maxMana(), mana + dt * (2.2 + 0.18 * totalStats(save.hero, save.alloc, save.equip).wis));
    comboT = Math.max(0, comboT - dt);
    if (wantMelee || (hold.melee && !prevMelee)) meleeAttack();
    wantMelee = false;
    prevMelee = hold.melee;
    rollT = Math.max(0, rollT - dt);
    rollCd = Math.max(0, rollCd - dt);
    if (wantJump || (hold.jump && !prevJump)) {
      buffer = 0.13;
      // esquiva rolando (mundo aberto): toque duplo em pular enquanto anda dá 0,3 s de invulnerabilidade
      if (level?.open) {
        if (ow.clock - lastJumpAt < 0.3 && rollCd <= 0 && ow.moving) {
          rollT = 0.24;
          rollCd = 0.9;
          iframe = Math.max(iframe, 0.32);
          buffer = 0;
          audio.jump();
          burst(player.x + player.w / 2, player.y + player.h, "#d8cdb0", 6, 90);
        }
        lastJumpAt = ow.clock;
      }
    }
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
    if (level.open) openMove(hold, dt, speed);
    else {
    const accel = (wasGround ? 3200 : 1800) * dt;
    const target = move * speed;
    const delta = target - player.vx;
    if (Math.abs(delta) <= accel) player.vx = target;
    else player.vx += Math.sign(delta) * accel;
    if (move !== 0) player.facing = move;
    {
      const mz = deep() ? (hold.down ? 1 : 0) - (hold.up ? 1 : 0) : 0;
      const want = mz * speed * 0.72;
      player.vz = (player.vz ?? 0) + (want - (player.vz ?? 0)) * Math.min(1, dt * 14);
      player.z = Math.max(-ZW, Math.min(ZW, (player.z ?? 0) + player.vz * dt));
      if (player.z === ZW || player.z === -ZW) player.vz = 0;
    }
    }
    if (level.open) openStep(dt);
    if (dashT > 0) {
      dashT -= dt;
      player.vx = level.open ? aim.x * 1150 : player.facing * 1150;
      const dmgDash = 4.6 * dmgPhys();
      const sd = SKILLS[save.hero][1]!;
      for (const a of actors) {
        if (a.dead || a.ally || inert(a)) continue;
        if (player.x + player.w + 16 > a.x && player.x - 16 < a.x + a.w && player.y + player.h > a.y && player.y < a.y + a.h && (!level.open || zd(a, player) < TILE * 0.9)) {
          hurtFoe(a, dmgDash, sd.color);
          fx.push({ kind: "wave", x: a.x + a.w / 2, y: a.y + a.h / 2, t: 0, max: 0.4, color: sd.color, r: 70, dir: 0 });
          shake = 8;
          hitStop = 0.08;
          dashT = 0;
          player.vx = (level.open ? aim.x : player.facing) * 200;
          break;
        }
      }
    }
    player.phase += dt * (4 + Math.hypot(player.vx, player.vz ?? 0) / 50);

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

    updateRisers(dt);
    if (level.gates) {
      for (const gt of level.gates) {
        if (gt.open) continue;
        if (!actors.some((a) => a.mini && !a.dead && a.room === gt.room)) {
          gt.open = true;
          showToast("Um portão se abriu.");
          audio.ui();
        }
      }
    }
    stepVis *= Math.exp(-14 * dt);
    if (stepVis < 0.3) stepVis = 0;
    if (level.open) player.y += pEl;
    const hit = moveBody(player, level, dt, dropT, wasGround && player.vy >= 0 && Math.abs(player.vx) > 20);
    if (level.open) {
      const tg = elT(g2w(player.x + player.w / 2), player.z ?? 0, pEl);
      pEl += Math.max(-1100 * dt, Math.min(1100 * dt, tg - pEl));
      player.y -= pEl;
    }
    if (stepInfo.lift > 0) stepVis += stepInfo.lift;
    // teto de altura: o herói nunca sai da tela em super-pulos/voos
    const ceilY = level.rooms ? -400 : (GROUND - 7) * TILE - (level.open ? pEl : 0);
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
    // poeira: passos rápidos e pouso
    dustT -= dt;
    if (hit.grounded && !wasGround && lastVy > 300) dust(player.x + player.w / 2, player.y + player.h, 5 + Math.min(6, Math.floor(lastVy / 200)), 70);
    else if (hit.grounded && Math.abs(player.vx) > 200 && dustT <= 0) {
      dustT = 0.16;
      dust(player.x + player.w / 2 - player.facing * 10, player.y + player.h - 2, 1, 38);
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

    if (level.portals && screen === "play") {
      const pcx = player.x + player.w / 2;
      let near: (typeof level.portals)[number] | undefined;
      for (const pt of level.portals) {
        if (Math.abs(pt.c * TILE + TILE / 2 - pcx) < TILE * 1.3 && Math.abs((player.z ?? 0) - pt.z * TILE) < TILE * 1.6 && player.y + player.h + pEl > (GROUND - 3) * TILE) near = pt;
      }
      if (near && near.dg !== undefined) {
        if (portalT === 0) {
          const d = near.dg;
          showToast(d === 10 ? `Descida para o andar ${DG.floor + 1}. Fique para entrar.` : d === 11 ? "Saída: voltar ao mundo. Fique para sair." : `Entrada: ${DG_NAMES[d]}. Fique para entrar.`);
        }
        portalT = Math.min(portalT, 0) - dt - 0.0001;
        if (portalT < -0.9) {
          portalT = 0;
          const d = near.dg;
          if (d === 10) enterDungeon(DG.kind, DG.floor + 1);
          else if (d === 11) exitDungeon();
          else enterDungeon(d, 1, { realm: LV.realm, x: g2w(player.x + player.w / 2), z: player.z ?? 0 });
          return;
        }
      } else if (near && LV.on) {
        const got = partsGot(LV.realm);
        if (got < 3) {
          if (portalT === 0) { showToast(`Portal selado: reúna as 3 peças do enigma (${got}/3).`); portalT = 3; }
        } else {
          if (portalT === 0) showToast(`O portal se abre: ${REEL_NAMES[near.realm] ?? "próximo reino"}. Fique para entrar.`);
          portalT = Math.min(portalT, 0) - dt - 0.0001;
          if (portalT < -0.9) { portalT = 0; save.next = Math.max(save.next, near.realm + 1); persist(); api.enterReel(near.realm); return; }
        }
      } else if (near) {
        if (near.realm + 1 > save.next) {
          if (portalT === 0) { showToast(`Selado: conclua o reino ${near.realm} para abrir este portal.`); portalT = 2.5; }
        } else {
          if (portalT === 0) { showToast(`Reino ${near.realm + 1}: ${REEL_NAMES[near.realm]}. Fique para entrar.`); }
          portalT = Math.min(portalT, 0) - dt - 0.0001;
          if (portalT < -0.9) { portalT = 0; api.enterReel(near.realm); return; }
        }
      } else if (portalT < 0) portalT = 0;
      if (portalT > 0) portalT -= dt;
    }

    if (level.rooms && screen === "play") {
      const pc = Math.floor((player.x + player.w / 2) / TILE);
      const pr = Math.floor((player.y + player.h / 2) / TILE);
      const ri = level.rooms.findIndex((rm) => pc >= rm.c0 && pc < rm.c1 && pr >= rm.r0 && pr <= rm.r1);
      if (ri >= 0 && ri !== curRoom) {
        curRoom = ri;
        showToast(level.rooms[ri]!.name);
      }
    }

    if (!cine && screen === "play") {
      for (const a of actors) {
        if ((!a.boss && !a.mini) || a.dead || seenCine.has(a)) continue;
        if (Math.abs(a.x - player.x) < 560 && Math.abs(a.y - player.y) < 260 && (!level.open || zd(a, player) < 520)) {
          seenCine.add(a);
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
      if (level.open) {
        actorElev(a, dt);
        openAI(a, dt);
        if (a.kind === "candle" && overlaps(player, a) && zd(a, player) < TILE * 1.4) {
          a.dead = true;
          if (player.hp < maxHp()) player.hp = Math.min(maxHp(), player.hp + 1 + bonusBoost());
          audio.pickup();
        } else if (a.kind === "chest" && overlaps(player, a) && zd(a, player) < TILE * 1.4) {
          openChest(a);
        } else if (!a.ally && a.touch > 0 && iframe <= 0 && overlaps(player, a) && zd(a, player) < TILE * 0.85) {
          hurtPlayer(a.x + a.w / 2, a.boss || a.mini ? 2 + Math.floor(dEff(a.room ?? 0) / 8) : 1 + Math.floor(dEff(a.room ?? 0) / 6));
        }
        // bote: monstro perto do herói parte para cima dele (animação de ataque)
        a.atkT = Math.max(0, a.atkT - dt);
        if (!a.ally && !a.npc && a.touch > 0 && a.atkT <= 0 && a.hurt <= 0 && Math.hypot(dx, zd(a, player)) < TILE * 2.6 && Math.random() < dt * 1.6) a.atkT = 0.42;
        continue;
      }
      if (deep() && a.behavior !== "still" && a.kind !== "chest" && a.kind !== "candle") {
        const near = Math.abs(dx) < 760 && Math.abs(player.y - a.y) < 420;
        if (near || a.ally) {
          const tz = (player.z ?? 0) + (a.ally ? 1 : 1) * Math.sin(a.phase * 0.6 + a.seq * 2 + a.zOff * 9) * TILE * (a.boss ? 0.2 : 0.7);
          const zs = Math.max(40, a.speed) * (a.boss ? 0.5 : 0.62);
          const dz = tz - (a.z ?? 0);
          const z0 = a.z ?? 0;
          a.z = Math.max(-ZW, Math.min(ZW, z0 + Math.max(-zs * dt, Math.min(zs * dt, dz))));
          a.vz = (a.z - z0) / Math.max(dt, 0.001);
        } else a.vz = 0;
      }
      if (level.rooms && !a.boss && !a.mini && !a.ally && (Math.abs(dx) > 1300 || Math.abs(player.y - a.y) > 900)) continue;
      if (a.behavior === "fly") {
        a.facing = dx >= 0 ? 1 : -1;
        a.vx = a.facing * a.speed * (a.ally ? 1.1 : 1);
        a.vy = Math.sin(a.phase * 2) * 36;
        if (!a.ally) a.vx = Math.sign(dx || 1) * a.speed;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        const rm = a.room !== undefined ? level.rooms?.[a.room] : undefined;
        if (rm) {
          // voador fica dentro do cômodo
          if (a.x < rm.c0 * TILE + 10) a.x = rm.c0 * TILE + 10;
          if (a.x + a.w > rm.c1 * TILE - 10) a.x = rm.c1 * TILE - 10 - a.w;
          if (a.y < (rm.r0 + 0.3) * TILE) a.y = (rm.r0 + 0.3) * TILE;
          if (a.y > rm.r1 * TILE - a.h - 20) a.y = rm.r1 * TILE - a.h - 20;
          if (Math.abs(dx) > 520 || Math.abs(player.y - a.y) > 420) a.vx = 0;
        } else {
          if (a.y < 20) a.y = 20;
          if (a.y > GROUND * TILE - a.h) a.y = GROUND * TILE - a.h;
        }
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

      if (!a.ally && !inert(a) && a.behavior !== "boss" && (a.behavior === "shoot" || a.behavior === "still" || a.kind === "golem" || a.kind === "cherub" || a.kind === "seraph")) {
        if (a.cd <= 0 && Math.abs(dx) < 460 && Math.abs(player.y - a.y) < 180) {
          a.cd = a.behavior === "still" ? 1.5 : 1.9;
          a.facing = dx >= 0 ? 1 : -1;
          fire("foe", a, a.facing, 220, (level?.world ?? 0) >= 5 ? 2 : 1, a.kind === "snowman" ? "#bfe6ff" : a.kind === "cherub" || a.kind === "seraph" ? "#ffe9a0" : a.kind === "devil" || a.kind === "demon" ? "#ff5a2a" : "#e08a3a", 0);
        }
      }

      if (a.kind === "candle" && overlaps(player, a) && zd(a, player) < TILE * 1.4) {
        a.dead = true;
        if (player.hp < maxHp()) player.hp = Math.min(maxHp(), player.hp + 1 + bonusBoost());
        audio.pickup();
        burst(a.x, a.y, "#e0b15a", 6, 70);
      } else if (a.kind === "chest" && overlaps(player, a) && zd(a, player) < TILE * 1.4) {
        openChest(a);
      } else if (!a.ally && a.touch > 0 && iframe <= 0 && overlaps(player, a) && zd(a, player) < TILE * 0.85) {
        hurtPlayer(a.x + a.w / 2, a.boss || a.mini ? 2 : (level?.world ?? 0) >= 5 ? 2 : 1);
      }
    }

    for (let i = loot.length - 1; i >= 0; i--) {
      const lt = loot[i]!;
      lt.age += dt;
      lt.vy = Math.min(TERM, lt.vy + 1500 * dt);
      if (level.open) lt.y += lt.el ?? 0;
      const lh = moveBody(lt, level, dt, 0);
      if (level.open) { lt.el = elT(g2w(lt.x + 10), lt.z ?? 0, lt.el ?? 0); lt.y -= lt.el; }
      if (lh.grounded) lt.vx *= 0.8;
      if (lt.y > level.rows * TILE) {
        loot.splice(i, 1);
        continue;
      }
      if (lt.age > 0.5 && overlaps(player, lt) && zd(lt, player) < TILE * 1.5) {
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
        if (!level.open && tx * Math.sign(s.vx || 1) <= 0) s.home = null;
        const k = s.home ? 1 - Math.exp(-5 * dt) : 0;
        s.vx += ((tx / d) * sp - s.vx) * k;
        s.vy += ((ty / d) * sp - s.vy) * k;
      }
      if (s.home) burst(s.x + s.w / 2, s.y + s.h / 2, s.color, 1, 30);
      if (deep()) {
        if (s.foe) {
          if (s.vz === undefined) {
            const tt = Math.max(0.25, Math.abs(player.x - s.x) / Math.max(120, Math.abs(s.vx)));
            s.vz = Math.max(-260, Math.min(260, ((player.z ?? 0) - (s.z ?? 0)) / tt));
          }
        } else if (s.home && !s.home.dead) {
          s.vz = Math.max(-360, Math.min(360, ((s.home.z ?? 0) - (s.z ?? 0)) * 7));
        }
        s.z = level.open ? (s.z ?? 0) + (s.vz ?? 0) * dt : Math.max(-ZW - 40, Math.min(ZW + 40, (s.z ?? 0) + (s.vz ?? 0) * dt));
      }
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
        if (iframe <= 0 && overlaps(player, s) && zd(s, player) < TILE * 0.7) {
          hurtPlayer(s.x, s.dmg);
          shots.splice(i, 1);
        }
        continue;
      }
      for (const a of actors) {
        if (a.dead || a.ally || inert(a) || s.hit.has(a)) continue;
        if (!overlaps(s, a) || zd(s, a) > TILE * 0.8) continue;
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
    if (door && overlaps(player, door) && Math.abs(player.z ?? 0) < TILE * 1.9) {
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

  let foeZ = 0;
  function foeShot(x: number, y: number, vx: number, vy: number, color: string, life = 1.6, seek = false) {
    shots.push({ x, y, w: 14, h: 12, vx, vy, life, color, dmg: (level?.world ?? 0) >= 3 ? 2 : 1, foe: true, pierce: 0, hit: new Set(), seek, z: foeZ });
    if (shots.length > 60) shots.splice(0, shots.length - 60);
  }

  function bossAI(a: Actor, dx: number, dt: number) {
    foeZ = a.z ?? 0;
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
      const d = Math.hypot(o.x - a.x, (o.z ?? 0) - (a.z ?? 0));
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
    } else if (first && idx === 11) {
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
    if (level.open) {
      shots = [];
      player.x = w2g(ow.rwx);
      player.z = ow.rwz;
      player.y = GROUND * TILE - player.h;
      snapElev();
      ow.tele = [];
      actors = actors.filter((a) => !a.oid || Math.hypot(a.x - player.x, (a.z ?? 0) - player.z!) > 500);
    } else {
    actors = blueprint.filter((a) => !(a.kind === "chest" && opened.has(Math.round(a.x)))).map((a) => ({ ...a }));
    player.x = respawn.x;
    player.y = respawn.y;
    player.z = 0;
    }
    buffs = [];
    summon = null;
    shots = [];
    player.vx = 0;
    player.vy = 0;
    player.hp = maxHp();
    mana = maxMana();
    iframe = 1.2;
    formT = 0;
    formCd = 0;
    screen = "play";
    emit();
  }

  /* ---------- NPCs: comércio, ferreiro, bruxa e missões ---------- */
  const priceOf = (it: Item) => {
    const b = baseOf(it);
    return b.slot === "potion" ? 6 + 3 * it.tier : Math.round((8 + 6 * it.tier) * [1, 2.6, 6, 16, 40][it.rarity]!);
  };
  function stockOf(n: Actor): Item[] {
    const id = n.npc!.id;
    let st = ow.stock.get(id);
    if (st) return st;
    let seed = 0;
    for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) | 0;
    seed ^= (LV.realm + 1) * 7919;
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const tier = Math.min(10, Math.floor(LV.realm / 2.5) + 1);
    const by = (slots: string[]) => BASES.filter((b) => slots.includes(b.slot));
    const take = (list: BaseDef[], rar: Rarity, count: number) => {
      for (let i = 0; i < count && list.length; i++) out.push(makeItem(list[Math.floor(rnd() * list.length)]!.id, rar, tier, rnd));
    };
    const out: Item[] = [];
    const role = n.npc!.role;
    if (role === "merchant") {
      take(by(["potion"]).filter((b) => b.heal), 0, 3);
      take(by(["helmet", "pants", "gloves", "boots", "necklace", "ring"]), 0, 3);
      take(by(["weapon", "armor", "offhand"]), 1, 1);
    } else if (role === "smith") {
      take(by(["weapon"]), 0, 3);
      take(by(["weapon"]), 1, 3);
      take(by(["weapon"]), 2, 2);
      take(by(["offhand"]), 1, 1);
    } else if (role === "armorer") {
      take(by(["armor", "helmet"]), 0, 3);
      take(by(["armor", "helmet", "pants"]), 1, 3);
      take(by(["gloves", "boots", "cape"]), 1, 2);
      take(by(["armor", "helmet", "cape"]), 2, 2);
    } else if (role === "witch") {
      take(by(["potion"]).filter((b) => b.fam === "scroll" && !b.heal), 0, 4);
      take(by(["potion"]).filter((b) => b.fam === "scroll" && b.spell !== undefined), 1, 3);
      take(by(["potion"]).filter((b) => !b.heal && b.fam !== "scroll"), 0, 3);
      take(by(["ring", "necklace", "offhand", "gem"]), 2, 2);
    }
    ow.stock.set(id, out);
    return out;
  }
  const NPC_TEXT: Record<string, string[]> = {
    merchant: ["Poções, armaduras, tudo com preço justo (para mim).", "Mais fundo no reino, mais caro. Compre agora.", "Leve o que precisar, viajante."],
    smith: ["Aço bom não se compra com conversa.", "Traga ouro e eu lhe dou fio na lâmina.", "Armas e armaduras forjadas aqui duram."],
    armorer: ["Couraças, elmos e mantos: tudo testado em campo.", "Quem não se protege vira história triste.", "Escolha o seu manto, viajante."],
    spirit: ["Almas menores servem bem. As maiores, melhor ainda.", "Um cão do inferno ou um nefelin? Tenho ambos, a preço de ouro.", "Eu só intermedeio. As almas é que escolhem o dono."],
    witch: ["Pergaminhos, elixires e coisas que não explico.", "O que a névoa esconde, eu vendo.", "Hihihi… quer um elixir?"],
    quest: ["Preciso de alguém corajoso. Aceita um trabalho?", "Há monstros demais por aqui.", "Pagamento garantido."],
    villager: ["Cuidado com a mansão ao longe. Ninguém volta de lá.", "A estrada leva às outras vilas. Fique nela à noite.", "Dizem que o portal só abre com três peças."],
    guard: ["Circulando.", "Tudo calmo por aqui.", "Sem confusão."],
  };
  /** 3 níveis de missão: curta (ouro + raro), média (mítico + peça do portal), longa/difícil (celestial + peça do portal) */
  function questDef(tier: number, done: number, id: string) {
    const r = LV.on ? LV.realm : 0;
    const goal = [6 + 2 * done + Math.floor(r / 3), 16 + done + Math.floor(r / 2), 34 + done * 2 + r][tier]!;
    const gold = Math.round([40 + r * 12 + done * 20, 110 + r * 28, 260 + r * 60][tier]!);
    const xp = Math.round([60 + r * 25, 150 + r * 55, 380 + r * 120][tier]!);
    const firstPart = id === "v1q" && done === 0 && tier === 0;
    const parts = missingParts();
    const reward = [
      `${gold} moedas, ${xp} XP e 1 item raro${firstPart ? " e a Peça 1 do enigma" : ""}`,
      `${gold} moedas, ${xp} XP, 1 item mítico${parts ? " e 1 peça do portal" : ""}`,
      `${gold} moedas, ${xp} XP, 1 item celestial${parts ? " e 1 peça do portal" : ""}`,
    ][tier]!;
    return { goal, gold, xp, firstPart, label: ["Curta", "Média", "Longa e difícil"][tier]!, title: `${["Caçada curta", "Caçada média", "Desafio épico"][tier]}: derrote ${goal} monstros`, reward };
  }
  function missingParts() { const m = save.parts[LV.realm] ?? 0; return LV.on && (m & 7) !== 7; }
  function grantNextPart(why: string) {
    const m = save.parts[LV.realm] ?? 0;
    for (let i = 0; i < 3; i++) if (!(m & (1 << i))) { grantPart(i, why); return; }
  }
  /** corretor de almas: servos (menor/maior), cão do inferno e nefelin por ouro */
  function spiritOffers() {
    const r = LV.on ? LV.realm : 0;
    return [
      { id: "minor", name: "Alma menor", text: "Servo fiel de nível baixo. Ocupa 1 vaga de servo.", price: 220 + r * 30 },
      { id: "major", name: "Alma maior", text: "Espírito de guerreiro, nível alto. Ocupa 1 vaga de servo.", price: 900 + r * 90 },
      { id: "hound", name: "Filhote de cão do inferno", text: "Sombra de Cérbero. Ocupa 1 das 5 vagas de cães.", price: 1400 + r * 120 },
      { id: "nef", name: "Filhote de nefelin", text: "Lobo celestial. Ocupa 1 das 5 vagas de cães.", price: 2600 + r * 160 },
    ];
  }
  function npcHud(): NpcHud | undefined {
    const n = ow.npc;
    if (!n || !n.npc) return undefined;
    const role = n.npc.role;
    const lines = NPC_TEXT[role] ?? NPC_TEXT.villager!;
    const hud: NpcHud = {
      name: n.npc.name,
      role,
      text: lines[Math.abs(n.npc.id.length + (n.npc.id.charCodeAt(n.npc.id.length - 1) || 0)) % lines.length]!,
      gold: save.gold,
      stock: stockOf(n).map((it, i) => ({ i, label: itemName(it), price: priceOf(it), color: RARITY_COLOR[it.rarity]!, info: modText(it) })),
      sell: save.bag.map((it) => ({ uid: it.uid, label: itemName(it), price: Math.max(1, Math.floor(priceOf(it) * 0.4)), color: RARITY_COLOR[it.rarity]! })),
    };
    if (role === "witch") {
      hud.spells = SPELLS.map((sp) => { const lv = save.spells[sp.id] ?? 0; return { id: sp.id, name: sp.name, text: sp.text, tag: sp.tag, lv, price: lv === 0 ? sp.price : lv >= SPELL_MAX_LV ? 0 : spellUpCost(sp, lv), slot: save.slot.indexOf(sp.id) }; });
    }
    if (role === "spirit") hud.spirits = spiritOffers();
    if (role === "quest") {
      const q = save.qs[n.npc.id];
      const active = Boolean(q && q.base >= 0);
      const qd = questDef(active ? (q!.tier ?? 0) : 0, q?.done ?? 0, n.npc.id);
      const goal = active ? q!.goal : qd.goal;
      const prog = active ? Math.min(goal, save.kills - q!.base) : 0;
      const ad = active ? questDef(q!.tier ?? 0, q!.done, n.npc.id) : qd;
      hud.quest = {
        title: ad.title, prog, goal, ready: active && prog >= goal, reward: ad.reward, active, tier: q?.tier ?? 0,
        offers: [0, 1, 2].map((t) => { const d = questDef(t, q?.done ?? 0, n.npc!.id); return { tier: t, label: d.label, title: d.title, reward: d.reward, goal: d.goal }; }),
      };
    }
    return hud;
  }

  function readHold() {
    const down = (code: string) => keys.has(code) || (qa ? qa.has(code) : false);
    return {
      left: touch.left || padHold.left || down("KeyA") || down("ArrowLeft"),
      right: touch.right || padHold.right || down("KeyD") || down("ArrowRight"),
      up: touch.up || padHold.up || down("KeyW") || down("ArrowUp"),
      down: touch.down || padHold.down || down("KeyS") || down("ArrowDown"),
      jump: touch.jump || padHold.jump || down("Space"),
      attack: touch.attack || padHold.attack || down("KeyJ") || down("KeyZ"),
      form: touch.form || padHold.form || down("KeyK") || down("KeyL") || down("ShiftLeft"),
      s: [touch.s1 || padHold.s1 || down("KeyU") || down("Digit1"), touch.s2 || padHold.s2 || down("KeyI") || down("Digit2"), touch.s3 || padHold.s3 || down("KeyO") || down("Digit3"), touch.s4 || padHold.s4 || down("KeyP") || down("Digit4")],
      potion: touch.potion || padHold.potion || down("KeyQ"),
      melee: touch.melee || padHold.melee || down("KeyH") || down("KeyX"),
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
        z: a.z ?? 0,
        vz: a.vz ?? 0,
        w: a.w,
        h: a.h,
        vx: a.vx,
        vy: a.vy,
        speed: Math.max(1, a.speed),
        // o monstro olha para onde anda (nunca de costas); chefes e parados olham para o herói
        facing: !a.boss && a.behavior !== "still" && Math.abs(a.vx) > 14 ? (a.vx > 0 ? 1 : -1) : a.facing,
        phase: a.phase,
        kind: a.npc && a.npc.role !== "pup" && a.npc.role !== "soul" ? "hero" : a.mini && a.look ? a.look : a.kind,
        hero: a.npc && a.body ? a.body : save.hero,
        form: false,
        hurt: a.hurt > 0,
        ally: a.ally,
        world: level?.world ?? 0,
        attack: a.atkT > 0 ? a.atkT / 0.42 : 0,
        fly: a.behavior === "fly",
        dying: a.dead ? 1 - Math.max(0, a.dyT) / 0.45 : 0,
        mini: a.mini,
        garb: a.npc ? a.garb : undefined,
        tex: a.npc && a.npc.role !== "pup" && a.npc.role !== "soul" ? npcTex(a) : undefined,
        job: a.jb?.k,
        working: a.wk,
        talk: a.npc || ow.sub === a ? ow.talk === a || ow.sub === a : undefined,
        petFx: a.pfx,
        iceFx: a.ice,
        soulC: a.soulC,
        gear: a.npc ? a.outfit : undefined,
        yaw: level?.open ? a.yaw : undefined,
      });
    }
    if (remote && level?.open && performance.now() - remote.t < 3000 && remote.realm === LV.realm && screen !== "title") {
      const rw = 26;
      const rh = 42;
      list.push({
        ref: remote.ref,
        x: w2g(remote.x) - rw / 2,
        y: GROUND * TILE - rh - remote.el,
        z: remote.z,
        vz: 0,
        w: rw,
        h: rh,
        vx: remote.vx,
        vy: 0,
        speed: 268,
        facing: remote.facing,
        phase: remote.phase,
        kind: "hero",
        hero: remote.hero,
        form: false,
        hurt: false,
        ally: false,
        world: level?.world ?? 0,
        attack: 0,
        yaw: remote.yaw,
      });
    }
    if (screen === "play" || screen === "pause" || screen === "char" || screen === "dead" || screen === "clear" || screen === "talk" || screen === "npc" || screen === "title") {
      list.push({
        ref: player,
        x: player.x,
        y: player.y + stepVis,
        z: player.z ?? 0,
        vz: player.vz ?? 0,
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
        swing: swingT > 0 ? swingT / 0.3 : 0,
        ground: level?.open ? !(player.y + player.h + pEl < GROUND * TILE - 34) : undefined,
        yaw: level?.open ? Math.atan2(aim.x, aim.z) : undefined,
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
      screen === "npc" ||
      (screen === "title" && titleScene && level !== null) ||
      (screen === "talk" && level !== null);
    const door = exitRect();
    const open = !actors.some((a) => a.boss && !a.dead);
    renderer.render({
      level: playing ? level : attract,
      camX,
      camY,
      focus: playing ? { z: player.z ?? 0, x: player.x + player.w / 2, y: player.y + player.h / 2, vy: player.vy, facing: player.facing, grounded: wasGround } : null,
      shake,
      t: clock,
      playing,
      unlocked: save.next,
      actors: playing ? paintList() : [],
      shots: shots.map((s) => ({ z: s.z ?? 0, x: s.x, y: s.y, w: s.w, h: s.h, color: s.color, vx: s.vx, foe: s.foe, el: s.el })),
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
              const b = nearBoss();
              return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2, z: b.z ?? 0 } : null;
            })(),
            cine: cine ? { x: cine.x + cine.w / 2, y: cine.y + cine.h / 2 } : null,
            mode: camMode,
            hazard: level?.open ? 0 : hazardAhead(),
            open: level?.open ? { inside: ow.inside, el: pEl / TILE, yaw: ow.yaw, pitch: ow.pitch, dist: ow.dist, look: ow.look, offX: ow.offX, night: ow.night, jump: ow.jump, tele: ow.tele.filter((t) => t.t > -0.5).map((t) => ({ x: w2g(t.x), z: t.z, r: t.r, k: Math.max(0, Math.min(1, t.t / t.max)), c: t.c })) } : undefined,
            space: level?.rooms && curRoom >= 0 ? level.rooms[curRoom]!.c1 - level.rooms[curRoom]!.c0 : 0,
          }
        : undefined,
      loot: playing ? loot.map<LootPaint>((l) => ({ z: l.z ?? 0, x: l.x + l.w / 2, y: l.y + l.h / 2, color: l.item.rarity > 0 ? RARITY_COLOR[l.item.rarity]! : baseOf(l.item).color, rarity: l.item.rarity, t: l.t, slot: baseOf(l.item).slot, fam: baseOf(l.item).fam, acc: baseOf(l.item).acc ?? baseOf(l.item).color })) : [],
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
  /** perigo à frente (espinhos, buracos, passagem estreita): 0..1, faz a câmera ir para trás do herói */
  function hazardAhead() {
    if (!level) return 0;
    const dir = player.facing >= 0 ? 1 : -1;
    const pc = Math.floor((player.x + player.w / 2) / TILE);
    const r0 = Math.floor((player.y + player.h - 2) / TILE);
    let best = 0;
    for (let k = 1; k <= 8; k++) {
      const c = pc + dir * k;
      if (c < 0 || c >= level.cols) break;
      const t0 = tileAt(level, c, r0);
      const t1 = tileAt(level, c, r0 + 1);
      if (t0 === Tile.Spike || t1 === Tile.Spike || t0 === Tile.Spring || t1 === Tile.Spring) best = Math.max(best, 1 - (k - 1) / 9);
      let floor = false;
      for (let r = r0 + 1; r <= r0 + 5; r++) {
        const t = tileAt(level, c, r);
        if (t === Tile.Solid || t === Tile.OneWay || t === Tile.Spike) { floor = true; break; }
      }
      if (!floor) best = Math.max(best, 0.95 - (k - 1) / 10);
      if (level.risers?.some((z) => c >= z.c && c < z.c + z.w)) best = Math.max(best, 0.7 - (k - 1) / 12);
    }
    return best;
  }

  /** controles por Bluetooth/USB (Gamepad API): Xbox, PlayStation, Switch Pro e genéricos */
  function pollPad() {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let gp: Gamepad | null = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) {
      if (padName) { padName = ""; showToast("Controle desconectado."); emit(); }
      for (const k of Object.keys(padHold) as Action[]) padHold[k] = false;
      return;
    }
    const name = gp.id.replace(/\(.*?\)/g, "").replace(/Vendor:.*$/i, "").trim().slice(0, 32) || "Controle";
    const b = (i: number) => Boolean(gp!.buttons[i]?.pressed) || (gp!.buttons[i]?.value ?? 0) > 0.5;
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    const dz = 0.38;
    const cur: boolean[] = [];
    for (let i = 0; i < 17; i++) cur[i] = b(i);
    const anyBtn = cur.some(Boolean) || Math.abs(ax) > dz || Math.abs(ay) > dz;
    if (!padName && anyBtn) { padName = name; showToast(`Controle conectado: ${name}`); audio.unlock(); emit(); }
    if (!padName) return;
    padCamX = Math.abs(gp.axes[2] ?? 0) > 0.25 ? gp.axes[2]! : 0;
    padHold.left = ax < -dz || cur[14]!;
    padHold.right = ax > dz || cur[15]!;
    padHold.up = ay < -dz || cur[12]!;
    padHold.down = ay > dz || cur[13]!;
    padHold.jump = cur[0]!;
    padHold.attack = cur[2]! || cur[7]!;
    padHold.melee = cur[1]!;
    padHold.form = cur[3]!;
    padHold.s1 = cur[4]!;
    padHold.s2 = cur[5]!;
    padHold.s3 = cur[6]!;
    padHold.s4 = false;
    padHold.potion = cur[10]!;
    const edge = (i: number) => cur[i]! && !padPrev[i];
    if (screen === "play") {
      if (edge(0)) wantJump = true;
      if (edge(3)) wantForm = true;
      if (edge(1)) wantMelee = true;
      if (edge(10)) wantPotion = true;
      if (edge(4)) wantSkill[0] = true;
      if (edge(5)) wantSkill[1] = true;
      if (edge(6)) wantSkill[2] = true;
      if (edge(7)) wantSkill[3] = true;
      if (edge(11)) api.cycleCam();
      if (edge(9)) { screen = "pause"; emit(); }
      if (edge(8)) api.openChar();
    } else if (screen === "pause") {
      if (edge(9) || edge(1)) { screen = "play"; emit(); }
      if (edge(8)) api.openChar();
      if (edge(11)) api.cycleCam();
    } else if (screen === "char") {
      if (edge(1) || edge(8) || edge(9)) api.closeChar();
    } else if (screen === "talk" || screen === "clear") {
      if (edge(0) || edge(9)) { if (screen === "talk") bridge.advance(); }
    }
    padPrev = cur;
  }

  let titleScene = false;
  function prepTitle() {
    setLevel(0);
    loadLevel(OPEN_INDEX);
    if (level) level.world = REALM_THEMES[0]!.amb;
    player.x = OW_ORIGIN_X + 0;
    player.z = 150;
    snapElev();
    ow.yaw = ow.tyaw = 0.5;
    ow.pitch = 0.5;
    ow.dist = 15;
    ow.look = 2.4;
    titleScene = true;
  }

  function frame(now: number) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    pollPad();
    for (const s of sparks) {
      if (s.z === undefined) s.z = player.z ?? 0;
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 400 * dt;
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i]!.life <= 0) sparks.splice(i, 1);
    for (const f of fx) { f.t += dt; if (f.z === undefined) f.z = player.z ?? 0; }
    fx = fx.filter((f) => f.t < f.max);
    flashT = Math.max(0, flashT - dt * 1.6);
    // o tremor decai em qualquer tela (antes só decaía jogando: ficava tremendo no portal/telas de fim)
    shake = Math.max(0, shake - dt * 16);
    if (screen !== "play") {
      hitStop = 0;
      // botões de toque desmontam fora do jogo e podem não soltar: garante que nada fica pressionado
      if (screen !== "dead") for (const k of Object.keys(touch) as Action[]) touch[k] = false;
    }

    if (screen !== "title") titleScene = false;
    if (screen === "title" && !titleScene) prepTitle();
    if (screen === "title" && titleScene && level?.open) {
      // abertura: câmera passeia em volta do vilarejo ao entardecer
      ow.clock += dt;
      ow.night = 0.12 + 0.1 * Math.sin(ow.clock * 0.1);
      ow.tyaw += dt * 0.11;
      ow.yaw += angDiff(ow.yaw, ow.tyaw) * (1 - Math.exp(-5 * dt));
      ow.pitch = 0.44 + 0.08 * Math.sin(ow.clock * 0.13);
      ow.dist = 13 + 2.5 * Math.sin(ow.clock * 0.07);
      ow.scan -= dt;
      if (ow.scan <= 0) { ow.scan = 0.6; streamChunks(); }
      for (const a of actors) a.phase += dt;
    }
    if (net.status() === "connected" && level?.open && screen === "play") {
      netT -= dt;
      if (netT <= 0) {
        netT = 0.09;
        net.send({ k: "p", r: LV.realm, x: Math.round(g2w(player.x + player.w / 2)), z: Math.round(player.z ?? 0), el: Math.round(pEl), yaw: Math.atan2(aim.x, aim.z), f: player.facing, h: save.hero, vx: Math.round(player.vx) });
      }
    }
    if (remote) {
      const k = 1 - Math.exp(-12 * dt);
      remote.x += (remote.tx - remote.x) * k;
      remote.z += (remote.tz - remote.z) * k;
      remote.el += (remote.tel - remote.el) * k;
      remote.phase += dt * Math.min(12, Math.abs(remote.vx) / 40 + 0.5);
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
        if (e.code === "Space") wantJump = true;
        if (e.code === "KeyK" || e.code === "KeyL" || e.code === "ShiftLeft") wantForm = true;
      }
  if (e.code === "KeyV" && !e.repeat && (screen === "play" || screen === "pause")) api.cycleCam();
      if (e.code === "KeyE" && !e.repeat) { if (screen === "play") api.interact(); else if (screen === "npc") api.npcClose(); }
      if (e.code === "Escape" && screen === "npc") api.npcClose();
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
      } else if (e.code === "KeyG" && !e.repeat && (screen === "play" || screen === "pause" || screen === "pets")) {
        e.preventDefault();
        if (screen === "pets") api.closePets(); else api.openPets();
      } else if (e.code === "Escape" && screen === "pets") {
        api.closePets();
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
    playOpen() {
      audio.unlock();
      audio.ui();
      const loaded = loadSave();
      if (loaded) {
        save = loaded;
        hasSave = true;
        selected = save.hero;
      }
      api.enterReel(OPEN_INDEX);
    },
    netHost: () => net.host(),
    netJoin: (code) => net.join(code),
    netFinish: (code) => net.finish(code),
    netClose() { net.close(); remote = null; emit(); },
    interact() {
      if (screen === "play" && ow.sub && !ow.talk) { trySubmit(ow.sub); return; }
      if (screen !== "play" || !ow.talk) return;
      if (ow.talk.npc?.role === "pup") { adoptPup(ow.talk); return; }
      if (ow.talk.npc?.role === "soul") { bindSoul(ow.talk); return; }
      // alguns aldeões estão possuídos: viram monstro ao serem abordados
      const t0 = ow.talk;
      if (t0.npc?.role === "villager" && LV.realm >= 1 && Math.random() < 0.1) {
        const pool = REALM_THEMES[LV.realm]!.pool;
        const m = spawnActor(pool[Math.floor(Math.random() * pool.length)]!, 0, GROUND, false, false);
        m.x = t0.x;
        m.z = t0.z;
        m.el = t0.el;
        m.y = GROUND * TILE - m.h - (t0.el ?? 0);
        m.oid = `${t0.oid}:mon`;
        const kk = 1 + 0.045 * dEff(LV.realm);
        m.maxHp = m.hp = Math.round(m.maxHp * kk * 1.3);
        actors.push(m);
        actors.splice(actors.indexOf(t0), 1);
        ow.talk = null;
        showToast(`${t0.npc.name} estava possuído!`);
        audio.hurt?.();
        shake = 8;
        emit();
        return;
      }
      ow.npc = ow.talk;
      screen = "npc";
      audio.ui();
      emit();
    },
    npcClose() {
      if (screen !== "npc") return;
      screen = "play";
      ow.npc = null;
      emit();
    },
    npcBuy(i: number) {
      const n = ow.npc;
      if (!n || screen !== "npc") return;
      const st = stockOf(n);
      const it = st[i];
      if (!it) return;
      const price = priceOf(it);
      if (save.gold < price) { showToast("Moedas insuficientes."); emit(); return; }
      if (!canFit(save.bag, it)) { showToast("Mochila cheia."); emit(); return; }
      save.gold -= price;
      save.bag.push(it);
      st.splice(i, 1);
      audio.pickup();
      persist();
      emit();
    },
    spiritBuy(id: string) {
      const n = ow.npc;
      if (!n?.npc || n.npc.role !== "spirit" || screen !== "npc") return;
      const o = spiritOffers().find((x) => x.id === id);
      if (!o) return;
      if (save.gold < o.price) { showToast("Moedas insuficientes."); emit(); return; }
      const r = LV.on ? LV.realm : 0;
      if (id === "minor" || id === "major") {
        if (servCount(save.pets) >= SERV_MAX) { showToast("Limite de 5 servos."); emit(); return; }
        save.gold -= o.price;
        addPet("soul", "thrall", `${PET_NAMES.soul[Math.floor(Math.random() * 3)]} ${id === "major" ? "Maior" : "Menor"}`, id === "major" ? 8 + Math.floor(dEff(r) / 2) : 2 + Math.floor(dEff(r) / 4));
      } else {
        if (houndCount(save.pets) >= HOUND_MAX) { showToast("Limite de 5 cães."); emit(); return; }
        save.gold -= o.price;
        if (id === "hound") addPet("hell", "cerberus", PET_NAMES.hell[(save.pets.length + 1) % PET_NAMES.hell.length]!);
        else addPet("nefelin", "lupin", PET_NAMES.nefelin[houndCount(save.pets) % PET_NAMES.nefelin.length]!);
      }
      showToast(`${o.name} adquirido!`);
      audio.fanfare();
      persist();
      emit();
    },
    spellBuy(id: number) {
      const n = ow.npc;
      const sp = SPELLS[id];
      if (!sp || !n?.npc || n.npc.role !== "witch" || screen !== "npc") return;
      const lv = save.spells[id] ?? 0;
      if (lv >= SPELL_MAX_LV) { showToast("Grimório já no máximo."); emit(); return; }
      const price = lv === 0 ? sp.price : spellUpCost(sp, lv);
      if (save.gold < price) { showToast("Moedas insuficientes."); emit(); return; }
      save.gold -= price;
      save.spells[id] = lv + 1;
      if (lv === 0) { const free = save.slot.indexOf(-1); if (free >= 0) save.slot[free] = id; }
      showToast(lv === 0 ? `Magia aprendida: ${sp.name}!` : `${sp.name} subiu para o nível ${lv + 1}.`);
      audio.fanfare();
      persist();
      emit();
    },
    spellEquip(id: number, slot: number) {
      if (screen !== "npc" || (save.spells[id] ?? 0) <= 0 || slot < -1 || slot > 3) return;
      const cur = save.slot.indexOf(id);
      if (cur >= 0) save.slot[cur] = -1;
      if (slot >= 0) save.slot[slot] = id;
      audio.ui();
      persist();
      emit();
    },
    npcSell(uid: number) {
      if (screen !== "npc") return;
      const k = save.bag.findIndex((x) => x.uid === uid);
      if (k < 0) return;
      const it = save.bag[k]!;
      save.gold += Math.max(1, Math.floor(priceOf(it) * 0.4));
      save.bag.splice(k, 1);
      audio.pickup();
      persist();
      emit();
    },
    npcQuestAbandon() {
      const n = ow.npc;
      if (!n || !n.npc || screen !== "npc") return;
      const q = save.qs[n.npc.id];
      if (q) q.base = -1;
      showToast("Missão abandonada.");
      persist();
      emit();
    },
    npcQuest(tier = 0) {
      const n = ow.npc;
      if (!n || !n.npc || screen !== "npc" || n.npc.role !== "quest") return;
      const id = n.npc.id;
      const q = save.qs[id] ?? { base: -1, goal: 0, done: 0 };
      if (q.base < 0) {
        const t = Math.max(0, Math.min(2, tier));
        const d = questDef(t, q.done, id);
        q.goal = d.goal;
        q.tier = t;
        q.base = save.kills;
        save.qs[id] = q;
        showToast(`Missão aceita: ${d.title}.`);
      } else if (save.kills - q.base >= q.goal) {
        const t = q.tier ?? 0;
        const d = questDef(t, q.done, id);
        addGold(d.gold);
        gainXp(d.xp);
        const it = rewardItem(level?.world ?? 0, ([1, 3, 4] as const)[t]!, Math.random);
        if (!addToBag(it)) dropLoot([it], player.x + player.w / 2, player.y, player.z ?? 0);
        if (t === 0 && d.firstPart) grantPart(0, "missão do vilarejo");
        else if (t > 0) grantNextPart("missão");
        q.done++;
        q.base = -1;
        save.qs[id] = q;
        showToast(`Missão cumprida! +${d.gold} moedas e ${itemName(it)}.`);
      }
      audio.ui();
      persist();
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
      api.enterReel(Math.max(0, Math.min(MAIN_LEVELS - 1, save.next - 1)));
    },
    pickHero(hero: HeroId) {
      selected = hero;
      audio.ui();
      emit();
    },
    enterReel(index0: number) {
      audio.unlock();
      const total = MAIN_LEVELS + 11;
      if (index0 < 0 || index0 >= total) return;
      if (index0 === OPEN_INDEX) {
        // sempre liberado
      } else if (index0 < MAIN_LEVELS) {
        if (index0 + 1 > save.next) return;
      } else if (bonusUnlocked(save.next) < index0 - MAIN_LEVELS + 1) return;
      afterTalk = "play";
      if (index0 < MAIN_LEVELS) {
        setLevel(index0);
        loadLevel(OPEN_INDEX);
        if (level) level.world = REALM_THEMES[index0]!.amb;
        player.z = 140;
        snapElev();
        ow.rwx = 0;
        ow.rwz = 140;
        audio.setWorld(REALM_THEMES[index0]!.music, index0 % 5, false);
      } else {
        setLevel(null);
        loadLevel(index0);
      }
      const world = level?.world ?? 0;
      const fresh: Snap["lines"] = [];
      if (index0 < MAIN_LEVELS && (index0 < 30 ? save.realms & (1 << index0) : save.realmsHi & (1 << (index0 - 30))) === 0) {
        const pre = REALM_PREFACE[index0];
        if (pre) fresh.push({ who: "Narrador", text: pre });
        if (world > 0 && (save.seen & (1 << world)) === 0) {
          fresh.push(...worldIntro(world));
          save.seen |= 1 << world;
        }
        if (index0 < 30) save.realms |= 1 << index0;
        else save.realmsHi |= 1 << (index0 - 30);
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
    openPets() {
      if (screen === "pets") return;
      charFrom = screen;
      screen = "pets";
      audio.ui();
      emit();
    },
    closePets() {
      if (screen !== "pets") return;
      screen = charFrom === "pause" ? "pause" : "play";
      if (screen === "play") { prevJump = true; prevForm = true; buffer = 0; }
      audio.ui();
      persist();
      emit();
    },
    petToggle(id: string) {
      const p = petOf(id);
      if (!p) return;
      if (!p.active && save.pets.filter((x) => x.active).length >= ACTIVE_MAX) { showToast(`No máximo ${ACTIVE_MAX} companheiros ativos.`); emit(); return; }
      p.active = !p.active;
      persist();
      emit();
    },
    petStore(id: string, uid: number) {
      const p = petOf(id);
      const i = save.bag.findIndex((x) => x.uid === uid);
      if (!p || i < 0) return;
      if (p.bag.length >= BAG_MAX) { showToast("A mochila do companheiro está cheia (20)."); emit(); return; }
      p.bag.push(save.bag.splice(i, 1)[0]!);
      audio.ui();
      persist();
      emit();
    },
    petTake(id: string, uid: number) {
      const p = petOf(id);
      const i = p ? p.bag.findIndex((x) => x.uid === uid) : -1;
      if (!p || i < 0) return;
      const it = p.bag[i]!;
      if (!canFit(save.bag, it)) { showToast("Sem espaço na sua mochila."); emit(); return; }
      p.bag.splice(i, 1);
      save.bag.push(it);
      audio.ui();
      persist();
      emit();
    },
    /** equipa no companheiro um item da mochila do herói (armadura, joia ou adorno) */
    petEquip(id: string, uid: number) {
      const p = petOf(id);
      const i = save.bag.findIndex((x) => x.uid === uid);
      if (!p || i < 0) return;
      const it = save.bag[i]!;
      const slot = petSlotFor(baseOf(it).slot);
      if (slot < 0) { showToast("Esse item não serve num companheiro (use armadura, joia ou adorno)."); emit(); return; }
      save.bag.splice(i, 1);
      const old = p.gear[slot];
      p.gear[slot] = it;
      if (old) { if (canFit(save.bag, old)) save.bag.push(old); else p.bag.push(old); }
      player.hp = Math.min(player.hp, maxHp());
      audio.pickup();
      persist();
      emit();
    },
    petUnequip(id: string, slot: number) {
      const p = petOf(id);
      const it = p?.gear[slot];
      if (!p || !it) return;
      if (!canFit(save.bag, it)) { showToast("Sem espaço na sua mochila."); emit(); return; }
      p.gear[slot] = null;
      save.bag.push(it);
      player.hp = Math.min(player.hp, maxHp());
      audio.ui();
      persist();
      emit();
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
    forgeUpgrade(uid: number) {
      const i = save.bag.findIndex((x) => x.uid === uid);
      if (i < 0) return;
      const r = forgeUpgrade(save.bag[i]!, Math.random);
      if (r.item) save.bag[i] = r.item;
      else save.bag.splice(i, 1);
      showToast(r.text);
      if (r.ok) audio.pickup();
      else audio.hit();
      persist();
      emit();
    },
    forgeFuse(uidA: number, uidB: number) {
      const ia = save.bag.findIndex((x) => x.uid === uidA);
      const ib = save.bag.findIndex((x) => x.uid === uidB);
      if (ia < 0 || ib < 0 || ia === ib) return;
      const r = forgeFuse(save.bag[ia]!, save.bag[ib]!, Math.random);
      const keep = r.item;
      const hi = Math.max(ia, ib);
      const lo = Math.min(ia, ib);
      save.bag.splice(hi, 1);
      if (keep) save.bag[lo] = keep;
      else save.bag.splice(lo, 1);
      showToast(r.text);
      if (r.ok) audio.loot(4);
      else audio.hit();
      persist();
      emit();
    },
    forgeSocket(uidA: number, uidGem: number) {
      const ia = save.bag.findIndex((x) => x.uid === uidA);
      const ig = save.bag.findIndex((x) => x.uid === uidGem);
      if (ia < 0 || ig < 0) return;
      const r = socketGem(save.bag[ia]!, save.bag[ig]!);
      showToast(r.text);
      if (r.ok && r.item) {
        save.bag[ia] = r.item;
        save.bag.splice(ig, 1);
        audio.pickup();
      }
      persist();
      emit();
    },
    forgeAlloc(uid: number, key: "str" | "int" | "dex" | "wis" | "rec") {
      const i = save.bag.findIndex((x) => x.uid === uid);
      if (i < 0) return;
      const n = allocSupreme(save.bag[i]!, key);
      if (!n) return;
      save.bag[i] = n;
      audio.ui();
      persist();
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
    camRot(d: number) {
      ow.tyaw += d * 0.6;
    },
    cycleCam() {
      camMode = (camMode + 1) % 5;
      try { localStorage.setItem("bn_cam", String(camMode)); } catch { /* sem armazenamento */ }
      showToast(`Câmera: ${CAM_MODES[camMode]}`);
      emit();
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
    const idx = Math.max(0, Math.min(MAIN_LEVELS + 10, Number(q.get("qa")) || 0));
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
    netHost: () => net.host(),
    netJoin: (c: string) => net.join(c),
    netFinish: (c: string) => net.finish(c),
    netState: () => ({ st: net.status(), remote: remote ? { x: Math.round(remote.x), z: Math.round(remote.z), realm: remote.realm, hero: remote.hero } : null }),
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
    showMobs: (kinds: string) => {
      actors = [];
      const list = kinds.split(",").filter(Boolean) as Kind[];
      list.forEach((k, i) => {
        const a = spawnActor(k, Math.floor(player.x / TILE) + 3 + i * 2.5, GROUND);
        a.vx = 0;
        a.speed = 0;
        a.behavior = "still";
        a.hp = a.maxHp = 9999;
        a.facing = -1;
        actors.push(a);
      });
    },
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
    info: () => ({ sp: sparks.length, fxn: fx.length, act: actors.length, lootn: loot.length, lvl: save.level, points: save.points, hp: player.hp, bagUsed: bagUsed(save.bag), screen }),
    getBag: () => save.bag.length,
    giveItems: (n: number) => {
      for (let i = 0; i < n; i++) {
        const kinds = ["pot", "staff", "plate", "ring", "sword", "elx_fury", "bow", "orb"];
        addToBag(makeItem(kinds[i % kinds.length]!, (i % 4) as 0 | 1 | 2 | 3, 3, Math.random));
      }
    },
    giveForge: () => {
      addToBag(makeItem("sword", 4, 3, Math.random));
      addToBag(makeItem("plate", 4, 3, Math.random));
      addToBag(makeItem("ring", 1, 3, Math.random));
      addToBag(makeItem("gem_str", 1, 3, Math.random));
      addToBag(makeItem("gem_int", 2, 3, Math.random));
    },
    openChar: () => api.openChar(),
    setKeys: (codes: string[]) => {
      qa = new Set(codes);
    },
    tpRiser: () => {
      const z = level?.risers?.[0];
      if (z) { player.x = (z.c - 6) * TILE; player.y = GROUND * TILE - player.h; player.vx = 0; player.vy = 0; }
      return z ? z.c : -1;
    },
    tpBoss: () => {
      const b = actors.find((a) => (a.boss || a.mini) && !a.dead);
      if (b) { player.x = b.x - 520; player.y = b.y + b.h - player.h; player.vx = 0; player.vy = 0; }
      return !!b;
    },
    setSteer: (_v: number) => {},
    owInfo: () => ({ x: Math.round(player.x), z: Math.round(player.z ?? 0), off: ow.offX, actors: actors.length, yaw: +ow.yaw.toFixed(2), hp: player.hp, region: ow.region, night: +ow.night.toFixed(2), tele: ow.tele.length, chunks: ow.chunks.size, shots: shots.length, ax: aim.x, az: aim.z, kinds: actors.slice(0, 12).map((a) => a.kind) }),
    tpWorld: (wx: number, wz: number) => { player.x = w2g(wx); player.z = wz; snapElev(); ow.chunks.clear(); actors = []; },
    setCam: (m: number) => { camMode = m; },
    strike: () => strikeEvent(),
    wxT: (k: string, v: number) => { (FORCE as Record<string, number>)[k] = v; },
    petT: (kind: string, lv: number) => addPet(kind as Pet["kind"], kind === "soul" ? "thrall" : kind === "nefelin" ? "lupin" : "cerberus", "Teste", lv).id,
    spawnT: (kind: string, dx: number, dz: number) => {
      const a = spawnActor(kind as Kind, 0, GROUND, false);
      a.x = player.x + dx; a.z = (player.z ?? 0) + dz; a.el = elT(g2w(a.x + a.w / 2), a.z, 0); a.y = GROUND * TILE - a.h - a.el;
      a.behavior = "still"; a.speed = 0; a.touch = 0; a.hp = a.maxHp = 9999; a.facing = -1;
      actors.push(a);
    },
    enterDungeonT: (k: number, f: number) => enterDungeon(k, f, { realm: Math.max(0, LV.realm), x: 0, z: 0 }),
    enterRealm: (k: number) => { save.next = Math.max(save.next, k + 1); api.enterReel(k); if (screen === "talk") screen = "play"; },
    th: (x: number, z: number) => floorElev(x, z, 0),
    nudge: (wx: number, wz: number) => { player.x = w2g(wx) - player.w / 2; player.z = wz; },
    lvl: () => (LV.on ? LV.realm : -1),
    lay: () => (LV.lay ? { portal: LV.lay.portal, places: LV.lay.places.map((p) => ({ k: p.kind, x: p.x, z: p.z, n: p.houses.length, w: p.walls.length, hs: p.houses.map((h) => ({ id: h.id, f: h.floors, r: h.rect })), st: p.surfs.filter((q) => q.vis === "stair").map((q) => ({ x0: q.x0, z0: q.z0, x1: q.x1, z1: q.z1, h0: q.h0, h1: q.h1, ax: q.axis, hid: q.house, fl: q.fl })) })), parts: LV.lay.parts, R: LV.lay.R } : null),
    wallTest: () => { const r = wallsNear(g2w(player.x), player.z ?? 0, 300); return r.length; },
    pos: () => ({ el: pEl / TILE, x: g2w(player.x + player.w / 2), z: player.z, screen, portals: level?.portals?.length ?? -1, portalT, parts: LV.on ? partsGot(LV.realm) : -1, next: save.next }),
    giveParts: () => { if (LV.on) save.parts[LV.realm] = 7; },
    npcNear: () => (ow.talk ? ow.talk.npc : null),
    openNpc: () => api.interact(),
    gold: (n: number) => { save.gold += n; },
    endTalk: () => { if (screen === "talk") { screen = "play"; cine = null; } },
  };
  (window as unknown as { __controlsTest?: typeof probe }).__controlsTest = probe;

  bridge.advance = () => api.advanceDialogue();

  emit();
  requestAnimationFrame(frame);
  return api;
}
