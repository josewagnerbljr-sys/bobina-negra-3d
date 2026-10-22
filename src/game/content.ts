import {
  GROUND,
  ROWS,
  Tile,
  type Behavior,
  type HeroId,
  type Kind,
  type Level,
  type LevelEnt,
  type Line,
  type StatKey,
} from "./types";

export type HeroDef = {
  id: HeroId;
  name: string;
  role: string;
  formName: string;
  blurb: string;
  voice: string;
  attack: string;
  skin: string;
  hair: string;
  cloth: string;
  cloth2: string;
  shoe: string;
  accent: string;
};

export const HEROES: HeroDef[] = [
  {
    id: "ivo",
    name: "Ivo Marr",
    role: "Lobo de palco",
    formName: "Uivo",
    blurb: "Forte de circo. A lua é colega de trabalho, não romantismo.",
    voice: "Eu não me transformo. Eu paro de fingir que a camisa fecha.",
    attack: "Estalo de pólvora. Em forma de lobo, garra.",
    skin: "#f0c39a",
    hair: "#24160f",
    cloth: "#c4373a",
    cloth2: "#2a4f86",
    shoe: "#e0b15a",
    accent: "#7a1f28",
  },
  {
    id: "lena",
    name: "Lena Vesper",
    role: "Vampira de camarim",
    formName: "Asas",
    blurb: "Bebe o que o contrato chama de tinta. Ninguém pergunta a cor.",
    voice: "Asas são só uma desculpa para não usar escada.",
    attack: "Dardo de tinta. Em forma de morcego, voo e mordida.",
    skin: "#ead6c8",
    hair: "#140e14",
    cloth: "#24182e",
    cloth2: "#7a1d38",
    shoe: "#1a1218",
    accent: "#c4373a",
  },
  {
    id: "osso",
    name: "Osso Quill",
    role: "Necromante de fio",
    formName: "Caveira",
    blurb: "Fantocheiro. Os fantoches pediram demissão e continuaram andando.",
    voice: "Estágio no além. Sem VR, sem vale.",
    attack: "Osso perfurante. A forma convoca o último morto.",
    skin: "#ddd2c2",
    hair: "#c8c2b4",
    cloth: "#243028",
    cloth2: "#6d5a3a",
    shoe: "#1c1612",
    accent: "#9fd4d8",
  },
  {
    id: "syl",
    name: "Syl Auber",
    role: "Arqueira da mata",
    formName: "Elfa",
    blurb: "Humana até a flecha decidir o contrário.",
    voice: "Orelha pontuda não é personalidade. A mira é.",
    attack: "Flecha. Em forma de elfa, três de uma vez e um pulo a mais.",
    skin: "#e8c4a4",
    hair: "#6b2e1a",
    cloth: "#2f5a3a",
    cloth2: "#8d4a2f",
    shoe: "#4a3024",
    accent: "#d2e39a",
  },
];

export function heroById(id: HeroId): HeroDef {
  return HEROES.find((h) => h.id === id) ?? HEROES[0]!;
}

export const UPGRADES: { id: StatKey; name: string; text: string }[] = [
  { id: "vit", name: "Vitalidade", text: "+1 coração. O contrato aceita carne como cláusula." },
  { id: "impeto", name: "Ímpeto", text: "+dano. A plateia antiga gosta de impacto, infelizmente." },
  { id: "folego", name: "Fôlego", text: "A forma dura mais e volta antes. Até maldição cansa." },
  { id: "passo", name: "Passo", text: "+velocidade. A fase continua longa. Você é que encurta." },
  { id: "mira", name: "Mira", text: "Atira mais rápido. Flecha, osso ou estalo: dói igual." },
];

export type WorldDef = {
  id: number;
  name: string;
  boss: string;
  sky0: string;
  sky1: string;
  sky2: string;
  hill: string;
  hill2: string;
  ground: string;
  groundDark: string;
  trim: string;
  accent: string;
  fog: string;
};

