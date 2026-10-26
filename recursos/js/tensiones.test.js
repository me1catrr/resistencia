import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as T from "./tensiones.js";

const ref = JSON.parse(readFileSync(fileURLToPath(new URL("../../pruebas/referencia/e01.json", import.meta.url)), "utf8"));
const sA = [[24, 48, 0], [48, -4, 0], [0, 0, 20]];

function cerca(a, b, tol = 1e-9, msg = "") {
  if (Array.isArray(a)) {
    assert.equal(a.length, b.length, msg);
    a.forEach((x, i) => cerca(x, b[i], tol, `${msg}[${i}]`));
    return;
  }
  const lim = tol * Math.max(1, Math.abs(b));
  assert.ok(Math.abs(a - b) <= lim, `${msg}: ${a} vs ${b} (tol ${lim})`);
}

test("tensor común sA: principales, direcciones e invariantes exactos", () => {
  const p = T.principales(sA);
  cerca(p.valores, [60, 20, -40]);
  cerca(p.vectores.map((f) => f[0]), [0.8, 0.6, 0]);
  cerca(p.vectores.map((f) => f[1]), [0, 0, 1]);
  cerca(p.vectores.map((f) => f[2]), [0.6, -0.8, 0]);
  assert.ok(Math.abs(T.det3(p.vectores) - 1) < 1e-12, "base dextrógira");
  cerca(T.invariantes(sA), [40, -2000, -48000]);
  cerca(T.principalesCubica(sA), [60, 20, -40]);
  cerca(T.rotar(sA, p.Q), [[60, 0, 0], [0, 20, 0], [0, 0, -40]], 1e-9);
});

test("plano oblicuo (1,2,2)/3: valores exactos 280/9 y 200√2/9", () => {
  const r = T.componentesPlano(sA, [1, 2, 2]);
  cerca(r.t, [40, 40 / 3, 40 / 3]);
  cerca(r.sigmaN, 280 / 9);
  cerca(r.tau, (200 * Math.SQRT2) / 9);
  assert.ok(T.admisible(r.sigmaN, r.tau, [60, 20, -40]));
  const n = T.normalizar([1, 2, 2]);
  assert.ok(Math.abs(T.punto(r.tauVec, n)) < 1e-12, "τ es tangente");
});

test("uniaxial, hidrostático y cortante puro", () => {
  const u = T.componentesPlano([[100, 0, 0], [0, 0, 0], [0, 0, 0]], [1, 1, 0]);
  cerca(u.sigmaN, 50);
  cerca(u.tau, 50);
  const h = [[-30, 0, 0], [0, -30, 0], [0, 0, -30]];
  assert.ok(T.componentesPlano(h, [1, 2, 3]).tau < 1e-12);
  cerca(T.principales(h).valores, [-30, -30, -30]);
  cerca(T.principalesCubica(h), [-30, -30, -30]);
  const c = [[0, 25, 0], [25, 0, 0], [0, 0, 0]];
  cerca(T.principales(c).valores, [25, 0, -25], 1e-12);
  cerca(T.esfericoDesviador(c).J2, 625);
});

test("cambio de base: matriz de rotación de ejes y valores racionales exactos", () => {
  const th = 0.7;
  const Q = T.matrizRotacionEjes([0, 0, 1], th);
  const [c, s] = [Math.cos(th), Math.sin(th)];
  cerca(Q, [[c, s, 0], [-s, c, 0], [0, 0, 1]]);
  assert.ok(T.esOrtogonal(Q, { propia: true }));
  const sr = T.rotar([[80, 0, 0], [0, 0, 0], [0, 0, 0]], Q);
  cerca(sr[0][0], 80 * c * c);
  cerca(sr[0][1], -80 * s * c);
  const sp = T.rotar(sA, [[3 / 5, 4 / 5, 0], [-4 / 5, 3 / 5, 0], [0, 0, 1]]);
  cerca(sp[0][0], 1304 / 25);
  cerca(sp[1][1], -804 / 25);
  cerca(sp[0][1], -672 / 25);
  cerca(T.invariantes(sp), T.invariantes(sA));
  assert.throws(() => T.rotar(sA, [[2, 0, 0], [0, 2, 0], [0, 0, 2]]), /ortogonal/);
  cerca(T.rotar(T.rotar(sA, Q), T.transpuesta(Q)), sA);
});

