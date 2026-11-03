import type { Kind } from "./types";
import { REEL_NAMES, type WorldDef } from "./content";

/** estilo do ambiente: define as paredes, o teto e a decoração do reino */
export type RealmStyle = "mansion" | "cave" | "swamp" | "city" | "ice" | "ruin" | "garden" | "cloud" | "gold";

export type RealmMini = { look: Kind; name: string };

export type RealmTheme = {
  style: RealmStyle;
  /** mundo de ambiência (partículas, fundo, clima): 0..9 */
  amb: number;
  /** faixa de música base 0..9 */
  music: number;
  boss: string;
  pool: Kind[];
  minis: RealmMini[];
  /** nomes dos cômodos deste reino */
  rooms: string[];
  entry: string;
  stairs: string;
  bossRoom: string;
  pal: { s0: string; s1: string; s2: string; hill: string; hill2: string; ground: string; dark: string; trim: string; accent: string; fog: string };
};

const P = (s0: string, s1: string, s2: string, hill: string, hill2: string, ground: string, dark: string, trim: string, accent: string, fog: string) => ({ s0, s1, s2, hill, hill2, ground, dark, trim, accent, fog });

export const REALM_THEMES: RealmTheme[] = [
  {
    style: "mansion", amb: 0, music: 0, boss: "Mestre Verniz", pool: ["imp", "mask", "balloon", "jester", "clerk"],
    minis: [{ look: "jester", name: "Contorcionista" }, { look: "knight", name: "Mordomo Dourado" }, { look: "clerk", name: "Escriba Furioso" }, { look: "golem", name: "Capataz de Rebite" }, { look: "gargoyle", name: "Guardião do Candelabro" }],
    rooms: ["Salão das Sombras", "Sala de Jantar", "Biblioteca Proibida", "Galeria de Espelhos", "Escritório", "Sala das Lâminas"], entry: "Saguão de Entrada", stairs: "Escadaria", bossRoom: "Salão do Trono",
    pal: P("#140c18", "#3a1a32", "#6a3044", "#24101c", "#3a1830", "#7a4034", "#4a241c", "#e0b15a", "#c4373a", "#1a0c14"),
  },
  {
    style: "swamp", amb: 7, music: 7, boss: "Caronte, o Barqueiro", pool: ["shade", "wraith", "undead", "crab", "gull"],
    minis: [{ look: "ogre", name: "Remador de Almas" }, { look: "knight", name: "Cobrador do Pedágio" }, { look: "crab", name: "Caranguejo do Aqueronte" }, { look: "wraith", name: "Lamento Flutuante" }, { look: "undead", name: "Afogado Sem Moeda" }],
    rooms: ["Margem do Rio", "Cais Podre", "Barca Encalhada", "Gruta das Almas", "Praia de Cinzas", "Câmara dos Remos"], entry: "Margem do Aqueronte", stairs: "Rampa de Lodo", bossRoom: "Barca de Caronte",
    pal: P("#0a1014", "#16242c", "#2a3c46", "#0e161c", "#1a2a32", "#4a5860", "#262e34", "#9fb8c0", "#7ac4d8", "#0c1418"),
  },
  {
    style: "ruin", amb: 1, music: 1, boss: "Guardião do Nobre Castelo", pool: ["shade", "skel", "wraith", "knight", "dryad"],
    minis: [{ look: "shade", name: "Poeta Sem Coro" }, { look: "golem", name: "Filósofo de Pedra" }, { look: "knight", name: "Sentinela do Castelo" }, { look: "wraith", name: "Sábio de Sete Muros" }, { look: "skel", name: "Herói Esquecido" }],
    rooms: ["Pátio dos Sábios", "Prado Pálido", "Biblioteca Muda", "Arcada Quebrada", "Jardim Sem Cor", "Anfiteatro Vazio"], entry: "Portal do Limbo", stairs: "Degraus de Mármore", bossRoom: "Castelo dos Nobres",
    pal: P("#1a1c20", "#32363c", "#5a6068", "#22262c", "#3a4046", "#8a8c88", "#54565a", "#e4e0d0", "#a8c4b8", "#16181c"),
  },
  {
    style: "cave", amb: 2, music: 2, boss: "Minos, Juiz do Inferno", pool: ["imp", "witch", "wraith", "demon", "cherub"],
    minis: [{ look: "devil", name: "Escrivão de Minos" }, { look: "witch", name: "Amante Sem Descanso" }, { look: "demon", name: "Vento Cortante" }, { look: "wraith", name: "Alma do Vendaval" }, { look: "imp", name: "Cauda Enrolada" }],
    rooms: ["Corredor do Vendaval", "Gruta dos Amantes", "Fenda Sussurrante", "Caverna das Tempestades", "Ponte de Vento", "Câmara da Cauda"], entry: "Entrada do Segundo Círculo", stairs: "Rampa de Basalto", bossRoom: "Tribunal de Minos",
    pal: P("#160812", "#3a0e2c", "#6a1c48", "#220a1c", "#3c1230", "#5a2a44", "#2c1224", "#e87ab4", "#ff4a90", "#14060f"),
  },
  {
    style: "swamp", amb: 7, music: 3, boss: "Cérbero, o Triplo Faminto", pool: ["hound", "troll", "ogre", "undead", "imp"],
    minis: [{ look: "hound", name: "Filhote de Cérbero" }, { look: "ogre", name: "Glutão Inchado" }, { look: "troll", name: "Chef do Lamaçal" }, { look: "undead", name: "Convidado Eterno" }, { look: "ogre", name: "Rei da Gororoba" }],
    rooms: ["Lamaçal Frio", "Poça Fétida", "Mesa Caída", "Gruta da Chuva Suja", "Banquete Podre", "Cova de Lodo"], entry: "Borda do Lamaçal", stairs: "Talude de Lama", bossRoom: "Covil de Cérbero",
    pal: P("#0e1208", "#222a12", "#3a4420", "#141a0c", "#222c14", "#4c4a2c", "#2a2814", "#b0a860", "#8cc83c", "#0c1006"),
  },
  {
    style: "gold", amb: 9, music: 8, boss: "Pluto, Senhor do Ouro", pool: ["golem", "knight", "scorp", "clerk", "mummy"],
    minis: [{ look: "golem", name: "Guardião do Cofre" }, { look: "clerk", name: "Contador de Moedas" }, { look: "knight", name: "Cavaleiro do Lucro" }, { look: "jester", name: "Pródigo Furioso" }, { look: "scorp", name: "Escorpião de Ouro" }],
    rooms: ["Câmara de Moedas", "Cofre Aberto", "Roda do Peso", "Tesouraria Sombria", "Fundição de Ouro", "Salão dos Credores"], entry: "Porta do Quarto Círculo", stairs: "Escada de Barras", bossRoom: "Tesouro de Pluto",
    pal: P("#1a1204", "#3c2a08", "#6a4c10", "#241a06", "#3c2c0c", "#8a6a20", "#4a3610", "#ffd24a", "#ffb020", "#150e03"),
  },
  {
    style: "swamp", amb: 7, music: 5, boss: "Flégias, Barqueiro da Ira", pool: ["undead", "crab", "troll", "devil", "wraith"],
    minis: [{ look: "troll", name: "Brigão do Estige" }, { look: "undead", name: "Mordedor Submerso" }, { look: "devil", name: "Fúria de Lodo" }, { look: "crab", name: "Pinça Rancorosa" }, { look: "ogre", name: "Colérico Eterno" }],
    rooms: ["Pântano Negro", "Margem do Estige", "Ilha de Lodo", "Gruta da Raiva", "Cais Afundado", "Brejo Fervente"], entry: "Margem do Estige", stairs: "Rampa Alagada", bossRoom: "Barca da Ira",
    pal: P("#060a0a", "#0e1a18", "#1c2e2a", "#0a1210", "#142220", "#2c3a34", "#161e1c", "#7a9a8c", "#3ae0a0", "#050908"),
  },
  {
    style: "city", amb: 2, music: 9, boss: "Fúria de Dis", pool: ["skel", "demon", "devil", "knight", "gargoyle"],
    minis: [{ look: "knight", name: "Guarda das Muralhas" }, { look: "gargoyle", name: "Gárgula Flamejante" }, { look: "demon", name: "Arauto de Dis" }, { look: "devil", name: "Sacerdote Herege" }, { look: "skel", name: "Herege Ardente" }],
    rooms: ["Rua de Ferro", "Torre de Dis", "Praça das Tumbas", "Forja Rubra", "Muralha Incandescente", "Cripta Flamejante"], entry: "Portão da Cidade de Dis", stairs: "Escadaria de Ferro", bossRoom: "Cidadela de Dis",
    pal: P("#1c0604", "#4a0e08", "#7a1c0c", "#260806", "#401008", "#6a2a1c", "#341610", "#ff8a3a", "#ff3a1a", "#180403"),
  },
  {
    style: "cave", amb: 3, music: 3, boss: "O Minotauro Sangrento", pool: ["thorn", "dryad", "hound", "ogre", "demon"],
    minis: [{ look: "ogre", name: "Centauro Arqueiro" }, { look: "thorn", name: "Espinheiro Faminto" }, { look: "dryad", name: "Árvore dos Suicidas" }, { look: "hound", name: "Cão da Floresta Rubra" }, { look: "demon", name: "Harpia Sangrenta" }],
    rooms: ["Floresta de Espinhos", "Rio Rubro", "Clareira das Harpias", "Deserto de Brasas", "Gruta dos Violentos", "Vale Sangrento"], entry: "Limiar do Flegetonte", stairs: "Encosta de Espinhos", bossRoom: "Covil do Minotauro",
    pal: P("#1a0606", "#3c0c0c", "#6a1810", "#240808", "#3c1010", "#5a2418", "#2c1008", "#d86a4a", "#e02a2a", "#150404"),
  },
  {
    style: "city", amb: 4, music: 4, boss: "Gerião, o Fraudulento", pool: ["jester", "mask", "devil", "witch", "imp"],
    minis: [{ look: "jester", name: "Embusteiro de Valas" }, { look: "witch", name: "Feiticeira Falsa" }, { look: "mask", name: "Rosto Emprestado" }, { look: "devil", name: "Demônio das Fossas" }, { look: "clerk", name: "Escrivão do Engano" }],
    rooms: ["Vala dos Aduladores", "Fosso dos Simoníacos", "Ponte de Pedra", "Vala de Piche", "Fosso dos Ladrões", "Abismo de Malebolge"], entry: "Descida de Gerião", stairs: "Ponte Íngreme", bossRoom: "Fosso de Gerião",
    pal: P("#141004", "#2e2808", "#544a10", "#1c1606", "#322a0a", "#6a5e1c", "#3a3210", "#d8d040", "#b8c828", "#100c03"),
  },
  {
    style: "ice", amb: 6, music: 6, boss: "Lúcifer, o Rei Gelado", pool: ["snowman", "yeti", "wraith", "knight", "shade"],
    minis: [{ look: "yeti", name: "Traidor Congelado" }, { look: "knight", name: "Cavaleiro de Gelo" }, { look: "snowman", name: "Boneco de Judas" }, { look: "wraith", name: "Sussurro do Cocito" }, { look: "shade", name: "Sombra de Brutus" }],
    rooms: ["Lago Congelado", "Gruta de Cristal", "Caverna de Gelo Azul", "Ponte de Geada", "Câmara dos Traidores", "Fenda Eterna"], entry: "Borda do Cocito", stairs: "Degraus de Gelo", bossRoom: "Trono de Lúcifer",
    pal: P("#06101c", "#0e2840", "#1c4a6a", "#0a1a2c", "#122e48", "#7aa8c8", "#3a5a78", "#d8f0ff", "#7ad8ff", "#08121c"),
  },
  {
    style: "city", amb: 2, music: 2, boss: "Tisífone, Fúria dos Portões", pool: ["gargoyle", "golem", "demon", "knight", "devil"],
    minis: [{ look: "golem", name: "Portão Vivo" }, { look: "gargoyle", name: "Gárgula de Adamante" }, { look: "knight", name: "Carcereiro Titânico" }, { look: "demon", name: "Açoite das Fúrias" }, { look: "devil", name: "Guarda do Abismo" }],
    rooms: ["Pátio de Adamante", "Câmara de Correntes", "Torre dos Titãs", "Corredor de Bronze", "Cela Eterna", "Sala das Fúrias"], entry: "Portões de Adamante", stairs: "Escada de Bronze", bossRoom: "Torre de Tisífone",
    pal: P("#0a0814", "#1c1236", "#34246a", "#10091e", "#1e1238", "#3c3858", "#1c1a2e", "#9a8ae8", "#7a5aff", "#07050e"),
  },
  {
    style: "cave", amb: 5, music: 5, boss: "Colosso de Sísifo", pool: ["golem", "scorp", "mummy", "troll", "ogre"],
    minis: [{ look: "golem", name: "Pedra Rolante" }, { look: "mummy", name: "Tântalo Ressecado" }, { look: "scorp", name: "Escorpião da Fome" }, { look: "troll", name: "Empurrador Eterno" }, { look: "ogre", name: "Condenado do Rochedo" }],
    rooms: ["Encosta do Rochedo", "Lago Seco", "Pomar Inalcançável", "Gruta do Esforço", "Pedreira Eterna", "Vale da Sede"], entry: "Campos do Castigo", stairs: "Ladeira Eterna", bossRoom: "Cume de Sísifo",
    pal: P("#1c1408", "#44300e", "#7a5a1c", "#261a0a", "#40300e", "#7a5e3a", "#44341c", "#e0c080", "#e09a3a", "#160f05"),
  },
  {
    style: "cave", amb: 1, music: 1, boss: "Cronos, Pai Devorador", pool: ["shade", "wraith", "demon", "devil", "gargoyle"],
    minis: [{ look: "shade", name: "Eco do Vazio" }, { look: "devil", name: "Titã Acorrentado" }, { look: "wraith", name: "Devorado Eterno" }, { look: "gargoyle", name: "Estátua de Tempo" }, { look: "demon", name: "Foice Errante" }],
    rooms: ["Abismo Sem Fundo", "Câmara do Tempo", "Gruta Negra", "Corredor de Foices", "Salão dos Titãs", "Fenda do Esquecimento"], entry: "Beira do Abismo", stairs: "Queda Controlada", bossRoom: "Trono de Cronos",
    pal: P("#06040c", "#120a22", "#24143c", "#0a0614", "#160c28", "#2c2040", "#140e22", "#8a6ae0", "#a04aff", "#04030a"),
  },
  {
    style: "ruin", amb: 5, music: 7, boss: "Catão, Guardião da Praia", pool: ["crab", "gull", "scorp", "wraith", "dryad"],
    minis: [{ look: "knight", name: "Centurião de Catão" }, { look: "crab", name: "Caranguejo Penitente" }, { look: "gull", name: "Gaivota Mensageira" }, { look: "dryad", name: "Junco Sagrado" }, { look: "scorp", name: "Escorpião da Maré" }],
    rooms: ["Praia de Juncos", "Dunas Brancas", "Ruína Costeira", "Cais do Anjo", "Recife Pálido", "Falésia do Amanhecer"], entry: "Praia do Antepurgatório", stairs: "Escada de Areia", bossRoom: "Colina de Catão",
    pal: P("#18283a", "#4a6a88", "#d8b890", "#2a4058", "#5a7088", "#c8b080", "#8a7a52", "#fff0c8", "#58b8e0", "#2a3c50"),
  },
  {
    style: "ruin", amb: 4, music: 4, boss: "Orgulho de Pedra", pool: ["golem", "knight", "gargoyle", "troll", "imp"],
    minis: [{ look: "golem", name: "Carregador de Blocos" }, { look: "knight", name: "Soberbo Curvado" }, { look: "gargoyle", name: "Escultura Viva" }, { look: "troll", name: "Peso do Orgulho" }, { look: "ogre", name: "Colosso Penitente" }],
    rooms: ["Primeiro Terraço", "Relevos de Humildade", "Corredor de Pedras", "Escadaria Esculpida", "Pátio das Cargas", "Mirante de Mármore"], entry: "Primeira Cornija", stairs: "Escada do Anjo", bossRoom: "Cume dos Soberbos",
    pal: P("#1c1c24", "#3a3a4c", "#6a6a84", "#26262e", "#40404e", "#8a8a98", "#4c4c5a", "#f0eadc", "#8a9ad0", "#18181e"),
  },
  {
    style: "ruin", amb: 1, music: 6, boss: "Sapia Vendada", pool: ["shade", "wraith", "witch", "mask", "clerk"],
    minis: [{ look: "wraith", name: "Invejoso Cego" }, { look: "witch", name: "Costureira de Olhos" }, { look: "mask", name: "Máscara Cinzenta" }, { look: "shade", name: "Sombra Vendada" }, { look: "clerk", name: "Escriba do Desejo" }],
    rooms: ["Segundo Terraço", "Muro Azul", "Corredor de Mantos", "Pátio dos Vendados", "Passagem Cinzenta", "Cornija de Lamentos"], entry: "Segunda Cornija", stairs: "Escada Cinzenta", bossRoom: "Cume dos Invejosos",
    pal: P("#101830", "#223458", "#3c5688", "#16203a", "#243252", "#58688a", "#2c3850", "#b8c8f0", "#7a98e0", "#0c1226"),
  },
  {
    style: "ruin", amb: 2, music: 2, boss: "Marco, Senhor da Fumaça", pool: ["imp", "devil", "demon", "undead", "hound"],
    minis: [{ look: "devil", name: "Nuvem de Fúria" }, { look: "imp", name: "Brasa Rancorosa" }, { look: "demon", name: "Ira Fumegante" }, { look: "hound", name: "Cão da Cinza" }, { look: "ogre", name: "Colérico Penitente" }],
    rooms: ["Terraço Enfumaçado", "Corredor Negro", "Pátio de Cinzas", "Cornija Cega", "Passagem de Brasas", "Câmara da Névoa"], entry: "Terceira Cornija", stairs: "Escada de Fumaça", bossRoom: "Cume dos Iracundos",
    pal: P("#140c0c", "#2e1c1a", "#523430", "#1c1210", "#2e1c1a", "#5a4642", "#2c2220", "#c8a898", "#d8604a", "#100808"),
  },
  {
    style: "ruin", amb: 8, music: 8, boss: "Abade Dorminhoco", pool: ["undead", "mummy", "balloon", "shade", "yeti"],
    minis: [{ look: "mummy", name: "Preguiçoso Eterno" }, { look: "balloon", name: "Sonho Flutuante" }, { look: "undead", name: "Corredor Cansado" }, { look: "yeti", name: "Urso Hibernante" }, { look: "shade", name: "Bocejo Sombrio" }],
    rooms: ["Quarto Terraço", "Pátio da Sesta", "Corredor de Neblina", "Cornija Lenta", "Passagem Sonolenta", "Jardim do Torpor"], entry: "Quarta Cornija", stairs: "Escada Lenta", bossRoom: "Cume dos Preguiçosos",
    pal: P("#1c2030", "#3a4268", "#6a78a8", "#242a3e", "#3a4260", "#7a809a", "#4a4e66", "#e0e4f8", "#a8b4e8", "#161a28"),
  },
  {
    style: "ruin", amb: 9, music: 8, boss: "Estácio, o Peso", pool: ["golem", "scorp", "knight", "crab", "clerk"],
    minis: [{ look: "golem", name: "Avarento Curvado" }, { look: "clerk", name: "Guardião de Moedas" }, { look: "scorp", name: "Ferrão de Ouro" }, { look: "crab", name: "Pinça Gananciosa" }, { look: "knight", name: "Cavaleiro do Chão" }],
    rooms: ["Quinto Terraço", "Chão de Ouro", "Corredor Curvado", "Pátio dos Prostrados", "Passagem Dourada", "Cornija do Desapego"], entry: "Quinta Cornija", stairs: "Escada de Ouro Velho", bossRoom: "Cume dos Avarentos",
    pal: P("#2a2010", "#54401c", "#8a6a30", "#32260e", "#4c3a16", "#9a8450", "#5a4a28", "#fff0a8", "#e0b84a", "#201808"),
  },
  {
    style: "ruin", amb: 2, music: 9, boss: "Guido, o Poeta em Chamas", pool: ["dryad", "thorn", "imp", "witch", "hound"],
    minis: [{ look: "dryad", name: "Faminto da Árvore" }, { look: "imp", name: "Chama Dançante" }, { look: "witch", name: "Poeta Ardente" }, { look: "thorn", name: "Espinho de Brasa" }, { look: "hound", name: "Cão do Muro" }],
    rooms: ["Sexto Terraço", "Muro de Fogo", "Bosque Faminto", "Pátio Ardente", "Passagem de Chamas", "Cornija do Fogo Final"], entry: "Sexta Cornija", stairs: "Escada de Brasas", bossRoom: "Muro de Fogo",
    pal: P("#2a1006", "#5a2208", "#9a4412", "#341406", "#522008", "#8a5232", "#4c2c1a", "#ffc47a", "#ff7a2a", "#200c04"),
  },
  {
    style: "garden", amb: 3, music: 3, boss: "Matelda, Guardiã do Éden", pool: ["dryad", "cherub", "balloon", "gull", "thorn"],
    minis: [{ look: "dryad", name: "Guardiã do Lete" }, { look: "cherub", name: "Querubim do Eunoé" }, { look: "knight", name: "Sentinela do Éden" }, { look: "gull", name: "Ave do Paraíso" }, { look: "balloon", name: "Pólen Vivo" }],
    rooms: ["Bosque Divino", "Rio Lete", "Rio Eunoé", "Clareira da Primavera", "Pomar Eterno", "Prado das Flores"], entry: "Portal do Éden", stairs: "Escada de Raízes", bossRoom: "Árvore do Conhecimento",
    pal: P("#0c2a1c", "#1c5a36", "#4aa868", "#103420", "#1c4c2c", "#4c9a52", "#2a5a30", "#f4e8a0", "#7ae890", "#0a2014"),
  },
  {
    style: "cloud", amb: 8, music: 8, boss: "Beatriz, Luz das Esferas", pool: ["cherub", "seraph", "knight", "balloon", "jester"],
    minis: [{ look: "cherub", name: "Anjo da Lua" }, { look: "seraph", name: "Serafim de Mercúrio" }, { look: "knight", name: "Cavaleiro de Vênus" }, { look: "seraph", name: "Guardião do Sol" }, { look: "cherub", name: "Coro de Saturno" }],
    rooms: ["Esfera da Lua", "Esfera de Mercúrio", "Esfera de Vênus", "Esfera do Sol", "Esfera de Marte", "Esfera de Júpiter"], entry: "Primeira Esfera", stairs: "Escada de Luz", bossRoom: "Rosa Celeste",
    pal: P("#2a3a7a", "#5a78c8", "#b8d0f8", "#3a4a8a", "#6a88d0", "#d8e0f4", "#9aa8cc", "#fff8d0", "#ffe27a", "#4a5a98"),
  },
  {
    style: "gold", amb: 9, music: 9, boss: "Zeus, Senhor do Raio", pool: ["knight", "golem", "seraph", "gargoyle", "ogre"],
    minis: [{ look: "knight", name: "Hoplita Divino" }, { look: "golem", name: "Colosso de Mármore" }, { look: "seraph", name: "Águia do Raio" }, { look: "gargoyle", name: "Esfinge de Ouro" }, { look: "ogre", name: "Titã do Monte" }],
    rooms: ["Pórtico dos Doze", "Templo de Atena", "Salão de Hera", "Forja de Hefesto", "Átrio de Apolo", "Terraço de Posídon"], entry: "Pé do Monte Olimpo", stairs: "Escadaria dos Deuses", bossRoom: "Trono de Zeus",
    pal: P("#2a2a46", "#4a4a7a", "#8a8ac0", "#32325a", "#4a4a7c", "#d8d0b4", "#9a9078", "#ffd24a", "#8ab4ff", "#20203a"),
  },
  {
    style: "cloud", amb: 8, music: 0, boss: "O Empresário, Guardião da Passagem", pool: ["seraph", "demon", "wraith", "knight", "devil"],
    minis: [{ look: "seraph", name: "Arauto do Céu" }, { look: "devil", name: "Arauto da Terra" }, { look: "knight", name: "Sentinela da Fronteira" }, { look: "demon", name: "Contrato Vivo" }, { look: "wraith", name: "Último Credor" }],
    rooms: ["Ponte de Luz", "Fronteira Partida", "Escada do Meio", "Praça das Duas Mãos", "Corredor de Nuvem e Cinza", "Portal Final"], entry: "A Passagem", stairs: "Escada do Meio", bossRoom: "Cláusula Final",
    pal: P("#1c1030", "#4a2a6a", "#d88a6a", "#2a1844", "#5a3a7a", "#b8a8c8", "#6a5a84", "#ffe8b0", "#ff9a7a", "#241438"),
  },
];