export const WORLDS: WorldDef[] = [
  {
    id: 0,
    name: "Carnaval de Verniz",
    boss: "Mestre Verniz",
    sky0: "#140c18",
    sky1: "#3a1a32",
    sky2: "#6a3044",
    hill: "#24101c",
    hill2: "#3a1830",
    ground: "#7a4034",
    groundDark: "#4a241c",
    trim: "#e0b15a",
    accent: "#c4373a",
    fog: "#1a0c14",
  },
  {
    id: 1,
    name: "Catacumbas de Medula",
    boss: "Abadessa do Véu",
    sky0: "#100e14",
    sky1: "#221c2a",
    sky2: "#3a3344",
    hill: "#16141c",
    hill2: "#2a2630",
    ground: "#5c564e",
    groundDark: "#35312c",
    trim: "#d9d0c2",
    accent: "#8fd0c8",
    fog: "#121016",
  },
  {
    id: 2,
    name: "Forja dos Golens",
    boss: "Rei da Bigorna",
    sky0: "#140e0c",
    sky1: "#3a2014",
    sky2: "#6a3418",
    hill: "#1c1410",
    hill2: "#2e2016",
    ground: "#5a534c",
    groundDark: "#332e2a",
    trim: "#e08a3a",
    accent: "#c4373a",
    fog: "#160e0c",
  },
  {
    id: 3,
    name: "Mata Cega",
    boss: "A Árvore que Piscou",
    sky0: "#0c1410",
    sky1: "#163026",
    sky2: "#2a4a34",
    hill: "#102018",
    hill2: "#1c3424",
    ground: "#3e5a34",
    groundDark: "#24361e",
    trim: "#c6d48a",
    accent: "#6aaa48",
    fog: "#0c1610",
  },
  {
    id: 4,
    name: "Arquivo do Contrato",
    boss: "O Arquivista",
    sky0: "#100c16",
    sky1: "#22182e",
    sky2: "#3a2848",
    hill: "#140e1c",
    hill2: "#241428",
    ground: "#4a3c32",
    groundDark: "#2a221c",
    trim: "#e0b15a",
    accent: "#c9b6e0",
    fog: "#100c14",
  },
];

export const REEL_NAMES = [
  "Abertura fora de hora",
  "Pista dos ingressos vivos",
  "Roda que não para",
  "Camarim sem espelho",
  "Picadeiro do Verniz",
  "Escada que desce demais",
  "Coro sem pulmão",
  "Véu emprestado",
  "Ossuário com expediente",
  "Missa da Abadessa",
  "Esteira de sucata",
  "Bigorna quente",
  "Molde vazio",
  "Turno da noite",
  "Trono de Rebite",
  "Trilha que esquece",
  "Seiva doce demais",
  "Clareira sem céu",
  "Espinhos educados",
  "A árvore que piscou",
  "Prateleira 25",
  "Corredor de erratas",
  "Sala das cláusulas",
  "Carimbo final",
  "O Arquivista",
];

const POOLS: Kind[][] = [
  ["imp", "mask", "balloon"],
  ["skel", "witch", "undead"],
  ["golem", "troll", "imp"],
  ["thorn", "hound", "dryad"],
  ["wraith", "clerk", "witch"],
];

export type EntDef = {
  hp: number;
  w: number;
  h: number;
  speed: number;
  xp: number;
  behavior: Behavior;
  touch: number;
};

const ENT: Record<Kind, EntDef> = {
  imp: { hp: 2, w: 28, h: 32, speed: 70, xp: 8, behavior: "walk", touch: 1 },
  mask: { hp: 2, w: 30, h: 34, speed: 90, xp: 9, behavior: "jump", touch: 1 },
  balloon: { hp: 3, w: 34, h: 40, speed: 55, xp: 10, behavior: "fly", touch: 1 },
  skel: { hp: 3, w: 26, h: 44, speed: 78, xp: 10, behavior: "walk", touch: 1 },
  witch: { hp: 3, w: 30, h: 46, speed: 46, xp: 12, behavior: "shoot", touch: 1 },
  undead: { hp: 4, w: 32, h: 40, speed: 42, xp: 12, behavior: "walk", touch: 1 },
  golem: { hp: 7, w: 44, h: 52, speed: 32, xp: 16, behavior: "shoot", touch: 1 },
  troll: { hp: 6, w: 46, h: 52, speed: 48, xp: 15, behavior: "charge", touch: 1 },
  thorn: { hp: 3, w: 36, h: 42, speed: 0, xp: 11, behavior: "still", touch: 1 },
  hound: { hp: 3, w: 40, h: 28, speed: 120, xp: 11, behavior: "walk", touch: 1 },
  dryad: { hp: 4, w: 30, h: 50, speed: 40, xp: 13, behavior: "shoot", touch: 1 },
  wraith: { hp: 3, w: 32, h: 40, speed: 80, xp: 12, behavior: "fly", touch: 1 },
  clerk: { hp: 2, w: 28, h: 42, speed: 64, xp: 9, behavior: "shoot", touch: 1 },
  boss: { hp: 18, w: 84, h: 92, speed: 60, xp: 70, behavior: "boss", touch: 1 },
  candle: { hp: 1, w: 16, h: 24, speed: 0, xp: 0, behavior: "item", touch: 0 },
};

