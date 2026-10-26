// Datos y geometría de las simulaciones de E01 hechas con Observable JS (celdas ```{ojs} de las
// páginas del tema). Aquí solo hay funciones PURAS: todo lo físico se calcula con ../tensiones.js
// (contrastado con Julia) y las celdas OJS se limitan a dibujar con Observable Plot.
// Probadas en ojs-e01.test.js.

import {
  componentesPlano, rotar, matrizRotacionEjes, principales, circulosMohr, tauMax, producto,
  esfericoDesviador, octaedricas, componentesDesdePrincipales, clasificarEstado, invariantes, admisible,
} from "../tensiones.js";

const RAD = Math.PI / 180;
export const colores = { acero: "#3a7bb8", cobre: "#c4622f", verde: "#2a9a73", violeta: "#8564d1", gris: "#8a94a3" };

/** Número con coma decimal y signo menos tipográfico (para los rótulos). */
export function fmt(x, dec = 1) {
  if (!Number.isFinite(x)) return "—";
  let t = x.toFixed(dec);
  if (Number(t) === 0) t = (0).toFixed(dec);
  return t.replace(".", ",").replace("-", "\u2212");
}

/** Tensor 3×3 con σzz (por defecto 0) a partir de las componentes en el plano xy. */
export const tensorXY = (sxx, syy, sxy, szz = 0) => [[sxx, sxy, 0], [sxy, syy, 0], [0, 0, szz]];

// ---------------------------------------------------------------- 1 · barra y plano de corte
/** Segmento de la recta {p0 + t·d} contenido en la caja [x0,x1]×[y0,y1] (Liang–Barsky) o null. */
export function recortarSegmento(p0, d, [x0, x1, y0, y1]) {
  let t0 = -Infinity;
  let t1 = Infinity;
  for (const [p, q, lo, hi] of [[p0[0], d[0], x0, x1], [p0[1], d[1], y0, y1]]) {
    if (Math.abs(q) < 1e-12) {
      if (p < lo || p > hi) return null;
    } else {
      const a = (lo - p) / q;
      const b = (hi - p) / q;
      t0 = Math.max(t0, Math.min(a, b));
      t1 = Math.min(t1, Math.max(a, b));
    }
  }
  if (t0 > t1) return null;
  return [[p0[0] + t0 * d[0], p0[1] + t0 * d[1]], [p0[0] + t1 * d[0], p0[1] + t1 * d[1]]];
}

/**
 * Barra con tensión axial σ0 cortada por un plano cuya normal forma θ con el eje (eje x).
 * Devuelve las magnitudes y la geometría (en unidades de dibujo) para pintar la barra.
 */
export function barraPlano(sigma0, thetaDeg, { largo = 10, alto = 2.2 } = {}) {
  const th = thetaDeg * RAD;
  const r = componentesPlano([[sigma0, 0, 0], [0, 0, 0], [0, 0, 0]], [Math.cos(th), Math.sin(th), 0]);
  const n = [Math.cos(th), Math.sin(th)];
  const tang = [-Math.sin(th), Math.cos(th)];                  // dirección del plano
  const centro = [largo / 2, 0];
  const corte = recortarSegmento(centro, tang, [0, largo, -alto / 2, alto / 2]);
  return {
    sigma0, thetaDeg, sigmaN: r.sigmaN, tau: r.tau, t: r.t, modulo: Math.hypot(...r.t),
    n, tauVec: [r.tauVec[0], r.tauVec[1]], corte, centro, largo, alto,
  };
}

/** σn(θ) y τ(θ) para θ en [0, 90] (calculados con la fórmula de Cauchy, no con cos²). */
export function curvasBarra(sigma0, paso = 1) {
  const datos = [];
  for (let g = 0; g <= 90; g += paso) {
    const th = g * RAD;
    const r = componentesPlano([[sigma0, 0, 0], [0, 0, 0], [0, 0, 0]], [Math.cos(th), Math.sin(th), 0]);
    datos.push({ theta: g, sn: r.sigmaN, tau: r.tau });
  }
  return datos;
}

