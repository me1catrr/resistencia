import test from "node:test";
import assert from "node:assert/strict";
import { montarSimulaciones } from "./registro.js";

// DOM mínimo: marcos con data-sim y un hueco de montaje.
function marco(id) {
  const destino = { textContent: "Cargando…", classList: { _c: new Set(), add(c) { this._c.add(c); } } };
  return { dataset: { sim: id }, querySelector: () => destino, destino };
}
const doc = (...marcos) => ({ querySelectorAll: () => marcos });

test("monta cada simulación con su módulo y limpia el texto de carga", async () => {
  const a = marco("uno");
  const montados = [];
  const importar = async (url) => ({ montar: (el) => montados.push([url, el]) });
  const r = await montarSimulaciones(doc(a), importar, "https://x.test/recursos/js/sim/registro.js");
  assert.deepEqual(r, [{ id: "uno", ok: true }]);
  assert.equal(montados[0][0], "https://x.test/recursos/js/sim/uno.js");
  assert.equal(a.destino.textContent, "");
});

test("un módulo que falla muestra un error y no impide montar las demás", async () => {
  const mala = marco("rota");
  const buena = marco("buena");
  let ok = 0;
  const importar = async (url) => {
    if (url.endsWith("rota.js")) throw new Error("404");
    return { montar() { ok++; } };
  };
  const silencio = console.error;
  console.error = () => {};
  try {
    const r = await montarSimulaciones(doc(mala, buena), importar, "https://x.test/s/registro.js");
    assert.equal(r[0].ok, false);
    assert.equal(r[1].ok, true);
  } finally { console.error = silencio; }
  assert.match(mala.destino.textContent, /No se pudo cargar la simulación «rota»: 404/);
  assert.ok(mala.destino.classList._c.has("sim-error"));
  assert.equal(ok, 1);
});

test("módulo sin montar() y identificador no válido se señalan", async () => {
  const sinMontar = marco("vacio");
  const raro = marco("../malo");
  const silencio = console.error;
  console.error = () => {};
  try {
    const r = await montarSimulaciones(doc(sinMontar, raro), async () => ({}), "https://x.test/s/registro.js");
    assert.match(r[0].error, /montar\(\)/);
    assert.match(r[1].error, /identificador/);
  } finally { console.error = silencio; }
});