export function entDef(kind: Kind, world: number): EntDef {
  const base = ENT[kind];
  if (kind === "candle") return base;
  const scale = 1 + world * 0.15;
  const hp = kind === "boss" ? 18 + world * 6 : Math.max(1, Math.round(base.hp * scale));
  return { ...base, hp, speed: base.speed * (1 + world * 0.04) };
}

export function prologue(): Line[] {
  return [
    {
      who: "Arquivista",
      text: "Bem-vindos ao arquivo. Vocês assinaram “mais uma apresentação”. A plateia foi embora em mil novecentos e vinte e oito. O espetáculo, não.",
    },
    {
      who: "Ivo Marr",
      text: "Eu assinei achando que era recibo de figurino. Se a hitbox fosse honesta, eu processava o autor.",
    },
    {
      who: "Lena Vesper",
      text: "Morrer, para mim, é transporte. O incômodo é a papelada entre uma morte e outra.",
    },
    {
      who: "Osso Quill",
      text: "Eu li a cláusula vinte e cinco. Ela lê a gente de volta. Não recomendo em voz alta.",
    },
    {
      who: "Syl Auber",
      text: "A mata cega ainda está no roteiro. Alguém esqueceu de regar. Alguém esqueceu de parar.",
    },
    {
      who: "Arquivista",
      text: "Vinte e cinco rolos. Queimem todos e eu carimbo a rescisão. Morram e eu só reabro o mesmo rolo. Eficiência.",
    },
    {
      who: "Ivo Marr",
      text: "Traduzindo para quem está com o dedo no botão: corre, pula, atira. Não temos palhaço. Temos pior. Burocrata.",
    },
  ];
}

export function worldIntro(world: number): Line[] {
  if (world === 1) {
    return [
      { who: "Osso Quill", text: "Catacumbas de Medula. O aplauso virou eco, e o eco pediu atestado de óbito." },
      { who: "Lena Vesper", text: "Que cheiro é esse? Ah. Saudades mal arquivadas." },
      { who: "Syl Auber", text: "Se um esqueleto te cobrar ingresso, pede nota. Eles adoram nota. Não têm bolso." },
    ];
  }
  if (world === 2) {
    return [
      { who: "Ivo Marr", text: "Forja. Alguém animou sucata e chamou de elenco fixo. Sem sindicato, com rebite." },
      { who: "Osso Quill", text: "Golem é o que acontece quando um contrato ganha ombro e perde ironia." },
      { who: "Lena Vesper", text: "O calor aqui é quase afeto. Quase. Não encosta." },
    ];
  }
  if (world === 3) {
    return [
      { who: "Syl Auber", text: "Essa mata era gentil antes do roteiro ficar com fome. Agora ela pisca quando mente." },
      { who: "Osso Quill", text: "As plantas comem gente e ainda pedem avaliação do prato. Cinco espinhos." },
      { who: "Ivo Marr", text: "Se a árvore falar com voz mansa, corre. Mansa, aqui, é preâmbulo de mordida." },
    ];
  }
  if (world === 4) {
    return [
      {
        who: "Arquivista",
        text: "Última prateleira. Se chegaram aqui, ou são teimosos ou eu errei a curva de dificuldade. As duas coisas me divertem.",
      },
      {
        who: "Lena Vesper",
        text: "Quebra a quarta parede com cuidado. Do outro lado tem espectador, e espectador não assina rescisão.",
      },
      { who: "Syl Auber", text: "Então é isso. O final fica num arquivo. Típico de quem nunca soube terminar uma piada." },
    ];
  }
  return [];
}

