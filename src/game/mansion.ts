import { BONUS_NAMES, ENT, POOLS, REEL_NAMES } from "./content";
import { GROUND, MAIN_LEVELS, ROWS, Tile, type Decor, type Kind, type Level, type LevelEnt, type Riser, type Room } from "./types";

/**
 * Mansão do inferno: cada fase é uma casa de 10 a 15 cômodos em 2 ou 3 andares,
 * com portas entre os cômodos, escadarias, salas de combate, tesouro e perigos.
 * Piso f fica na linha FL(f) (a linha sólida em que se pisa); o interior tem 9 linhas.
 */
export const FLOOR_PITCH = 10;
export const FL = (f: number) => GROUND - FLOOR_PITCH * f;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const debugMansion: Record<number, string> = {};

const KIND_NAME: Record<string, string[]> = {
  foyer: ["Saguão de Entrada", "Vestíbulo", "Átrio"],
  hall: ["Salão das Sombras", "Grande Salão", "Salão dos Retratos"],
  dining: ["Sala de Jantar", "Refeitório Amaldiçoado", "Mesa dos Condenados"],
  kitchen: ["Cozinha das Chamas", "Cozinha Infernal", "Copa Escaldante"],
  crypt: ["Cripta", "Adega dos Ossos", "Catacumba Doméstica"],
  chapel: ["Capela Torta", "Oratório", "Capela dos Velhos Votos"],
  gallery: ["Galeria de Espelhos", "Galeria dos Olhos", "Corredor de Molduras"],
  library: ["Biblioteca Proibida", "Arquivo de Contratos", "Sala dos Livros Vivos"],
  ballroom: ["Salão de Baile", "Pista do Cramunhão", "Salão das Danças Mortas"],
  armory: ["Armaria", "Sala das Lâminas", "Depósito de Ferros"],
  study: ["Escritório", "Gabinete do Mordomo", "Sala de Contas"],
  stairs: ["Escadaria", "Escadaria Sem Fim", "Lance de Degraus"],
  boss: ["Salão do Trono", "Câmara do Dono", "Sala do Último Contrato"],
  attic: ["Sótão", "Sótão dos Esquecidos", "Água-furtada"],
};

type Grid = { cols: number; t: Uint8Array };

