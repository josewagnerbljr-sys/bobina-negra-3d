# Bobina Negra 3D

Jogo de plataforma **3D (2.5D) para navegador**, em WebGL, com 8 heróis, 10 mundos, 50 fases, 10 bis de tesouro, 20 chefes, atributos e mochila de itens.
Projeto do desafio da **DIO** ("publicar um jogo jogável em WebGL"), adaptado de um jogo 2D que eu já tinha:
a lógica, as fases e a história foram mantidas, e todo o visual foi refeito em 3D.

> **Jogar agora:** https://josewagnerbljr-sys.github.io/bobina-negra-3d/
> (abre direto no navegador, no PC ou no celular, sem instalar nada)

## O que o jogo tem

| Item | Detalhe |
|---|---|
| Heróis | 8: Ivo (lobo), Lena (vampira/asas), Osso (necromante/caveira), Syl (arqueira/elfa), Tito Brasa (engolidor de fogo/dragão), Marina Sal (sereia/maré), Pia Granito (gárgula/pedra) e Doutor Lúmen (eletricista fantasma/raio), cada um com ataque, forma e 4 poderes próprios |
| Mundos | 10: Carnaval de Verniz, Catacumbas de Medula, Forja dos Golens, Mata Cega, Arquivo do Contrato, Dunas do Sol Morto, Geleira Silenciosa, Lagoa dos Náufragos, Cidadela Celeste, Palácio do Empresário |
| Fases | **50 rolos** com estrutura de mapa própria (colinas, poços com ilhas, pontes, pilares, torres, túneis, molas, espinhos...), todos conferidos por um verificador que usa a física real do jogo |
| Bis (bônus) | **10 mapas bônus**, um a cada 5 fases: poucos monstros e muitos baús de tesouro |
| Chefes | 10 chefes de mundo (cada um com padrão de ataque próprio) e 10 mini-chefes no meio de alguns rolos |
| Inimigos | 23 tipos, todos modelados em 3D |
| Atributos | Cada nível dá **5 pontos** para FOR, INT, DES, SAB e REC (tecla C): força, intensidade, velocidade, recarga, XP, drops e corações. Nível máximo 50 |
| Itens e drops | Monstros, mini-chefes, chefes e baús soltam poções, elixires, armas, armaduras e relíquias (4 raridades) |
| Equipamento visível | armadura vestida (prata, preto, vermelho, roxo e dourado conforme raridade), arma na mão e relíquia no personagem; cada item tem ícone próprio |
| Mochila | **32 blocos**; cada objeto ocupa blocos pelo tamanho, não pela quantidade (poção 1, cajado 3, armadura 5). Equipar, usar e descartar na tela de personagem |
| Controles | Teclado (A/D, Espaço, J tiro, K forma, S descer, U/I/O/P ou 1–4 poderes, Q poção, C personagem/mochila) e botões na tela para celular |
| Poderes (U, I, O, P) | 2 ataques unitários (perseguidor e investida), 1 em área comum e 1 super especial em área, liberados desde o início |
| Visual | sombreamento estilo anime: 3 faixas duras, sombra fria, brilho de gloss, luz de contorno e traço de tinta |
| Cenários | cada rolo tem clima, lua e peças de cenário próprios |
| Trilha sonora | rock original gerado por código (70s, 80s, 90s), com várias músicas por mundo e efeitos sonoros elaborados, sem gravações e sem direitos autorais |
| Save | automático no navegador (migra saves da versão anterior) |

## Como foi feito o 3D

- **Motor WebGL2 próprio** (`src/engine/gl.ts`), sem biblioteca externa: matrizes, malhas, shader com luz em faixas (estilo desenho), contorno de tinta, névoa e céu em gradiente.
- **Modelos 3D procedurais** (`src/engine/models.ts`): heróis, inimigos e chefes montados com formas 3D e animados por código (andar, pular, esticar/achatar, forma especial).
- **Cenário em profundidade** (`src/engine/scenery.ts`): blocos, decoração e fundo diferentes para cada mundo. O efeito de paralaxe vem da perspectiva real da câmera.
- **Jogabilidade mantida em 2.5D**: a física e a lógica continuam num plano (como nos plataformas 3D clássicos), o que mantém os controles precisos.
- **Leve**: cerca de 50 a 90 chamadas de desenho por quadro, e só os objetos perto da câmera são desenhados.

## Versão Unity (C#)

Ainda **não** existe porte para Unity nesta versão: o jogo roda no navegador (WebGL) pelo link do GitHub Pages. A física foi isolada em `src/game/physics.ts` justamente para facilitar um porte futuro.