export function bossIntro(world: number): Line[] {
  const lines: Line[][] = [
    [
      {
        who: "Arquivista",
        text: "Mestre Verniz não é palhaço. Palhaço quer riso. Verniz quer o esmalte de vocês. Diferença sutil. Resultado molhado.",
      },
      { who: "Ivo Marr", text: "Eu já dividi picadeiro com pior. Normalmente o pior era eu. Hoje eu terceirizo." },
    ],
    [
      {
        who: "Osso Quill",
        text: "A Abadessa reza para baixo. O inferno acha falta de educação, mas admira a frequência.",
      },
      { who: "Lena Vesper", text: "Véu é ótimo. Esconde olheira, intenção e, às vezes, um segundo maxilar." },
    ],
    [
      {
        who: "Ivo Marr",
        text: "O Rei da Bigorna não fala. O martelo fala. O martelo é ruim de piada e ótimo de ponto final.",
      },
      { who: "Syl Auber", text: "Não tenta dialogar com ferramenta. Eu já tentei com uma flecha. A flecha só concordou." },
    ],
    [
      {
        who: "Syl Auber",
        text: "Não é a floresta de ninguém. É a nossa. E ela pisca quando está com fome, não quando está triste.",
      },
      { who: "Osso Quill", text: "Se eu morrer para uma planta, escrevam “adubo voluntário”. Sem flor em cima. Ela come." },
    ],
    [
      {
        who: "Arquivista",
        text: "Eu seria o vilão, mas vilão é cargo comissionado. Eu sou arquivo-morto com opinião e carimbo ilimitado.",
      },
      { who: "Lena Vesper", text: "Então é você. O monstro final é atendimento ao cliente. Eu devia ter adivinhado no rolo um." },
    ],
  ];
  return lines[world] ?? [];
}

export function ending(): Line[] {
  return [
    { who: "Arquivista", text: "Rolo vinte e cinco. Carimbo. Rescisão. Vocês estão livres para ir embora." },
    { who: "Ivo Marr", text: "E o mundo? Fica no escuro, fazendo bico de cenário?" },
    {
      who: "Arquivista",
      text: "O mundo era a cláusula de rodapé. Ninguém lê. Ele fica. Vocês saem. Ou ficam para o bis, porque alguém sempre pede bis.",
    },
    { who: "Syl Auber", text: "Bis é maldição com aplauso. Eu já vi as duas coisas matarem do mesmo jeito." },
    {
      who: "Osso Quill",
      text: "Eu convoquei metade desse elenco do chão. Pediram crédito. Eu disse que o gênero não paga crédito, paga sequela.",
    },
    { who: "Lena Vesper", text: "Se isso foi um final feliz, o feliz estava na letra miúda, entre uma vírgula e um dente." },
    {
      who: "Arquivista",
      text: "Pode fechar. Eu continuo aqui. Alguém sempre reabre um arquivo. De preferência sem ler.",
    },
  ];
}

const DEATHS: Record<HeroId, string[]> = {
  ivo: [
    "Morri. De novo. O figurino nem teve tempo de rasgar com dignidade.",
    "Isso não entra no currículo. Entra no atestado.",
    "A plateia invisível aplaudiu. Eu odeio público imaginário.",
  ],
  lena: [
    "Transporte concluído. O destino é o mesmo checkpoint de sempre. Que original.",
    "Eu já morri com mais estilo. E com menos espinho.",
    "Não é dramático. É recorrente. Recorrente é pior.",
  ],
  osso: [
    "Anotem: o necromante também serve de matéria-prima. Constrangedor.",
    "Eu voltaria como convocação, mas o contrato exige que eu volte como eu. Péssimo benefício.",
    "Morte temporária. Como estágio. Como tudo aqui.",
  ],
  syl: [
    "Errei o pulo. A flecha, não. O chão é que é mal escrito.",
    "A mata não perdoa pressa. Eu também não. Empate.",
    "Respawn não é poesia. É teimosia com sprite.",
  ],
};

const CLEARS: Record<HeroId, string[]> = {
  ivo: [
    "Rolo queimado. Cheira a cabelo e cláusula vencida.",
    "Mais um. Se o próximo tiver escada, eu mordo a escada.",
  ],
  lena: [
    "Arquivado. Eu arquivaria melhor, mas estou ocupada não sangrando.",
    "O rolo acabou antes de mim. Raro. Vou fingir que foi talento.",
  ],
  osso: [
    "Mais um morto no currículo do morto. Coerente.",
    "Eu daria um discurso. O carimbo já fez o discurso. Sem graça, mas válido.",
  ],
  syl: [
    "Trilha fechada. Sem fita no peito. Sem plateia. Serve.",
    "A flecha chegou. Eu também. Nessa ordem, de preferência.",
  ],
};

