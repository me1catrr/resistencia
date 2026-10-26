// Utilidades compartidas por scripts/captura.mjs y scripts/revisar_navegador.mjs: sirve el sitio por HTTP bajo
// /resistencia/ (como GitHub Pages) y controla chrome-headless-shell por el protocolo DevTools. Sin dependencias.
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2",
  ".woff": "font/woff", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain", ".map": "application/json" };

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
export const traza = (...a) => { if (process.env.CAPTURA_DEPURAR) console.error("[navegador]", ...a); };

/** Servidor estático mínimo del sitio bajo el prefijo /resistencia/. */
export function servidor(directorio) {
  return new Promise((res) => {
    const srv = createServer(async (req, rsp) => {
      try {
        let ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (!ruta.startsWith("/resistencia/")) { rsp.writeHead(404); return rsp.end("fuera de /resistencia/"); }
        ruta = ruta.slice("/resistencia".length);
        let archivo = join(directorio, ruta);
        if (!archivo.startsWith(directorio)) { rsp.writeHead(403); return rsp.end(); }
        if ((await stat(archivo).catch(() => null))?.isDirectory()) archivo = join(archivo, "index.html");
        const datos = await readFile(archivo);
        rsp.writeHead(200, { "Content-Type": MIME[archivo.slice(archivo.lastIndexOf("."))] ?? "application/octet-stream" });
        rsp.end(datos);
      } catch { rsp.writeHead(404); rsp.end("no encontrado"); }
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

export function rutaNavegador() {
  const base = join(homedir(), "Library/Caches/ms-playwright");
  const dirs = existsSync(base) ? readdirSync(base).filter((d) => d.startsWith("chromium_headless_shell")).sort() : [];
  for (const d of dirs.reverse()) {
    for (const sub of ["chrome-headless-shell-mac-arm64", "chrome-headless-shell-mac-x64"]) {
      const p = join(base, d, sub, "chrome-headless-shell");
      if (existsSync(p)) return p;
    }
  }
  throw new Error("No encuentro chrome-headless-shell de Playwright");
}

/**
 * Abre un navegador y un servidor del sitio y ejecuta `fn({ abrir, base })`. `abrir(pagina, opciones)` devuelve una
 * pestaña con cdp(), evaluar(), consola[] y cerrar(). Cierra todo al terminar.
 */
export async function conNavegador(directorioSitio, fn, { maximo = 240000 } = {}) {
  const puerto = 9300 + Math.floor(Math.random() * 500);
  const perfil = mkdtempSync(join("/tmp", "cdp"));
  const srv = await servidor(directorioSitio);
  const base = `http://127.0.0.1:${srv.address().port}/resistencia/`;
  const chrome = spawn(rutaNavegador(), ["--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, "about:blank"], { stdio: "ignore" });
  const matar = () => {
    try { chrome.kill("SIGKILL"); } catch { /* ya terminó */ }
    try { srv.close(); } catch { /* ya cerrado */ }
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* sin permiso */ }
  };
  const limite = setTimeout(() => { console.error("ERROR: tiempo máximo agotado"); matar(); process.exit(1); }, maximo);
  try {
    let version;
    for (let i = 0; i < 60 && !version; i++) {
      try { version = await (await fetch(`http://127.0.0.1:${puerto}/json/version`)).json(); } catch { await dormir(250); }
    }
    if (!version) throw new Error("Chrome no abrió el puerto de depuración");
    traza("Chrome listo", version.Browser);

    const abrir = async (pagina, { ancho = 1200, alto = 900, oscuro = false, selector = "", espera = 1500 } = {}) => {
      const pestana = await (await fetch(`http://127.0.0.1:${puerto}/json/new?about:blank`, { method: "PUT" })).json();
      const ws = new WebSocket(pestana.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
      let id = 0;
      const pendientes = new Map();
      const eventos = [];
      const consola = [];
      ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); return; }
        if (!d.method) return;
        eventos.push(d.method);
        if (d.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(d.params.type)) {
          consola.push(`${d.params.type}: ${d.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`.slice(0, 300));
        } else if (d.method === "Runtime.exceptionThrown") {
          consola.push(`excepción: ${(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text).slice(0, 400)}`);
        } else if (d.method === "Log.entryAdded" && ["error"].includes(d.params.entry.level)) {
          consola.push(`log: ${d.params.entry.text} ${d.params.entry.url ?? ""}`.slice(0, 300));
        }
      };
      const cdp = (method, params = {}) => new Promise((res) => { const i = ++id; pendientes.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
      const evaluar = async (expresion) => (await cdp("Runtime.evaluate", { expression: expresion, returnByValue: true, awaitPromise: true })).result?.result?.value;
      await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Log.enable");
      await cdp("Emulation.setDeviceMetricsOverride", { width: ancho, height: alto, deviceScaleFactor: 1, mobile: ancho < 600 });
      if (oscuro) await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
      await cdp("Page.navigate", { url: base + pagina });
      for (let i = 0; i < 160 && !eventos.includes("Page.loadEventFired"); i++) await dormir(250);
      let selectorOk = true;
      if (selector) {
        selectorOk = false;
        for (let i = 0; i < 80 && !selectorOk; i++) { selectorOk = await evaluar(`!!document.querySelector(${JSON.stringify(selector)})`); if (!selectorOk) await dormir(250); }
      }
      await dormir(espera);
      return { cdp, evaluar, consola, selectorOk, cerrar: async () => { ws.close(); await fetch(`http://127.0.0.1:${puerto}/json/close/${pestana.id}`).catch(() => {}); } };
    };
    return await fn({ abrir, base });
  } finally {
    clearTimeout(limite);
    matar();
  }
}
