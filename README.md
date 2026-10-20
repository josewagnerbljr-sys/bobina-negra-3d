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
| Controles | Teclado (A/D, Espaço, J, K, S) e botões na tela para celular |

## Como foi feito o 3D

- **Motor WebGL2 próprio** (`src/engine/gl.ts`), sem biblioteca externa: matrizes, malhas, shader com luz em faixas (estilo desenho), contorno de tinta, névoa e céu em gradiente.
- **Modelos 3D procedurais** (`src/engine/models.ts`): heróis, inimigos e chefes montados com formas 3D e animados por código (andar, pular, esticar/achatar, forma especial).
- **Cenário em profundidade** (`src/engine/scenery.ts`): blocos, decoração e fundo diferentes para cada mundo. O efeito de paralaxe vem da perspectiva real da câmera.
- **Jogabilidade mantida em 2.5D**: a física e a lógica continuam num plano (como nos plataformas 3D clássicos), o que mantém os controles precisos.
- **Leve**: cerca de 50 a 90 chamadas de desenho por quadro, e só os objetos perto da câmera são desenhados.

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
