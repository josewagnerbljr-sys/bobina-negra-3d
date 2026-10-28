import { BAG_SIZE, EQUIP_KEYS, STAT_KEYS, type Equip, type EquipKey, type Item, type ItemSlot, type Rarity, type Stats, type StatKey } from "./types";

export type BaseDef = {
  id: string;
  name: string;
  slot: ItemSlot;
  /** blocos que o objeto ocupa na mochila */
  size: number;
  w: Partial<Stats>;
  color: string;
  glyph: string;
  heal?: number;
  buff?: "haste" | "fury" | "ward";
  /** duração do efeito (s); padrão 25 (escudo 8) */
  dur?: number;
  /** XP concedido ao usar (pergaminhos) */
  xp?: number;
  text: string;
  /** família do desenho (ícone SVG e miniatura 3D no chão) */
  fam: string;
  /** cor de detalhe do ícone */
  acc?: string;
  /** modelo vestido no personagem (quando o visual é de outra base) */
  look?: string;
  /** primeiro mundo (0-9) onde pode cair */
  minWorld?: number;
  /** item único: só cai do chefe deste mundo */
  boss?: number;
  /** conjunto a que pertence */
  set?: string;
  /** frase do bônus especial (itens únicos) */
  special?: string;
};

const SIL = "#c9d1db";
const BLK = "#2a2a34";
const RED = "#c3101e";
const PUR = "#7b2bd1";
const GLD = "#e8b72e";
const ICE = "#9fd8ff";
const WOOD = "#8a5a38";

type X = Partial<Pick<BaseDef, "acc" | "look" | "minWorld" | "boss" | "set" | "special" | "heal" | "buff" | "dur" | "xp">>;
const I = (id: string, name: string, slot: ItemSlot, size: number, w: Partial<Stats>, color: string, fam: string, text: string, x: X = {}): BaseDef => ({ id, name, slot, size, w, color, glyph: "", fam, text, ...x });