export function buildMansion(i: number, bonus: boolean, world: number, stage: number): Level {
  const rng = mulberry32(5000 + i * 131 + world * 17);
  const rint = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const chance = (p: number) => rng() < p;
  const boss = !bonus && stage === 4;
  const mini = !bonus && stage === 2;
  const nRooms = bonus ? 10 : [10, 11, 12, 13, 15][stage]!;
  const attic = nRooms - 10;
  const nFloors = attic > 0 ? 3 : 2;

  // largura dos cômodos (colunas iguais nos andares)
  // serpentina: sobe no extremo leste do térreo, atravessa o 1º andar para oeste, sobe no extremo oeste
  const s0 = 4;
  const s1 = 0;
  const widths = Array.from({ length: 5 }, (_, j) => (j === s0 || j === s1 ? rint(36, 42) : rint(26, 40)));
  if (boss) widths[4] = 40;
  const PART = 2;
  const xs: number[] = [];
  let x = 2;
  for (let j = 0; j < 5; j++) {
    xs.push(x);
    x += widths[j]! + PART;
  }
  const cols = x - PART + 2;
  const G: Grid = { cols, t: new Uint8Array(cols * ROWS) };
  const set = (c: number, r: number, v: number) => {
    if (c < 0 || c >= cols || r < 0 || r >= ROWS) return;
    G.t[r * cols + c] = v;
  };
  const get = (c: number, r: number) => (c < 0 || c >= cols || r < 0 || r >= ROWS ? Tile.Solid : G.t[r * cols + c]!);
  const fill = (c0: number, c1: number, r0: number, r1: number, v: number) => {
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) set(c, r, v);
  };

  const rooms: Room[] = [];
  const decor: Decor[] = [];
  const ents: LevelEnt[] = [];
  const risers: Riser[] = [];
  const dec = (k: string, c: number, r: number, w = 1, h = 1, v = 0) => decor.push({ k, c, r, w, h, v: v || Math.floor(rng() * 1000) });

  // atico: quais cômodos do 3º andar
  const atA = 0;
  const roomsOf = (f: number) => (f < 2 ? [0, 1, 2, 3, 4] : Array.from({ length: attic }, (_, k) => atA + k));

  // ---- cascas: pisos, tetos, paredes
  const wallL = xs[0]! - 2;
  const wallR = cols - 2;
  fill(0, cols, GROUND, ROWS, Tile.Solid); // térreo + porão
  for (let f = 0; f < nFloors; f++) {
    const F = FL(f);
    const rs = roomsOf(f);
    const a = rs[0]!;
    const b = rs[rs.length - 1]!;
    const left = a === 0 ? wallL : xs[a]! - PART;
    const right = b === 4 ? cols : xs[b]! + widths[b]!;
    // teto/piso de cima
    fill(left, right + (b === 4 ? 0 : PART), F - FLOOR_PITCH, F - FLOOR_PITCH + 1, Tile.Solid);
    // paredes externas e divisórias
    fill(left, left + PART, F - FLOOR_PITCH, F, Tile.Solid);
    fill(right - (b === 4 ? PART : 0), right + (b === 4 ? 0 : PART), F - FLOOR_PITCH, F, Tile.Solid);
    for (let k = 0; k < rs.length - 1; k++) {
      const j = rs[k]!;
      const px = xs[j]! + widths[j]!;
      fill(px, px + PART, F - FLOOR_PITCH, F, Tile.Solid);
      // porta (3 de altura) com arco
      fill(px, px + PART, F - 3, F, Tile.Air);
      dec("door", px, F, PART, 3, rint(0, 9));
    }
  }
  // lajes dos andares de cima como "piso" das salas (linha FL(f) já é a laje); abertura das escadas é feita abaixo

  // ---- escadas
  const stair = (f: number, j: number, rightUp: boolean) => {
    const F = FL(f);
    const x0 = xs[j]!;
    const w = widths[j]!;
    const sx = rightUp ? x0 + 3 : x0 + w - 3 - 20;
    for (let k = 0; k < 10; k++) {
      const c0 = rightUp ? sx + k * 2 : sx + (9 - k) * 2;
      fill(c0, c0 + 2, F - 1 - k, F, Tile.Solid);
      if (k < 9) fill(c0, c0 + 2, F - FLOOR_PITCH, F - FLOOR_PITCH + 1, Tile.OneWay);
    }
    // corrimão/decoração
    dec("rail", sx, F, 20, 5, rightUp ? 1 : 2);
    return { sx, rightUp };
  };
  const st0 = stair(0, s0, true);
  const st1 = nFloors === 3 ? stair(1, s1, false) : null;
  void st0;
  void st1;

  // ---- cômodos e conteúdo
  const poolA = POOLS[world] ?? POOLS[0]!;
  const poolB = POOLS[(world + 3) % 10]!;
  const lvPower = Math.floor(i / 10);
  const monsterCount = (kind: string) => {
    const base = kind === "foyer" ? 1 : kind === "boss" ? 0 : kind === "stairs" ? 2 : kind === "armory" || kind === "ballroom" ? 4 : 3;
    return Math.min(7, base + (stage > 1 ? 1 : 0) + (lvPower > 2 ? 1 : 0) + (chance(0.35) ? 1 : 0));
  };
  const fliesOK = (k: Kind) => ENT[k].behavior === "fly";
  const pickKind = (dest: Kind[] = poolA) => dest[Math.floor(rng() * dest.length)]!;

  const roomIndex: number[][] = [[], [], []];
  // cada círculo do inferno tem salas preferidas (muda o "tempero" da mansão)
  const FAV: string[][] = [
    ["ballroom", "gallery"], // Limbo
    ["crypt", "chapel"], // Heresia
    ["armory", "kitchen"], // Ira
    ["crypt", "hall"], // Violência
    ["library", "study"], // Fraude
    ["ballroom", "dining"], // Luxúria
    ["crypt", "gallery"], // Traição
    ["dining", "kitchen"], // Gula
    ["armory", "library"], // Avareza
    ["hall", "chapel"], // Dis
  ];
  const fav = FAV[world % 10] ?? [];
  const kindsF0 = shuffle(["hall", "dining", "kitchen", "crypt", "chapel", "gallery", ...fav, ...fav], rng);
  const kindsF1 = shuffle(["library", "ballroom", "armory", "study", "gallery", "chapel", ...fav, ...fav], rng);
  const kindsF2 = shuffle(["attic", "armory", "gallery", "study", "attic", ...fav], rng);
  let k0 = 0;
  let k1 = 0;
  let k2 = 0;

  const floorFree = (F: number, c0: number, c1: number) => {
    const out: number[] = [];
    for (let c = c0 + 3; c < c1 - 3; c++) {
      if (get(c, F) !== Tile.Solid || get(c, F - 1) !== Tile.Air || get(c, F - 2) !== Tile.Air) continue;
      if (get(c - 1, F - 1) !== Tile.Air || get(c + 1, F - 1) !== Tile.Air) continue;
      out.push(c);
    }
    return out;
  };

  const spawnC = xs[0]! + 4;
  let exitC = xs[4]! + widths[4]! - 5;
  let exitFoot = GROUND;
  let bossPlaced = false;

  const mkRoom = (f: number, j: number): void => {
    const F = FL(f);
    const c0 = xs[j]!;
    const c1 = c0 + widths[j]!;
    let kind: string;
    const isStair = (f === 0 && j === s0) || (f === 1 && nFloors === 3 && j === s1);
    const aboveStair = (f === 1 && j === s0) || (f === 2 && j === s1);
    if (f === 0 && j === 0) kind = "foyer";
    else if (isStair) kind = "stairs";
    else if (aboveStair) kind = "gallery";
    else if (f === 0) kind = kindsF0[k0++ % kindsF0.length]!;
    else if (f === 1) kind = kindsF1[k1++ % kindsF1.length]!;
    else kind = kindsF2[k2++ % kindsF2.length]!;
    // sala do chefe
    let farEnd = false;
    if (boss) {
      if (nFloors === 3) farEnd = f === 2 && j === atA + attic - 1;
      else farEnd = f === 1 && j === 0;
    }
    if (farEnd) kind = "boss";
    const names = KIND_NAME[kind] ?? ["Cômodo"];
    const ri = rooms.length;
    rooms.push({ c0, c1, r0: F - 9, r1: F, floor: F, kind, name: names[(i + j + f) % names.length]!, theme: (j * 3 + f * 5 + i + world * 2) % 6 });
    roomIndex[f]![j] = ri;

    const room = rooms[ri]!;
    const plat = (c: number, w: number, r: number) => {
      for (let q = c; q < c + w; q++) if (get(q, r) === Tile.Air) set(q, r, Tile.OneWay);
    };
    const block = (c: number, w: number, h: number) => fill(c, c + w, F - h, F, Tile.Solid);
    const cx = Math.floor((c0 + c1) / 2);

    // área onde a escada ocupa o cômodo (evita obstáculos)
    const stairCols = isStair ? (f === 0 && j === s0 ? [st0.sx, st0.sx + 20] : st1 ? [st1.sx, st1.sx + 20] : [c0, c0]) : [c0, c0];
    const clearOfStair = (c: number, w: number) => c + w <= stairCols[0]! - 1 || c >= stairCols[1]! + 1;

    switch (kind) {
      case "foyer": {
        dec("rug", c0 + 6, F, 14, 1);
        dec("column", c0 + 5, F, 2, 9);
        dec("column", c1 - 7, F, 2, 9);
        dec("chandelier", cx, F - 9, 1, 3);
        dec("painting", cx - 8, F - 5, 3, 3);
        dec("painting", cx + 6, F - 5, 3, 3);
        dec("window", c0 + 12, F - 4, 2, 4);
        ents.push({ kind: "candle", c: c0 + 18, foot: F, room: ri });
        break;
      }
      case "hall": {
        dec("column", c0 + 6, F, 2, 9);
        dec("column", cx, F, 2, 9);
        dec("column", c1 - 8, F, 2, 9);
        dec("chandelier", c0 + 13, F - 9, 1, 3);
        dec("chandelier", c1 - 14, F - 9, 1, 3);
        dec("banner", c0 + 9, F - 8, 2, 5);
        dec("banner", c1 - 11, F - 8, 2, 5);
        dec("statue", cx + 5, F, 2, 3);
        for (let q = 0; q < 3; q++) risers.push({ c: c0 + 7 + q * 8, w: 3, h: 1 + (q % 2), mode: 0, ph: 0, col: 0, vis: 0, f: F });
        break;
      }
      case "dining": {
        const tx = c0 + 9;
        block(tx, 12, 1);
        for (let q = 0; q < 6; q++) dec("chair", tx + 1 + q * 2, F, 1, 2);
        dec("tableware", tx, F - 1, 12, 1);
        dec("chandelier", tx + 6, F - 9, 1, 3);
        dec("window", c0 + 4, F - 5, 2, 4);
        dec("window", c1 - 7, F - 5, 2, 4);
        plat(c1 - 12, 6, F - 4);
        break;
      }
      case "kitchen": {
        const sp0 = c0 + 8;
        for (let q = 0; q < 10; q++) set(sp0 + q, F, Tile.Spike);
        plat(sp0 + 1, 3, F - 3);
        plat(sp0 + 6, 3, F - 3);
        dec("fireplace", c0 + 3, F, 4, 4);
        dec("pots", c1 - 8, F, 4, 3);
        dec("chain", cx, F - 9, 1, 4);
        break;
      }
      case "crypt": {
        for (let q = 0; q < 6; q++) dec("coffin", c0 + 5 + q * 4, F, 2, 1);
        block(c0 + 10, 3, 1);
        block(c0 + 20, 3, 2);
        plat(c0 + 15, 4, F - 3);
        dec("cobweb", c0 + 2, F - 9, 4, 4);
        dec("cobweb", c1 - 6, F - 9, 4, 4);
        break;
      }
      case "chapel": {
        for (let q = 0; q < 4; q++) block(c0 + 6 + q * 5, 3, 1);
        dec("altar", c1 - 8, F, 4, 3);
        dec("window", cx, F - 7, 3, 6);
        dec("candelabra", c1 - 11, F, 1, 3);
        break;
      }
      case "gallery": {
        for (let q = 0; q < 6; q++) dec("painting", c0 + 4 + q * 5, F - 6, 3, 3);
        plat(c0 + 8, 4, F - 3);
        plat(c0 + 16, 4, F - 5);
        plat(c0 + 24, 4, F - 3);
        dec("mirror", c1 - 8, F - 6, 3, 4);
        break;
      }
      case "library": {
        // estantes formam escada de plataformas
        dec("bookshelf", c0 + 3, F, c1 - c0 - 6, 9);
        plat(c0 + 6, 5, F - 3);
        plat(c0 + 13, 5, F - 5);
        plat(c0 + 20, 5, F - 7);
        plat(c0 + 26, 4, F - 5);
        dec("lamp", c0 + 9, F - 3, 1, 2);
        const cc = c0 + 22;
        ents.push({ kind: "chest", c: cc, foot: F - 7, room: ri });
        break;
      }
      case "ballroom": {
        for (let q = 0; q < 4; q++) risers.push({ c: c0 + 5 + q * 7, w: 3, h: 1 + (q % 2), mode: 1, ph: q * 1.7, col: 0, vis: 0, f: F });
        dec("chandelier", cx - 5, F - 9, 1, 3);
        dec("chandelier", cx + 5, F - 9, 1, 3);
        dec("column", c0 + 3, F, 2, 9);
        dec("column", c1 - 5, F, 2, 9);
        plat(c0 + 4, 4, F - 5);
        plat(c1 - 9, 4, F - 5);
        break;
      }
      case "armory": {
        dec("rack", c0 + 4, F, 4, 3);
        dec("rack", c1 - 8, F, 4, 3);
        dec("banner", cx, F - 8, 2, 5);
        block(cx - 2, 4, 1);
        ents.push({ kind: "chest", c: c0 + 5, foot: F, room: ri });
        break;
      }
      case "study": {
        block(c0 + 6, 5, 1);
        dec("desk", c0 + 6, F - 1, 5, 1);
        dec("bookshelf", c1 - 12, F, 9, 6);
        dec("clock", c0 + 4, F - 3, 2, 6);
        plat(c1 - 11, 5, F - 3);
        if (chance(0.7)) ents.push({ kind: "chest", c: c1 - 9, foot: F - 3, room: ri });
        break;
      }
      case "attic": {
        for (let q = 0; q < 4; q++) if (c0 + 5 + q * 7 + 2 <= c1 - 6) block(c0 + 5 + q * 7, 2, 1 + (q % 2));
        dec("cobweb", c0 + 2, F - 9, 5, 5);
        dec("crate", c1 - 8, F, 3, 2);
        dec("window", cx, F - 6, 2, 3);
        plat(c0 + 12, 5, F - 4);
        break;
      }
      case "stairs": {
        dec("window", isStair && stairCols[0]! > c0 + 6 ? c0 + 5 : c1 - 8, F - 6, 2, 5);
        dec("chandelier", Math.floor((stairCols[0]! + stairCols[1]!) / 2), F - 9, 1, 3);
        if (f === 0 && j === s0) {
          // ponto de apoio
          set(c0 + 5, F - 1, Tile.Checkpoint);
        }
        break;
      }
      case "boss": {
        dec("column", c0 + 6, F, 2, 9);
        dec("column", c1 - 8, F, 2, 9);
        dec("throne", c1 - 9, F, 4, 5);
        dec("banner", cx - 6, F - 8, 2, 5);
        dec("banner", cx + 6, F - 8, 2, 5);
        dec("chandelier", cx, F - 9, 1, 3);
        plat(c0 + 8, 6, F - 4);
        plat(c1 - 15, 6, F - 4);
        break;
      }
      default:
        break;
    }

    // variação extra: cada sala ganha um detalhe diferente (fosso, palanque, plataformas suspensas)
    if (!["boss", "foyer", "stairs", "gallery"].includes(kind) && !isStair && !aboveStair) {
      const vr = rint(0, 4);
      if (vr === 1 && !["kitchen", "crypt"].includes(kind)) {
        const px = c0 + rint(10, Math.max(11, c1 - c0 - 16));
        for (let q = 0; q < 5; q++) if (get(px + q, F) === Tile.Solid && get(px + q, F - 1) === Tile.Air) set(px + q, F, Tile.Spike);
        plat(px + 1, 3, F - 3);
      } else if (vr === 2) {
        const px = c0 + rint(8, Math.max(9, c1 - c0 - 14));
        if (get(px, F - 1) === Tile.Air && get(px + 5, F - 1) === Tile.Air) {
          fill(px, px + 6, F - 1, F, Tile.Solid);
          fill(px + 1, px + 5, F - 2, F - 1, Tile.Solid);
          dec("rug", px, F - 2, 6, 1);
        }
      } else if (vr === 3) {
        const px = c0 + rint(6, Math.max(7, c1 - c0 - 14));
        plat(px, 3, F - 4);
        plat(px + 5, 3, F - 6);
        plat(px + 10, 3, F - 4);
        dec("chain", px + 1, F - 9, 1, 3);
        dec("chain", px + 11, F - 9, 1, 3);
      }
    }

    // decoração de fundo comum
    if (kind !== "boss" && kind !== "foyer") {
      if (!decor.some((d) => d.k === "window" && d.c >= c0 && d.c < c1) && chance(0.7)) dec("window", c0 + rint(5, 12), F - 5, 2, 4);
      if (chance(0.55)) dec("candelabra", c0 + rint(4, c1 - c0 - 5), F, 1, 3);
    }

    // monstros
    if (kind !== "boss") {
      const free = floorFree(F, c0, c1).filter((c) => (!isStair || (stairCols[0] === st0.sx && f === 0 ? c + 2 <= stairCols[0]! - 1 : c >= stairCols[1]! + 2)) && c > spawnC + 8 - (f === 0 && j === 0 ? 0 : 99));
      const n = monsterCount(kind);
      const used: number[] = [];
      for (let q = 0; q < n && free.length; q++) {
        const idx = Math.floor(rng() * free.length);
        const c = free[idx]!;
        if (used.some((u) => Math.abs(u - c) < 4)) {
          free.splice(idx, 1);
          q--;
          continue;
        }
        used.push(c);
        const kd = pickKind(chance(0.3 + lvPower * 0.06) ? poolB : poolA);
        ents.push({ kind: kd, c, foot: fliesOK(kd) ? F - 5 : F, room: ri });
      }
    } else {
      if (!bossPlaced) {
        ents.push({ kind: "boss", c: c1 - 12, foot: F, room: ri });
        bossPlaced = true;
        exitC = c1 - 4;
        exitFoot = F;
      }
    }
    if (mini && f === 1 && j === 2) ents.push({ kind: "boss", c: cx + 4, foot: F, mini: true, room: ri });
    if (chance(0.4) && kind !== "boss") ents.push({ kind: "candle", c: c0 + rint(5, c1 - c0 - 6), foot: F, room: ri });
  };

  for (let f = 0; f < nFloors; f++) for (const j of roomsOf(f)) mkRoom(f, j);

  // saída: sem chefe, na ponta mais distante do último andar
  if (!boss) {
    const topF = nFloors - 1;
    const rs = roomsOf(topF);
    const stairJ = nFloors === 3 ? s1 : s0;
    const far = Math.abs(rs[0]! - stairJ) >= Math.abs(rs[rs.length - 1]! - stairJ) ? rs[0]! : rs[rs.length - 1]!;
    exitFoot = FL(topF);
    exitC = far === 0 ? xs[far]! + 6 : xs[far]! + widths[far]! - 6;
    // sala final recebe vigia e baú
    const ri = roomIndex[topF]![far]!;
    ents.push({ kind: "chest", c: exitC + (far === 0 ? 5 : -5), foot: exitFoot, room: ri });
  }
  // checkpoints no meio dos andares
  for (let f = 0; f < nFloors; f++) {
    const rs = roomsOf(f);
    for (const j of rs) {
      if (rs.length < 3 || j !== rs[Math.floor(rs.length / 2)]) continue;
      const F = FL(f);
      const c = xs[j]! + Math.floor(widths[j]! / 2) + 4;
      if (get(c, F) === Tile.Solid && get(c, F - 1) === Tile.Air) set(c, F - 1, Tile.Checkpoint);
    }
  }
  // primeira lanterna perto da entrada
  set(spawnC + 6, GROUND - 1, Tile.Checkpoint);

  // limpa espinhos junto a buraco e saídas
  fixEnts(G, ents);

  const names = bonus ? BONUS_NAMES[i - MAIN_LEVELS] ?? "Cofre" : REEL_NAMES[i] ?? `Mansão ${i + 1}`;
  // espelha metade das fases (a entrada passa para o leste)
  const mirror = (i + world) % 2 === 1;
  let tilesOut = G.t;
  let spawnOut = { c: spawnC, foot: GROUND };
  let exitOut = { c: exitC, foot: exitFoot };
  if (mirror) {
    tilesOut = new Uint8Array(G.t.length);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < cols; c++) tilesOut[r * cols + (cols - 1 - c)] = G.t[r * cols + c]!;
    for (const e of ents) e.c = cols - 1 - e.c;
    for (const d of decor) {
      d.c = cols - (d.c + d.w);
      if (d.k === "rail") d.v = d.v === 1 ? 2 : 1;
    }
    for (const z of risers) z.c = cols - (z.c + z.w);
    for (const rm of rooms) {
      const a = cols - rm.c1;
      rm.c1 = cols - rm.c0;
      rm.c0 = a;
    }
    spawnOut = { c: cols - 1 - spawnC, foot: GROUND };
    exitOut = { c: cols - 1 - exitC, foot: exitFoot };
  }
  debugMansion[i] = `${rooms.length} cômodos · ${nFloors} andares · escadas ${s0}/${s1}`;
  return {
    index: i,
    name: names,
    world,
    boss,
    mini,
    bonus,
    cols,
    rows: ROWS,
    tiles: tilesOut,
    ents,
    spawn: spawnOut,
    exit: exitOut,
    risers: risers.length ? risers : undefined,
    rooms,
    decor,
  };
}

