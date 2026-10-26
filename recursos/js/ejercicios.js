// Interacción de los ejercicios (cuestionarios y problemas). Se carga como
// módulo desde las páginas que tienen ejercicios (lo inserta scripts/lua/ejercicios.lua).
//
// Todo es local: el progreso se guarda solo en localStorage de este navegador
// (con try/catch) y no se envía nada. La corrección está en ejercicios-core.js.
// La estructura HTML que se mejora la genera scripts/lua/ejercicios.lua; sin
// JavaScript todo queda visible, incluida la solución.

import {
  PREFIJO_ALMACEN, estadoInicial, estadoDesdeJSON, parseIndices, parseNumero, evaluarOpciones,
  evaluarNumerico, evaluarVF, registrarIntento, agotado, solucionDesbloqueada, puedeIntentar,
  siguientePista, mensajeIntentos,
} from "./ejercicios-core.js";

/** Almacén sobre un objeto tipo Storage; nunca lanza si no hay almacenamiento. */
export function crearAlmacen(storage) {
  const seguro = (f, defecto) => { try { return f(); } catch { return defecto; } };
  return {
    leer: (id) => estadoDesdeJSON(seguro(() => storage.getItem(PREFIJO_ALMACEN + id), null)),
    guardar: (id, estado) => seguro(() => storage.setItem(PREFIJO_ALMACEN + id, JSON.stringify(estado))),
    borrar: (id) => seguro(() => storage.removeItem(PREFIJO_ALMACEN + id)),
    borrarTodo: () => seguro(() => {
      const claves = [];
      for (let i = 0; i < storage.length; i++) claves.push(storage.key(i));
      for (const k of claves) if (k && k.startsWith(PREFIJO_ALMACEN)) storage.removeItem(k);
    }),
  };
}