const TOASTS: Record<HeroId, string> = {
  ivo: "A camisa rasgou. De novo. O figurino não é reembolsável.",
  lena: "Asas fora. Se alguém comentar a orelha, eu comento a jugular.",
  osso: "Caveira à mostra. O último que eu derrubei ganhou um crachá e uma ordem.",
  syl: "Orelha pontuda, três flechas, zero paciência. A mata que se explique.",
};

export function deathLine(hero: HeroId, n: number): string {
  const list = DEATHS[hero];
  return list[Math.abs(n) % list.length] ?? list[0]!;
}

export function clearLine(hero: HeroId, n: number): string {
  const list = CLEARS[hero];
  return list[Math.abs(n) % list.length] ?? list[0]!;
}

export function transformLine(hero: HeroId): string {
  return TOASTS[hero];
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Sketch {
  cols = 0;
  tiles: number[] = [];
  ents: LevelEnt[] = [];
  spawnC = 3;
  exitC = 4;

  private ensure(cols: number) {
    const next = new Array(ROWS * cols).fill(Tile.Air);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < this.cols; c++) next[r * cols + c] = this.tiles[r * this.cols + c] ?? Tile.Air;
    }
    this.tiles = next;
    this.cols = cols;
  }

  widen(w: number) {
    const start = this.cols;
    this.ensure(this.cols + w);
    return start;
  }

  get(c: number, r: number) {
    if (c < 0 || r < 0 || c >= this.cols || r >= ROWS) return Tile.Air;
    return this.tiles[r * this.cols + c] ?? Tile.Air;
  }

  set(c: number, r: number, t: number) {
    if (c < 0 || r < 0 || c >= this.cols || r >= ROWS) return;
    this.tiles[r * this.cols + c] = t;
  }

  fillFloor(c0: number, c1: number) {
    for (let c = c0; c < c1; c++) {
      for (let r = GROUND; r < ROWS; r++) this.set(c, r, Tile.Solid);
    }
  }

  ent(kind: Kind, c: number, foot = GROUND) {
    this.ents.push({ kind, c, foot });
  }
}

function segPlaza(sk: Sketch) {
  const x = sk.widen(28);
  sk.fillFloor(x, x + 28);
  sk.spawnC = x + 3;
  sk.set(x + 8, GROUND - 1, Tile.Checkpoint);
  for (let c = x + 14; c < x + 20; c++) sk.set(c, GROUND - 3, Tile.OneWay);
  sk.ent("candle", x + 12);
}

function segGap(sk: Sketch, gap: number) {
  const x = sk.widen(gap + 10);
  sk.fillFloor(x, x + 5);
  sk.fillFloor(x + 5 + gap, x + 10 + gap);
}

function segPlatforms(sk: Sketch, pool: Kind[], rng: () => number) {
  const x = sk.widen(30);
  sk.fillFloor(x, x + 30);
  const hs = [3, 4, 3];
  hs.forEach((h, i) => {
    const c0 = x + 3 + i * 9;
    for (let c = c0; c < c0 + 5; c++) sk.set(c, GROUND - h, Tile.OneWay);
  });
  sk.ent(pool[Math.floor(rng() * pool.length)] ?? "imp", x + 22);
  sk.ent(pool[0] ?? "imp", x + 8, GROUND - 3);
}

function segCombat(sk: Sketch, pool: Kind[], n: number, rng: () => number) {
  const x = sk.widen(32);
  sk.fillFloor(x, x + 32);
  for (let c = x + 6; c < x + 12; c++) sk.set(c, GROUND - 3, Tile.OneWay);
  for (let c = x + 18; c < x + 25; c++) sk.set(c, GROUND - 4, Tile.OneWay);
  for (let i = 0; i < n; i++) {
    const kind = pool[Math.floor(rng() * pool.length)] ?? "imp";
    const fly = kind === "balloon" || kind === "wraith";
    sk.ent(kind, x + 8 + i * 6, fly ? GROUND - 5 : GROUND);
  }
}

