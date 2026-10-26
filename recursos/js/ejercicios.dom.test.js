// Prueba la capa de interfaz de ejercicios.js con un DOM mínimo (test/dom-falso.js).
import test from "node:test";
import assert from "node:assert/strict";
import { montar, iniciar, crearAlmacen } from "./ejercicios.js";
import { DocumentoFalso, AlmacenamientoFalso, construirEjercicio } from "./test/dom-falso.js";

function entorno() {
  const doc = new DocumentoFalso();
  const storage = new AlmacenamientoFalso();
  return { doc, storage, almacen: crearAlmacen(storage) };
}
const boton = (el, texto) => el.querySelectorAll(".ej-boton").find((b) => b.textContent.startsWith(texto));
const resultado = (el) => el.querySelector(".ej-resultado");
const opcion = (el, i) => el.querySelectorAll(".ej-opcion")[i - 1];

function opcionMultiple(doc, extra = {}) {
  return construirEjercicio(doc, {
    id: "t-q01", tipo: "opcion", attrs: { respuesta: "2", intentos: "2", nivel: "2", ...extra },
    opciones: [
      { texto: "A", feedback: "A falla porque…" },
      { texto: "B", feedback: "B es correcta porque…" },
      { texto: "C", feedback: "C falla porque…" },
    ],
    pistas: ["Pista uno", "Pista dos"],
    solucion: "Solución desarrollada",
  });
}

test("opción: acierto a la primera, feedback de todas las opciones y solución disponible", () => {
  const { doc, almacen } = entorno();
  const el = opcionMultiple(doc);
  montar(el, doc, almacen);
  assert.equal(boton(el, "Ver solución").disabled, true, "la solución empieza bloqueada");
  opcion(el, 2).entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /Correcto/);
  assert.ok(opcion(el, 2).classList.contains("ok"));
  for (const i of [1, 2, 3]) assert.ok(opcion(el, i).querySelector(".ej-feedback").classList.contains("visible"));
  assert.equal(boton(el, "Ver solución").disabled, false);
  boton(el, "Ver solución").click();
  assert.ok(el.querySelector(".ej-solucion").classList.contains("visible"));
});

test("opción: fallo, intentos limitados, y marca de texto (no solo color)", () => {
  const { doc, almacen } = entorno();
  const el = opcionMultiple(doc);
  montar(el, doc, almacen);
  opcion(el, 1).entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /No es correcto.*Te queda 1 intento/);
  assert.ok(opcion(el, 1).classList.contains("mal"));
  assert.match(opcion(el, 1).marca.textContent, /Incorrecta/);
  assert.ok(opcion(el, 1).querySelector(".ej-feedback").classList.contains("visible"));
  assert.ok(!opcion(el, 3).querySelector(".ej-feedback").classList.contains("visible"));
  assert.equal(boton(el, "Ver solución").disabled, false, "tras un intento ya se puede ver la solución");
  // segundo fallo: se agotan los intentos y se revela todo
  opcion(el, 1).entrada.checked = false;
  opcion(el, 3).entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /agotado/);
  assert.ok(opcion(el, 2).classList.contains("ok"), "se revela la correcta");
  assert.equal(boton(el, "Comprobar").disabled, true);
  assert.ok(el.querySelector(".ej-solucion").classList.contains("visible"));
});

test("opción: sin selección no cuenta como intento", () => {
  const { doc, almacen } = entorno();
  const el = opcionMultiple(doc);
  const m = montar(el, doc, almacen);
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /Elige una opción/);
  assert.equal(m.estado().intentos, 0);
});

test("pistas escalonadas", () => {
  const { doc, almacen } = entorno();
  const el = opcionMultiple(doc);
  montar(el, doc, almacen);
  const pistas = el.querySelectorAll(".ej-pista");
  assert.ok(pistas.every((p) => !p.classList.contains("visible")));
  boton(el, "Pista").click();
  assert.ok(pistas[0].classList.contains("visible") && !pistas[1].classList.contains("visible"));
  boton(el, "Pista").click();
  assert.ok(pistas[1].classList.contains("visible"));
  assert.equal(boton(el, "Pistas").disabled, true);
});

