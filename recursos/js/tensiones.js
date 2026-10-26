// Estado de tensiones en el espacio (tema E01). Funciones puras, sin DOM y sin
// dependencias: las usa el simulador y se contrastan con el JSON de referencia
// que genera Julia (pruebas/referencia/e01.json).
//
// Convenciones (las mismas que en Julia y Python; véase CLAUDE.md):
//  - Tracción positiva; MPa y mm.
//  - sigma[i][j]: i = normal del plano, j = dirección de la componente. Con sigma
//    simétrica, el vector tensión en el plano de normal n es t = sigma n.
//  - Principales ordenadas s1 >= s2 >= s3. v1 y v2 con su primera componente no
//    nula positiva y v3 = v1 x v2 (base dextrógira).
//  - Q tiene por FILAS los vectores de la nueva base: sigma' = Q sigma Q^T.
//    Rotar los ejes un ángulo θ equivale a Q = R(θ)^T, con R la rotación activa.
// Las matrices son arrays de filas [[a,b,c],[d,e,f],[g,h,i]].

const EPS = 1e-12;

// ---------- álgebra 3×3 mínima ----------
export const identidad = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const transpuesta = (A) => A[0].map((_, j) => A.map((fila) => fila[j]));
export const producto = (A, B) =>
  A.map((fila) => B[0].map((_, j) => fila.reduce((s, a, k) => s + a * B[k][j], 0)));
export const matVec = (A, v) => A.map((fila) => fila.reduce((s, a, k) => s + a * v[k], 0));
export const punto = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
export const norma = (a) => Math.sqrt(punto(a, a));
export const cruz = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const traza = (A) => A[0][0] + A[1][1] + A[2][2];
export const det3 = (A) =>
  A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
  A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
  A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
const maxAbs = (A) => Math.max(...A.flat().map(Math.abs));
const restar = (A, B) => A.map((f, i) => f.map((x, j) => x - B[i][j]));

// ---------- simetría y normales ----------
export function esSimetrica(sigma, rtol = 1e-12) {
  if (!Array.isArray(sigma) || sigma.length !== 3 || sigma.some((f) => f.length !== 3)) return false;
  const escala = Math.max(1, maxAbs(sigma));
  return maxAbs(restar(sigma, transpuesta(sigma))) <= rtol * escala;
}

export function normalizar(n) {
  if (!Array.isArray(n) || n.length !== 3) throw new Error("la normal debe tener 3 componentes");
  const m = norma(n);
  if (!(m > 0)) throw new Error("la normal no puede ser el vector nulo");
  return n.map((x) => x / m);
}

// ---------- tensión sobre un plano ----------
export function traccion(sigma, n) {
  if (!esSimetrica(sigma)) throw new Error("sigma debe ser simétrica");
  return matVec(sigma, normalizar(n));
}

/** t, sigmaN = t·n (con signo), tauVec = t − sigmaN n, tau = |tauVec|. */
export function componentesPlano(sigma, n) {
  const nn = normalizar(n);
  const t = traccion(sigma, nn);
  const sigmaN = punto(t, nn);
  const tauVec = t.map((x, i) => x - sigmaN * nn[i]);
  return { t, sigmaN, tau: norma(tauVec), tauVec };
}

// ---------- cambio de base ----------
/** Q para ROTAR LOS EJES un ángulo theta (rad) alrededor de `eje` (mano derecha). */
export function matrizRotacionEjes(eje, theta) {
  const [kx, ky, kz] = normalizar(eje);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const v = 1 - c;
  // rotación activa de Rodrigues R; Q = R^T
  const R = [
    [c + kx * kx * v, kx * ky * v - kz * s, kx * kz * v + ky * s],
    [ky * kx * v + kz * s, c + ky * ky * v, ky * kz * v - kx * s],
    [kz * kx * v - ky * s, kz * ky * v + kx * s, c + kz * kz * v],
  ];
  return transpuesta(R);
}

export function esOrtogonal(Q, { rtol = 1e-12, propia = false } = {}) {
  if (!Array.isArray(Q) || Q.length !== 3 || Q.some((f) => f.length !== 3)) return false;
  const ok = maxAbs(restar(producto(Q, transpuesta(Q)), identidad())) <= rtol;
  return propia ? ok && det3(Q) > 0 : ok;
}

/** sigma' = Q sigma Q^T. */
export function rotar(sigma, Q) {
  if (!esOrtogonal(Q)) throw new Error("Q no es ortogonal");
  return producto(producto(Q, sigma), transpuesta(Q));
}

// ---------- invariantes, esférico y desviador ----------
export function invariantes(sigma) {
  const I1 = traza(sigma);
  const I2 = (I1 * I1 - traza(producto(sigma, sigma))) / 2;
  return [I1, I2, det3(sigma)];
}

export function esfericoDesviador(sigma) {
  const sigmaM = traza(sigma) / 3;
  const S = sigma.map((f, i) => f.map((x, j) => x - (i === j ? sigmaM : 0)));
  const J2 = S.flat().reduce((s, x) => s + x * x, 0) / 2;
  return { sigmaM, S, J2, J3: det3(S) };
}

export function octaedricas(sigma) {
  const { sigmaM, J2 } = esfericoDesviador(sigma);
  return { sigmaOct: sigmaM, tauOct: Math.sqrt((2 * J2) / 3) };
}

// ---------- tensiones principales ----------
/**
 * Autovalores y autovectores por el método de Jacobi cíclico (matriz simétrica).
 * Devuelve {valores (desc.), vectores (columnas), Q = vectores^T}.
 */