// ---------------------------------------------------------------- 2 · plano en el plano xy
/** Vector tensión y componentes sobre el plano cuya normal está en xy, a φ del eje x. */
export function planoXY(sxx, syy, sxy, phiDeg, szz = 0) {
  const f = phiDeg * RAD;
  const n = [Math.cos(f), Math.sin(f), 0];
  const r = componentesPlano(tensorXY(sxx, syy, sxy, szz), n);
  return { n, t: r.t, sigmaN: r.sigmaN, tau: r.tau, tauVec: r.tauVec, phiDeg };
}

/** Puntas de t(φ) al recorrer todas las normales del plano xy (sección del elipsoide de Lamé). */
export function lugarT(sxx, syy, sxy, szz = 0, paso = 2) {
  const s = tensorXY(sxx, syy, sxy, szz);
  const pts = [];
  for (let g = 0; g <= 360; g += paso) {
    const r = componentesPlano(s, [Math.cos(g * RAD), Math.sin(g * RAD), 0]);
    pts.push({ x: r.t[0], y: r.t[1], phi: g });
  }
  return pts;
}

export function curvasPlanoXY(sxx, syy, sxy, szz = 0, paso = 1) {
  const s = tensorXY(sxx, syy, sxy, szz);
  const d = [];
  for (let g = 0; g <= 180; g += paso) {
    const r = componentesPlano(s, [Math.cos(g * RAD), Math.sin(g * RAD), 0]);
    d.push({ phi: g, sn: r.sigmaN, tau: r.tau });
  }
  return d;
}

// ---------------------------------------------------------------- 3 · giro de ejes alrededor de z
/** Ángulo (grados, en [0,180)) del eje x' que da la dirección de la mayor tensión principal en xy. */
export function anguloPrincipal(sxx, syy, sxy) {
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy) / RAD;
  return ((th % 180) + 180) % 180;
}

export function giro(sxx, syy, sxy, thetaDeg, szz = 0) {
  const s = tensorXY(sxx, syy, sxy, szz);
  const sp = rotar(s, matrizRotacionEjes([0, 0, 1], thetaDeg * RAD));
  return {
    thetaDeg, sxx: sp[0][0], syy: sp[1][1], sxy: sp[0][1], szz: sp[2][2],
    invariantes: invariantes(sp), invariantesOriginales: invariantes(s),
  };
}

export function curvasGiro(sxx, syy, sxy, szz = 0, paso = 1) {
  const d = [];
  for (let g = 0; g <= 180; g += paso) {
    const r = giro(sxx, syy, sxy, g, szz);
    d.push({ theta: g, sxx: r.sxx, syy: r.syy, sxy: r.sxy, I1: r.invariantes[0] });
  }
  return d;
}

// ---------------------------------------------------------------- 4 · círculos de Mohr 3D
/** Ordena de mayor a menor. */
export const ordenar = (a, b, c) => [a, b, c].sort((x, y) => y - x);

/** Polilínea de un semicírculo de Mohr (centro c, radio r) en el semiplano τ ≥ 0. */
export function semicirculo(c, r, n = 90) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (Math.PI * i) / n;
    return { sn: c + r * Math.cos(a), tau: r * Math.sin(a) };
  });
}

export function circulosMohrDatos(s1, s2, s3) {
  const [a, b, c] = ordenar(s1, s2, s3);
  const k = circulosMohr([a, b, c]);
  return {
    lambda: [a, b, c], k,
    c13: semicirculo(k.c13, k.r13), c12: semicirculo(k.c12, k.r12), c23: semicirculo(k.c23, k.r23),
  };
}