export const BASES: BaseDef[] = [
  // ---- poções, elixires e pergaminhos (consumíveis)
  I("pot", "Poção de Tinta", "potion", 1, {}, "#c4373a", "flask", "Cura 1 coração. A cor é o que o contrato chama de tinta.", { heal: 1 }),
  I("pot2", "Poção Grande", "potion", 1, {}, "#e0527a", "flask", "Cura 2 corações. Gosto de vela derretida.", { heal: 2, acc: "#fff" }),
  I("pot3", "Poção Gigante", "potion", 1, {}, "#ff3a6a", "flask", "Cura 4 corações. Vem com rolha de camarote.", { heal: 4, acc: "#ffd34a" }),
  I("pot_royal", "Poção Real", "potion", 1, {}, "#ff5a9a", "flask", "Cura 6 corações. Servida em taça, bebida em pé, pago em dobro.", { heal: 6, acc: "#ffd34a", minWorld: 4 }),
  I("tonic", "Tônico de Camarim", "potion", 1, {}, "#9ad06a", "bottle", "Cura 3 corações e dá pressa por 12 segundos. Amargo como crítica de jornal.", { heal: 3, buff: "haste", dur: 12, minWorld: 2 }),
  I("bread", "Pão de Camarim", "potion", 1, {}, "#d9a45a", "bread", "Cura 1 coração. Duro, mas ninguém recusa de graça.", { heal: 1 }),
  I("elx_haste", "Elixir de Pressa", "potion", 1, {}, "#4ac0e0", "bottle", "Mais velocidade e cadência por 25 segundos.", { buff: "haste" }),
  I("elx_fury", "Elixir de Fúria", "potion", 1, {}, "#e08a3a", "bottle", "+50% de dano por 25 segundos.", { buff: "fury" }),
  I("elx_ward", "Elixir de Escudo", "potion", 1, {}, "#9aa8e0", "bottle", "Imune a dano por 8 segundos.", { buff: "ward" }),
  I("elx_swift", "Elixir de Vendaval", "potion", 1, {}, "#2ad0d0", "bottle", "Pressa por 50 segundos: o dobro do elixir comum.", { buff: "haste", dur: 50, minWorld: 3, acc: "#fff" }),
  I("elx_rage", "Elixir de Ira", "potion", 1, {}, "#ff5a2a", "bottle", "+50% de dano por 45 segundos. Tira o sono e o juízo.", { buff: "fury", dur: 45, minWorld: 3, acc: "#ffd34a" }),
  I("elx_aegis", "Elixir de Égide", "potion", 1, {}, "#7a8aff", "bottle", "Imune a dano por 14 segundos. Gosto de armadura polida.", { buff: "ward", dur: 14, minWorld: 5, acc: "#fff" }),
  I("scroll_a", "Pergaminho de Ensaio", "potion", 1, {}, "#e8dcc0", "scroll", "Ao ler, ganha 40 de XP. Rascunho cheio de rasuras úteis.", { xp: 40 }),
  I("scroll_b", "Pergaminho de Roteiro", "potion", 1, {}, "#f0e0a8", "scroll", "Ao ler, ganha 110 de XP. As falas já vêm sublinhadas.", { xp: 110, minWorld: 2, acc: "#c4373a" }),
  I("scroll_c", "Pergaminho do Diretor", "potion", 1, {}, "#ffd36a", "scroll", "Ao ler, ganha 260 de XP. Carimbado em ouro e em desespero.", { xp: 260, minWorld: 5, acc: "#7b2bd1" }),
  I("scroll_ward", "Pergaminho de Cortina", "potion", 1, {}, "#b8c8ff", "scroll", "Cura 1 coração e protege por 10 segundos. A cortina desce na hora certa.", { heal: 1, buff: "ward", dur: 10, minWorld: 4, acc: "#4a5ac0" }),
  // ---- armas
  I("knife", "Faca de Palco", "weapon", 2, { dex: 2, str: 1 }, SIL, "knife", "Curta e ágil. Golpe rápido, alcance pequeno."),
  I("claws", "Garras de Camarim", "weapon", 2, { dex: 3, str: 1 }, "#b8c0cc", "claws", "Duas lâminas por mão. Golpes muito rápidos."),
  I("wand", "Varinha de Maestro", "weapon", 2, { int: 2, dex: 1, wis: 1 }, "#f0e6ff", "wand", "Reger a orquestra e fritar monstros dá o mesmo gesto."),
  I("sword", "Espada de Ensaio", "weapon", 3, { str: 3, dex: 1 }, "#d9d2c2", "sword", "Pesada, honesta, desafinada. Golpe largo que atinge até 3 alvos."),
  I("staff", "Cajado de Fio", "weapon", 3, { int: 3, wis: 1 }, "#c9b6e0", "staff", "Alcance longo e empurrão forte. Três blocos de mística."),
  I("scepter", "Cetro do Arquivo", "weapon", 3, { int: 2, wis: 2 }, GLD, "scepter", "Carimba o ar. Bom para quem vive de recarga."),
  I("bow", "Arco de Folha", "weapon", 3, { dex: 3, wis: 1 }, "#8ac060", "bow", "Silencioso até demais. Favorece destreza."),
  I("axe", "Machado de Forja", "weapon", 4, { str: 4, rec: 1 }, "#e08a3a", "axe", "Quatro blocos de problema. Golpe lento que atinge muitos alvos."),
  I("hammer", "Martelo de Carnaval", "weapon", 4, { str: 5 }, "#b9a37a", "hammer", "Acerta o ursinho e o monstro com a mesma alegria."),
  I("foil", "Florete de Esgrima", "weapon", 2, { dex: 3, int: 1 }, "#e8eef8", "foil", "Fino como desculpa. Rápido e preciso.", { look: "knife", minWorld: 1 }),
  I("dagger_bone", "Adaga de Osso", "weapon", 2, { dex: 2, wis: 2 }, "#efe8d8", "knife", "Osso afiado de fantoche aposentado.", { look: "knife", minWorld: 1, acc: "#c8c2b4" }),
  I("katar", "Katar de Arena", "weapon", 2, { str: 2, dex: 3 }, "#d0c8b0", "claws", "Soco com lâmina. Para brigas de bastidor.", { look: "claws", minWorld: 2, acc: "#e08a3a" }),
  I("scimitar", "Cimitarra de Duna", "weapon", 3, { str: 3, dex: 2 }, "#f0d890", "scimitar", "Curva como o caminho para o oásis. Corta largo.", { look: "sword", minWorld: 5 }),
  I("spear", "Lança de Cenário", "weapon", 3, { str: 3, dex: 1, rec: 1 }, "#c8a878", "spear", "Pau de bandeira com ponta de verdade. Alcance bom.", { look: "staff", minWorld: 2 }),
  I("longbow", "Arco Longo de Salgueiro", "weapon", 3, { dex: 4, wis: 1 }, "#b8d878", "bow", "Alcance de ator que sabe da última fila.", { look: "bow", minWorld: 3, acc: "#8a5a38" }),
  I("crossbow", "Besta de Bilheteria", "weapon", 3, { dex: 3, str: 2 }, "#a8844a", "crossbow", "Carimba o ingresso e o alvo ao mesmo tempo.", { look: "bow", minWorld: 4 }),
  I("staff_ice", "Cajado de Geada", "weapon", 3, { int: 4, wis: 1 }, ICE, "staff", "Sopra frio nas ideias e nos inimigos.", { look: "staff", minWorld: 6, acc: "#e0f4ff" }),
  I("staff_fire", "Cajado de Brasa", "weapon", 3, { int: 4, str: 1 }, "#ff8a3a", "staff", "A ponta nunca apaga. O dono, às vezes.", { look: "staff", minWorld: 2, acc: "#ffd34a" }),
  I("wand_star", "Varinha de Estrela", "weapon", 2, { int: 3, wis: 2 }, "#ffe88a", "wand", "Ponta em estrela de papel dourado, magia de verdade.", { look: "wand", minWorld: 3, acc: "#fff" }),
  I("scepter_sun", "Cetro do Sol Morto", "weapon", 3, { int: 3, wis: 3 }, "#ffb23a", "scepter", "Sol rachado em cima de um pau. Ainda esquenta.", { look: "scepter", minWorld: 5, acc: "#ffe08a" }),
  I("axe_great", "Machado do Carrasco", "weapon", 4, { str: 5, rec: 1 }, "#9a9fa8", "axe", "Lâmina larga e sem cerimônia. Lento e definitivo.", { look: "axe", minWorld: 4, acc: "#c4373a" }),
  I("mace", "Maça de Ferro Negro", "weapon", 4, { str: 4, rec: 2 }, "#4a4a56", "hammer", "Esfera de ferro com espinhos de opinião.", { look: "hammer", minWorld: 3, acc: "#c9d1db" }),
  // ---- armas únicas de chefe
  I("u_hammer", "Martelo-Bigorna do Rei", "weapon", 4, { str: 7, rec: 3, wis: 1 }, "#e8884a", "hammer", "Soltou da mão do Rei da Bigorna. Cada golpe tem eco.", { look: "hammer", boss: 2, acc: "#ffd34a", special: "Chefe da Forja dos Golens" }),
  I("u_root", "Cajado de Raiz Viva", "weapon", 3, { int: 6, wis: 4, rec: 1 }, "#6ac060", "staff", "A árvore piscou. O cajado ainda está olhando.", { look: "staff", boss: 3, acc: "#d2ff7a", special: "Chefe da Mata Cega" }),
  I("u_stamp", "Carimbo do Arquivista", "weapon", 3, { int: 5, wis: 5 }, "#e8b72e", "scepter", "Carimbo oficial: aprova, reprova e desintegra.", { look: "scepter", boss: 4, acc: "#c4373a", special: "Chefe do Arquivo do Contrato" }),
  I("u_scimitar", "Cimitarra do Faraó Sem Fim", "weapon", 3, { str: 6, dex: 4, wis: 1 }, "#ffe08a", "scimitar", "Ouro de múmia. Nunca perde o fio e o fim.", { look: "sword", boss: 5, acc: "#ffffff", special: "Chefe das Dunas do Sol Morto" }),
  I("u_hook", "Gancho do Capitão Maré", "weapon", 2, { str: 4, dex: 6, rec: 1 }, "#8ab0c8", "claws", "Gancho de naufrágio. Puxa o inimigo e a sorte.", { look: "claws", boss: 7, acc: "#e0f4ff", special: "Chefe da Lagoa dos Náufragos" }),
  // ---- mão secundária
  I("lid", "Escudo de Tampa de Panela", "offhand", 3, { rec: 3, str: 1 }, "#b8bcc6", "shield", "Tampa de panela com ambição. Defende e dá recuperação."),
  I("tome", "Livro de Contratos", "offhand", 2, { int: 3, wis: 1 }, "#8a2a3a", "tome", "Letras miúdas, consequências enormes."),
  I("lantern", "Lanterna de Camarim", "offhand", 2, { wis: 3, dex: 1 }, "#ffc24a", "lantern", "Ilumina o caminho e as dívidas."),
  I("quiver", "Aljava Bordada", "offhand", 2, { dex: 3, wis: 1 }, "#8a5a38", "quiver", "Flechas de reserva e um bolso para balas."),
  I("orb", "Orbe de Tinta", "offhand", 2, { int: 2, wis: 2 }, "#5ac0a8", "orb", "Esfera que guarda tinta e segredo. Antiga relíquia do contrato.", { look: "lantern" }),
  I("shield_rivet", "Escudo de Rebite", "offhand", 3, { rec: 4, str: 2 }, SIL, "shield", "Redondo, rebitado e barulhento. Aguenta o próximo golpe.", { look: "lid", minWorld: 2, set: "rivet", acc: "#e0b15a" }),
  I("tome_shadow", "Livro de Sombras", "offhand", 2, { int: 3, dex: 2 }, "#3a2a5a", "tome", "Cada página vira sozinha para onde você não olha.", { look: "tome", minWorld: 3, acc: "#b06ad0" }),
  I("lantern_ice", "Lanterna de Gelo", "offhand", 2, { wis: 4, int: 1 }, ICE, "lantern", "Chama azul que não derrete nada. Só ilumina.", { look: "lantern", minWorld: 6, acc: "#ffffff" }),
  I("u_contract", "Contrato Assinado em Ouro", "offhand", 2, { int: 6, wis: 5, dex: 1 }, "#f0c040", "tome", "A assinatura do Empresário. Ninguém leu, todos pagaram.", { look: "tome", boss: 9, acc: "#c4373a", special: "Chefe do Palácio do Empresário" }),
  // ---- capacetes
  I("cap", "Boné de Contrarregra", "helmet", 1, { dex: 1, rec: 1 }, "#5a6a8a", "cap", "Leve. Protege do sol e de refletor caindo."),
  I("tophat", "Cartola Emprestada", "helmet", 2, { int: 2, wis: 1 }, BLK, "tophat", "Sempre cabe um coelho. Ou uma ideia."),
  I("hood", "Capuz de Sombra", "helmet", 1, { dex: 2, wis: 1 }, PUR, "hood", "Some com a cara. Bom para fugir de cobrador.", { set: "shadow" }),
  I("helm", "Elmo de Rebite", "helmet", 3, { rec: 3, str: 1 }, SIL, "helm", "Bate na cabeça de dentro pra fora.", { set: "rivet" }),
  I("crown", "Coroa de Papelão Dourado", "helmet", 2, { wis: 3, int: 1 }, GLD, "crown", "Parece de ouro até chover.", { set: "ceremony" }),
  I("mask", "Máscara de Cena", "helmet", 1, { dex: 2, int: 1 }, "#f4efe4", "mask", "Sorriso pintado. A cara de baixo agradece.", { look: "hood", minWorld: 1, acc: "#c4373a" }),
  I("helm_wing", "Elmo Alado", "helmet", 3, { dex: 3, rec: 2 }, "#d0d8e4", "helm", "Asinhas de lata. Dão estilo e nenhuma altura.", { look: "helm", minWorld: 3, acc: "#ffffff" }),
  I("tophat_magic", "Chapéu de Mágico", "helmet", 2, { int: 3, wis: 2 }, "#3a2a7a", "tophat", "Estrelas costuradas por dentro. O coelho cobra aluguel.", { look: "tophat", minWorld: 4, acc: "#ffd34a" }),
  I("crown_ice", "Coroa de Gelo Fino", "helmet", 2, { wis: 4, int: 2 }, ICE, "crown", "Rachaduras em volta. Bonita enquanto durar.", { look: "crown", boss: 6, acc: "#ffffff", special: "Chefe da Geleira Silenciosa" }),
  I("u_tophat", "Cartola do Mestre Verniz", "helmet", 2, { int: 4, wis: 3, dex: 1 }, "#14101a", "tophat", "Esmalte molhado, brilho eterno. O coelho é de verdade.", { look: "tophat", boss: 0, acc: "#c4373a", special: "Chefe do Carnaval de Verniz" }),
  // ---- colares
  I("amulet", "Amuleto de Vela", "necklace", 1, { wis: 2, rec: 1 }, "#ffc24a", "amulet", "Brilha em cenas tristes."),
  I("charm", "Talismã de Lobo", "necklace", 1, { str: 2, dex: 1 }, RED, "charm", "Cheira a lua cheia."),
  I("locket", "Medalhão de Foto Rasgada", "necklace", 1, { rec: 2, int: 1 }, "#e0b15a", "locket", "Abre sozinho quando o clima esfria."),
  I("whistle", "Apito de Bilheteiro", "necklace", 1, { dex: 2, wis: 1 }, "#c9d1db", "whistle", "Um apito para chamar a sorte. Ela costuma atender."),
  I("pearls", "Colar de Pérolas Falsas", "necklace", 1, { int: 2, wis: 1 }, "#f4eef4", "pearls", "Falsas só no nome. Brilham com a luz certa.", { look: "amulet", minWorld: 2 }),
  I("scarab", "Escaravelho de Ouro", "necklace", 1, { wis: 2, str: 1, rec: 1 }, "#e8c040", "scarab", "Besouro sagrado de nome estrangeiro. Dá sorte e coceira.", { look: "amulet", minWorld: 5, acc: "#2ac0a8" }),
  I("fang", "Dente de Dragão", "necklace", 1, { str: 3, dex: 1 }, "#f0e8d0", "charm", "Dente maior que a mão. Roer é por sua conta.", { look: "charm", minWorld: 4, acc: "#c4373a" }),
  I("medal", "Medalha de Honra ao Mérito", "necklace", 1, { rec: 2, wis: 2 }, "#d9a830", "medal", "Concedida por mérito que ninguém lembra qual.", { look: "locket", minWorld: 3, acc: "#c4373a" }),
  I("u_halo", "Auréola Partida do Arcanjo", "necklace", 1, { wis: 5, rec: 3, int: 2 }, "#fff0a0", "amulet", "Caiu do Arcanjo do Contrato. Meio torta, brilha por inteiro.", { look: "amulet", boss: 8, acc: "#ffffff", special: "Chefe da Cidadela Celeste" }),
  // ---- armaduras (peito)
  I("vest", "Colete de Couro", "armor", 3, { rec: 2, str: 1 }, BLK, "vest", "Preto, resistente e bom de bolso. Aguenta uma tarde.", { set: "shadow" }),
  I("plate", "Armadura de Rebite", "armor", 5, { rec: 4, str: 2 }, SIL, "plate", "Prateada e barulhenta. Cinco blocos de segurança.", { set: "rivet" }),
  I("robe", "Manto de Tinteiro", "armor", 3, { int: 2, wis: 2 }, PUR, "robe", "Roxo de tanto absorver tinta e dívida.", { set: "ink" }),
  I("tunic", "Túnica de Palhaço Vermelha", "armor", 3, { dex: 2, rec: 1, str: 1 }, RED, "tunic", "Vermelho intenso. Tem tinta de sorriso no colarinho."),
  I("cuirass", "Peitoral Dourado de Bilheteria", "armor", 5, { rec: 3, str: 2, wis: 1 }, GLD, "plate", "Dourado e caro. A bilheteria desconta do seu salário.", { set: "ceremony", acc: "#fff2b0" }),
  I("coat_ring", "Casaco de Mestre de Cerimônias", "armor", 3, { wis: 2, rec: 2, dex: 1 }, "#c3101e", "tunic", "Botões dourados e ombreiras de quem manda no show.", { look: "tunic", minWorld: 2, acc: GLD, set: "ceremony" }),
  I("plate_ice", "Couraça de Gelo", "armor", 5, { rec: 5, int: 2 }, ICE, "plate", "Fria, pesada e quase transparente. Estala ao rir.", { look: "plate", minWorld: 6, acc: "#ffffff" }),
  I("robe_star", "Manto Estrelado", "armor", 3, { int: 3, wis: 3 }, "#2a2a7a", "robe", "O céu inteiro cabe no forro. Só falta a lua.", { look: "robe", minWorld: 4, acc: "#ffe88a" }),
  I("vest_copper", "Colete de Cobre", "armor", 3, { rec: 3, dex: 1 }, "#c8764a", "vest", "Placas de cobre cozidas no couro. Esverdeia com o tempo.", { look: "vest", minWorld: 3, acc: "#6ac0a0" }),
  I("plate_black", "Armadura de Ferro Negro", "armor", 5, { rec: 5, str: 3 }, "#3a3a46", "plate", "Pesadelo de ferreiro. Cada rebite é uma opinião.", { look: "plate", minWorld: 7, acc: "#c4373a" }),
  // ---- capas
  I("cape", "Capa de Camarim", "cape", 2, { dex: 1, rec: 2 }, RED, "cape", "Leve, dramática, balança com o vento."),
  I("cloak_dark", "Manto de Veludo Negro", "cape", 2, { dex: 2, int: 1 }, BLK, "cloak", "Veludo preto. Some nas cortinas.", { set: "shadow" }),
  I("cape_star", "Capa Estrelada", "cape", 2, { int: 2, wis: 2 }, PUR, "cape", "Roxa, cheia de estrelas de papel alumínio.", { set: "ink", acc: "#ffe88a" }),
  I("cape_gold", "Capa de Mestre de Cerimônias", "cape", 3, { wis: 2, rec: 2, str: 1 }, GLD, "cape", "Dourada e pomposa. Dá para ouvir os aplausos.", { set: "ceremony", acc: "#c3101e" }),
  I("cape_fur", "Capa de Pele de Urso", "cape", 2, { rec: 3, str: 1 }, "#8a6a4a", "cloak", "Quentinha e cheirosa. O urso não reclamou.", { look: "cape", minWorld: 6, acc: "#e8dcc0" }),
  I("cape_moon", "Capa de Luar", "cape", 2, { int: 2, dex: 2, wis: 1 }, "#9ab0e8", "cape", "Tecida de luz coada. Muda de tom com a lua.", { look: "cape_star", minWorld: 4, acc: "#ffffff" }),
  I("cloak_flame", "Manto de Chama", "cape", 2, { str: 2, int: 2, rec: 1 }, "#ff6a2a", "cloak", "A barra pega fogo. É de propósito.", { look: "cloak_dark", minWorld: 5, acc: "#ffd34a" }),
  I("u_veil", "Véu da Abadessa", "cape", 2, { dex: 4, int: 4, wis: 2 }, "#e8e0f4", "cloak", "Véu branco de quem vigia o além. Ainda cheira a incenso.", { look: "cloak_dark", boss: 1, acc: "#b06ad0", special: "Chefe das Catacumbas de Medula" }),
  // ---- luvas
  I("gloves", "Luvas de Couro", "gloves", 1, { dex: 1, str: 1 }, BLK, "gloves", "Seguram melhor a arma e pior a verdade.", { set: "shadow" }),
  I("gloves_mage", "Luvas de Fio Roxo", "gloves", 1, { int: 2 }, PUR, "gloves", "Tricotadas por uma avó que sabia magia.", { set: "ink" }),
  I("gauntlet", "Manoplas de Rebite", "gloves", 2, { str: 2, rec: 1 }, SIL, "gauntlet", "Para dar soco com educação.", { set: "rivet" }),
  I("gloves_box", "Luvas de Boxe de Feira", "gloves", 1, { str: 2, rec: 1 }, "#d02a2a", "boxing", "Vermelhas, fofas e traiçoeiras. Direto no urso.", { look: "gloves", minWorld: 1, acc: "#ffffff" }),
  I("gloves_silk", "Luvas de Seda Branca", "gloves", 1, { int: 2, wis: 1 }, "#f4f0f8", "gloves", "Usadas pelo maestro. Nunca sujam, por respeito.", { look: "gloves_mage", minWorld: 3, acc: "#c0b0e0" }),
  I("gauntlet_gold", "Manoplas de Ouro", "gloves", 2, { str: 3, wis: 1, rec: 1 }, GLD, "gauntlet", "Brilham tanto que ofuscam o adversário e o dono.", { look: "gauntlet", minWorld: 5, set: "ceremony", acc: "#fff2b0" }),
  // ---- calças
  I("pants", "Calça Listrada de Palco", "pants", 2, { dex: 1, rec: 1 }, RED, "pants", "Vermelha intensa. Faz o público torcer."),
  I("pants_leather", "Calça de Couro Preto", "pants", 2, { str: 1, dex: 1, rec: 1 }, BLK, "pants", "Quase não amassa e nunca desbota.", { set: "shadow" }),
  I("greaves", "Grevas Prateadas", "pants", 3, { rec: 3, str: 1 }, SIL, "greaves", "Protegem as canelas de toda tropeçada.", { set: "rivet" }),
  I("pants_silk", "Calça de Seda Violeta", "pants", 2, { int: 2, wis: 1 }, "#9a5ae0", "pants", "Leve como boato, escorrega como promessa.", { look: "pants", minWorld: 2, set: "ink", acc: "#e0b15a" }),
  I("shorts_forge", "Calção de Forja", "pants", 2, { str: 2, rec: 1 }, "#7a5a3a", "pants", "Couro grosso de avental. Resiste a faísca.", { look: "pants_leather", minWorld: 2, acc: "#e08a3a" }),
  I("greaves_ice", "Grevas de Gelo", "pants", 3, { rec: 4, int: 1 }, ICE, "greaves", "Estalam a cada passo, como o gelo que são.", { look: "greaves", minWorld: 6, acc: "#ffffff" }),
  // ---- botas
  I("boots", "Botas de Sapateiro", "boots", 2, { dex: 1, rec: 1 }, "#6a4a30", "boots", "Gastas, confortáveis e fiéis."),
  I("boots_speed", "Botas de Pressa", "boots", 2, { dex: 3 }, PUR, "boots", "Roxas e leves. Dão a sensação de nunca estar atrasado.", { set: "ink", acc: "#fff" }),
  I("boots_iron", "Botas de Ferro Negro", "boots", 3, { rec: 2, str: 2 }, BLK, "boots", "Pesadas. Cada passo tem opinião.", { set: "rivet", acc: "#c9d1db" }),
  I("boots_heel", "Botas de Salto de Palco", "boots", 2, { dex: 2, wis: 1 }, "#a02a4a", "boots", "Salto alto, passo firme, queixo erguido.", { look: "boots", minWorld: 2, acc: "#ffd34a" }),
  I("slippers", "Sapatilhas de Bailarina", "boots", 1, { dex: 3, wis: 1 }, "#f4c0d0", "slippers", "Leves como pena, silenciosas como medo.", { look: "boots_speed", minWorld: 3, acc: "#ffffff" }),
  I("boots_gold", "Botas de Salto Dourado", "boots", 2, { dex: 2, rec: 2, wis: 1 }, GLD, "boots", "Cada pisada soa como uma moeda caindo.", { look: "boots_speed", minWorld: 6, acc: "#fff2b0" }),
  // ---- anéis
  I("ring", "Anel de Contrato", "ring", 1, { str: 1, int: 1, dex: 1 }, GLD, "ring", "Aperta um pouco. Cabe em qualquer dedo.", { acc: "#e0527a" }),
  I("ring_ruby", "Anel de Rubi de Vidro", "ring", 1, { str: 2, rec: 1 }, RED, "ring", "O rubi é vidro. A força é de verdade.", { acc: "#ff3a4a" }),
  I("ring_bone", "Anel de Osso Polido", "ring", 1, { int: 2, wis: 1 }, "#e8e0cc", "ring", "Osso de fantoche. Sussurra dicas.", { acc: "#f4efe4" }),
  I("ring_seal", "Anel de Selo Violeta", "ring", 1, { wis: 2, dex: 1 }, PUR, "ring", "Carimba tudo o que toca.", { set: "ink", acc: "#b06ad0" }),
  I("ring_sapphire", "Anel de Safira Azul", "ring", 1, { int: 2, rec: 1 }, "#e0b15a", "ring", "Safira de fundo de aquário. Fria, mas honesta.", { look: "ring", minWorld: 3, acc: "#3a8aff" }),
  I("ring_emerald", "Anel de Esmeralda Mata-Cega", "ring", 1, { dex: 2, wis: 1 }, "#d8d0a0", "ring", "Verde de tanto olhar a mata sem piscar.", { look: "ring", minWorld: 3, acc: "#3ad07a" }),
  I("ring_topaz", "Anel de Topázio Solar", "ring", 1, { str: 2, wis: 1 }, "#c8a050", "ring", "Pedra de sol que esquenta o dedo.", { look: "ring", minWorld: 5, acc: "#ffc02a" }),
  I("ring_thread", "Aliança de Fio Vermelho", "ring", 1, { rec: 2, dex: 1, wis: 1 }, "#c3101e", "ringthin", "Fio de destino enrolado três vezes. Difícil de tirar.", { look: "ring", minWorld: 1, acc: "#ffffff" }),
];

