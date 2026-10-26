// Modelo del simulador del tensor de tensiones 3D (sin DOM). Toda la física sale de
// ../tensiones.js; aquí solo se organiza el estado de la simulación, se validan las
// entradas y se calcula la geometría que dibuja la interfaz (tensor3d.js).

import {
  esSimetrica, normalizar, componentesPlano, matrizRotacionEjes, rotar, principales,
  invariantes, esfericoDesviador, octaedricas, circulosMohr, tauMax, admisible, norma,
} from "../tensiones.js";
import { parseNumero } from "../ejercicios-core.js";

/** Componentes: [sxx, syy, szz, sxy, syz, szx]. */
export const NOMBRES_COMPONENTES = ["σxx", "σyy", "σzz", "σxy", "σyz", "σzx"];

export function matrizDesdeComponentes([sxx, syy, szz, sxy, syz, szx]) {
  return [[sxx, sxy, szx], [sxy, syy, syz], [szx, syz, szz]];
}

export const componentesDesdeMatriz = (m) => [m[0][0], m[1][1], m[2][2], m[0][1], m[1][2], m[2][0]];

/** Casos predefinidos (MPa). Se contrastan con los de la referencia de Julia en las pruebas. */
export const CASOS = [
  { id: "uniaxial", nombre: "Uniaxial (tracción simple)", c: [100, 0, 0, 0, 0, 0] },
  { id: "biaxial", nombre: "Biaxial", c: [80, 40, 0, 0, 0, 0] },
  { id: "hidrostatico", nombre: "Hidrostático (esférico)", c: [-50, -50, -50, 0, 0, 0] },
  { id: "cortante_puro", nombre: "Cortante puro", c: [0, 0, 0, 30, 0, 0] },
  { id: "cilindrico", nombre: "Cilíndrico (dos principales iguales)", c: [50, 10, 10, 0, 0, 0] },
  { id: "generico", nombre: "Genérico", c: [30, -15, 40, 10, 25, -20] },
  { id: "ejemplos_sigmaA", nombre: "Tensor σ_A de los ejemplos", c: [24, -4, 20, 48, 0, 0] },
];

export function estadoInicial() {
  return {
    c: [...CASOS[CASOS.length - 1].c],
    n: [1, 2, 2],
    eje: [0, 0, 1],
    anguloGrados: 0,
    ejesGirados: false,   // ¿la vista del cubo muestra σ' (ejes girados)?
  };
}

/** Convierte el texto de una entrada en número o devuelve null. */
export function numeroDeTexto(t) {
  const v = parseNumero(t);
  return Number.isFinite(v) ? v : null;
}

/** Calcula todo lo que muestra el simulador a partir del estado. Nunca lanza. */
export function calcular(estado) {
  const avisos = [];
  const c = estado.c.map((x) => (Number.isFinite(x) ? x : 0));
  if (estado.c.some((x) => !Number.isFinite(x))) avisos.push("Alguna componente no es un número: se ha tomado como 0.");
  const sigma = matrizDesdeComponentes(c);
  const res = { avisos, sigma, c };

  const pr = principales(sigma);
  res.principales = pr;
  res.invariantes = invariantes(sigma);
  const ed = esfericoDesviador(sigma);
  res.esfericoDesviador = ed;
  res.octaedricas = octaedricas(sigma);
  res.circulos = circulosMohr(pr.valores);
  res.tauMax = tauMax(pr.valores);

  // plano
  if (estado.n.some((x) => !Number.isFinite(x)) || norma(estado.n) === 0) {
    avisos.push("La normal del plano no puede ser el vector nulo ni tener valores no numéricos.");
    res.plano = null;
  } else {
    const n = normalizar(estado.n);
    const r = componentesPlano(sigma, n);
    res.plano = { n, ...r, admisible: admisible(r.sigmaN, r.tau, pr.valores, 1e-9) };
  }

  // cambio de ejes
  const eje = estado.eje;
  if (eje.some((x) => !Number.isFinite(x)) || norma(eje) === 0 || !Number.isFinite(estado.anguloGrados)) {
    avisos.push("El eje de giro no puede ser nulo y el ángulo debe ser un número.");
    res.Q = null;
    res.sigmaRot = sigma;
  } else {
    res.Q = matrizRotacionEjes(eje, (estado.anguloGrados * Math.PI) / 180);
    res.sigmaRot = rotar(sigma, res.Q);
  }
  res.invariantesRot = invariantes(res.sigmaRot);
  res.principalesRot = principales(res.sigmaRot);
  res.invariantesConservados = res.invariantes.every(
    (v, i) => Math.abs(v - res.invariantesRot[i]) <= 1e-9 * Math.max(1, Math.abs(v)),
  );
  res.simetrico = esSimetrica(sigma);
  return res;
}

