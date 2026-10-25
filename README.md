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
