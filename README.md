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