test("esférico, desviador, octaédricas y Mohr", () => {
  const e = T.esfericoDesviador(sA);
  cerca(e.sigmaM, 40 / 3);
  cerca(e.J2, 7600 / 3);
  cerca(e.J2, (40 * 40 - 3 * -2000) / 3);
  const o = T.octaedricas(sA);
  cerca(o.tauOct, Math.sqrt(15200) / 3);
  const m = T.circulosMohr([60, 20, -40]);
  assert.deepEqual([m.c13, m.r13, m.c12, m.r12, m.c23, m.r23], [10, 50, 40, 20, -10, 30]);
  assert.equal(T.tauMax([60, 20, -40]), 50);
  assert.ok(T.admisible(10, 50, [60, 20, -40]));
  assert.ok(!T.admisible(100, 0, [60, 20, -40]));
  assert.ok(!T.admisible(40, 5, [60, 20, -40]), "dentro del círculo 12");
  assert.ok(!T.admisible(-10, 5, [60, 20, -40]), "dentro del círculo 23");
  assert.throws(() => T.circulosMohr([20, 60, -40]));
});

test("errores: no simétrica, normal nula", () => {
  assert.equal(T.esSimetrica([[1, 2, 0], [0, 1, 0], [0, 0, 1]]), false);
  assert.throws(() => T.traccion([[1, 2, 0], [0, 1, 0], [0, 0, 1]], [1, 0, 0]));
  assert.throws(() => T.normalizar([0, 0, 0]));
  assert.throws(() => T.principales([[1, 2, 0], [0, 1, 0], [0, 0, 1]]));
});

// ---------- contraste con la referencia de Julia ----------
function contrastarResumen(r, etiqueta) {
  const sigma = r.sigma;
  const p = T.principales(sigma);
  cerca(p.valores, r.principales, 1e-9, `${etiqueta} principales (Jacobi)`);
  // la cúbica pierde ~8 cifras cerca de raíces dobles (ver principalesCubica): tolerancia 1e-6
  cerca(T.principalesCubica(sigma), r.principales, 1e-6, `${etiqueta} principales (cúbica)`);
  cerca(T.invariantes(sigma), r.invariantes, 1e-9, `${etiqueta} invariantes`);
  const e = T.esfericoDesviador(sigma);
  cerca(e.sigmaM, r.sigma_m, 1e-9, `${etiqueta} sigma_m`);
  cerca(e.J2, r.J2, 1e-9, `${etiqueta} J2`);
  cerca(e.J3, r.J3, 1e-9, `${etiqueta} J3`);
  assert.equal(T.clasificarEstado(sigma), r.clase, `${etiqueta} clase`);
  const o = T.octaedricas(sigma);
  cerca(o.sigmaOct, r.sigma_oct, 1e-9, `${etiqueta} sigma_oct`);
  cerca(o.tauOct, r.tau_oct, 1e-9, `${etiqueta} tau_oct`);
  cerca(T.tauMax(p.valores), r.tau_max, 1e-9, `${etiqueta} tau_max`);
  // direcciones: comparables solo si los valores propios están separados
  const sep = Math.min(p.valores[0] - p.valores[1], p.valores[1] - p.valores[2]);
  if (sep > 1e-6) {
    for (let i = 0; i < 3; i++) cerca(p.vectores[i], r.vectores[i], 1e-8, `${etiqueta} vectores`);
  }
}

test("referencia Julia: ejemplos y casos predefinidos", () => {
  cerca(ref.sigmaA, sA);
  cerca(T.principales(ref.ej3.sigma).valores, [ref.ej3.sigma1, ref.ej3.sigma2, ref.ej3.sigma3], 1e-9);
  const r5 = T.componentesPlano(ref.sigmaA, ref.ej5.n);
  cerca(r5.t, ref.ej5.t, 1e-9);
  cerca(r5.sigmaN, ref.ej5.sigma_n, 1e-9);
  cerca(r5.tau, ref.ej5.tau, 1e-9);
  cerca(T.rotar(ref.sigmaA, ref.ej4.Q), ref.ej4.sigma_prima, 1e-9);
  cerca(T.rotar(ref.sigmaA, ref.ej4.Q_diagonaliza), ref.ej4.sigma_diagonal, 1e-9);
  for (const caso of ref.casos) contrastarResumen(caso.resumen, `caso ${caso.nombre}`);
});

test("referencia Julia: 30 tensores aleatorios (principales, plano, rotación)", () => {
  assert.equal(ref.aleatorios.length, 30);
  ref.aleatorios.forEach((a, i) => {
    contrastarResumen(a.resumen, `aleatorio ${i}`);
    const r = T.componentesPlano(a.resumen.sigma, a.plano.n);
    cerca(r.t, a.plano.t, 1e-9, `aleatorio ${i} t`);
    cerca(r.sigmaN, a.plano.sigma_n, 1e-9, `aleatorio ${i} sigma_n`);
    cerca(r.tau, a.plano.tau, 1e-9, `aleatorio ${i} tau`);
    assert.equal(T.admisible(r.sigmaN, r.tau, a.resumen.principales, 1e-6), a.plano.admisible);
    const Q = T.matrizRotacionEjes(a.eje, a.angulo);
    cerca(Q, a.Q, 1e-9, `aleatorio ${i} Q`);
    cerca(T.rotar(a.resumen.sigma, Q), a.sigma_prima, 1e-9, `aleatorio ${i} sigma'`);
  });
});

