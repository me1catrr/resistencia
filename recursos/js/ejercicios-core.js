// Lógica pura de los ejercicios (sin DOM): corrección y estado. Se prueba en
// ejercicios-core.test.js. La capa de interfaz está en ejercicios.js.

/** Convierte «3,5», «−2.1», «1e3», « 4 » en número. Devuelve NaN si no es un número. */
export function parseNumero(texto) {
  if (typeof texto === "number") return texto;
  if (typeof texto !== "string") return NaN;
  let t = texto.trim().replace(/−/g, "-").replace(/\s+/g, "").replace(",", ".");
  if (t === "" || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return NaN;
  return Number(t);
}

/**
 * Compara una respuesta numérica con la esperada.
 * - tol:    tolerancia absoluta.
 * - tolrel: tolerancia relativa (fracción de |esperado|).
 * Si se dan ambas vale la mayor. Con esperado = 0 la tolerancia relativa no tiene
 * sentido (daría 0), así que se exige una tolerancia absoluta y, si no se da,
 * se usa 1e-9. Sin ninguna tolerancia se usa 1 % relativo.
 */
export function evaluarNumerico(usuario, esperado, { tol, tolrel } = {}) {
  const x = typeof usuario === "number" ? usuario : parseNumero(usuario);
  if (!Number.isFinite(x)) return { valido: false, ok: false, error: NaN };
  const tolAbs = Number.isFinite(tol) ? tol : null;
  const tolRel = Number.isFinite(tolrel) ? tolrel : null;
  let margen;
  if (tolAbs === null && tolRel === null) margen = 0.01 * Math.abs(esperado);
  else margen = Math.max(tolAbs ?? 0, tolRel === null ? 0 : tolRel * Math.abs(esperado));
  if (esperado === 0) margen = Math.max(tolAbs ?? 0, 1e-9);
  const error = Math.abs(x - esperado);
  return { valido: true, ok: error <= margen * (1 + 1e-9) + 1e-12, error };
}

/** «2» → {2}; «1,3» → {1,3}. Los índices empiezan en 1. */
export function parseIndices(texto) {
  const s = new Set();
  for (const p of String(texto ?? "").split(",")) {
    const n = Number.parseInt(p.trim(), 10);
    if (Number.isInteger(n) && n > 0) s.add(n);
  }
  return s;
}

/** Compara dos conjuntos de índices. */
export function evaluarOpciones(seleccion, correctas) {
  const sel = new Set(seleccion);
  const ok = sel.size === correctas.size && [...sel].every((i) => correctas.has(i));
  const sobran = [...sel].filter((i) => !correctas.has(i));
  const faltan = [...correctas].filter((i) => !sel.has(i));
  return { ok, sobran, faltan };
}

/** Verdadero/falso: la respuesta esperada es «v» o «f». */
export function evaluarVF(respuesta, esperada) {
  const norm = (x) => String(x ?? "").trim().toLowerCase().charAt(0);
  const r = norm(respuesta);
  if (r !== "v" && r !== "f") return { valido: false, ok: false };
  return { valido: true, ok: r === norm(esperada) };
}

// ---------------------------------------------------------------------------
// Estado de un ejercicio
// ---------------------------------------------------------------------------

export function estadoInicial() {
  return { intentos: 0, resuelto: false, pistas: 0, solucionVista: false, fijada: false, respuesta: null };
}

/** Restaura un estado guardado, descartando lo que no tenga el formato esperado. */
export function estadoDesdeJSON(texto) {
  const base = estadoInicial();
  if (!texto) return base;
  try {
    const o = JSON.parse(texto);
    return {
      intentos: Number.isInteger(o.intentos) && o.intentos >= 0 ? o.intentos : 0,
      resuelto: o.resuelto === true,
      pistas: Number.isInteger(o.pistas) && o.pistas >= 0 ? o.pistas : 0,
      solucionVista: o.solucionVista === true,
      fijada: o.fijada === true,
      respuesta: o.respuesta ?? null,
    };
  } catch {
    return base;
  }
}

/** Registra un intento. `max` es el número máximo de intentos (0 o null: sin límite). */
export function registrarIntento(estado, ok) {
  return { ...estado, intentos: estado.intentos + 1, resuelto: estado.resuelto || ok };
}

/** ¿Se agotaron los intentos sin acertar? */
export function agotado(estado, max) {
  return Boolean(max) && !estado.resuelto && estado.intentos >= max;
}

/** ¿Se puede ya ver la solución? Tras un intento o un acierto; «oral» siempre. */
export function solucionDesbloqueada(tipo, estado, max) {
  if (tipo === "oral") return true;
  if (tipo === "prediccion") return estado.fijada;
  return estado.resuelto || estado.intentos >= 1 || agotado(estado, max);
}

/** ¿Se puede seguir comprobando? */
export function puedeIntentar(estado, max) {
  return !estado.resuelto && !agotado(estado, max);
}

export function siguientePista(estado, total) {
  return estado.pistas < total ? { ...estado, pistas: estado.pistas + 1 } : estado;
}

/** Texto de intentos restantes: «Te quedan 2 intentos.» */
export function mensajeIntentos(estado, max) {
  if (!max) return "";
  const q = max - estado.intentos;
  if (q <= 0) return "Se han agotado los intentos.";
  return q === 1 ? "Te queda 1 intento." : `Te quedan ${q} intentos.`;
}

export const PREFIJO_ALMACEN = "resistencia.ej.v1.";