/** conjuntos: bônus extras por número de peças equipadas */
export const SETS: Record<string, { name: string; bonus: { n: number; mods: Partial<Stats>; text: string }[] }> = {
  rivet: { name: "Rebite de Ferro", bonus: [{ n: 2, mods: { rec: 2 }, text: "+2 REC" }, { n: 3, mods: { rec: 2, str: 2 }, text: "+2 REC e +2 FOR" }, { n: 5, mods: { rec: 4, str: 3 }, text: "+4 REC e +3 FOR" }] },
  shadow: { name: "Sombra de Camarim", bonus: [{ n: 2, mods: { dex: 2 }, text: "+2 DES" }, { n: 3, mods: { dex: 3, wis: 1 }, text: "+3 DES e +1 SAB" }, { n: 5, mods: { dex: 5, wis: 2 }, text: "+5 DES e +2 SAB" }] },
  ink: { name: "Tinteiro Violeta", bonus: [{ n: 2, mods: { int: 2 }, text: "+2 INT" }, { n: 3, mods: { int: 3, wis: 1 }, text: "+3 INT e +1 SAB" }, { n: 5, mods: { int: 5, wis: 3 }, text: "+5 INT e +3 SAB" }] },
  ceremony: { name: "Mestre de Cerimônias", bonus: [{ n: 2, mods: { wis: 2 }, text: "+2 SAB" }, { n: 3, mods: { wis: 2, rec: 2 }, text: "+2 SAB e +2 REC" }, { n: 5, mods: { wis: 4, rec: 3, str: 2 }, text: "+4 SAB, +3 REC e +2 FOR" }] },
};

