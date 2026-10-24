import {
  type Behavior,
  type HeroId,
  type Kind,
  type Line,
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
  {
    id: "tito",
    name: "Tito Brasa",
    role: "Engolidor de fogo",
    formName: "Dragão",
    blurb: "Assinou por seguro de vida. O seguro assinou por ele e sumiu.",
    voice: "Fogo não é truque. Truque é a cláusula de incêndio.",
    attack: "Bola de brasa. Em forma de dragão, queima tudo em volta.",
    skin: "#d79a6a",
    hair: "#2a140c",
    cloth: "#7a1410",
    cloth2: "#1c1210",
    shoe: "#3a2418",
    accent: "#ff7a2a",
  },
  {
    id: "mari",
    name: "Marina Sal",
    role: "Sereia de aquário",
    formName: "Maré",
    blurb: "Trabalhava no tanque da entrada. Trocaram a água pelo contrato.",
    voice: "Pernas são um aluguel caro. Eu pago em tinta e em sal.",
    attack: "Bolha salgada em arco. Em forma de maré, nada pelo ar.",
    skin: "#bfe4e0",
    hair: "#1f6f86",
    cloth: "#1c8a9a",
    cloth2: "#e0b15a",
    shoe: "#146070",
    accent: "#4ac0e0",
  },
  {
    id: "pia",
    name: "Pia Granito",
    role: "Gárgula de torre",
    formName: "Pedra",
    blurb: "Vigiava o telhado do cinema. Foi demitida por piscar.",
    voice: "Eu não sou pesada. Eu sou definitiva.",
    attack: "Estilhaço de pedra. Em forma de pedra, aguenta e esmaga.",
    skin: "#9aa0a8",
    hair: "#4a4e56",
    cloth: "#6a6e78",
    cloth2: "#3a3d46",
    shoe: "#2a2c32",
    accent: "#c0c8d4",
  },
  {
    id: "lumen",
    name: "Doutor Lúmen",
    role: "Eletricista fantasma",
    formName: "Raio",
    blurb: "Morreu religando o refletor. O refletor continua aceso. Ele, também.",
    voice: "Todo mundo teme o escuro. Eu temo a fiação.",
    attack: "Faísca perfurante. Em forma de raio, corre e dispara em leque.",
    skin: "#d8e6f0",
    hair: "#e8e0a0",
    cloth: "#2a4a8a",
    cloth2: "#e0c030",
    shoe: "#1a1c28",
    accent: "#ffe24a",
  },
];

export function heroById(id: HeroId): HeroDef {
  return HEROES.find((h) => h.id === id) ?? HEROES[0]!;
}

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
  {
    id: 5,
    name: "Dunas do Sol Morto",
    boss: "Faraó Sem Fim",
    sky0: "#2a1a10",
    sky1: "#6a3a1c",
    sky2: "#c47a34",
    hill: "#4a2c18",
    hill2: "#7a4a24",
    ground: "#b88a50",
    groundDark: "#7a5a30",
    trim: "#ffd27a",
    accent: "#ffb23a",
    fog: "#2a1a10",
  },
  {
    id: 6,
    name: "Geleira Silenciosa",
    boss: "Rainha do Gelo Fino",
    sky0: "#0a1424",
    sky1: "#1c3a5a",
    sky2: "#5a8ab0",
    hill: "#142a42",
    hill2: "#2a4a6a",
    ground: "#a8c4d8",
    groundDark: "#6a8aa4",
    trim: "#e8f6ff",
    accent: "#7ad8ff",
    fog: "#0c1a2c",
  },
  {
    id: 7,
    name: "Lagoa dos Náufragos",
    boss: "Capitão Maré",
    sky0: "#04121a",
    sky1: "#0c3a4a",
    sky2: "#1a7a84",
    hill: "#082a34",
    hill2: "#104a54",
    ground: "#4a7a74",
    groundDark: "#2a4a48",
    trim: "#a8f0e0",
    accent: "#3ad8b4",
    fog: "#06181e",
  },
  {
    id: 8,
    name: "Cidadela Celeste",
    boss: "Arcanjo do Contrato",
    sky0: "#1a1840",
    sky1: "#4a4a9a",
    sky2: "#c4a4e0",
    hill: "#2a2a6a",
    hill2: "#5a5aa0",
    ground: "#d8d0e8",
    groundDark: "#9a90b8",
    trim: "#fff2b0",
    accent: "#ffe27a",
    fog: "#1a1a44",
  },
  {
    id: 9,
    name: "Palácio do Empresário",
    boss: "O Empresário",
    sky0: "#14040a",
    sky1: "#4a0c1c",
    sky2: "#8a1a2c",
    hill: "#22060e",
    hill2: "#4a0e1a",
    ground: "#3a2a2e",
    groundDark: "#1e1418",
    trim: "#ffd24a",
    accent: "#ff3a4a",
    fog: "#14040a",
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
  "Areia com prazo",
  "Duna de segunda mão",
  "Oásis de fachada",
  "Tumba sem luz",
  "Trono do Faraó",
  "Neve que não derrete",
  "Lago de vidro fosco",
  "Ponte de gelo fino",
  "Caverna do eco azul",
  "Palácio da Rainha",
  "Maré baixa de nós",
  "Cais dos desaparecidos",
  "Recife com opinião",
  "Naufrágio em cartaz",
  "Convés do Capitão",
  "Escada de nuvem",
  "Jardim suspenso",
  "Ponte de harpas",
  "Torre dos querubins",
  "Coroa do Arcanjo",
  "Foyer do fim",
  "Corredor de ouro velho",
  "Salão dos bufões",
  "Cofre sem fundo",
  "O Empresário",
];

