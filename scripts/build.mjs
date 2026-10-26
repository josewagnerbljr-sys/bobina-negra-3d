// Build sem Vite: esbuild empacota o JS e o compilador do Tailwind gera o CSS.
// Uso: node scripts/build.mjs        (produção -> dist/)
//      node scripts/build.mjs --watch (não usado; use `npm run dev`)
import { build } from "esbuild";
import { compile } from "tailwindcss";
import { readFile, writeFile, mkdir, cp, rm, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const require = createRequire(import.meta.url);

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const stamp = Date.now().toString(36);
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });

// 1) JS
await build({
  entryPoints: [path.join(root, "src/main.tsx")],
  bundle: true,
  minify: true,
  sourcemap: false,
  format: "esm",
  target: ["es2020"],
  jsx: "automatic",
  outfile: path.join(dist, "assets/app.js"),
  define: { "process.env.NODE_ENV": '"production"', __BUILD__: JSON.stringify(stamp) },
  legalComments: "none",
});

// 2) CSS (Tailwind)
const twDir = path.dirname(require.resolve("tailwindcss/package.json"));
const input = await readFile(path.join(root, "src/styles.css"), "utf8");
const compiler = await compile(input, {
  base: root,
  loadStylesheet: async (id, base) => {
    let file;
    if (id === "tailwindcss") file = path.join(twDir, "index.css");
    else if (id.startsWith("tailwindcss/")) file = path.join(twDir, id.slice("tailwindcss/".length) + (id.endsWith(".css") ? "" : ".css"));
    else file = path.resolve(base, id);
    return { path: file, base: path.dirname(file), content: await readFile(file, "utf8") };
  },
});
const files = (await walk(path.join(root, "src"))).filter((f) => /\.(tsx?|css)$/.test(f));
const candidates = new Set(["sr-only"]);
for (const f of [...files, path.join(root, "index.html")]) {
  const text = await readFile(f, "utf8");
  for (const m of text.matchAll(/[^\s"'`<>=(){}\[\]\;,]+(?:\[[^\]\s]*\])?[^\s"'`<>=(){}\;,]*/g)) candidates.add(m[0]);
}
const css = compiler.build([...candidates]);
await writeFile(path.join(dist, "assets/app.css"), css);

// 3) HTML + estáticos
// cache-busting: app.js/app.css têm nome fixo, então o navegador (e o CDN do GitHub Pages) guardavam a versão velha
const guard = `<meta name="build" content="${stamp}" />\n    <script>(function(){try{var m="${stamp}";fetch(location.pathname+"?nc="+Date.now(),{cache:"no-store"}).then(function(r){return r.text()}).then(function(t){var x=t.match(/name="build" content="([^"]+)"/);if(x&&x[1]!==m&&!sessionStorage.getItem("bn-r"+x[1])){sessionStorage.setItem("bn-r"+x[1],"1");location.replace(location.pathname+"?v="+x[1])}}).catch(function(){})}catch(e){}})();</script>`;
const html = (await readFile(path.join(root, "index.html"), "utf8")).replace("</head>", `    ${guard}\n  </head>`).replace("./assets/app.css", `./assets/app.css?v=${stamp}`).replace("./assets/app.js", `./assets/app.js?v=${stamp}`);
await writeFile(path.join(dist, "index.html"), html);
await cp(path.join(root, "public"), dist, { recursive: true });
await writeFile(path.join(dist, ".nojekyll"), "");
console.log("OK -> dist/ (", (css.length / 1024).toFixed(1), "KB css )");