test("propiedades con tensores generados aquí: Jacobi = cúbica, invariancia, |t|² = σn² + τ²", () => {
  let semilla = 12345;
  const rnd = () => ((semilla = (semilla * 1664525 + 1013904223) % 4294967296) / 4294967296) - 0.5;
  for (let k = 0; k < 300; k++) {
    const a = [[0, 0, 0], [0, 0, 0], [0, 0, 0]].map(() => [rnd() * 200, rnd() * 200, rnd() * 200]);
    const s = a.map((f, i) => f.map((_, j) => (a[i][j] + a[j][i]) / 2));
    const p = T.principales(s);
    cerca(p.valores, T.principalesCubica(s), 1e-8, "Jacobi vs cúbica");
    cerca(T.rotar(s, p.Q), [[p.valores[0], 0, 0], [0, p.valores[1], 0], [0, 0, p.valores[2]]], 1e-8, "diagonalización");
    const Q = T.matrizRotacionEjes([rnd() + 0.6, rnd(), rnd()], rnd() * 12);
    cerca(T.invariantes(T.rotar(s, Q)), T.invariantes(s), 1e-8, "invariancia");
    const r = T.componentesPlano(s, [rnd(), rnd(), rnd() + 0.7]);
    cerca(T.punto(r.t, r.t), r.sigmaN ** 2 + r.tau ** 2, 1e-9, "|t|²");
    assert.ok(T.admisible(r.sigmaN, r.tau, p.valores, 1e-6), "punto en la región admisible");
  }
});

test("referencia Julia: barra uniaxial, desviador principal y distancias de Mohr", () => {
  const b = ref.ej_barra;
  const th = (b.theta_grados * Math.PI) / 180;
  const sig = [[b.sigma0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const r = T.componentesPlano(sig, [Math.cos(th), Math.sin(th), 0]);
  cerca(r.sigmaN, b.sigma_n, 1e-9);
  cerca(r.sigmaN, b.sigma0 * Math.cos(th) ** 2, 1e-9, "σn = σ0 cos²θ");
  cerca(r.tau, b.tau, 1e-9);
  cerca(r.tau, b.sigma0 * Math.sin(th) * Math.cos(th), 1e-9, "τ = σ0 sinθ cosθ");
  cerca(T.rotar(sig, T.matrizRotacionEjes([0, 0, 1], th)), b.sigma_prima, 1e-9);
  const p = ref.ej5;
  const lam = T.principales(ref.sigmaA).valores;
  const c = T.circulosMohr(lam);
  const d = [c.c13, c.c12, c.c23].map((cc) => (p.sigma_n - cc) ** 2 + p.tau ** 2);
  cerca(d, p.dist2, 1e-9);
  cerca([c.r13 ** 2, c.r12 ** 2, c.r23 ** 2], p.radios2, 1e-9);
  const e = T.esfericoDesviador(ref.sigmaA);
  cerca(lam.map((l) => l - e.sigmaM), ref.esfdes.desviador_principales, 1e-9);
  const o = T.octaedricas(ref.sigmaA);
  assert.equal(T.admisible(o.sigmaOct, o.tauOct, lam), ref.mohr.oct_en_region);
  cerca(ref.ej1.tau_max_con_radial, T.tauMax([ref.ej1.sigma_theta, ref.ej1.sigma_x, -ref.ej1.p]), 1e-12);
  cerca(ref.ej_peso.sigma_max, ref.ej_peso.rho_g * ref.ej_peso.L, 1e-12);
});

test("clasificarEstado: estados particulares, y no depende de los ejes", () => {
  const d = (a, b, c) => [[a, 0, 0], [0, b, 0], [0, 0, c]];
  const casos = [[d(100, 0, 0), "uniaxial"], [d(0, 0, -30), "uniaxial"], [d(80, 40, 0), "biaxial"],
    [d(50, 0, -20), "biaxial"], [[[0, 30, 0], [30, 0, 0], [0, 0, 0]], "cortante_puro"],
    [d(50, 10, 10), "cilindrico"], [d(50, 50, 10), "cilindrico"], [d(-50, -50, -50), "esferico"],
    [d(0, 0, 0), "esferico"], [sA, "triaxial"]];
  for (const [s, esperado] of casos) assert.equal(T.clasificarEstado(s), esperado);
  const Q = T.matrizRotacionEjes([1, 2, 3], 0.9);
  assert.equal(T.clasificarEstado(T.rotar([[0, 30, 0], [30, 0, 0], [0, 0, 0]], Q)), "cortante_puro");
});