/** bônus de conjunto ativo para as peças equipadas */
export function setBonus(eq: Equip): { set: string; name: string; count: number; mods: Partial<Stats> }[] {
  const count: Record<string, number> = {};
  for (const k of EQUIP_KEYS) {
    const it = eq[k];
    const s = it ? BASE_BY_ID[it.base]?.set : undefined;
    if (s) count[s] = (count[s] ?? 0) + 1;
  }
  const out: { set: string; name: string; count: number; mods: Partial<Stats> }[] = [];
  for (const [key, n] of Object.entries(count)) {
    const def = SETS[key];
    if (!def) continue;
    let best: Partial<Stats> | null = null;
    for (const t of def.bonus) if (n >= t.n) best = t.mods;
    if (best) out.push({ set: key, name: def.name, count: n, mods: best });
  }
  return out;
}

export const BASE_BY_ID: Record<string, BaseDef> = Object.fromEntries(BASES.map((b) => [b.id, b]));

export const RARITY_NAME = ["Comum", "Raro", "Épico", "Lendário"];
export const RARITY_COLOR = ["#cfc7b8", "#5fb4ff", "#c07aff", "#ffb23a"];
const RARITY_MUL = [1, 1.5, 2.1, 3];
const RARITY_PRE = ["", "Polido", "Encantado", "Lendário"];

