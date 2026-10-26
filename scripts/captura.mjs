#!/usr/bin/env node
// Captura de una página del sitio con chrome-headless-shell controlado por el protocolo DevTools.
// Sin dependencias. Sirve para páginas con Observable JS, que cuelgan el modo --screenshot de Chrome.
//
//   node scripts/captura.mjs temas/e01-tensiones-espacio/01-tension-punto.html salida.png
//   node scripts/captura.mjs ... --selector "svg[role=img]" --espera 3000     # espera a que exista
//   node scripts/captura.mjs ... --elemento ".sim-caja" --antes 20 --alto 900 # recorta desde ahí
//   node scripts/captura.mjs ... --ancho 390 --oscuro --sitio _site-pruebas
//
// Sirve el sitio por HTTP en un puerto local bajo /resistencia/ (como GitHub Pages). Necesita red si la página
// carga MathJax u Observable JS de un CDN; en el sandbox de Claude Code se ejecuta con el sandbox desactivado.
// Imprime los errores de consola de la página.
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { conNavegador } from "./lib/navegador.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function opciones(argv) {
  const o = { ancho: 1200, alto: 0, espera: 2500, sitio: "_site", oscuro: false, selector: "", elemento: "", maximo: 120000, antes: 0 };
  const libres = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--oscuro") o.oscuro = true;
    else if (a.startsWith("--")) { o[a.slice(2)] = isNaN(Number(argv[i + 1])) ? argv[++i] : Number(argv[++i]); }
    else libres.push(a);
  }
  [o.pagina, o.salida] = libres;
  if (!o.pagina || !o.salida) { console.error("uso: node scripts/captura.mjs PAGINA.html SALIDA.png [opciones]"); process.exit(2); }
  return o;
}

const o = opciones(process.argv.slice(2));
await conNavegador(resolve(RAIZ, o.sitio), async ({ abrir }) => {
  const p = await abrir(o.pagina, { ancho: o.ancho, alto: o.alto || 900, oscuro: o.oscuro, selector: o.selector, espera: o.espera });
  if (o.selector && !p.selectorOk) p.consola.push(`aviso: no apareció el selector ${o.selector}`);
  const altoTotal = await p.evaluar("document.documentElement.scrollHeight");
  let clip;
  if (o.elemento) {
    const y = await p.evaluar(`(() => { const e = document.querySelector(${JSON.stringify(o.elemento)}); return e ? e.getBoundingClientRect().top + scrollY - 10 - ${Number(o.antes) || 0} : null; })()`);
    if (y === null) throw new Error(`no existe el elemento ${o.elemento}`);
    clip = { x: 0, y: Math.max(0, y), width: o.ancho, height: Math.min(o.alto || 900, altoTotal - y), scale: 1 };
  } else {
    clip = { x: 0, y: 0, width: o.ancho, height: Math.min(o.alto || altoTotal, 16000), scale: 1 };
  }
  const img = await p.cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
  writeFileSync(o.salida, Buffer.from(img.result.data, "base64"));
  console.log(`captura: ${o.salida} (${o.ancho}×${Math.round(clip.height)}; alto de la página ${altoTotal})`);
  for (const c of p.consola.slice(0, 25)) console.log("  consola →", c);
  await p.cerrar();
}, { maximo: o.maximo }).catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
