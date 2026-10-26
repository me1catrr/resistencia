import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CASOS, estadoInicial, calcular, matrizDesdeComponentes, componentesDesdeMatriz,
  geometriaMohr, flechasCubo, formato, numeroDeTexto,
} from "./tensor3d-modelo.js";

const ref = JSON.parse(readFileSync(fileURLToPath(new URL("../../../pruebas/referencia/e01.json", import.meta.url)), "utf8"));
const cerca = (a, b, tol = 1e-9, m = "") => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: ${a} vs ${b}`);

test("los casos predefinidos coinciden con los de la referencia de Julia", () => {
  const nombres = ref.casos.map((c) => c.nombre);
  assert.deepEqual(CASOS.map((c) => c.id), nombres);
  CASOS.forEach((caso, i) => {
    const sigmaRef = ref.casos[i].resumen.sigma;
    sigmaRef.forEach((fila, r) => fila.forEach((v, c) => cerca(matrizDesdeComponentes(caso.c)[r][c], v, 1e-12, `${caso.id}[${r}][${c}]`)));
    const res = calcular({ ...estadoInicial(), c: caso.c });
    res.principales.valores.forEach((v, k) => cerca(v, ref.casos[i].resumen.principales[k], 1e-9, `${caso.id} principales`));
    cerca(res.esfericoDesviador.J2, ref.casos[i].resumen.J2, 1e-9, `${caso.id} J2`);
  });
});

test("estado inicial: reproduce los ejemplos del tema", () => {
  const e = estadoInicial();
  const r = calcular(e);
  assert.deepEqual(r.avisos, []);
  cerca(r.principales.valores[0], ref.ej3.sigma1);
  cerca(r.plano.sigmaN, ref.ej5.sigma_n);
  cerca(r.plano.tau, ref.ej5.tau);
  assert.equal(r.plano.admisible, true);
  cerca(r.tauMax, ref.mohr.tau_max);
  assert.ok(r.invariantesConservados);
  assert.deepEqual(componentesDesdeMatriz(matrizDesdeComponentes([1, 2, 3, 4, 5, 6])), [1, 2, 3, 4, 5, 6]);
});

test("rotación de ejes: las componentes cambian y los invariantes y principales no", () => {
  const e = { ...estadoInicial(), eje: [0, 0, 1], anguloGrados: Math.acos(0.6) * 180 / Math.PI };   // cos = 3/5
  const r = calcular(e);
  cerca(r.sigmaRot[0][0], ref.ej4.sigma_prima[0][0], 1e-9);
  cerca(r.sigmaRot[1][1], ref.ej4.sigma_prima[1][1], 1e-9);
  assert.ok(r.invariantesConservados);
  r.principalesRot.valores.forEach((v, k) => cerca(v, r.principales.valores[k], 1e-9));
  const girado = calcular({ ...estadoInicial(), eje: [1, 1, 1], anguloGrados: 77 });
  assert.ok(girado.invariantesConservados);
});

test("entradas inválidas no rompen nada y avisan", () => {
  const r = calcular({ ...estadoInicial(), n: [0, 0, 0] });
  assert.equal(r.plano, null);
  assert.ok(r.avisos.some((a) => /normal/.test(a)));
  const r2 = calcular({ ...estadoInicial(), eje: [0, 0, 0] });
  assert.equal(r2.Q, null);
  assert.ok(r2.avisos.some((a) => /eje/.test(a)));
  const r3 = calcular({ ...estadoInicial(), c: [NaN, 0, 0, 0, 0, 0] });
  assert.ok(r3.avisos.some((a) => /componente/.test(a)));
  assert.equal(numeroDeTexto("3,5"), 3.5);
  assert.equal(numeroDeTexto("x"), null);
});

test("geometría de Mohr: círculos concéntricos con el diámetro en el eje y punto dentro de la región", () => {
  const r = calcular(estadoInicial());
  const g = geometriaMohr(r);
  assert.ok(g.c13.r > g.c12.r && g.c13.r > g.c23.r);
  // el círculo grande contiene a los pequeños: sus extremos coinciden con σ3 y σ1
  assert.ok(Math.abs(g.c13.cx - g.c13.r - g.marcas[2].px) < 1e-9);
  assert.ok(Math.abs(g.c13.cx + g.c13.r - g.marcas[0].px) < 1e-9);
  assert.ok(g.punto.admisible);
  const d = (c) => Math.hypot(g.punto.px - c.cx, g.punto.py - c.cy);
  assert.ok(d(g.c13) <= g.c13.r + 1e-9);
  assert.ok(d(g.c12) >= g.c12.r - 1e-9);
  assert.ok(d(g.c23) >= g.c23.r - 1e-9);
  // todo cabe en el lienzo
  for (const c of [g.c13]) {
    assert.ok(c.cx - c.r >= 0 && c.cx + c.r <= g.ancho);
    assert.ok(c.cy - c.r >= 0);
  }
});

test("geometría de Mohr con estado hidrostático (círculos de radio 0) no da NaN", () => {
  const r = calcular({ ...estadoInicial(), c: [-50, -50, -50, 0, 0, 0] });
  const g = geometriaMohr(r);
  for (const v of [g.escala, g.c13.r, g.c13.cx, g.punto.px, g.punto.py]) assert.ok(Number.isFinite(v), String(v));
  assert.ok(Math.abs(g.punto.px - g.ancho / 2) < 1e-9, "el punto único queda centrado");
  assert.equal(g.c13.r, 0);
});

test("flechas del cubo: 9 flechas, normales con el signo del valor y longitud proporcional", () => {
  const { sigma } = calcular(estadoInicial());
  const f = flechasCubo(sigma);
  assert.equal(f.flechas.length, 9);
  assert.equal(f.flechas.filter((x) => x.normal).length, 3);
  const mayor = f.flechas.reduce((a, b) => (b.longitud > a.longitud ? b : a));
  assert.ok(Math.abs(mayor.longitud - 34) < 1e-9, "la mayor componente usa el largo máximo");
  assert.equal(mayor.nombre, "σxy", "σxy = 48 es la mayor componente en valor absoluto");
  // simetría: σxy y σyx tienen el mismo valor
  const val = (n) => f.flechas.find((x) => x.nombre === n).valor;
  assert.equal(val("σxy"), val("σyx"));
  // tensor nulo: sin flechas visibles ni NaN
  const nulo = flechasCubo([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  assert.ok(nulo.flechas.every((x) => x.longitud === 0 && Number.isFinite(x.hasta[0])));
});

test("formato: coma decimal, signo menos tipográfico y sin -0", () => {
  assert.equal(formato(-12.3456, 2), "−12,35");
  assert.equal(formato(0.00001, 1), "0,0");
  assert.equal(formato(-0.00001, 1), "0,0");
  assert.equal(formato(NaN), "—");
});