function segSpikes(sk: Sketch) {
  const x = sk.widen(26);
  sk.fillFloor(x, x + 26);
  for (let c = x + 6; c < x + 20; c++) sk.set(c, GROUND, Tile.Spike);
  for (let c = x + 7; c < x + 12; c++) sk.set(c, GROUND - 3, Tile.OneWay);
  for (let c = x + 15; c < x + 20; c++) sk.set(c, GROUND - 3, Tile.OneWay);
}

function segStairs(sk: Sketch, pool: Kind[]) {
  const x = sk.widen(36);
  sk.fillFloor(x, x + 36);
  let h = 0;
  for (let i = 0; i < 5; i++) {
    if (i > 0) h += 2;
    const c0 = x + 2 + i * 5;
    for (let c = c0; c < c0 + 4; c++) {
      for (let dy = 0; dy <= h; dy++) sk.set(c, GROUND - dy, Tile.Solid);
    }
  }
  sk.ent(pool[1] ?? pool[0] ?? "imp", x + 30);
}

function segClimb(sk: Sketch, pool: Kind[]) {
  const x = sk.widen(24);
  sk.fillFloor(x, x + 24);
  for (let i = 0; i < 4; i++) {
    const c0 = x + 2 + (i % 2) * 10;
    const row = GROUND - 3 - i * 2;
    for (let k = 0; k < 6; k++) sk.set(c0 + k, row, Tile.OneWay);
  }
  const fly = pool.find((k) => k === "balloon" || k === "wraith");
  if (fly) sk.ent(fly, x + 16, GROUND - 6);
  else sk.ent(pool[0] ?? "imp", x + 18);
}

function segSpring(sk: Sketch) {
  const x = sk.widen(26);
  sk.fillFloor(x, x + 26);
  sk.set(x + 4, GROUND, Tile.Spring);
  for (let c = x + 14; c < x + 24; c++) sk.set(c, GROUND - 5, Tile.Solid);
  for (let r = GROUND - 5; r < ROWS; r++) sk.set(x + 23, r, Tile.Solid);
  sk.ent("candle", x + 18, GROUND - 5);
}

function segTunnel(sk: Sketch, pool: Kind[]) {
  const x = sk.widen(28);
  sk.fillFloor(x, x + 28);
  for (let c = x + 4; c < x + 22; c++) sk.set(c, GROUND - 3, Tile.Solid);
  sk.ent(pool[0] ?? "imp", x + 12);
  sk.ent(pool[2] ?? pool[0] ?? "imp", x + 18);
}

function segCheckpoint(sk: Sketch) {
  const x = sk.widen(12);
  sk.fillFloor(x, x + 12);
  sk.set(x + 6, GROUND - 1, Tile.Checkpoint);
  sk.ent("candle", x + 9);
}

function segArena(sk: Sketch) {
  const x = sk.widen(40);
  sk.fillFloor(x, x + 40);
  sk.set(x + 3, GROUND - 1, Tile.Checkpoint);
  for (let c = x + 8; c < x + 15; c++) sk.set(c, GROUND - 4, Tile.OneWay);
  for (let c = x + 24; c < x + 31; c++) sk.set(c, GROUND - 4, Tile.OneWay);
  sk.ent("boss", x + 30);
  sk.exitC = x + 36;
}

function segFinale(sk: Sketch) {
  const x = sk.widen(18);
  sk.fillFloor(x, x + 18);
  sk.set(x + 6, GROUND - 1, Tile.Checkpoint);
  sk.ent("candle", x + 4);
  sk.exitC = x + 14;
}