function shuffle<T>(a: T[], rng: () => number) {
  const b = [...a];
  for (let k = b.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [b[k], b[j]] = [b[j]!, b[k]!];
  }
  return b;
}

/** coloca cada monstro terrestre em cima de uma superfície real (procura ao redor) */
function fixEnts(G: Grid, ents: LevelEnt[]) {
  const get = (c: number, r: number) => (c < 0 || c >= G.cols || r < 0 || r >= ROWS ? Tile.Solid : G.t[r * G.cols + c]!);
  const surf = (c: number, r: number) => (get(c, r) === Tile.Solid || get(c, r) === Tile.OneWay) && get(c, r - 1) === Tile.Air && get(c, r - 2) === Tile.Air && get(c - 1, r - 1) !== Tile.Spike && get(c, r) !== Tile.Spike;
  for (const e of ents) {
    if (ENT[e.kind].behavior === "fly") continue;
    let done = false;
    for (let dc = 0; dc <= 8 && !done; dc++) {
      for (const sgn of dc ? [1, -1] : [1]) {
        const c = e.c + dc * sgn;
        for (const dr of [0, -1, 1, -2, 2, -3]) {
          if (surf(c, e.foot + dr)) {
            e.c = c;
            e.foot = e.foot + dr;
            done = true;
            break;
          }
        }
        if (done) break;
      }
    }
  }
}