/* ---- Segunda Travessia: reinos 26..50 reaproveitam o roteiro dos 25 primeiros com outro cenário e inimigos ---- */
(() => {
  const n = REALM_THEMES.length;
  for (let r = 0; r < n; r++) {
    const base = REALM_THEMES[r]!;
    const alt = REALM_THEMES[(r + 12) % n]!;
    REALM_THEMES.push({
      ...base,
      style: alt.style,
      amb: alt.amb,
      pal: alt.pal,
      boss: `${base.boss} Redivivo`,
      pool: [...alt.pool.slice(0, 3), ...base.pool.slice(0, 2)],
      minis: base.minis.map((m, i) => ({ look: alt.minis[i]?.look ?? m.look, name: `${m.name} Sombrio` })),
    });
  }
})();

export function realmWorld(index: number): WorldDef {
  const t = REALM_THEMES[index] ?? REALM_THEMES[0]!;
  return { id: t.amb, name: REEL_NAMES[index] ?? "Reino", boss: t.boss, sky0: t.pal.s0, sky1: t.pal.s1, sky2: t.pal.s2, hill: t.pal.hill, hill2: t.pal.hill2, ground: t.pal.ground, groundDark: t.pal.dark, trim: t.pal.trim, accent: t.pal.accent, fog: t.pal.fog };
}