/** quanto mais fundo o rolo, mais monstros: espalha reforços pelo chão da fase */
function addCrowd(sk: Sketch, i: number, world: number, boss: boolean, rng: () => number) {
  const extra = Math.floor(i * 0.6) + (i >= 10 ? 1 : 0);
  if (extra <= 0) return;
  const pools = [POOLS[world] ?? POOLS[0]!, POOLS[(world + 4) % 5]!, POOLS[(world + 1) % 5]!];
  const cands: number[] = [];
  const end = sk.cols - (boss ? 46 : 20);
  for (let c = sk.spawnC + 10; c < end; c++) {
    if (sk.get(c, GROUND) !== Tile.Solid) continue;
    if (sk.get(c, GROUND - 1) !== Tile.Air || sk.get(c, GROUND - 2) !== Tile.Air) continue;
    if (sk.get(c - 1, GROUND) !== Tile.Solid || sk.get(c + 1, GROUND) !== Tile.Solid) continue;
    cands.push(c);
  }
  for (let k = cands.length - 1; k > 0; k--) {
    const j = Math.floor(rng() * (k + 1));
    [cands[k], cands[j]] = [cands[j]!, cands[k]!];
  }
  let placed = 0;
  for (const c of cands) {
    if (placed >= extra) break;
    if (sk.ents.some((e) => Math.abs(e.c - c) < 3)) continue;
    const pool = pools[i >= 6 && rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0]!;
    const kind = pool[Math.floor(rng() * pool.length)] ?? "imp";
    const fly = kind === "balloon" || kind === "wraith";
    sk.ent(kind, c, fly ? GROUND - 4 : GROUND);
    placed += 1;
  }
}

function fixEnts(sk: Sketch) {
  for (const e of sk.ents) {
    const def = ENT[e.kind];
    if (def.behavior === "fly") {
      e.foot = Math.min(GROUND - 4, Math.max(3, e.foot));
      continue;
    }
    if (e.c < 1) e.c = 1;
    if (e.c >= sk.cols - 1) e.c = sk.cols - 2;
    let guard = 0;
    while (guard++ < 8) {
      const t = sk.get(e.c, e.foot);
      const surface = t === Tile.Solid || t === Tile.OneWay || t === Tile.Spring;
      if (surface) break;
      if (sk.get(e.c, GROUND) === Tile.Solid || sk.get(e.c, GROUND) === Tile.Spring) {
        e.foot = GROUND;
        break;
      }
      e.c += 1;
    }
  }
}

export function buildLevel(index: number): Level {
  const i = Math.max(0, Math.min(24, index));
  const world = Math.floor(i / 5);
  const stage = i % 5;
  const boss = stage === 4;
  const rng = mulberry32(900 + i * 131);
  const pool = POOLS[world] ?? POOLS[0]!;
  const sk = new Sketch();
  segPlaza(sk);
  const beats = boss ? 8 : 10 + stage * 2;
  for (let b = 0; b < beats; b++) {
    const pick = (i * 3 + b * 5) % 9;
    if (pick === 0) segGap(sk, 2 + ((stage + b) % 2));
    else if (pick === 1) segPlatforms(sk, pool, rng);
    else if (pick === 2) segCombat(sk, pool, 2 + (stage > 1 ? 1 : 0), rng);
    else if (pick === 3) segSpikes(sk);
    else if (pick === 4) segStairs(sk, pool);
    else if (pick === 5) segClimb(sk, pool);
    else if (pick === 6) segSpring(sk);
    else if (pick === 7) segTunnel(sk, pool);
    else segCombat(sk, pool, 3, rng);
    if (b === 3 || b === 7 || b === 11) segCheckpoint(sk);
  }
  if (boss) segArena(sk);
  else segFinale(sk);
  addCrowd(sk, i, world, boss, rng);
  fixEnts(sk);
  return {
    index: i,
    name: REEL_NAMES[i] ?? `Rolo ${i + 1}`,
    world,
    boss,
    cols: sk.cols,
    rows: ROWS,
    tiles: Uint8Array.from(sk.tiles),
    ents: sk.ents,
    spawn: { c: sk.spawnC, foot: GROUND },
    exit: { c: sk.exitC, foot: GROUND },
  };
}

export function reelWorld(index0: number) {
  return WORLDS[Math.floor(index0 / 5)] ?? WORLDS[0]!;
}