export function baseOf(it: Item): BaseDef {
  return BASE_BY_ID[it.base] ?? BASES[0]!;
}

export function itemSize(it: Item) {
  return baseOf(it).size;
}

export function itemName(it: Item): string {
  const b = baseOf(it);
  if (b.slot === "potion") return b.name;
  if (b.boss !== undefined) return `${b.name}${it.tier > 1 ? ` +${it.tier - 1}` : ""}`;
  const pre = RARITY_PRE[it.rarity] ? ` ${RARITY_PRE[it.rarity]}` : "";
  return `${b.name}${pre}${it.tier > 1 ? ` +${it.tier - 1}` : ""}`;
}

export function modText(it: Item): string {
  const b = baseOf(it);
  if (b.slot === "potion") {
    const bits: string[] = [];
    if (b.heal) bits.push(`Cura ${b.heal} ♥`);
    if (b.xp) bits.push(`+${b.xp} XP`);
    if (b.buff) bits.push(`${b.buff === "haste" ? "Pressa" : b.buff === "fury" ? "Fúria" : "Escudo"} ${b.dur ?? (b.buff === "ward" ? 8 : 25)}s`);
    return bits.join(" · ") || "Efeito temporário";
  }
  return STAT_KEYS.filter((k) => (it.mods[k] ?? 0) !== 0)
    .map((k) => `+${it.mods[k]} ${k.toUpperCase()}`)
    .join("  ");
}

