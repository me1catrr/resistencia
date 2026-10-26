import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNumero, evaluarNumerico, parseIndices, evaluarOpciones, evaluarVF,
  estadoInicial, estadoDesdeJSON, registrarIntento, agotado, solucionDesbloqueada,
  puedeIntentar, siguientePista, mensajeIntentos,
} from "./ejercicios-core.js";

test("parseNumero acepta coma decimal, signo menos tipográfico y notación científica", () => {
  assert.equal(parseNumero("3,5"), 3.5);
  assert.equal(parseNumero(" −2.1 "), -2.1);
  assert.equal(parseNumero("1e3"), 1000);
  assert.equal(parseNumero("1 000"), 1000);
  assert.equal(parseNumero(".5"), 0.5);
  assert.equal(parseNumero("-0"), -0);
  assert.equal(parseNumero(7), 7);
});

test("parseNumero rechaza lo que no es un número", () => {
  for (const malo of ["", "  ", "abc", "1,2,3", "1.2.3", "--1", "12abc", "Infinity", "NaN", null, undefined, {}]) {
    assert.ok(Number.isNaN(parseNumero(malo)), `debería ser NaN: ${JSON.stringify(malo)}`);
  }
});

test("evaluarNumerico: tolerancia absoluta y relativa", () => {
  assert.equal(evaluarNumerico("60,4", 60, { tol: 0.5 }).ok, true);
  assert.equal(evaluarNumerico("60,6", 60, { tol: 0.5 }).ok, false);
  assert.equal(evaluarNumerico("61", 60, { tolrel: 0.02 }).ok, true);
  assert.equal(evaluarNumerico("62", 60, { tolrel: 0.02 }).ok, false);
  assert.equal(evaluarNumerico("-39,9", -40, { tolrel: 0.01 }).ok, true);
  // por defecto 1 % relativo
  assert.equal(evaluarNumerico("100,9", 100).ok, true);
  assert.equal(evaluarNumerico("102", 100).ok, false);
});

test("evaluarNumerico: el caso de respuesta esperada 0", () => {
  // una tolerancia relativa daría margen 0: no debe exigirse igualdad exacta imposible
  assert.equal(evaluarNumerico("0", 0, { tolrel: 0.05 }).ok, true);
  assert.equal(evaluarNumerico("1e-12", 0, { tolrel: 0.05 }).ok, true);
  assert.equal(evaluarNumerico("0,001", 0, { tolrel: 0.05 }).ok, false);
  assert.equal(evaluarNumerico("0,001", 0, { tol: 0.01 }).ok, true);
  assert.equal(evaluarNumerico("0,1", 0, { tol: 0.01 }).ok, false);
});

test("evaluarNumerico: entrada inválida no cuenta como fallo de cálculo", () => {
  const r = evaluarNumerico("hola", 5, { tol: 1 });
  assert.equal(r.valido, false);
  assert.equal(r.ok, false);
});

test("evaluarNumerico: signo equivocado es un fallo", () => {
  assert.equal(evaluarNumerico("40", -40, { tolrel: 0.01 }).ok, false);
});

test("parseIndices y evaluarOpciones", () => {
  assert.deepEqual([...parseIndices("2")], [2]);
  assert.deepEqual([...parseIndices("1, 3")].sort(), [1, 3]);
  assert.deepEqual([...parseIndices("")], []);
  assert.deepEqual([...parseIndices("x,0,-1,2")], [2]);
  const c = parseIndices("1,3");
  assert.equal(evaluarOpciones(new Set([1, 3]), c).ok, true);
  const mal = evaluarOpciones(new Set([1, 2]), c);
  assert.equal(mal.ok, false);
  assert.deepEqual(mal.sobran, [2]);
  assert.deepEqual(mal.faltan, [3]);
  assert.equal(evaluarOpciones(new Set(), c).ok, false);
});

test("evaluarVF", () => {
  assert.equal(evaluarVF("v", "v").ok, true);
  assert.equal(evaluarVF("Verdadero", "v").ok, true);
  assert.equal(evaluarVF("f", "v").ok, false);
  assert.equal(evaluarVF("", "v").valido, false);
  assert.equal(evaluarVF("quizá", "v").valido, false);
});

test("estado: intentos, acierto y solución desbloqueada", () => {
  let e = estadoInicial();
  assert.equal(solucionDesbloqueada("opcion", e, 2), false);
  assert.equal(puedeIntentar(e, 2), true);
  e = registrarIntento(e, false);
  assert.equal(solucionDesbloqueada("opcion", e, 0), true); // tras un intento
  assert.equal(puedeIntentar(e, 2), true);
  e = registrarIntento(e, false);
  assert.equal(agotado(e, 2), true);
  assert.equal(puedeIntentar(e, 2), false);
  assert.equal(mensajeIntentos(e, 2), "Se han agotado los intentos.");
  const acierto = registrarIntento(estadoInicial(), true);
  assert.equal(acierto.resuelto, true);
  assert.equal(agotado(acierto, 1), false);
  assert.equal(puedeIntentar(acierto, 5), false);
});

test("estado: oral y predicción tienen reglas propias", () => {
  assert.equal(solucionDesbloqueada("oral", estadoInicial(), 0), true);
  assert.equal(solucionDesbloqueada("prediccion", estadoInicial(), 0), false);
  assert.equal(solucionDesbloqueada("prediccion", { ...estadoInicial(), fijada: true }, 0), true);
});

test("pistas escalonadas y mensajes de intentos", () => {
  let e = estadoInicial();
  e = siguientePista(e, 2);
  e = siguientePista(e, 2);
  e = siguientePista(e, 2);
  assert.equal(e.pistas, 2);
  assert.equal(mensajeIntentos({ ...estadoInicial(), intentos: 1 }, 3), "Te quedan 2 intentos.");
  assert.equal(mensajeIntentos({ ...estadoInicial(), intentos: 2 }, 3), "Te queda 1 intento.");
  assert.equal(mensajeIntentos(estadoInicial(), 0), "");
});

test("estadoDesdeJSON tolera datos corruptos", () => {
  assert.deepEqual(estadoDesdeJSON(null), estadoInicial());
  assert.deepEqual(estadoDesdeJSON("{no es json"), estadoInicial());
  assert.deepEqual(estadoDesdeJSON('{"intentos":"mucho","resuelto":"sí"}'), estadoInicial());
  const e = estadoDesdeJSON('{"intentos":2,"resuelto":true,"pistas":1}');
  assert.equal(e.intentos, 2);
  assert.equal(e.resuelto, true);
  assert.equal(e.pistas, 1);
});