/* Cada fase de um mundo ganha um clima próprio (entardecer, noite funda, névoa, chefe...). */
const STAGE_TINT: { c: string; k: number }[][] = [
  [{ c: "#000000", k: 0 }, { c: "#ff7a3a", k: 0.2 }, { c: "#2a4fa0", k: 0.24 }, { c: "#7a2aa0", k: 0.22 }, { c: "#a01820", k: 0.3 }],
  [{ c: "#000000", k: 0 }, { c: "#3a8a9a", k: 0.22 }, { c: "#5a3a8a", k: 0.24 }, { c: "#8a8a4a", k: 0.18 }, { c: "#8a1a3a", k: 0.28 }],
  [{ c: "#000000", k: 0 }, { c: "#ff5a1a", k: 0.22 }, { c: "#aa2a0a", k: 0.26 }, { c: "#3a3a5a", k: 0.24 }, { c: "#ffaa30", k: 0.24 }],
  [{ c: "#000000", k: 0 }, { c: "#8aca3a", k: 0.2 }, { c: "#1a5a8a", k: 0.24 }, { c: "#aa5ac0", k: 0.22 }, { c: "#3aaa6a", k: 0.24 }],
  [{ c: "#000000", k: 0 }, { c: "#c0a050", k: 0.22 }, { c: "#3a4a9a", k: 0.24 }, { c: "#9a3a6a", k: 0.22 }, { c: "#e0d0ff", k: 0.2 }],
];

function mixHex(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const o = pa.map((v, i) => Math.round(v + (pb[i]! - v) * k));
  return "#" + o.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function themedWorld(world: number, stage: number): WorldDef {
  const base = WORLDS[world] ?? WORLDS[0]!;
  const t = STAGE_TINT[world]?.[stage % 5];
  if (!t || t.k === 0) return base;
  const m = (c: string, k = 1) => mixHex(c, t.c, t.k * k);
  return {
    ...base,
    sky0: m(base.sky0, 0.8),
    sky1: m(base.sky1),
    sky2: m(base.sky2, 1.2),
    hill: m(base.hill, 0.8),
    hill2: m(base.hill2),
    ground: m(base.ground, 0.5),
    groundDark: m(base.groundDark, 0.5),
    fog: m(base.fog, 0.9),
    accent: m(base.accent, 0.4),
  };
}

/* ---- poderes novos: 2 unitários, 1 em área comum, 1 super em área ---- */
export const SKILL_LV = [2, 3, 4, 6];
export const SKILL_CD = [1.4, 2.2, 3.4, 18];
export const SKILL_KEYS = ["U", "I", "O", "P"];
export const SKILL_KINDS = ["Unitário", "Unitário", "Área", "Super área"];

export const SKILLS: Record<HeroId, { name: string; color: string; text: string }[]> = {
  ivo: [
    { name: "Bala de Prata", color: "#d8dce8", text: "Projétil que persegue o alvo mais próximo." },
    { name: "Garra do Lobo", color: "#e0b15a", text: "Investida cortante: atravessa o espaço e rasga um alvo." },
    { name: "Estouro de Palco", color: "#ff9a4a", text: "Onda de choque em volta; empurra e fere todos perto." },
    { name: "Noite de Lua Cheia", color: "#f4e4c8", text: "Uivo em tela inteira: fere todos os monstros visíveis." },
  ],
  lena: [
    { name: "Dardo Sanguíneo", color: "#ff3a4a", text: "Dardo de tinta que caça o alvo mais próximo." },
    { name: "Mordida Sombria", color: "#c4373a", text: "Salta em sombra e crava num alvo à frente." },
    { name: "Revoada", color: "#b06ad0", text: "Morcegos em espiral ferem tudo em volta." },
    { name: "Eclipse Carmesim", color: "#ff2a5a", text: "A tela escurece e sangra: dano enorme em todos os visíveis." },
  ],
  osso: [
    { name: "Osso Teleguiado", color: "#f1ead8", text: "Osso que gira atrás do alvo mais próximo." },
    { name: "Pancada de Cajado", color: "#9fd4d8", text: "Avanço com cajado fantoche: golpe pesado em um alvo." },
    { name: "Dança dos Fios", color: "#c8c2b4", text: "Fios cortam todos que estão por perto." },
    { name: "Grande Final", color: "#9fd4d8", text: "Aplausos fatais: dano enorme em todos os monstros visíveis." },
  ],
  syl: [
    { name: "Flecha Caçadora", color: "#d2e39a", text: "Flecha que curva até o alvo mais próximo." },
    { name: "Corte Ágil", color: "#9bd46a", text: "Rolamento cortante: atravessa e fere um alvo." },
    { name: "Chuva de Folhas", color: "#6aaa48", text: "Folhas afiadas em volta ferem todos perto." },
    { name: "Floresta Viva", color: "#d2ff7a", text: "Raízes e luz da mata atingem todos os monstros visíveis." },
  ],
};
