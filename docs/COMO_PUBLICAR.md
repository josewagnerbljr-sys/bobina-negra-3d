# Como publicar o jogo e gerar o link para os amigos

O jogo roda no navegador (WebGL). **Não precisa de Unity Hub**: o link do GitHub Pages abre em qualquer PC, tablet ou celular.

## 1. Criar o repositório vazio no GitHub

1. Entre em https://github.com/new
2. Nome: `bobina-negra-3d`
3. Deixe **Public** (o GitHub Pages grátis exige repositório público)
4. **Não** marque README, .gitignore nem licença (o projeto já tem)
5. Clique em **Create repository**

## 2. Enviar os arquivos (Git Bash)

Abra o Git Bash **dentro da pasta do projeto** (clique direito na pasta, "Git Bash Here") e rode, um por vez:

```bash
git init
git branch -M main
git add .
git commit -m "Bobina Negra 3D: versão inicial para o desafio DIO"
git remote add origin https://github.com/josewagnerbljr-sys/bobina-negra-3d.git
git push -u origin main
```

Se o Git pedir login, entre com sua conta do GitHub (ou use um token de acesso pessoal como senha).

## 3. Ligar o GitHub Pages

1. No repositório: **Settings → Pages**
2. Em **Build and deployment → Source**, escolha **GitHub Actions**
3. Vá na aba **Actions** e espere o workflow "Publicar jogo no GitHub Pages" ficar verde (cerca de 1 a 2 minutos)

## 4. O link do jogo

```
https://josewagnerbljr-sys.github.io/bobina-negra-3d/
```

Mande esse link para o seu filho e os amigos. Quem receber só precisa abrir no navegador.
O progresso de cada pessoa fica salvo no próprio aparelho.

## 5. Atualizar depois

```bash
git add .
git commit -m "Descreva a mudança"
git push
```

O site é republicado sozinho.

## Dicas para o desafio DIO

- Cole o link do jogo no topo do README do repositório (já está lá).
- Se o repositório tiver outro nome, troque o endereço no README e neste arquivo.
- Para o desafio, entregue o link do repositório e o link do jogo.