test("selección múltiple: usa casillas y exige el conjunto exacto", () => {
  const { doc, almacen } = entorno();
  const el = construirEjercicio(doc, {
    id: "t-multi", tipo: "opcion", attrs: { respuesta: "1,3" },
    opciones: [{ texto: "A" }, { texto: "B" }, { texto: "C" }],
  });
  montar(el, doc, almacen);
  assert.equal(opcion(el, 1).entrada.type, "checkbox");
  opcion(el, 1).entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /No es correcto/);
  opcion(el, 3).entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /Correcto/);
});

test("verdadero/falso razonado: exige justificación", () => {
  const { doc, almacen } = entorno();
  const el = construirEjercicio(doc, {
    id: "t-vf", tipo: "vf", attrs: { respuesta: "f", razonado: "si" },
    razonamiento: "Porque…", solucion: "Falso: …",
  });
  montar(el, doc, almacen);
  const [verdadero, falso] = el.querySelectorAll(".ej-opcion");
  assert.match(verdadero.textContent, /Verdadero/);
  falso.entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /justificación/);
  assert.equal(el.querySelector(".ej-razonamiento").classList.contains("visible"), false);
  el.querySelectorAll(".ej-enunciado"); // sin efecto; la justificación es el textarea
  const ta = doc.body.querySelectorAll(".ejercicio")[0]._descendientes().find((n) => n.tagName === "TEXTAREA");
  ta.value = "Porque el tensor es simétrico";
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /Correcto/);
  assert.ok(el.querySelector(".ej-razonamiento").classList.contains("visible"));
});

test("numérico: coma decimal, tolerancia, entrada inválida sin gastar intento, y cero", () => {
  const { doc, almacen } = entorno();
  const el = construirEjercicio(doc, {
    id: "t-num", tipo: "numerico", attrs: { respuesta: "-40", tolrel: "0.01", unidad: "MPa", intentos: "3" },
    solucion: "−40 MPa",
  });
  const m = montar(el, doc, almacen);
  const campo = el._descendientes().find((n) => n.tagName === "INPUT");
  campo.value = "abc";
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /Escribe un número/);
  assert.equal(m.estado().intentos, 0);
  campo.value = "40";
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /No es correcto.*Te quedan 2/);
  campo.value = "−39,8";
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /Correcto/);

  const cero = construirEjercicio(doc, { id: "t-cero", tipo: "numerico", attrs: { respuesta: "0", tolrel: "0.05" } });
  montar(cero, doc, almacen);
  const c2 = cero._descendientes().find((n) => n.tagName === "INPUT");
  c2.value = "0";
  boton(cero, "Comprobar").click();
  assert.match(resultado(cero).textContent, /Correcto/);
});

test("predicción: se fija antes de revelar", () => {
  const { doc, almacen } = entorno();
  const el = construirEjercicio(doc, {
    id: "t-pred", tipo: "prediccion", attrs: { respuesta: "1" },
    opciones: [{ texto: "Sube", feedback: "Sube porque…" }, { texto: "Baja", feedback: "Baja porque…" }],
    solucion: "Explicación",
  });
  montar(el, doc, almacen);
  assert.equal(el.querySelector(".ej-solucion").classList.contains("visible"), false);
  boton(el, "Fijar").click();
  assert.match(resultado(el).textContent, /Elige una opción/);
  opcion(el, 2).entrada.checked = true;
  boton(el, "Fijar").click();
  assert.match(resultado(el).textContent, /no coincide/);
  assert.ok(el.querySelector(".ej-solucion").classList.contains("visible"));
  assert.equal(opcion(el, 1).entrada.disabled, true, "la predicción queda bloqueada");
});

test("encuentra el error: pasos con radios", () => {
  const { doc, almacen } = entorno();
  const el = construirEjercicio(doc, {
    id: "t-err", tipo: "error", attrs: { respuesta: "3" }, pasos: true,
    opciones: [{ texto: "Paso 1" }, { texto: "Paso 2" }, { texto: "Paso 3", feedback: "Aquí está el error" }],
  });
  montar(el, doc, almacen);
  const pasos = el.querySelectorAll(".ej-paso");
  assert.equal(pasos.length, 3);
  pasos[2].entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.match(resultado(el).textContent, /Correcto/);
});