export const BONUS_NAMES = [
  "Bis: Tesouro do Picadeiro",
  "Bis: Cofre da Abadessa",
  "Bis: Mina da Forja",
  "Bis: Clareira do Dízimo",
  "Bis: Gaveta Dourada",
  "Bis: Oásis do Faraó",
  "Bis: Lago Congelado",
  "Bis: Baú do Capitão",
  "Bis: Nuvem de Prata",
  "Bis: Camarote do Dono",
];

export const POOLS: Kind[][] = [
  ["imp", "mask", "balloon"],
  ["skel", "witch", "undead"],
  ["golem", "troll", "imp"],
  ["thorn", "hound", "dryad"],
  ["wraith", "clerk", "witch"],
  ["scorp", "mummy", "gull"],
  ["snowman", "yeti", "wraith"],
  ["crab", "gull", "shade"],
  ["cherub", "gargoyle", "wraith"],
  ["jester", "gargoyle", "shade"],
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

export const ENT: Record<Kind, EntDef> = {
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
  crab: { hp: 4, w: 36, h: 26, speed: 95, xp: 12, behavior: "walk", touch: 1 },
  gull: { hp: 3, w: 36, h: 26, speed: 100, xp: 12, behavior: "fly", touch: 1 },
  scorp: { hp: 4, w: 40, h: 26, speed: 70, xp: 13, behavior: "shoot", touch: 1 },
  mummy: { hp: 7, w: 30, h: 46, speed: 38, xp: 14, behavior: "walk", touch: 1 },
  snowman: { hp: 5, w: 36, h: 46, speed: 30, xp: 13, behavior: "shoot", touch: 1 },
  yeti: { hp: 9, w: 48, h: 54, speed: 52, xp: 17, behavior: "charge", touch: 1 },
  cherub: { hp: 4, w: 30, h: 34, speed: 78, xp: 14, behavior: "fly", touch: 1 },
  gargoyle: { hp: 8, w: 40, h: 46, speed: 80, xp: 17, behavior: "jump", touch: 1 },
  shade: { hp: 5, w: 30, h: 42, speed: 92, xp: 15, behavior: "fly", touch: 1 },
  jester: { hp: 6, w: 30, h: 44, speed: 112, xp: 16, behavior: "jump", touch: 1 },
  chest: { hp: 1, w: 34, h: 28, speed: 0, xp: 0, behavior: "item", touch: 0 },
  boss: { hp: 18, w: 84, h: 92, speed: 60, xp: 70, behavior: "boss", touch: 1 },
  candle: { hp: 1, w: 16, h: 24, speed: 0, xp: 0, behavior: "item", touch: 0 },
};

export function entDef(kind: Kind, world: number, mini = false): EntDef {
  const base = ENT[kind];
  if (kind === "candle" || kind === "chest") return base;
  const scale = 1.4 + world * 0.34;
  const xpK = 1 + world * 0.4;
  if (kind === "boss") {
    const hp = mini ? 18 + world * 7 : 34 + world * 15;
    return {
      ...base,
      hp,
      w: mini ? 60 : base.w,
      h: mini ? 66 : base.h,
      xp: Math.round((mini ? 40 : 90) * xpK),
      speed: base.speed * (mini ? 0.9 : 1),
    };
  }
  const hp = Math.max(1, Math.round(base.hp * scale));
  return { ...base, hp, xp: Math.round(base.xp * xpK), speed: base.speed * (1 + world * 0.035) };
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
  if (world === 5) {
    return [
      { who: "Arquivista", text: "Vocês acharam que o carimbo final era final. Adorável. O contrato tinha um aditivo, e o aditivo tem areia." },
      { who: "Ivo Marr", text: "Areia. Claro. Todo roteiro que perde o orçamento manda a gente para o deserto." },
      { who: "Lena Vesper", text: "Sol morto. Pelo menos aqui ninguém me pede para sair do camarim." },
    ];
  }
  if (world === 6) {
    return [
      { who: "Syl Auber", text: "Gelo. Do tipo que não racha, só julga. Pisa leve e cala a boca." },
      { who: "Osso Quill", text: "Os mortos aqui estão conservados. Conservados e ressentidos. Combinação perigosa." },
    ];
  }
  if (world === 7) {
    return [
      { who: "Lena Vesper", text: "Lagoa. Água parada com opinião. Eu já morri em lugares menos úmidos." },
      { who: "Ivo Marr", text: "Se um caranguejo perguntar do contrato, a resposta é não. A pinça é só retórica." },
      { who: "Osso Quill", text: "Naufrágio é só um funeral com maré. Eu respeito o formato." },
    ];
  }
  if (world === 8) {
    return [
      { who: "Syl Auber", text: "Céu. Eu só subo em árvore, não em fórum de anjo." },
      { who: "Osso Quill", text: "Querubim é bebê com ficha criminal. Não encosta, não amamenta, não perdoa." },
      { who: "Lena Vesper", text: "Se eu cair daqui, tenho asas. Se vocês caírem, tenho pena. Pouca." },
    ];
  }
  if (world === 9) {
    return [
      { who: "Empresário", text: "Entrem. O contrato nunca foi do Arquivista. Ele só guardava. Eu assino." },
      { who: "Ivo Marr", text: "Então o dono do circo era um gerente de contas." },
      { who: "Lena Vesper", text: "Última porta. Se o carpete for macio, é armadilha." },
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
    [
      { who: "Ivo Marr", text: "Faraó Sem Fim. O fim já era com ele, mas ele não aceitou o aviso." },
      { who: "Osso Quill", text: "Múmia de gabinete. Enrolado em prazos que venceram na era errada." },
    ],
    [
      { who: "Syl Auber", text: "A Rainha do Gelo Fino. Fino para ela. Para nós, gelo suficiente para uma queda longa." },
      { who: "Lena Vesper", text: "Não encara. Vidro fosco também reflete, e reflexo morde." },
    ],
    [
      { who: "Osso Quill", text: "O Capitão Maré nunca naufragou. Foram os outros que afundaram ao redor dele." },
      { who: "Ivo Marr", text: "Capitão sem navio é gerente de crise. Vamos tirar o crachá." },
    ],
    [
      { who: "Lena Vesper", text: "O Arcanjo do Contrato. Anjo com cláusula. Quando ele sorri, alguém perde algo." },
      { who: "Syl Auber", text: "Fiquem fora das sombras das asas. Penas pesam mais que parecem." },
    ],
    [
      { who: "Empresário", text: "Vocês rendem bem em audiência. Rendem melhor em bilheteria. Fiquem. A plateia paga." },
      { who: "Ivo Marr", text: "Eu nunca briguei por dinheiro. Hoje abro exceção. É por mim, pelos três e pelo rolo." },
    ],
  ];
  return lines[world] ?? [];
}

export function miniIntro(world: number): Line[] {
  const names = ["o Contorcionista de Verniz", "um Frade Sem Ata", "o Capataz de Rebite", "o Guardião do Tronco", "um Escriba Furioso", "o Escaravelho Real", "o Urso de Geada", "o Fiscal da Maré", "o Serafim Menor", "o Mordomo Dourado"];
  return [{ who: "Arquivista", text: `No meio do caminho, ${names[world % 10]}. Mini-chefe: derrote para ganhar tesouro.` }];
}

export function midEnding(): Line[] {
  return [
    { who: "Arquivista", text: "Rolo vinte e cinco. Carimbo. Rescisão. Vocês estão livres para ir embora." },
    { who: "Ivo Marr", text: "E o mundo? Fica no escuro, fazendo bico de cenário?" },
    { who: "Arquivista", text: "O mundo era a cláusula de rodapé. Ninguém lê. Mas alguém assinou o rodapé, e não fui eu." },
    { who: "Lena Vesper", text: "Então tem outro dono. Um que usa mais areia, mais gelo e mais ouro." },
    { who: "Syl Auber", text: "O bis. Eu sabia. Bis é maldição com aplauso." },
    { who: "Osso Quill", text: "Mais vinte e cinco rolos. O estágio não acabou. Só mudou de cidade." },
  ];
}

export function ending(): Line[] {
  return [
    { who: "Empresário", text: "Rolo cinquenta. Rescisão. Sem cláusula. Sem bis. Sem mim." },
    { who: "Ivo Marr", text: "Então acabou. De verdade, dessa vez? Sem aditivo?" },
    { who: "Arquivista", text: "Sem aditivo. Eu mesmo li o rodapé. Ninguém mais assina por vocês." },
    { who: "Syl Auber", text: "Bis, só se for por vontade. Sem plateia invisível dizendo o que fazer." },
    { who: "Osso Quill", text: "Convoquei metade desse elenco do chão. Hoje eles pedem folga. Concedida." },
    { who: "Lena Vesper", text: "Se isso foi um final feliz, o feliz estava na letra miúda. Mas dessa vez eu li." },
    { who: "Arquivista", text: "Pode fechar. Ou reabrir, se quiser rejogar com tudo que ganhou. O arquivo é seu." },
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
  tito: [
    "Apagaram o artista. Ficou só a fumaça e o boletim de ocorrência.",
    "Eu cuspo fogo. O chão cospe de volta, e com mais pontaria.",
    "Seguro não cobre morte recorrente. Já li a letra miúda duas vezes.",
  ],
  mari: [
    "Afoguei no seco. É uma habilidade que eu não pedi.",
    "O tanque era menor e mais seguro. Ninguém me escuta.",
    "Sal na ferida é figura de linguagem. Aqui é rotina.",
  ],
  pia: [
    "Caí. Gárgula cai de telhado. Só não costuma ter plateia.",
    "Pedra não quebra. Racha com dignidade. Já racho de novo.",
    "Eu avisei que era pesada. Ninguém leu o aviso.",
  ],
  lumen: [
    "Curto-circuito. Dessa vez, o meu.",
    "Morri de novo. A conta de luz do além deve estar enorme.",
    "Fiz tudo certo. A fiação discordou, como sempre.",
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
  tito: [
    "Rolo queimado. Literalmente, e dessa vez fui eu.",
    "Apaguem as luzes. Eu faço o resto, com educação e com gasolina.",
  ],
  mari: [
    "Atravessei mais um rolo a nado, mesmo sem água. Anotem o recorde.",
    "O rolo secou. Eu não. Ainda.",
  ],
  pia: [
    "Pronto. Pedra no caminho agora é de quem passa.",
    "Terminei. Pode me colocar no telhado de novo.",
  ],
  lumen: [
    "Luz acesa. Nem eu acredito.",
    "Rolo ligado na tomada certa. Raro.",
  ],
};

const TOASTS: Record<HeroId, string> = {
  ivo: "A camisa rasgou. De novo. O figurino não é reembolsável.",
  lena: "Asas fora. Se alguém comentar a orelha, eu comento a jugular.",
  osso: "Caveira à mostra. O último que eu derrubei ganhou um crachá e uma ordem.",
  syl: "Orelha pontuda, três flechas, zero paciência. A mata que se explique.",
  tito: "Dragão. O contrato disse 'efeito pirotécnico'. Eu interpretei com generosidade.",
  mari: "Maré alta! Se alguém falar de pernas de novo, eu vazo.",
  pia: "Pedra. Agora eu posso ser a parede que vocês nunca tiveram.",
  lumen: "Raio. Se alguém perguntar, foi tudo dentro da norma.",
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

export function reelWorld(index0: number) {
  const w = index0 >= 50 ? index0 - 50 : Math.floor(index0 / 5);
  return WORLDS[w] ?? WORLDS[0]!;
}

export const MINI_NAMES = ["Contorcionista", "Frade Sem Ata", "Capataz de Rebite", "Guardião do Tronco", "Escriba Furioso", "Escaravelho Real", "Urso de Geada", "Fiscal da Maré", "Serafim Menor", "Mordomo Dourado"];

/* Cada fase de um mundo ganha um clima próprio (entardecer, noite funda, névoa, chefe...). */
const STAGE_TINT: { c: string; k: number }[][] = [
  [{ c: "#000000", k: 0 }, { c: "#ff7a3a", k: 0.2 }, { c: "#2a4fa0", k: 0.24 }, { c: "#7a2aa0", k: 0.22 }, { c: "#a01820", k: 0.3 }],
  [{ c: "#000000", k: 0 }, { c: "#3a8a9a", k: 0.22 }, { c: "#5a3a8a", k: 0.24 }, { c: "#8a8a4a", k: 0.18 }, { c: "#8a1a3a", k: 0.28 }],
  [{ c: "#000000", k: 0 }, { c: "#ff5a1a", k: 0.22 }, { c: "#aa2a0a", k: 0.26 }, { c: "#3a3a5a", k: 0.24 }, { c: "#ffaa30", k: 0.24 }],
  [{ c: "#000000", k: 0 }, { c: "#8aca3a", k: 0.2 }, { c: "#1a5a8a", k: 0.24 }, { c: "#aa5ac0", k: 0.22 }, { c: "#3aaa6a", k: 0.24 }],
  [{ c: "#000000", k: 0 }, { c: "#c0a050", k: 0.22 }, { c: "#3a4a9a", k: 0.24 }, { c: "#9a3a6a", k: 0.22 }, { c: "#e0d0ff", k: 0.2 }],
  [{ c: "#000000", k: 0 }, { c: "#ffcc60", k: 0.2 }, { c: "#a0482a", k: 0.24 }, { c: "#2a2a5a", k: 0.28 }, { c: "#ffe090", k: 0.22 }],
  [{ c: "#000000", k: 0 }, { c: "#a8e0ff", k: 0.2 }, { c: "#3a4a9a", k: 0.24 }, { c: "#a0f0e0", k: 0.2 }, { c: "#c0d8ff", k: 0.24 }],
  [{ c: "#000000", k: 0 }, { c: "#ff9a5a", k: 0.2 }, { c: "#1a3a7a", k: 0.28 }, { c: "#3aaa8a", k: 0.22 }, { c: "#7a2a4a", k: 0.24 }],
  [{ c: "#000000", k: 0 }, { c: "#ffd0a0", k: 0.2 }, { c: "#7a5ad0", k: 0.24 }, { c: "#ff9ac0", k: 0.2 }, { c: "#fff2c0", k: 0.26 }],
  [{ c: "#000000", k: 0 }, { c: "#c0302a", k: 0.22 }, { c: "#ffb020", k: 0.2 }, { c: "#6a1a6a", k: 0.26 }, { c: "#ff2030", k: 0.3 }],
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
export const SKILL_LV = [1, 1, 1, 1];
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
  tito: [
    { name: "Cometa de Brasa", color: "#ff9a3a", text: "Bola de fogo que persegue o alvo mais próximo." },
    { name: "Cuspe de Dragão", color: "#ff5a1a", text: "Avanço em chamas: atravessa e queima um alvo." },
    { name: "Anel de Fogo", color: "#ffb04a", text: "Círculo de chamas em volta; empurra e fere quem está perto." },
    { name: "Grande Incêndio", color: "#ff3a1a", text: "Tempestade de fogo: dano enorme em todos os monstros visíveis." },
  ],
  mari: [
    { name: "Bolha Caçadora", color: "#8fe4ff", text: "Bolha salgada que segue o alvo mais próximo." },
    { name: "Mergulho Cortante", color: "#4ac0e0", text: "Mergulho no ar: atravessa e fere um alvo." },
    { name: "Onda Curta", color: "#5ad0e8", text: "Onda em volta: empurra e fere todos perto." },
    { name: "Maremoto", color: "#2a9ad0", text: "Parede de água em tela inteira: fere todos os monstros visíveis." },
  ],
  pia: [
    { name: "Estilhaço Guiado", color: "#c0c8d4", text: "Pedra afiada que persegue o alvo mais próximo." },
    { name: "Mergulho de Gárgula", color: "#9aa4b0", text: "Investida pesada: atravessa e esmaga um alvo." },
    { name: "Pisão", color: "#8a929c", text: "Abalo em volta: empurra e fere todos perto." },
    { name: "Desabamento", color: "#d0d6e0", text: "Chuva de pedras em tela inteira: fere todos os monstros visíveis." },
  ],
  lumen: [
    { name: "Faísca Caçadora", color: "#ffee6a", text: "Faísca que busca o alvo mais próximo." },
    { name: "Curto-Circuito", color: "#ffd02a", text: "Descarga em linha: atravessa e fere um alvo." },
    { name: "Pulso Elétrico", color: "#a0e0ff", text: "Pulso em volta: empurra e fere todos perto." },
    { name: "Apagão", color: "#ffffff", text: "A luz some e volta num raio: dano enorme em todos os monstros visíveis." },
  ],
};