let uidSeed = 1;
export function setUidSeed(n: number) {
  uidSeed = Math.max(uidSeed, n);
}
export function peekUid() {
  return uidSeed;
}

export function makeItem(baseId: string, rarity: Rarity, tier: number, rnd: () => number): Item {
  const b = BASE_BY_ID[baseId] ?? BASES[0]!;
  const mods: Partial<Stats> = {};
  if (b.slot !== "potion") {
    const mul = RARITY_MUL[rarity]!;
    for (const k of STAT_KEYS) {
      const w = b.w[k];
      if (w) mods[k] = Math.max(1, Math.round(w * (0.8 + tier * 0.55) * mul));
    }
    if (rarity >= 1) {
      const k = STAT_KEYS[Math.floor(rnd() * STAT_KEYS.length)] as StatKey;
      mods[k] = (mods[k] ?? 0) + Math.max(1, Math.round((1 + tier * 0.4) * rarity));
    }
  }
  return { uid: uidSeed++, base: baseId, rarity, tier, mods };
}

export type DropSource = "mob" | "mini" | "boss" | "chest";

const POTION_W: Record<string, number> = { pot: 4, bread: 2.2, pot2: 2.4, pot3: 1, pot_royal: 0.5, tonic: 0.9, elx_haste: 1, elx_fury: 0.9, elx_ward: 0.8, elx_swift: 0.5, elx_rage: 0.5, elx_aegis: 0.4, scroll_a: 1.3, scroll_b: 0.8, scroll_c: 0.4, scroll_ward: 0.6 };