/** Plano de normal (acimut φ, ángulo polar ϑ) medida en los ejes principales. */
export function planoPrincipal(s1, s2, s3, azimutDeg, polarDeg) {
  const [a, b, c] = ordenar(s1, s2, s3);
  const f = azimutDeg * RAD;
  const v = polarDeg * RAD;
  const n = [Math.sin(v) * Math.cos(f), Math.sin(v) * Math.sin(f), Math.cos(v)];
  const { sigmaN, tau } = componentesDesdePrincipales([a, b, c], n);
  return { n, sigmaN, tau, lambda: [a, b, c] };
}

/** Nube de (σn, τ) de planos al azar (generador congruencial, reproducible). */
export function nubeMohr(s1, s2, s3, cantidad = 1500, semilla = 12345) {
  const lam = ordenar(s1, s2, s3);
  let x = semilla >>> 0;
  const u = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296);
  const normal = () => {                       // Box–Muller
    const r = Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12)));
    const t = 2 * Math.PI * u();
    return [r * Math.cos(t), r * Math.sin(t)];
  };
  const pts = [];
  while (pts.length < cantidad) {
    const [g1, g2] = normal();
    const [g3] = normal();
    const m = Math.hypot(g1, g2, g3);
    if (m < 1e-9) continue;
    const { sigmaN, tau } = componentesDesdePrincipales(lam, [g1 / m, g2 / m, g3 / m]);
    pts.push({ sn: sigmaN, tau });
  }
  return pts;
}

// ---------------------------------------------------------------- 5 · esférico / desviador y octaédricas
export function descomposicion(s1, s2, s3) {
  const lam = ordenar(s1, s2, s3);
  const S = [[lam[0], 0, 0], [0, lam[1], 0], [0, 0, lam[2]]];
  const ed = esfericoDesviador(S);
  const oct = octaedricas(S);
  const tmax = tauMax(lam);
  return {
    lambda: lam, sigmaM: ed.sigmaM, s: lam.map((l) => l - ed.sigmaM), J2: ed.J2,
    sigmaOct: oct.sigmaOct, tauOct: oct.tauOct, tauMax: tmax,
    razon: tmax > 1e-12 ? oct.tauOct / tmax : NaN,
  };
}

/** Datos de las barras: σ, parte esférica y desviador, para un gráfico por facetas. */
export function barrasDescomposicion(s1, s2, s3) {
  const d = descomposicion(s1, s2, s3);
  const filas = [];
  d.lambda.forEach((l, i) => {
    filas.push({ parte: "1 · estado σ", i: i + 1, valor: l });
    filas.push({ parte: "2 · esférico σm", i: i + 1, valor: d.sigmaM });
    filas.push({ parte: "3 · desviador S", i: i + 1, valor: d.s[i] });
  });
  return filas;
}

/** Cotas teóricas de τoct/τmax (para σ1, σ3 fijos): √6/3 ≤ τoct/τmax ≤ 2√2/3. */
export const COTA_RAZON_OCT = { min: Math.sqrt(6) / 3, max: (2 * Math.sqrt(2)) / 3 };

// ---------------------------------------------------------------- 6 · estados particulares
export const ESTADOS = {
  "Uniaxial": [1, 0, 0],
  "Biaxial": [1, 0.5, 0],
  "Cortante puro": [1, 0, -1],
  "Cilíndrico": [1, 0.2, 0.2],
  "Esférico (hidrostático)": [-1, -1, -1],
  "Triaxial (genérico)": [1, 0.33, -0.67],
};

export function estado(nombre, escala) {
  const [a, b, c] = ESTADOS[nombre].map((x) => x * escala);
  const lam = ordenar(a, b, c);
  const S = [[lam[0], 0, 0], [0, lam[1], 0], [0, 0, lam[2]]];
  return { nombre, lambda: lam, clase: clasificarEstado(S), tauMax: tauMax(lam), ...circulosMohrDatos(a, b, c) };
}

