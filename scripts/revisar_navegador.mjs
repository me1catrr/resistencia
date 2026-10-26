#!/usr/bin/env node
// Revisión automática en navegador real (chrome-headless-shell): carga las páginas indicadas y falla si hay errores
// de consola, errores de Observable JS (.observablehq--error), desbordamiento horizontal o MathJax sin renderizar.
//
//   node scripts/revisar_navegador.mjs                      # todas las páginas de temas/e01-*/ y la portada
//   node scripts/revisar_navegador.mjs temas/e01-tensiones-espacio/09-mohr.html --ancho 390
//
// Necesita red (CDN de MathJax y Observable JS) y, en el sandbox de Claude Code, el sandbox desactivado.
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { conNavegador } from "./lib/navegador.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let ancho = 1200;
const paginas = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--ancho") ancho = Number(args[++i]);
  else paginas.push(args[i]);
}
if (!paginas.length) {
  paginas.push("index.html");
  const dir = resolve(RAIZ, "_site/temas/e01-tensiones-espacio");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".html")).sort()) paginas.push(`temas/e01-tensiones-espacio/${f}`);
}

let fallos = 0;
await conNavegador(resolve(RAIZ, "_site"), async ({ abrir }) => {
  for (const pagina of paginas) {
    const hayOjs = await (async () => { try { return (await import("node:fs")).readFileSync(resolve(RAIZ, "_site", pagina), "utf8").includes("quarto-ojs-runtime"); } catch { return false; } })();
    const p = await abrir(pagina, { ancho, alto: 900, selector: hayOjs ? "svg[role=img], .sim-lectura" : "main", espera: hayOjs ? 3500 : 1200 });
    const problemas = [...p.consola.filter((c) => !/Failed to load resource.*(favicon|\.map)/.test(c))];
    if (hayOjs && !p.selectorOk) problemas.push("las simulaciones no llegaron a dibujarse");
    const ojsErrores = await p.evaluar("[...document.querySelectorAll('.observablehq--error')].map(e => e.textContent.trim().slice(0, 200))");
    for (const e of ojsErrores ?? []) problemas.push(`error de Observable JS: ${e}`);
    const desborda = await p.evaluar("document.documentElement.scrollWidth > document.documentElement.clientWidth + 2");
    if (desborda) problemas.push(`desbordamiento horizontal a ${ancho} px`);
    const mathjaxSinProcesar = await p.evaluar("(typeof window.MathJax !== 'undefined' && window.MathJax.startup?.promise) ? window.MathJax.startup.promise.then(() => document.querySelectorAll('mjx-container').length) : document.querySelectorAll('mjx-container').length");
    const tieneMates = await p.evaluar("document.querySelectorAll('.math').length");
    if (tieneMates > 0 && !mathjaxSinProcesar) problemas.push("hay fórmulas pero MathJax no las ha renderizado");
    console.log(`${problemas.length ? "✖" : "✔"} ${pagina}${hayOjs ? " (con simulaciones)" : ""}`);
    for (const q of problemas) { console.log("    ·", q); fallos++; }
    await p.cerrar();
  }
});
console.log(fallos ? `\n${fallos} problema(s) en el navegador` : "\nSin problemas en el navegador.");
process.exit(fallos ? 1 : 0);