// ------------------------------------------------------------------
// Geometría de las vistas (números, no dibujo)
// ------------------------------------------------------------------

/**
 * Geometría del diagrama de Mohr 3D en coordenadas de pantalla (SVG: y hacia abajo).
 * Devuelve la escala, los tres círculos (centro y radio en píxeles), el eje y el punto del plano.
 */
export function geometriaMohr(res, { ancho = 520, alto = 280, margen = 34 } = {}) {
  const [s1, , s3] = res.principales.valores;
  const rango = s1 - s3;
  // Estado esférico (rango ≈ 0): los tres círculos son un punto; se centra y se fija una escala.
  const degenerado = rango <= 1e-9 * Math.max(1, Math.abs(s1));
  const k = (ancho - 2 * margen) / Math.max(rango, 1e-300);
  const kAlto = (alto - 2 * margen) / Math.max((rango / 2) * 1.15, 1e-300);
  const escala = degenerado ? 1 : Math.min(k, kAlto);
  const desplaza = degenerado ? (ancho - 2 * margen) / 2 : 0;
  const x = (s) => margen + desplaza + (s - s3) * escala;
  const xCero = x(0);                                  // pixel de σ = 0 (puede quedar fuera)
  const y0 = alto - margen;                          // eje σ
  const y = (t) => y0 - t * escala;
  const c = res.circulos;
  const circulo = (centro, radio) => ({ cx: x(centro), cy: y0, r: radio * escala });
  const geo = {
    ancho, alto, margen, escala, y0, xCero, x, y,
    c13: circulo(c.c13, c.r13), c12: circulo(c.c12, c.r12), c23: circulo(c.c23, c.r23),
    marcas: res.principales.valores.map((v, i) => ({ etiqueta: `σ${i + 1}`, valor: v, px: x(v) })),
    punto: null,
  };
  if (res.plano) geo.punto = { px: x(res.plano.sigmaN), py: y(res.plano.tau), admisible: res.plano.admisible };
  return geo;
}

/** Vectores en pantalla de los ejes en la proyección fija del cubo. */
export const PROYECCION = { x: [-0.7, -0.5], y: [1, 0], z: [0, 1] };   // (derecha, arriba)

/**
 * Flechas del cubo: para cada una de las 9 componentes sobre las caras +x, +y, +z, su origen
 * (centro de la cara) y su vector en píxeles (y hacia ABAJO, como en SVG).
 */
export function flechasCubo(sigma, { lado = 90, largo = 34 } = {}) {
  const e = { x: PROYECCION.x, y: PROYECCION.y, z: PROYECCION.z };
  const p = (x, y, z) => [lado * (y * e.y[0] + x * e.x[0]), -lado * (z * e.z[1] + x * e.x[1])];
  const maximo = Math.max(1e-12, ...sigma.flat().map(Math.abs));
  const caras = [
    { i: 0, nombre: "x", centro: p(1, 0.5, 0.5) },
    { i: 1, nombre: "y", centro: p(0.5, 1, 0.5) },
    { i: 2, nombre: "z", centro: p(0.5, 0.5, 1) },
  ];
  const ejes = ["x", "y", "z"];
  const flechas = [];
  for (const cara of caras) {
    for (let j = 0; j < 3; j++) {
      const valor = sigma[cara.i][j];
      const dir = e[ejes[j]];
      const l = (valor / maximo) * largo;
      flechas.push({
        nombre: `σ${cara.nombre}${ejes[j]}`, valor, normal: cara.i === j,
        desde: cara.centro, hasta: [cara.centro[0] + l * dir[0], cara.centro[1] - l * dir[1]],
        longitud: Math.abs(l),
      });
    }
  }
  return { flechas, p, lado };
}

/** Formato con coma decimal y signo menos tipográfico. */
export function formato(x, dec = 2) {
  if (!Number.isFinite(x)) return "—";
  let s = x.toFixed(dec);
  if (Number(s) === 0) s = (0).toFixed(dec);
  return s.replace(".", ",").replace("-", "−");
}
