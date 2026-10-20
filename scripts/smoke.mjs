// Teste de fumaça: abre o jogo, entra na fase 1 e confere que o 3D renderiza e o herói anda.
// Uso: npm run build && node scripts/serve.mjs 8090 &  depois  node scripts/smoke.mjs http://localhost:8090
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:8080";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/?qa=0&hero=ivo`);
await page.waitForTimeout(1500);
const x0 = await page.evaluate(() => window.__controlsTest.getX());
await page.evaluate(() => window.__controlsTest.setKeys(["ArrowRight"]));
await page.waitForTimeout(2000);
const x1 = await page.evaluate(() => window.__controlsTest.getX());
const hasCanvas = await page.evaluate(() => Boolean(document.querySelector("canvas")));
await browser.close();
const ok = hasCanvas && x1 > x0 + 50 && errors.length === 0;
console.log(ok ? "OK: jogo renderiza e o herói anda" : `FALHOU: canvas=${hasCanvas} x0=${x0} x1=${x1} erros=${errors.join(";")}`);
process.exit(ok ? 0 : 1);