// ---------------------------------------------------------------- 7 · depósito de pared delgada
/** Tensiones de un depósito cilíndrico cerrado de pared delgada (p en MPa, r y t en mm). */
export function deposito(p, r, t) {
  const sTheta = (p * r) / t;
  const sX = (p * r) / (2 * t);
  const sinRadial = ordenar(sTheta, sX, 0);
  const conRadial = ordenar(sTheta, sX, -p);
  return {
    p, r, t, sTheta, sX, esbeltez: r / t,
    tauMaxSinRadial: tauMax(sinRadial), tauMaxConRadial: tauMax(conRadial),
    errorRelativo: tauMax(conRadial) / Math.max(tauMax(sinRadial), 1e-12) - 1,
    delgada: r / t >= 10,
  };
}

/** Barra colgada de su peso: σzz(z) = ρ g z, con z medido desde el extremo libre. */
export function barraColgada(rhoG, L, puntos = 60) {
  return Array.from({ length: puntos + 1 }, (_, i) => ({ z: (L * i) / puntos, sigma: (rhoG * L * i) / puntos }));
}

// ---------------------------------------------------------------- 8 · giro 3D y cubo
/** Tensor simétrico desde [sxx, syy, szz, sxy, syz, szx]. */
export const tensorDesdeComponentes = ([sxx, syy, szz, sxy, syz, szx]) => [[sxx, sxy, szx], [sxy, syy, syz], [szx, syz, szz]];

/**
 * Giro 3D de los ejes como composición de tres giros alrededor de los ejes x, y y z originales
 * (Q = Qz(γ)·Qy(β)·Qx(α), con Q por filas: σ' = Q σ Qᵀ). Devuelve σ, σ' y lo que debe conservarse.
 */
export function giro3D(c, alfaDeg, betaDeg, gammaDeg) {
  const sigma = tensorDesdeComponentes(c);
  const Q = producto(producto(matrizRotacionEjes([0, 0, 1], gammaDeg * RAD), matrizRotacionEjes([0, 1, 0], betaDeg * RAD)),
    matrizRotacionEjes([1, 0, 0], alfaDeg * RAD));
  const sigmaRot = rotar(sigma, Q);
  return {
    sigma, sigmaRot, Q,
    invariantes: invariantes(sigma), invariantesRot: invariantes(sigmaRot),
    principales: principales(sigma).valores, principalesRot: principales(sigmaRot).valores,
  };
}

/** Proyección axonométrica fija (x hacia el observador, y a la derecha, z arriba), y hacia ARRIBA. */
export const proyectar = (x, y, z) => [y - 0.7 * x, z - 0.5 * x];

/**
 * Geometría del elemento cúbico para Observable Plot: caras visibles, aristas ocultas y las nueve
 * flechas de las componentes (primer índice = normal de la cara; segundo = dirección).
 */
export function cuboPlot(sigma, { largo = 0.5 } = {}) {
  const maximo = Math.max(1e-12, ...sigma.flat().map(Math.abs));
  const ejes = [[-0.7, -0.5], [1, 0], [0, 1]];
  const nombres = ["x", "y", "z"];
  // orígenes de las flechas: lejos de las aristas compartidas para que no se pisen
  const centros = [proyectar(1, 0.36, 0.52), proyectar(0.64, 1, 0.52), proyectar(0.5, 0.5, 1)];
  const caras = {
    x: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], y: [[1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1]],
    z: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
  };
  const flechas = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const v = sigma[i][j];
      const l = (v / maximo) * largo;
      const c = centros[i];
      const fin = [c[0] + l * ejes[j][0], c[1] + l * ejes[j][1]];
      const d = [ejes[j][0] * Math.sign(l || 1), ejes[j][1] * Math.sign(l || 1)];
      const norma = Math.hypot(d[0], d[1]) || 1;
      flechas.push({
        nombre: `σ${nombres[i]}${nombres[j]}`, valor: v, normal: i === j, visible: Math.abs(l) > 0.012,
        x1: c[0], y1: c[1], x2: fin[0], y2: fin[1], tx: fin[0] + (d[0] / norma) * 0.1, ty: fin[1] + (d[1] / norma) * 0.1,
      });
    }
  }
  return {
    caras: Object.entries(caras).map(([nombre, pts]) => ({ nombre, puntos: pts.map((q) => proyectar(...q)) })),
    ocultas: [[[0, 0, 0], [0, 1, 0]], [[0, 0, 0], [0, 0, 1]], [[0, 0, 0], [1, 0, 0]]].map((seg) => seg.map((q) => proyectar(...q))),
    flechas,
  };
}