export function rollDrops(src: DropSource, world: number, luck: number, rnd: () => number): Item[] {
  const tier = Math.min(10, world + 1);
  const out: Item[] = [];
  const rar = (bonus: number): Rarity => {
    const t = (0.06 + bonus + world * 0.004) * luck;
    if (rnd() < t * 0.18) return 3;
    if (rnd() < t * 0.55) return 2;
    if (rnd() < t * 1.5 + 0.1) return 1;
    return 0;
  };
  const pick = <T extends BaseDef>(pool: T[], weight: (b: T) => number): T => {
    let sum = 0;
    for (const b of pool) sum += weight(b);
    let r = rnd() * sum;
    for (const b of pool) {
      r -= weight(b);
      if (r <= 0) return b;
    }
    return pool[pool.length - 1]!;
  };
  const potion = () => {
    const pool = BASES.filter((b) => b.slot === "potion" && (b.minWorld ?? 0) <= world);
    // quanto mais fundo o mundo, menos poções fracas e mais elixires/pergaminhos
    const b = pick(pool, (x) => (POTION_W[x.id] ?? 1) * ((x.minWorld ?? 0) > 0 ? 1 + world * 0.08 : Math.max(0.5, 1 - world * 0.05)));
    return makeItem(b.id, 0, tier, rnd);
  };
  const gear = (bonus: number, force?: Rarity) => {
    const pool = BASES.filter((b) => b.slot !== "potion" && b.boss === undefined && (b.minWorld ?? 0) <= world);
    // novidades do mundo atual aparecem mais
    const b = pick(pool, (x) => ((x.minWorld ?? 0) === world && world > 0 ? 2.2 : 1));
    return makeItem(b.id, force ?? rar(bonus), tier, rnd);
  };
  const unique = (): Item | null => {
    const u = BASES.find((b) => b.boss === world);
    if (!u) return null;
    return makeItem(u.id, rnd() < 0.3 ? 3 : 2, tier, rnd);
  };
  if (src === "mob") {
    if (rnd() < 0.15 * luck) out.push(rnd() < 0.62 ? potion() : gear(0));
  } else if (src === "mini") {
    out.push(potion(), gear(0.12));
    if (rnd() < 0.5) out.push(gear(0.12));
  } else if (src === "boss") {
    out.push(potion(), potion(), gear(0.3, 1), gear(0.3));
    if (rnd() < 0.4) out.push(gear(0.4, 2));
    // item único do chefe: cai em mais de metade das lutas
    if (rnd() < Math.min(0.9, 0.5 * luck)) {
      const u = unique();
      if (u) out.push(u);
    }
  } else {
    const n = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) out.push(rnd() < 0.4 ? potion() : gear(0.2));
  }
  return out;
}

export function emptyEquip(): Equip {
  return { helmet: null, necklace: null, armor: null, cape: null, gloves: null, pants: null, boots: null, weapon: null, offhand: null, ring1: null, ring2: null };
}

/** em qual espaço do personagem o item entra (anéis: primeiro vazio, senão o do primeiro anel) */
export function equipKeyFor(it: Item, eq: Equip): EquipKey | null {
  const slot = baseOf(it).slot;
  if (slot === "potion") return null;
  if (slot === "ring") return !eq.ring1 ? "ring1" : !eq.ring2 ? "ring2" : "ring1";
  return slot;
}

/** explica cada bônus do item em linguagem do jogo */
export const MOD_MEANING: Record<StatKey, (n: number) => string> = {
  str: (n) => `+${Math.round(n * 5)}% de dano físico (tiro, golpe e poderes unitários)`,
  int: (n) => `+${(n * 5.5).toFixed(0)}% de dano mágico e área maior`,
  dex: (n) => `mais velocidade, tiro mais rápido e chance de crítico (+${(n * 0.6).toFixed(1)}%)`,
  wis: (n) => `poderes e forma recarregam ${(n * 0.85).toFixed(0)}% mais rápido, mais XP e drops`,
  rec: (n) => `${n >= 5 ? "ganha corações extras, " : ""}poções curam mais e proteção após dano dura mais`,
};