## Rodar no seu computador

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev        # compila e abre em http://localhost:8080
```

Outros comandos: `npm run build` (gera a pasta `dist/`), `npm run typecheck`, `npm run smoke` (teste automático).

## Publicar (GitHub Pages)

O arquivo `.github/workflows/pages.yml` compila e publica o jogo sozinho a cada `git push` na branch `main`.
Passo a passo completo em [`docs/COMO_PUBLICAR.md`](docs/COMO_PUBLICAR.md).

## Estrutura

```
src/engine/   motor 3D, modelos e cenário
src/game/     regras do jogo, conteúdo, fases, áudio, save e renderizador
src/components/Bobina.tsx   menus e HUD (React + Tailwind)
scripts/      build (esbuild + Tailwind), servidor local e teste de fumaça
```

## Tecnologias

TypeScript, React 19, WebGL2, Tailwind CSS 4 e esbuild.

## Modo de teste

`?qa=<fase 0-24>&hero=<ivo|lena|osso|syl>&at=<coluna>` abre direto numa fase (usado nos testes automáticos).

## Autor

José Wagner Blanco Júnior · [GitHub](https://github.com/josewagnerbljr-sys)


## Novidades da versão 2

- Cada fase tem clima, cenário e peças próprias (5 mundos x 5 climas).
- Heróis e monstros mais detalhados; transformação com explosão de luz.
- Quatro poderes por herói (U e I unitários, O em área, P super em área), liberados nos níveis 2, 3, 4 e 6.
- Quanto mais fundo o rolo, mais monstros.
- Câmera mais próxima, acompanhando os pulos.
- Trilha de rock original (estilos 70/80/90) e efeitos sonoros sintetizados, sem amostras de terceiros.
- Teste rápido: abra o jogo com `?all=1` no endereço para liberar todos os poderes.

## v5 — modos, golpe físico, câmera cinematográfica

- **Modos de jogo** (escolhidos ao assinar o contrato e no mapa): Banho-maria (fácil), Queimadurinha (médio), Panela de Vidro (difícil), Frigideira de Ferro (muito difícil), Panela do Cramunhão (expert). Vida dos monstros ×1 / ×1,9 / ×3,6 / ×6,8 / ×13; nos dois últimos cada golpe tira 2 corações; XP e drops crescem junto.
- **Botão Golpe** (tecla H ou X): ataque corpo a corpo com a arma equipada; alcance, dano, recarga e número de alvos dependem da arma (faca rápida, espada, machado pesado, cajado longo…).
- **Câmera**: mais próxima, abertura 2D → 3/4 em 3,4 s, fica atrás/ao lado do herói com suavização, abre para mostrar o chefe.
- **Cenas de chefe e miniboss**: câmera orbita o inimigo com tarjas pretas e o texto do roteiro, antes da luta.
- **Correções**: rolagem na seleção de personagens, herói parado no início da fase, tremor de tela nos portais, toques presos nos botões.

## v6 — personagens animados, 11 espaços de equipamento, efeitos por elemento

- **Heróis e monstros com esqueleto**: o manequim e as animações CC0 do pacote *Universal Animation Library* (Quaternius) rodam num carregador próprio (`src/engine/skin.ts`; modelos convertidos em `public/models/`). Heróis: `skinhero.ts`; 13 monstros humanoides: `skinmob.ts`. Os demais monstros seguem procedurais.
- **11 espaços de equipamento**: capacete, colar, armadura, capa, luvas, calça, botas, arma, mão secundária e 2 anéis; todos aparecem no boneco.
- **Efeitos por elemento**: bola de fogo que explode em área (Tito), raios encadeados (Lúmen), maré (Marina), espinhos de pedra (Pia), raízes (Syl), sangue (Lena), espíritos (Osso), lua (Ivo).
- **Correções**: monstros olham para onde andam, tiro reto não desvia mais, mira só persegue alvo à frente.
- Selo de versão na tela inicial ("v6 · build …") para conferir se o link atualizou.

## v7 — pacote único e completo
- Cenários dinâmicos: cada fase tem um clima (amanhecer, dia, entardecer, noite, tempestade) que muda céu, luz e névoa e vai virando o próximo ao longo do caminho; relâmpago suave; nuvens em parallax; bandos de morcegos/aves/gaivotas; balões, engrenagens, páginas voando, aurora, holofotes, bolhas, faíscas, moedas brilhando, etc. por mundo (`src/game/ambient.ts`).
- Resolução dinâmica (baixa a nitidez sozinha se o aparelho engasgar).
- Tudo de v5/v6: heróis e 13 monstros com esqueleto (pacotes UAL), 11 slots, 5 modos, golpe, câmera, drops 3D, ícones de itens, efeitos elementais, seleção de personagens com rolagem horizontal.

## v7.1
- Cada família de item (capacete, colar, armadura, luvas, calça, botas, anéis, armas, escudos/livros/lanternas/orbes) tem modelo próprio no herói (`src/engine/gearparts.ts`), em vez de cair no modelo genérico.
- Capa/manto agora é pano: 5 colunas × 8 linhas independentes, com onda, arrasto e queda; comprimento ajustado.
- Asas: dedos em dois segmentos, membrana com borda recortada, mão que atrasa na batida.
- Parâmetros de teste: `?pva=<ângulo>&pvd=<distância>&pvf=1` (vitrine do herói na tela C).

## v7.2
- Correção: fala do mini-chefe/chefe não reinicia mais em loop (a cinemática era disparada de novo toda vez que o chefe se mexia).
- Degrau automático: o herói sobe blocos de 1 tile andando (colinas suaves), com suavização visual.
- Colinas dinâmicas: trechos "swell" (sobem à frente do herói e afundam atrás) e "tides" (pulsam no tempo); não sobem em cima de ninguém.
- Asas de anjo/dragão/demônio com batida assimétrica, cascata de penas, respiração e reação à corrida; mais monstros e maiores que os heróis (demônio, diabo, ogro, serafim, cavaleiro).
- Cenário vivo: confete, folhas, flocos de neve, cinzas, penas, cardumes, vaga-lumes, areia ao vento, runas flutuantes; balões desacoplados do pulo.
- Câmera mais próxima do herói.

## v7.2

- Demônios, diabos, ogros, serafins e cavaleiros novos, todos maiores que os heróis; asas de dragão (demônios) e de anjo (serafim/Lumen).
- Asas mais naturais: planeio ao cair (bate menos, abre mais), assimetria entre as duas asas, tremor de vento.
- Câmera mais próxima do herói.
- Balões do fundo independentes do pulo, em quantidade aleatória.
- Mapas vivos: trechos "swell" (colinas que sobem à frente do herói e afundam atrás) e "tides" (blocos que pulsam); degrau automático de 1 tile ao andar.
- Poeira nos passos, pousos e quando o chão sobe.
- Cena de fala de chefe/mini-chefe renderiza em resolução menor para não engasgar.

## v7.3 — Mansões do Inferno + corpos de anime
- Todas as fases agora são mansões de 10–15 cômodos em 2–3 andares (térreo, nobre, sótão), com portas, escadas, salas temáticas (biblioteca, salão de baile, capela, armaria, sótão...), lustres, quadros, luzes de cômodo e muitos monstros dentro e fora das salas.
- Percurso em serpentina (sobe no leste, atravessa para oeste, sobe de novo); validado por BFS: as 60 fases têm saída e baús alcançáveis.
- Heróis com físicos distintos (inclui mulheres), rostos/cabelos estilo anime; primitivas cruas (cubo/cone/cilindro) trocadas por formas suaves.
- Câmera mais afastada; abertura sem vai-e-vem; tremor dos blocos móveis removido.

## v8.0 — Profundidade (semi-mundo aberto)
- Herói, monstros, tiros e poderes agora se movem também em **profundidade**: W/↑ = fundo, S/↓ = frente (no celular, dois botões novos ↑ ↓). Pular = Espaço (ou botão). Descer de plataforma = ↓ + pular.
- Cômodos das mansões com 6 tiles de profundidade, câmera mais próxima e inclinada; acertos de golpe/tiro/contato consideram a profundidade.
- Mapas variados: salas preferidas por círculo do inferno, larguras variáveis, fossos, palanques e plataformas suspensas, metade das fases espelhada (entrada no leste). Nome do cômodo aparece ao entrar.
- Correções: plataformas que sobem/descem desenhadas no andar errado (heróis/monstros "atravessavam"), mini-chefe disparando fora do andar, formas primitivas nos heróis (tiras, coldres, chapéus de cone).
- Limite conhecido: obstáculos (mesas, caixas) ocupam toda a profundidade; não dá para contorná-los.

## v8.1 — Reinos (25 níveis gigantes)

- **25 reinos** no lugar dos 50 rolos: 1 = a Mansão (3 andares, cômodos, escadas), 2–11 Inferno de Dante, 12–14 Tártaro, 15–21 Purgatório, 22–24 Paraíso/Olimpo, 25 a Passagem. Cada reino abre com um prefácio (Dante, Perseu, literatura grega sobre Hades e Tártaro).
- Mini-chefes por cômodo e **portões** de ferro que só abrem quando o guardião cai.
- **Forja** (50% acerta/quebra; fusão com 35% em divino/infernal), 5 raridades (normal, raro, épico, lendário, divino/infernal), **encaixes de gemas** e item supremo *Matador de Deuses e Demônios* (12 pontos distribuíveis).
- Botão **Voltar** na seleção de personagem (mobile); caminhada lateral e bordas de plataforma corrigidas.
- Mapa reorganizado por regiões; 10 bis liberados a cada 2–3 reinos. Saves antigos migram automaticamente.
- Pendências: enigmas/portais invocáveis, mais monstros por reino, desempenho em fases longas.

## v8.2 — Mundo Aberto + câmera

- **Mundo Aberto** (botão no mapa): planície de 300 colunas com profundidade larga (±6 tiles), o herói anda em todas as direções, 25 portais (um por reino; fique parado no portal ~1s para entrar; selados até concluir o reino anterior), monstros por região, baús, ruínas e luzes de checkpoint.
- Câmera mais próxima do herói; o chefe não puxa mais o enquadramento para fora do herói (limite de 1,6 tile) e o afastamento é só 7%. No Mundo Aberto a câmera sobe para as colinas não taparem o herói.

## v8.3 — Câmera dinâmica

Câmera de seguimento por contexto (inspirada em Zelda/Uncharted/Mario Odyssey): fica de lado e atrás do herói; abre um pouco ao correr e no ar; aproxima como "cobertura" em cômodos estreitos; afasta em salões largos e no Mundo Aberto; segue o herói também na profundidade (z) sem deixá-lo cair para trás dos botões.

## v8.4 — 5 câmeras + controles

- **Câmeras** (botão "Cam N" no HUD, tecla V, pausa, R3 no controle; escolha salva): 1 Lateral, 2 Atrás do herói, 3 Dinâmica (lateral; vai para trás do herói ao se aproximar de espinhos, buracos, molas e colinas), 4 Multi-dinâmica (padrão: dinâmica + cômodo apertado aproxima/"cobertura" + salão afasta + chefe), 5 Aérea.
- **Controles** via Gamepad API (Bluetooth/USB, PC e celular com navegador compatível): Xbox, PlayStation, Switch Pro e genéricos. Mapa: analógico/direcional = andar e profundidade; A pular; X ou RT tiro; B golpe; Y forma; LB/RB/LT poderes 1-3; RT poder 4 (também tiro); L3 poção; R3 trocar câmera; Select personagem; Start pausa.

## v10.0 — Reinos temáticos, mini-chefes únicos, música de rock

- **25 ambientes diferentes** (src/game/realms.ts): cada reino tem estilo próprio (mansão, caverna/inferno, pântano, cidade de ferro, gelo, ruínas de mármore, jardim, nuvens, ouro), paleta, céu, partículas, paredes (rocha com estalactites, placas rebitadas, cristais de gelo, colunas e arcadas, nuvens), mobília temática (ossos, braseiros, tumbas, espinhos, gárgulas, árvores, fontes, moedas…) e nomes de cômodos próprios.
- **Monstros por reino** (5 tipos por reino, mais 2 por sala) e **mini-chefes todos diferentes**: cada um é um monstro gigante com nome próprio (ex.: Escrivão de Minos, Glutão Inchado, Guardião do Cofre…). Cada reino tem seu chefe com nome próprio (Caronte, Minos, Cérbero, Pluto, Flégias, Minotauro, Gerião, Lúcifer, Tisífone, Cronos, Catão, Matelda, Beatriz, Zeus…).
- **Música:** só instrumentos, estilo hard rock/heavy metal (boogie, galope, riff pesado), com solo de guitarra distorcida (bend + vibrato), 70% mais baixa que antes. Composições originais; não reproduzem músicas de bandas.
- **Mundo Aberto:** o chão e a decoração mudam por região (cada trecho usa o visual do reino correspondente).

## v10.0 — Mundo aberto ilimitado + câmera "Atrás" corrigida

- **Mapa infinito** (`src/game/openworld.ts`, `src/engine/openmesh.ts`): gerado por blocos de 16x16 tiles a partir de uma semente, sem paredes nem bordas (o mundo se reancora sozinho). 25 biomas = 25 reinos, com fronteiras distorcidas por ruído e cores/céu/neblina que se misturam; quanto mais longe da partida, mais perigoso o reino.
- **Perigos do próprio mapa** (sem missões): poças de lava/veneno/espinhos/gelo/areia movediça, meteoros, raios e tremores com marcação no chão, emboscadas, chefes errantes, noite com mais monstros.
- **Pontos de interesse**: acampamentos com bando e baú, santuários (curam e guardam o retorno), ruínas com guardiões, mini-chefes errantes, baús; 25 portais espalhados em espiral, com bússola no HUD.
- **Controles 360°**: movimento relativo à câmera, mira automática no inimigo mais próximo, tiros/golpes/habilidades em qualquer direção. Câmera orbital: `,` e `.` (ou direita do analógico, ou botões ⟲ ⟳).
- **Câmera "Atrás"** (todos os mapas): fica realmente atrás do herói, mais alta e afastada, olhando à frente.
- Inspiração (padrões, sem código de terceiros): mundos abertos procedurais (biomas como dados, Voronoi com bordas ruidosas, dispersão por regras) e câmeras de terceira pessoa com spring-arm/look-ahead.

## Versão 12 — mundo aberto

- 50 reinos em mundo aberto (25 da travessia + 25 da "Segunda Travessia"), cada um com vilarejos-cidade, mansão, castelo, florestas, estradas, enigma de 3 peças e portal.
- NPCs (comerciantes, ferreiro, bruxa, missões, moradores que passeiam e alguns possuídos), 13 magias com grimórios, 13 combos, mais de 650 itens, respawn de monstros em 3 minutos.

## Créditos (licença CC0)

Quaternius (Stylized Nature MegaKit, Medieval Village MegaKit, Fantasy Props MegaKit, Modular Character Outfits, Universal Animation Library), KayKit (Forest Nature Pack), Kenney (texturas e partículas de fumaça). Motor WebGL2, áudio e jogo: José Wagner Blanco Júnior.

## Multijogador (v13)

Cooperativo ponto a ponto por WebRTC, sem servidor: na tela inicial, "Multijogador (amigos)". Um jogador cria a sala e envia o código; o outro cola, gera a resposta e a devolve; o anfitrião cola a resposta e conecta. Depois os dois entram no mesmo reino e se veem. Cada aparelho simula os próprios monstros (sincronização de monstros e baús é uma etapa futura).

## v17.0
- NPCs com ofício (ferreiro martela, lenhador, camponês, vigia patrulha, bardo, padeiro, bruxa…) e recolhimento noturno.
- Locomoção: pernas não travam mais ao atacar andando; golpe de tronco ao mover.
- Escadas sem vão até a parede; menos baús nas casas e mais baús de recompensa pelo mapa.
- Dungeons aleatórias (Inferno, Céu, Purgatório, Castelo, Calabouço): mapas abertos independentes, andares infinitos.

## v18.0
- 4 novos heróis: Kael (Paladino), Nyx (Ceifadora), Brann (Xamã do Gelo), Skadi (Valquíria), cada um com kit de 4 poderes.
- Companheiros: filhote de cão do inferno (25% por local de interesse), nefelin (Senhor do 5º andar de cada dungeon), almas amarradas (conjuradores, 20 de mana) e feras submetidas (guerreiros, monstro com ≤30% de vida). Tela G: nível, mochila de 20 itens, armadura/joia/adorno. Luta a partir do nv 15, adulto no 25, renascimento em forma final, 5 cães = mundo +2 níveis.
- Clima: vento balançando árvores/capim, névoa em manchas aleatórias e nas vilas, tempestades com relâmpagos e chuva, geleiras com neve e monstros de gelo.

## v18.1
- Cão do inferno redesenhado: lobo de sombra estilo Cérbero (fumaça, brasas, fendas incandescentes, 3 cabeças na forma adulta), Nefelin como lobo celestial com halo e asas de luz, almas como espíritos de servos de guerra (capuz, correntes, lança espectral, translúcidos).

## v19.0 — modelos reais
- Moradores, diabretes/demônios/capetas, ogros/trolls e almas agora usam modelos texturizados de verdade (Quaternius Bestiary "Imp" e "Puglin", Modular Character Outfits "Ranger"/"Peasant", pacote Standard) no esqueleto Unreal, animados com as bibliotecas UAL1/UAL2 (CC0, 84 clipes: colheita, corte de lenha, golpes de espada, zumbi, dança…).
- Alma = espírito translúcido com capuz e silhueta luminosa (shader próprio com textura, emissão e luz de contorno).
- Conversor: tools/glb2ue.py. Créditos: Quaternius (CC0 / licença Standard dos packs).

## v20.0 — casas reais
- Interiores de casas com móveis texturizados reais (lareira, poltronas, mesa, barris) em escala ajustada.
- Fazenda com canteiros, cercas, lanternas e caixotes como props reais.
- Pendentes: criatura Aberration, trilha de terror, variedade de NPCs, cães do inferno.
- Créditos: FoxDev (Victorian Study), Quaternius (CC0), Rafael Martins (Aberration).