test("reflexión y oral no corrigen", () => {
  const { doc, almacen } = entorno();
  const r = construirEjercicio(doc, { id: "t-ref", tipo: "reflexion", solucion: "Orientación" });
  montar(r, doc, almacen);
  assert.equal(boton(r, "Comparar").disabled, true, "sin texto no se compara");
  const ta = r._descendientes().find((n) => n.tagName === "TEXTAREA");
  ta.value = "Mi idea";
  ta.dispatch("input");
  assert.equal(boton(r, "Comparar").disabled, false);
  boton(r, "Comparar").click();
  assert.ok(r.querySelector(".ej-solucion").classList.contains("visible"));

  const o = construirEjercicio(doc, { id: "t-oral", tipo: "oral", solucion: "Guion" });
  montar(o, doc, almacen);
  boton(o, "Mostrar la guía").click();
  assert.ok(o.querySelector(".ej-solucion").classList.contains("visible"));
  boton(o, "Mostrar la guía").click();
  assert.ok(!o.querySelector(".ej-solucion").classList.contains("visible"));
});

test("problema: la solución se desbloquea al declarar un intento", () => {
  const { doc, almacen } = entorno();
  const el = construirEjercicio(doc, { id: "t-prob", tipo: "problema", pistas: ["P1"], solucion: "Sol" });
  montar(el, doc, almacen);
  assert.equal(boton(el, "Ver solución").disabled, true);
  boton(el, "He intentado").click();
  assert.equal(boton(el, "Ver solución").disabled, false);
  boton(el, "Ver solución").click();
  assert.ok(el.querySelector(".ej-solucion").classList.contains("visible"));
});

test("el progreso se conserva al recargar y se borra con «Reiniciar»", () => {
  const { doc, almacen, storage } = entorno();
  const el = opcionMultiple(doc);
  montar(el, doc, almacen);
  opcion(el, 1).entrada.checked = true;
  boton(el, "Comprobar").click();
  boton(el, "Pista").click();
  assert.ok(storage.getItem("resistencia.ej.v1.t-q01"));

  // «recarga»: DOM nuevo, mismo almacenamiento
  const doc2 = new DocumentoFalso();
  const el2 = opcionMultiple(doc2);
  const m2 = montar(el2, doc2, crearAlmacen(storage));
  assert.equal(m2.estado().intentos, 1);
  assert.ok(opcion(el2, 1).entrada.checked, "recupera la selección");
  assert.ok(opcion(el2, 1).classList.contains("mal"));
  assert.ok(el2.querySelectorAll(".ej-pista")[0].classList.contains("visible"));

  boton(el2, "Reiniciar").click();
  assert.equal(m2.estado().intentos, 0);
  assert.equal(storage.getItem("resistencia.ej.v1.t-q01"), null);
  assert.ok(!opcion(el2, 1).classList.contains("mal"));
});

test("iniciar monta todo y «Borrar mis respuestas» limpia el almacén", () => {
  const { doc, almacen, storage } = entorno();
  const aviso = doc.createElement("div"); aviso.className = "aviso-ejercicios"; doc.body.append(aviso);
  opcionMultiple(doc);
  const montados = iniciar(doc, almacen);
  assert.equal(montados.length, 1);
  const el = montados[0].el;
  opcion(el, 1).entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.ok(storage.length > 0);
  boton(aviso, "Borrar mis respuestas").click();
  assert.equal(storage.length, 0);
  assert.equal(montados[0].estado().intentos, 0);
});

test("sin almacenamiento disponible no se rompe nada", () => {
  const roto = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); }, removeItem() { throw new Error("x"); }, key() { return null; }, length: 0 };
  const doc = new DocumentoFalso();
  const el = opcionMultiple(doc);
  const m = montar(el, doc, crearAlmacen(roto));
  opcion(el, 2).entrada.checked = true;
  boton(el, "Comprobar").click();
  assert.equal(m.estado().resuelto, true);
});