export function principales(sigma) {
  if (!esSimetrica(sigma)) throw new Error("sigma debe ser simétrica");
  const A = sigma.map((f) => f.slice());
  let V = identidad();
  const escala = Math.max(1, maxAbs(A));
  for (let barrido = 0; barrido < 60; barrido++) {
    const fuera = Math.abs(A[0][1]) + Math.abs(A[0][2]) + Math.abs(A[1][2]);
    if (fuera <= 1e-15 * escala) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      // A <- J^T A J con J = rotación en el plano (p,q)
      for (let k = 0; k < 3; k++) {
        const akp = A[k][p];
        const akq = A[k][q];
        A[k][p] = c * akp - s * akq;
        A[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = A[p][k];
        const aqk = A[q][k];
        A[p][k] = c * apk - s * aqk;
        A[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = V[k][p];
        const vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq;
        V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const orden = [0, 1, 2].sort((a, b) => A[b][b] - A[a][a]);
  const valores = orden.map((i) => A[i][i]);
  const col = (j) => [V[0][orden[j]], V[1][orden[j]], V[2][orden[j]]];
  const signo = (v) => {
    const i = v.findIndex((x) => Math.abs(x) > EPS);
    return i >= 0 && v[i] < 0 ? v.map((x) => -x) : v;
  };
  const v1 = signo(col(0));
  const v2 = signo(col(1));
  const v3 = cruz(v1, v2);
  const vectores = [0, 1, 2].map((i) => [v1[i], v2[i], v3[i]]);
  return { valores, vectores, Q: transpuesta(vectores) };
}

/**
 * Tensiones principales por la solución trigonométrica de la cúbica (independiente de Jacobi).
 * Sirve para contrastar `principales`. Limitación: cerca de raíces dobles es mal condicionada
 * (el error crece como √ε ≈ 1e-8 relativo); el método de uso es `principales` (Jacobi).
 */
export function principalesCubica(sigma) {
  const [I1] = invariantes(sigma);
  const sigmaM = I1 / 3;
  const { J2, J3 } = esfericoDesviador(sigma);
  if (J2 <= 1e-14 * Math.max(1, sigmaM * sigmaM)) return [sigmaM, sigmaM, sigmaM];
  const arg = Math.min(1, Math.max(-1, ((3 * Math.sqrt(3)) / 2) * J3 / Math.pow(J2, 1.5)));
  const th = Math.acos(arg) / 3;
  const r = 2 * Math.sqrt(J2 / 3);
  return [0, 1, 2].map((k) => sigmaM + r * Math.cos(th - (2 * Math.PI * k) / 3));
}

// ---------- Mohr ----------
export function circulosMohr(lambda) {
  const [s1, s2, s3] = lambda;
  if (!(s1 >= s2 && s2 >= s3)) throw new Error("las tensiones principales deben venir ordenadas s1 >= s2 >= s3");
  return {
    c13: (s1 + s3) / 2, r13: (s1 - s3) / 2,
    c12: (s1 + s2) / 2, r12: (s1 - s2) / 2,
    c23: (s2 + s3) / 2, r23: (s2 - s3) / 2,
  };
}

export const tauMax = (lambda) => (lambda[0] - lambda[2]) / 2;

/** ¿Puede un plano tener (sigmaN, tau)? Dentro del círculo grande y fuera de los dos pequeños. */
export function admisible(sigmaN, tau, lambda, tol = 1e-9) {
  const c = circulosMohr(lambda);
  const d13 = (sigmaN - c.c13) ** 2 + tau ** 2;
  const d12 = (sigmaN - c.c12) ** 2 + tau ** 2;
  const d23 = (sigmaN - c.c23) ** 2 + tau ** 2;
  return d13 <= c.r13 ** 2 + tol && d12 >= c.r12 ** 2 - tol && d23 >= c.r23 ** 2 - tol;
}

// ---------- desde ejes principales ----------
/** Con los ejes principales como referencia y cosenos directores (l, m, n) de la normal. */
export function componentesDesdePrincipales(lambda, cosenos) {
  const n = normalizar(cosenos);
  const sigmaN = lambda.reduce((s, l, i) => s + l * n[i] * n[i], 0);
  const t2 = lambda.reduce((s, l, i) => s + l * l * n[i] * n[i], 0) - sigmaN * sigmaN;
  return { sigmaN, tau: Math.sqrt(Math.max(t2, 0)) };
}

export function tensionDesdePrincipales(lambda, V) {
  const D = [[lambda[0], 0, 0], [0, lambda[1], 0], [0, 0, lambda[2]]];
  return producto(producto(V, D), transpuesta(V));
}

// ---------- reconocimiento de estados particulares ----------
/**
 * Reconoce el estado particular: "esferico", "uniaxial", "cortante_puro", "biaxial",
 * "cilindrico" o "triaxial" (mismas reglas que clasificar_estado en Julia y Python).
 */
export function clasificarEstado(sigma, rtol = 1e-9) {
  const lam = principales(sigma).valores;
  const escala = Math.max(Math.max(...lam.map(Math.abs)), 1);
  const nulo = (x) => Math.abs(x) <= rtol * escala;
  const igual = (a, b) => Math.abs(a - b) <= rtol * escala;
  if (igual(lam[0], lam[1]) && igual(lam[1], lam[2])) return "esferico";
  const ceros = lam.filter(nulo).length;
  if (ceros === 2) return "uniaxial";
  if (ceros === 1) return nulo(lam[1]) && igual(lam[0], -lam[2]) ? "cortante_puro" : "biaxial";
  return igual(lam[0], lam[1]) || igual(lam[1], lam[2]) ? "cilindrico" : "triaxial";
}