export function describeMods(it: Item): { key: StatKey; value: number; text: string }[] {
  const out: { key: StatKey; value: number; text: string }[] = [];
  for (const k of STAT_KEYS) {
    const v = it.mods[k] ?? 0;
    if (v) out.push({ key: k, value: v, text: MOD_MEANING[k](v) });
  }
  return out;
}

/** diferença de atributos entre o item e o que está no espaço onde ele entraria */
export function compareItem(it: Item, eq: Equip): { key: EquipKey; diff: Partial<Record<StatKey, number>>; current: Item | null } | null {
  const key = equipKeyFor(it, eq);
  if (!key) return null;
  const cur = eq[key];
  const diff: Partial<Record<StatKey, number>> = {};
  for (const k of STAT_KEYS) {
    const d = (it.mods[k] ?? 0) - (cur?.mods[k] ?? 0);
    if (d) diff[k] = d;
  }
  return { key, diff, current: cur };
}

export const SLOT_NAME: Record<ItemSlot, string> = {
  potion: "Consumível",
  weapon: "Arma",
  offhand: "Mão secundária",
  helmet: "Capacete",
  necklace: "Colar",
  ring: "Anel",
  armor: "Armadura",
  cape: "Capa",
  gloves: "Luvas",
  pants: "Calça",
  boots: "Botas",
};

export { EQUIP_KEYS };

export function bagUsed(bag: Item[]): number {
  let n = 0;
  for (const it of bag) n += itemSize(it);
  return n;
}

export function canFit(bag: Item[], it: Item): boolean {
  return bagUsed(bag) + itemSize(it) <= BAG_SIZE;
}

export function countPotions(bag: Item[]): number {
  return bag.filter((i) => baseOf(i).slot === "potion").length;
}

export const WORLD_NAMES = ["Carnaval de Verniz", "Catacumbas de Medula", "Forja dos Golens", "Mata Cega", "Arquivo do Contrato", "Dunas do Sol Morto", "Geleira Silenciosa", "Lagoa dos Náufragos", "Cidadela Celeste", "Palácio do Empresário"];
const BOSS_NAMES = ["Mestre Verniz", "Abadessa do Véu", "Rei da Bigorna", "A Árvore que Piscou", "O Arquivista", "Faraó Sem Fim", "Rainha do Gelo Fino", "Capitão Maré", "Arcanjo do Contrato", "O Empresário"];

export const RARITY_MEANING = [
  "Bônus normais do item.",
  "Bônus ×1,5 e mais 1 atributo sorteado.",
  "Bônus ×2,1 e mais 1 atributo sorteado, forte.",
  "Bônus ×3 e atributo extra: o melhor que o contrato permite.",
];

export type ItemInfo = {
  slotName: string;
  rarityName: string;
  rarityMeaning: string;
  sizeText: string;
  origin: string;
  how: string;
  tierText: string;
  flavor: string;
  special?: string;
  set?: { name: string; id: string; bonus: { n: number; text: string }[] };
};

/** tudo o que o jogador precisa saber sobre o item, em texto do jogo */
export function itemInfo(it: Item): ItemInfo {
  const b = baseOf(it);
  const potion = b.slot === "potion";
  let origin: string;
  if (b.boss !== undefined) origin = `Só cai do chefe ${BOSS_NAMES[b.boss]} (${WORLD_NAMES[b.boss]}). Nem todo chefe solta.`;
  else if (potion) origin = (b.minWorld ?? 0) > 0 ? `Cai de monstros, mini-chefes, chefes e baús a partir de ${WORLD_NAMES[b.minWorld!]}.` : "Cai de monstros, mini-chefes, chefes e baús desde o começo.";
  else origin = (b.minWorld ?? 0) > 0 ? `Cai de mini-chefes, chefes, baús e alguns monstros a partir de ${WORLD_NAMES[b.minWorld!]}.` : "Cai de monstros, mini-chefes, chefes e baús desde o começo.";
  let how: string;
  if (potion) {
    const parts: string[] = [];
    if (b.heal) parts.push("Usar (ou tecla Q / botão ♥) para curar");
    if (b.buff) parts.push("Usar na hora da luta: o efeito é por tempo");
    if (b.xp) parts.push("Usar para ler: o XP entra na hora");
    how = parts.join(". ") + ".";
  } else if (b.slot === "ring") how = "Equipar: entra no primeiro dos 2 espaços de anel livres. Se os dois estiverem cheios, troca o primeiro.";
  else how = `Equipar: vai para o espaço ${SLOT_NAME[b.slot]} e aparece no personagem. Descartar libera os blocos da mochila.`;
  const set = b.set && SETS[b.set] ? { name: SETS[b.set]!.name, id: b.set, bonus: SETS[b.set]!.bonus.map((t) => ({ n: t.n, text: t.text })) } : undefined;
  return {
    slotName: SLOT_NAME[b.slot],
    rarityName: potion ? "Consumível" : RARITY_NAME[it.rarity]!,
    rarityMeaning: potion ? "Consumíveis não têm raridade; somem ao usar." : RARITY_MEANING[it.rarity]!,
    sizeText: `${b.size} ${b.size === 1 ? "bloco" : "blocos"} da mochila`,
    origin,
    how,
    tierText: potion ? "" : `Nível de item ${it.tier}: veio de um lugar de nível ${it.tier}. Mundos mais fundos dão bônus maiores.`,
    flavor: b.text,
    special: b.special,
    set,
  };
}
