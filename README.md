# Bobina Negra 3D

Jogo de plataforma **3D (2.5D) para navegador**, em WebGL, com 4 heróis, 5 mundos, 25 fases e 5 chefes.
Projeto do desafio da **DIO** ("publicar um jogo jogável em WebGL"), adaptado de um jogo 2D que eu já tinha:
a lógica, as fases e a história foram mantidas, e todo o visual foi refeito em 3D.

> **Jogar agora:** https://josewagnerbljr-sys.github.io/bobina-negra-3d/
> (abre direto no navegador, no PC ou no celular, sem instalar nada)

## O que o jogo tem

| Item | Detalhe |
|---|---|
| Heróis | Ivo (lobo), Lena (vampira/asas), Osso (necromante/caveira), Syl (arqueira/elfa), cada um com ataque e forma própria |
| Mundos | Carnaval de Verniz, Catacumbas de Medula, Forja dos Golens, Mata Cega, Arquivo do Contrato |
| Fases | 25 "rolos" gerados por segmentos, com lanternas de checkpoint, molas, espinhos e plataformas |
| Inimigos | 13 tipos, todos modelados em 3D, mais 5 chefes (um por mundo) |
| Progressão | XP, nível, escolha de atributos, melhor tempo por fase, save automático no navegador |
| Controles | Teclado (A/D, Espaço, J tiro, K forma, S descer, U/I/O/P poderes) e botões na tela para celular |
| Poderes (U, I, O, P) | 2 ataques unitários (perseguidor e investida), 1 em área comum e 1 super especial em área; cada herói tem os seus, liberados nos níveis 2, 3, 4 e 6 |
| Monstros | quanto mais fundo o rolo, mais monstros no caminho |
| Cenários | cada rolo tem clima, lua e peças de cenário próprios (5 climas por mundo) |
| Trilha sonora | 5 temas de rock originais gerados por código (70s boogie e psicodelia, 80s gótico e arena, 90s industrial), sem gravações e sem direitos autorais |
| Câmera | mais próxima, segue o herói nos pulos e nas quedas |

## Como foi feito o 3D

- **Motor WebGL2 próprio** (`src/engine/gl.ts`), sem biblioteca externa: matrizes, malhas, shader com luz em faixas (estilo desenho), contorno de tinta, névoa e céu em gradiente.
- **Modelos 3D procedurais** (`src/engine/models.ts`): heróis, inimigos e chefes montados com formas 3D e animados por código (andar, pular, esticar/achatar, forma especial).
- **Cenário em profundidade** (`src/engine/scenery.ts`): blocos, decoração e fundo diferentes para cada mundo. O efeito de paralaxe vem da perspectiva real da câmera.
- **Jogabilidade mantida em 2.5D**: a física e a lógica continuam num plano (como nos plataformas 3D clássicos), o que mantém os controles precisos.
- **Leve**: cerca de 50 a 90 chamadas de desenho por quadro, e só os objetos perto da câmera são desenhados.

## Versão Unity (C#)

A pasta [`unity/`](unity/README.md) traz o mesmo jogo reescrito em C# para o Unity. O jogo web continua sendo o que roda no link do GitHub Pages.

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