// ---------------------------------------------------------------- 9 · simulador completo
/** Casos predefinidos [sxx, syy, szz, sxy, syz, szx] en MPa (se contrastan con los de Julia en las pruebas). */
export const CASOS = [
  { id: "uniaxial", nombre: "Uniaxial (tracción simple)", c: [100, 0, 0, 0, 0, 0] },
  { id: "biaxial", nombre: "Biaxial", c: [80, 40, 0, 0, 0, 0] },
  { id: "hidrostatico", nombre: "Hidrostático (esférico)", c: [-50, -50, -50, 0, 0, 0] },
  { id: "cortante_puro", nombre: "Cortante puro", c: [0, 0, 0, 30, 0, 0] },
  { id: "cilindrico", nombre: "Cilíndrico (dos principales iguales)", c: [50, 10, 10, 0, 0, 0] },
  { id: "generico", nombre: "Genérico", c: [30, -15, 40, 10, 25, -20] },
  { id: "ejemplos_sigmaA", nombre: "Tensor σ_A de los ejemplos", c: [24, -4, 20, 48, 0, 0] },
];

/** Normal en ejes globales a partir del acimut φ (en xy desde x) y el ángulo polar ϑ (desde z). */
export function normalDesdeAngulos(azimutDeg, polarDeg) {
  const f = azimutDeg * RAD;
  const v = polarDeg * RAD;
  return [Math.sin(v) * Math.cos(f), Math.sin(v) * Math.sin(f), Math.cos(v)];
}

/**
 * Todo lo que muestra el simulador: tensor, tensor girado, principales, invariantes, esférico/
 * desviador, octaédricas, plano (en los ejes ORIGINALES) y su pertenencia a la región de Mohr.
 */
export function analisis(c, normal, alfaDeg = 0, betaDeg = 0, gammaDeg = 0) {
  const g = giro3D(c, alfaDeg, betaDeg, gammaDeg);
  const pr = principales(g.sigma);
  const ed = esfericoDesviador(g.sigma);
  const oct = octaedricas(g.sigma);
  const lam = pr.valores;
  const nv = normal.map(Number);
  const normaN = Math.hypot(...nv);
  let plano = null;
  if (Number.isFinite(normaN) && normaN > 1e-12) {
    const r = componentesPlano(g.sigma, nv.map((x) => x / normaN));
    plano = {
      n: nv.map((x) => x / normaN), t: r.t, sigmaN: r.sigmaN, tau: r.tau, modulo: Math.hypot(...r.t),
      admisible: admisible(r.sigmaN, r.tau, lam, 1e-9),
    };
  }
  const mohr = circulosMohrDatos(lam[0], lam[1], lam[2]);
  return {
    ...g, vectores: pr.vectores, lambda: lam, sigmaM: ed.sigmaM, J2: ed.J2, desviador: ed.S,
    sigmaOct: oct.sigmaOct, tauOct: oct.tauOct, tauMax: tauMax(lam), clase: clasificarEstado(g.sigma),
    plano, mohr,
    invariantesConservados: g.invariantes.every((v, i) => Math.abs(v - g.invariantesRot[i]) <= 1e-9 * Math.max(1, Math.abs(v))),
  };
}
