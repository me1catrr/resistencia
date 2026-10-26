// Pruebas de los constructores de HTML/SVG del simulador (sin navegador).
import test from "node:test";
import assert from "node:assert/strict";
import { plantilla, svgCubo, svgMohr, descCubo, tablaMatriz } from "./tensor3d.js";
import { CASOS, estadoInicial, calcular, geometriaMohr } from "./tensor3d-modelo.js";

const limpio = (s, etiqueta) => {
  for (const malo of ["NaN", "undefined", "Infinity", "null"]) assert.ok(!s.includes(malo), `${etiqueta}: contiene ${malo}`);
};

test("la plantilla tiene etiquetas para todas las entradas y regiones accesibles", () => {
  const h = plantilla("t");
  limpio(h, "plantilla");
  for (const campo of ["c0", "c1", "c2", "c3", "c4", "c5", "n0", "n1", "n2", "e0", "e1", "e2", "ang", "angr"]) {
    assert.ok(h.includes(`data-campo="${campo}"`), `falta el campo ${campo}`);
  }
  // cada input de texto tiene su label for= (o aria-label)
  const ids = [...h.matchAll(/<input id="([^"]+)" data-campo="(?!girados)[^"]*" type="(?:text|range)"/g)].map((m) => m[1]);
  assert.ok(ids.length >= 14);
  for (const id of ids) assert.ok(h.includes(`for="${id}"`) || h.includes(`id="${id}" data-campo="angr"`), `sin etiqueta: ${id}`);
  assert.ok(h.includes('role="alert"') && h.includes('aria-live="polite"'));
  assert.equal([...h.matchAll(/<svg [^>]*role="img"/g)].length, 2);
  assert.equal([...h.matchAll(/<desc /g)].length, 2);
  assert.equal([...h.matchAll(/<option /g)].length, CASOS.length);
});

test("el cubo y Mohr se dibujan sin valores no válidos para todos los casos", () => {
  for (const caso of CASOS) {
    for (const girado of [false, true]) {
      const res = calcular({ ...estadoInicial(), c: caso.c, anguloGrados: 33, eje: [1, 2, 3] });
      const cubo = svgCubo(res, girado, "t");
      limpio(cubo, `cubo ${caso.id}`);
      assert.ok(cubo.includes('class="t3d-cara t3d-cara-x"'));
      limpio(svgMohr(res, geometriaMohr(res), "t"), `mohr ${caso.id}`);
      limpio(descCubo(res, girado), `desc ${caso.id}`);
    }
  }
});

test("cubo: nueve componentes como mucho, y las nulas no se dibujan", () => {
  const sigmaA = calcular(estadoInicial());
  const n = (h) => [...h.matchAll(/<line [^>]*marker-end/g)].length;
  assert.equal(n(svgCubo(sigmaA, false, "t")), 5, "σA: no nulas σxx, σxy, σyx, σyy y σzz");
  const hidro = calcular({ ...estadoInicial(), c: [-50, -50, -50, 0, 0, 0] });
  assert.equal(n(svgCubo(hidro, false, "t")), 3);
  const nulo = calcular({ ...estadoInicial(), c: [0, 0, 0, 0, 0, 0] });
  assert.equal(n(svgCubo(nulo, false, "t")), 0);
});

test("Mohr: tres arcos (o puntos si hay radios nulos) y el punto del plano con su clase", () => {
  const res = calcular(estadoInicial());
  const h = svgMohr(res, geometriaMohr(res), "t");
  assert.equal([...h.matchAll(/class="t3d-c(13|12|23)"/g)].length, 3);
  assert.ok(h.includes('class="t3d-punto"'));
  const imposible = calcular({ ...estadoInicial(), n: [0, 0, 0] });
  assert.ok(!svgMohr(imposible, geometriaMohr(imposible), "t").includes("t3d-punto"));
});

test("tablaMatriz usa coma decimal y signo menos tipográfico", () => {
  const h = tablaMatriz([[1.5, -2, 0], [0, 0, 0], [0, 0, 0]], 1);
  assert.ok(h.includes("1,5") && h.includes("−2,0"));
});