function h(doc, tag, clase, texto) {
  const e = doc.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function boton(doc, texto, secundario) {
  const b = h(doc, "button", "ej-boton" + (secundario ? " secundario" : ""), texto);
  b.type = "button";
  return b;
}

const hijosConClase = (el, clase) => el.querySelectorAll("." + clase);

/** Monta un ejercicio. Devuelve funciones útiles para pruebas. */
export function montar(el, doc, almacen) {
  const id = el.id;
  const tipo = el.dataset.tipo;
  const max = Number(el.dataset.intentos) || 0;
  let estado = almacen.leer(id);
  el.classList.add("ej-js");

  const pistas = hijosConClase(el, "ej-pista");
  const solucion = el.querySelector(".ej-solucion");
  const razonamiento = el.querySelector(".ej-razonamiento");
  const controles = h(doc, "div", "ej-controles");
  const resultado = h(doc, "div", "ej-resultado");
  resultado.setAttribute("role", "status");
  const guardar = () => almacen.guardar(id, estado);

  // ---- estructura de entrada según el tipo ----
  let items = [];            // opciones (o pasos) con radios/casillas
  let correctas = new Set();
  let campoTexto = null;     // numérico, reflexión, predicción abierta, justificación
  let justificacion = null;  // vf razonado
  const enunciado = el.querySelector(".ej-enunciado");

  const esOpciones = ["opcion", "grafica", "error", "prediccion", "vf"].includes(tipo);

  if (tipo === "vf") {
    const lista = h(doc, "div", "ej-opciones");
    for (const [i, texto] of [[1, "Verdadero"], [2, "Falso"]]) {
      const it = h(doc, "div", "ej-opcion");
      it.dataset.indice = String(i);
      const t = h(doc, "div", "ej-texto", texto);
      it.append(t);
      lista.append(it);
    }
    enunciado.parentNode.insertBefore(lista, enunciado.nextSibling);
    correctas = new Set([String(el.dataset.respuesta || "").trim().toLowerCase().startsWith("v") ? 1 : 2]);
    if (el.dataset.razonado === "si") {
      justificacion = h(doc, "textarea");
      justificacion.setAttribute("aria-label", "Justifica tu respuesta");
      justificacion.placeholder = "Justifica tu respuesta con tus palabras…";
      lista.parentNode.insertBefore(justificacion, lista.nextSibling);
    }
  } else if (esOpciones) {
    correctas = parseIndices(el.dataset.respuesta);
  }

  if (esOpciones) {
    items = [...hijosConClase(el, "ej-opcion"), ...hijosConClase(el, "ej-paso")];
    // `ej-opcion` del vf ya se ha creado arriba; se recogen una sola vez
    items = [...new Set(items)];
    const multiple = correctas.size > 1 || el.dataset.multiple === "si";
    for (const it of items) {
      const entrada = doc.createElement("input");
      entrada.type = multiple ? "checkbox" : "radio";
      entrada.name = id;
      entrada.value = it.dataset.indice;
      entrada.addEventListener("change", limpiarMarcas);
      const texto = it.querySelector(".ej-texto");
      const marca = h(doc, "span", "ej-marca");
      const etiqueta = h(doc, "label");
      it.replaceChild(etiqueta, texto);
      etiqueta.append(entrada, texto, marca);
      it.entrada = entrada;
      it.marca = marca;
    }
    if (tipo === "error" && items.length) {
      const lista = items[0].parentNode;
      lista.parentNode.insertBefore(h(doc, "p", "ej-etiqueta", "Marca el primer paso erróneo:"), lista);
    } else if (multiple && items.length) {
      const lista = items[0].parentNode;
      lista.parentNode.insertBefore(h(doc, "p", "ej-etiqueta", "Marca todas las correctas:"), lista);
    }
  }

  if (tipo === "numerico") {
    const fila = h(doc, "div", "ej-entrada");
    const entrada = doc.createElement("input");
    entrada.type = "text";
    entrada.inputMode = "decimal";
    entrada.setAttribute("aria-label", "Tu respuesta" + (el.dataset.unidad ? ` en ${el.dataset.unidad}` : ""));
    entrada.addEventListener("input", () => { if (puedeIntentar(estado, max)) resultado.textContent = ""; });
    fila.append(entrada);
    if (el.dataset.unidad) fila.append(h(doc, "span", "ej-unidad", " " + el.dataset.unidad));
    enunciado.parentNode.insertBefore(fila, enunciado.nextSibling);
    campoTexto = entrada;
  } else if (tipo === "reflexion" || (tipo === "prediccion" && !items.length)) {
    const ta = h(doc, "textarea");
    ta.setAttribute("aria-label", tipo === "reflexion" ? "Tu reflexión" : "Tu predicción");
    ta.placeholder = tipo === "reflexion" ? "Escribe tu reflexión…" : "Escribe tu predicción…";
    ta.addEventListener("input", () => { estado.respuesta = ta.value; guardar(); pintarBotones(); });
    enunciado.parentNode.insertBefore(ta, enunciado.nextSibling);
    campoTexto = ta;
  }

  // ---- botones ----
  const bComprobar = (["opcion", "grafica", "error", "vf", "numerico"].includes(tipo)) ? boton(doc, "Comprobar") : null;
  const bFijar = tipo === "prediccion" ? boton(doc, "Fijar mi predicción") : null;
  const bComparar = tipo === "reflexion" ? boton(doc, "Comparar con la orientación") : null;
  const bIntentado = tipo === "problema" ? boton(doc, "He intentado resolverlo") : null;
  const bPista = pistas.length ? boton(doc, "Pista", true) : null;
  const bSolucion = (solucion && !["reflexion", "prediccion"].includes(tipo))
    ? boton(doc, tipo === "oral" ? "Mostrar la guía" : "Ver solución", true) : null;
  const bReiniciar = tipo === "oral" ? null : boton(doc, "Reiniciar", true);
  for (const b of [bComprobar, bFijar, bComparar, bIntentado, bPista, bSolucion, bReiniciar]) if (b) controles.append(b);
  el.append(controles, resultado);

  // ---- lectura de la entrada actual ----
  const seleccion = () => new Set(items.filter((it) => it.entrada.checked).map((it) => Number(it.dataset.indice)));
  const indicesGuardados = () => Array.isArray(estado.respuesta) ? estado.respuesta : [];

  // ---- pintado (función del estado y de la selección actual) ----
  function revelarTodo() {
    return estado.resuelto || agotado(estado, max) || estado.solucionVista || estado.fijada;
  }

  function limpiarMarcas() {
    if (!puedeIntentar(estado, max) || estado.fijada) return;
    for (const it of items) {
      it.classList.remove("ok", "mal");
      it.marca.textContent = "";
      const fb = it.querySelector(".ej-feedback");
      if (fb) fb.classList.remove("visible");
    }
    if (estado.intentos > 0) resultado.textContent = "";
    resultado.classList.remove("ok", "mal");
  }

  function pintarOpciones() {
    const sel = seleccion();
    const todo = revelarTodo();
    for (const it of items) {
      const i = Number(it.dataset.indice);
      const fb = it.querySelector(".ej-feedback");
      it.classList.remove("ok", "mal");
      it.marca.textContent = "";
      let verFb = false;
      if (todo) {
        verFb = true;
        if (correctas.size && correctas.has(i)) { it.classList.add("ok"); it.marca.textContent = " ✔ Correcta"; }
        else if (sel.has(i)) { it.classList.add("mal"); it.marca.textContent = " ✘ Incorrecta"; }
      } else if (estado.intentos > 0 && sel.has(i) && !correctas.has(i)) {
        it.classList.add("mal"); it.marca.textContent = " ✘ Incorrecta"; verFb = true;
      }
      if (fb) fb.classList.toggle("visible", verFb);
      it.entrada.disabled = !puedeIntentar(estado, max) || estado.fijada || estado.solucionVista;
    }
  }

  function pintarResultado() {
    resultado.classList.remove("ok", "mal");
    if (tipo === "prediccion") {
      if (estado.fijada && correctas.size) {
        const ok = evaluarOpciones(seleccion(), correctas).ok;
        resultado.textContent = ok ? "✔ Tu predicción era correcta." : "✘ Tu predicción no coincide; revisa la explicación.";
        resultado.classList.add(ok ? "ok" : "mal");
      } else if (estado.fijada) {
        resultado.textContent = "Predicción fijada. Compárala con la explicación.";
      } else resultado.textContent = "";
      return;
    }
    if (tipo === "reflexion" || tipo === "oral" || tipo === "problema") {
      resultado.textContent = tipo === "problema" && estado.intentos > 0 && !estado.solucionVista
        ? "Bien: ya puedes consultar la solución cuando quieras." : "";
      return;
    }
    if (estado.intentos === 0) { resultado.textContent = ""; return; }
    if (estado.resuelto) {
      resultado.textContent = "✔ Correcto." + (estado.intentos > 1 ? ` Lo has conseguido en ${estado.intentos} intentos.` : "");
      resultado.classList.add("ok");
    } else if (agotado(estado, max)) {
      resultado.textContent = "✘ No es correcto. " + mensajeIntentos(estado, max) + " Revisa la solución.";
      resultado.classList.add("mal");
    } else {
      resultado.textContent = ("✘ No es correcto. " + mensajeIntentos(estado, max)).trim();
      resultado.classList.add("mal");
    }
  }

  function pintarBotones() {
    if (bComprobar) bComprobar.disabled = !puedeIntentar(estado, max) || estado.solucionVista;
    if (bFijar) bFijar.disabled = estado.fijada;
    if (bComparar) bComparar.disabled = !(campoTexto && campoTexto.value.trim());
    if (bIntentado) bIntentado.disabled = estado.intentos > 0;
    if (bSolucion) {
      bSolucion.disabled = !solucionDesbloqueada(tipo, estado, max);
      if (tipo !== "oral") bSolucion.title = bSolucion.disabled ? "Haz primero un intento" : "";
    }
    if (bPista) {
      bPista.textContent = estado.pistas >= pistas.length ? `Pistas (${pistas.length}/${pistas.length})` : `Pista (${estado.pistas}/${pistas.length})`;
      bPista.disabled = estado.pistas >= pistas.length;
    }
  }

  function pintar() {
    if (esOpciones) pintarOpciones();
    pistas.forEach((p, i) => p.classList.toggle("visible", i < estado.pistas));
    const verSol = estado.solucionVista || estado.fijada || (agotado(estado, max) && !!solucion);
    if (solucion) solucion.classList.toggle("visible", verSol);
    if (razonamiento) razonamiento.classList.toggle("visible", estado.intentos > 0 || estado.fijada || estado.solucionVista);
    pintarResultado();
    pintarBotones();
  }

  // ---- acciones ----
  function comprobar() {
    if (!puedeIntentar(estado, max)) return;
    let ok;
    if (tipo === "numerico") {
      const r = evaluarNumerico(campoTexto.value, parseNumero(el.dataset.respuesta), {
        tol: el.dataset.tol === undefined ? NaN : parseNumero(el.dataset.tol),
        tolrel: el.dataset.tolrel === undefined ? NaN : parseNumero(el.dataset.tolrel),
      });
      if (!r.valido) {
        resultado.textContent = "Escribe un número (puedes usar la coma decimal).";
        resultado.classList.remove("ok");
        resultado.classList.add("mal");
        return;
      }
      ok = r.ok;
      estado.respuesta = campoTexto.value;
    } else {
      const sel = seleccion();
      if (sel.size === 0) {
        resultado.textContent = "Elige una opción antes de comprobar.";
        resultado.classList.remove("ok");
        resultado.classList.add("mal");
        return;
      }
      if (justificacion && !justificacion.value.trim()) {
        resultado.textContent = "Escribe primero tu justificación.";
        resultado.classList.remove("ok");
        resultado.classList.add("mal");
        return;
      }
      ok = evaluarOpciones(sel, correctas).ok;
      estado.respuesta = [...sel];
    }
    estado = { ...registrarIntento(estado, ok), respuesta: estado.respuesta };
    resultado.textContent = "";
    guardar();
    pintar();
  }

  function fijar() {
    if (items.length && seleccion().size === 0) {
      resultado.textContent = "Elige una opción para fijar tu predicción.";
      return;
    }
    if (!items.length && !(campoTexto && campoTexto.value.trim())) {
      resultado.textContent = "Escribe tu predicción antes de fijarla.";
      return;
    }
    estado = { ...estado, fijada: true, respuesta: items.length ? [...seleccion()] : campoTexto.value };
    if (campoTexto) campoTexto.disabled = true;
    guardar();
    pintar();
  }

  function reiniciar() {
    estado = estadoInicial();
    almacen.borrar(id);
    for (const it of items) it.entrada.checked = false;
    if (campoTexto) { campoTexto.value = ""; campoTexto.disabled = false; }
    if (justificacion) justificacion.value = "";
    resultado.textContent = "";
    pintar();
  }

  if (bComprobar) bComprobar.addEventListener("click", comprobar);
  if (bFijar) bFijar.addEventListener("click", fijar);
  if (bComparar) bComparar.addEventListener("click", () => {
    estado = { ...estado, solucionVista: true, intentos: Math.max(1, estado.intentos), respuesta: campoTexto.value };
    guardar(); pintar();
  });
  if (bIntentado) bIntentado.addEventListener("click", () => { estado = registrarIntento(estado, false); guardar(); pintar(); });
  if (bPista) bPista.addEventListener("click", () => { estado = siguientePista(estado, pistas.length); guardar(); pintar(); });
  if (bSolucion) bSolucion.addEventListener("click", () => {
    if (tipo === "oral") estado = { ...estado, solucionVista: !estado.solucionVista };
    else if (solucionDesbloqueada(tipo, estado, max)) estado = { ...estado, solucionVista: true };
    guardar(); pintar();
  });
  if (bReiniciar) bReiniciar.addEventListener("click", reiniciar);

  // ---- restaurar lo guardado ----
  if (items.length && estado.respuesta !== null) {
    const guardadas = new Set(indicesGuardados());
    for (const it of items) it.entrada.checked = guardadas.has(Number(it.dataset.indice));
  }
  if (campoTexto && typeof estado.respuesta === "string") campoTexto.value = estado.respuesta;
  if (campoTexto && estado.fijada) campoTexto.disabled = true;
  pintar();

  return { comprobar, reiniciar, estado: () => estado, el };
}

/** Monta todos los ejercicios de la página y el botón para borrar lo guardado. */
export function iniciar(doc, almacen) {
  const montados = [];
  for (const el of doc.querySelectorAll(".ejercicio")) {
    if (el.dataset.tipo) montados.push(montar(el, doc, almacen));
  }
  for (const aviso of doc.querySelectorAll(".aviso-ejercicios")) {
    const b = boton(doc, "Borrar mis respuestas de este navegador", true);
    b.addEventListener("click", () => {
      almacen.borrarTodo();
      for (const m of montados) m.reiniciar();
    });
    aviso.append(b);
  }
  return montados;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  const arrancar = () => {
    let almacenamiento = null;
    try { almacenamiento = window.localStorage; } catch { /* bloqueado */ }
    const sinAlmacen = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
    iniciar(document, crearAlmacen(almacenamiento || sinAlmacen));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar);
  else arrancar();
}
