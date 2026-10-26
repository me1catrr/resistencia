import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as O from "./ojs-e01.js";

const ref = JSON.parse(readFileSync(fileURLToPath(new URL("../../../pruebas/referencia/e01.json", import.meta.url)), "utf8"));
const cerca = (a, b, tol = 1e-9, m = "") => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: ${a} vs ${b}`);

test("recortarSegmento: dentro, fuera y paralelo a un lado", () => {
  const caja = [0, 10, -1, 1];
  const s = O.recortarSegmento([5, 0], [0, 1], caja);
  cerca(s[0][1], -1); cerca(s[1][1], 1);
  assert.equal(O.recortarSegmento([5, 5], [1, 0], caja), null);
  const h = O.recortarSegmento([5, 0], [1, 0], caja);      // plano a 90°: recta horizontal
  cerca(h[0][0], 0); cerca(h[1][0], 10);
  const incl = O.recortarSegmento([5, 0], [-Math.sin(0.5), Math.cos(0.5)], caja);
  for (const p of incl) assert.ok(p[0] >= -1e-9 && p[0] <= 10 + 1e-9 && Math.abs(p[1]) <= 1 + 1e-9);
});

test("barraPlano reproduce σ0 cos²θ y σ0 sinθ cosθ, y coincide con la referencia de Julia", () => {
  const b = O.barraPlano(ref.ej_barra.sigma0, ref.ej_barra.theta_grados);
  cerca(b.sigmaN, ref.ej_barra.sigma_n); cerca(b.tau, ref.ej_barra.tau);
  cerca(b.modulo, ref.ej_barra.t_modulo);
  const th = ref.ej_barra.theta_grados * Math.PI / 180;
  cerca(b.sigmaN, 100 * Math.cos(th) ** 2); cerca(b.tau, 100 * Math.sin(th) * Math.cos(th));
  // t es paralelo al eje de la barra y suma de sus componentes
  cerca(b.t[1], 0, 1e-12);
  cerca(b.sigmaN * b.n[0] + b.tauVec[0], b.t[0]);
  cerca(b.sigmaN * b.n[1] + b.tauVec[1], b.t[1], 1e-9);
  assert.ok(b.corte && b.corte.length === 2);
  for (const th2 of [0, 90]) assert.ok(O.barraPlano(100, th2).corte, `θ=${th2}`);
});

test("curvasBarra: extremos y máximo de τ a 45°", () => {
  const c = O.curvasBarra(100);
  assert.equal(c.length, 91);
  cerca(c[0].sn, 100); cerca(c[90].sn, 0, 1e-9); cerca(c[0].tau, 0, 1e-9);
  const mejor = c.reduce((a, b) => (b.tau > a.tau ? b : a));
  assert.equal(mejor.theta, 45); cerca(mejor.tau, 50);
});

test("planoXY y lugarT: |t|² = σn² + τ² y el lugar de t es una elipse con los semiejes principales", () => {
  const p = O.planoXY(24, -4, 48, 30);
  cerca(p.t[0] ** 2 + p.t[1] ** 2, p.sigmaN ** 2 + p.tau ** 2, 1e-9);
  // con normal a lo largo de v1 = (4,3)/5 el plano es principal
  const f = Math.atan2(3, 4) * 180 / Math.PI;
  const pp = O.planoXY(24, -4, 48, f);
  cerca(pp.sigmaN, 60, 1e-9); cerca(pp.tau, 0, 1e-9);
  const L = O.lugarT(24, -4, 48);
  const maxR = Math.max(...L.map((q) => Math.hypot(q.x, q.y)));
  cerca(maxR, 60, 1e-3);
  const c = O.curvasPlanoXY(24, -4, 48);
  cerca(Math.max(...c.map((q) => q.sn)), 60, 1e-3); cerca(Math.min(...c.map((q) => q.sn)), -40, 1e-3);
});

test("giro: ángulo principal, invariantes conservados y diagonalización", () => {
  cerca(O.anguloPrincipal(24, -4, 48), Math.atan2(3, 4) * 180 / Math.PI, 1e-9);
  assert.equal(Math.round(O.anguloPrincipal(10, 30, 0)), 90);     // σyy mayor → dirección y
  assert.equal(Math.round(O.anguloPrincipal(30, 10, 0)), 0);
  const g = O.giro(24, -4, 48, O.anguloPrincipal(24, -4, 48));
  cerca(g.sxx, 60, 1e-9); cerca(g.sxy, 0, 1e-9); cerca(g.syy, -40, 1e-9);
  for (const ang of [0, 33, 90, 150]) {
    const r = O.giro(24, -4, 48, ang);
    r.invariantes.forEach((v, i) => cerca(v, r.invariantesOriginales[i], 1e-9));
  }
  // coincide con la referencia (Q con cos = 3/5)
  const th = Math.acos(0.6) * 180 / Math.PI;
  const r = O.giro(24, -4, 48, th);
  cerca(r.sxx, ref.ej4.sigma_prima[0][0]); cerca(r.syy, ref.ej4.sigma_prima[1][1]); cerca(r.sxy, ref.ej4.sigma_prima[0][1]);
  const cur = O.curvasGiro(24, -4, 48, 20);   // con σzz = 20 de σA, I1 = 40
  assert.ok(cur.every((q) => Math.abs(q.I1 - 40) < 1e-9));
  assert.ok(O.curvasGiro(24, -4, 48).every((q) => Math.abs(q.I1 - 20) < 1e-9), "sin σzz, I1 = 20");
});

test("Mohr 3D: círculos, plano y nube dentro de la región admisible", () => {
  const m = O.circulosMohrDatos(-40, 60, 20);                      // desordenados a propósito
  assert.deepEqual(m.lambda, [60, 20, -40]);
  assert.equal(m.c13.length, 91);
  m.c13.forEach((p) => cerca(Math.hypot(p.sn - m.k.c13, p.tau), m.k.r13, 1e-9));
  const pl = O.planoPrincipal(60, 20, -40, 0, 0);                   // normal = eje 3 → σ3
  cerca(pl.sigmaN, -40); cerca(pl.tau, 0, 1e-9);
  const p45 = O.planoPrincipal(60, 20, -40, 0, 45);
  const nube = O.nubeMohr(60, 20, -40, 400);
  assert.equal(nube.length, 400);
  for (const q of nube) {
    const d13 = (q.sn - m.k.c13) ** 2 + q.tau ** 2;
    const d12 = (q.sn - m.k.c12) ** 2 + q.tau ** 2;
    const d23 = (q.sn - m.k.c23) ** 2 + q.tau ** 2;
    assert.ok(d13 <= m.k.r13 ** 2 + 1e-6 && d12 >= m.k.r12 ** 2 - 1e-6 && d23 >= m.k.r23 ** 2 - 1e-6);
  }
  assert.ok(p45.tau > 0);
  // reproducible
  assert.deepEqual(O.nubeMohr(60, 20, -40, 5, 7), O.nubeMohr(60, 20, -40, 5, 7));
});

test("descomposición y octaédricas frente a la referencia de Julia", () => {
  const d = O.descomposicion(60, 20, -40);
  cerca(d.sigmaM, ref.esfdes.sigma_m); cerca(d.J2, ref.esfdes.J2); cerca(d.tauOct, ref.esfdes.tau_oct);
  d.s.forEach((v, i) => cerca(v, ref.esfdes.desviador_principales[i]));
  assert.ok(d.razon >= O.COTA_RAZON_OCT.min - 1e-12 && d.razon <= O.COTA_RAZON_OCT.max + 1e-12);
  // las cotas se alcanzan: σ2 = media de σ1 y σ3 (mínimo) y σ2 = σ1 o σ3 (máximo)
  cerca(O.descomposicion(60, 10, -40).razon, O.COTA_RAZON_OCT.min, 1e-9);
  cerca(O.descomposicion(60, 60, -40).razon, O.COTA_RAZON_OCT.max, 1e-9);
  assert.ok(Number.isNaN(O.descomposicion(5, 5, 5).razon));
  const barras = O.barrasDescomposicion(60, 20, -40);
  assert.equal(barras.length, 9);
});

test("estados particulares: la clase reconocida coincide con el nombre", () => {
  const esperado = { "Uniaxial": "uniaxial", "Biaxial": "biaxial", "Cortante puro": "cortante_puro",
    "Cilíndrico": "cilindrico", "Esférico (hidrostático)": "esferico", "Triaxial (genérico)": "triaxial" };
  for (const [nombre, clase] of Object.entries(esperado)) {
    for (const k of [10, 100]) assert.equal(O.estado(nombre, k).clase, clase, `${nombre} ×${k}`);
  }
});

test("depósito: coincide con el ejemplo de Julia y detecta la pared gruesa", () => {
  const d = O.deposito(ref.ej1.p, ref.ej1.r, ref.ej1.t);
  cerca(d.sTheta, ref.ej1.sigma_theta); cerca(d.sX, ref.ej1.sigma_x);
  cerca(d.tauMaxSinRadial, ref.ej1.tau_max); cerca(d.tauMaxConRadial, ref.ej1.tau_max_con_radial);
  assert.ok(d.delgada);
  assert.ok(!O.deposito(2, 40, 20).delgada);
  assert.ok(O.deposito(2, 40, 20).errorRelativo > 0.1, "con pared gruesa, despreciar σr deja de ser razonable");
  const b = O.barraColgada(ref.ej_peso.rho_g, ref.ej_peso.L);
  cerca(b[b.length - 1].sigma, ref.ej_peso.sigma_max); assert.equal(b[0].sigma, 0);
});

test("giro3D: invariantes y principales se conservan con tres giros cualesquiera", () => {
  const c = [24, -4, 20, 48, 0, 0];
  const g = O.giro3D(c, 31, -57, 120);
  g.invariantes.forEach((v, i) => cerca(v, g.invariantesRot[i], 1e-9));
  g.principales.forEach((v, i) => cerca(v, g.principalesRot[i], 1e-9));
  // sin giro, σ' = σ; y las componentes sí cambian con giros distintos de la identidad
  const id = O.giro3D(c, 0, 0, 0);
  id.sigma.forEach((f, i) => f.forEach((v, j) => cerca(id.sigmaRot[i][j], v, 1e-12)));
  assert.ok(Math.abs(g.sigmaRot[0][0] - g.sigma[0][0]) > 1);
  // coincide con la referencia al girar alrededor de z con cos = 3/5
  const th = Math.acos(0.6) * 180 / Math.PI;
  const r = O.giro3D(c, 0, 0, th);
  cerca(r.sigmaRot[0][0], ref.ej4.sigma_prima[0][0]);
});

test("cuboPlot: nueve flechas, normales con el signo del valor y caras visibles", () => {
  const sigma = O.tensorDesdeComponentes([24, -4, 20, 48, 0, 0]);
  const c = O.cuboPlot(sigma);
  assert.equal(c.flechas.length, 9);
  assert.equal(c.flechas.filter((f) => f.normal).length, 3);
  assert.equal(c.caras.length, 3);
  const mayor = c.flechas.reduce((a, b) => (Math.abs(b.valor) > Math.abs(a.valor) ? b : a));
  assert.equal(mayor.nombre, "σxy");
  cerca(Math.hypot(mayor.x2 - mayor.x1, mayor.y2 - mayor.y1), 0.5);
  // σyy < 0 (−4): la flecha apunta hacia −y (a la izquierda); σxx > 0 hacia fuera (−x, abajo-izquierda en pantalla)
  const syy = c.flechas.find((f) => f.nombre === "σyy");
  assert.ok(syy.x2 < syy.x1);
  const nulo = O.cuboPlot(O.tensorDesdeComponentes([0, 0, 0, 0, 0, 0]));
  assert.ok(nulo.flechas.every((f) => !f.visible && Number.isFinite(f.tx)));
});

test("CASOS coincide con los casos predefinidos de la referencia de Julia", () => {
  assert.deepEqual(O.CASOS.map((c) => c.id), ref.casos.map((c) => c.nombre));
  O.CASOS.forEach((caso, i) => {
    const sigmaRef = ref.casos[i].resumen.sigma;
    O.tensorDesdeComponentes(caso.c).forEach((fila, r) => fila.forEach((v, k) => cerca(v, sigmaRef[r][k], 1e-12, `${caso.id}[${r}][${k}]`)));
    const a = O.analisis(caso.c, [0, 0, 1]);
    a.lambda.forEach((v, k) => cerca(v, ref.casos[i].resumen.principales[k], 1e-9, caso.id));
    assert.equal(a.clase, ref.casos[i].resumen.clase, caso.id);
  });
});

test("analisis reproduce los ejemplos del tema y es coherente tras girar", () => {
  const c = [24, -4, 20, 48, 0, 0];
  const a = O.analisis(c, [1, 2, 2]);
  cerca(a.lambda[0], ref.ej3.sigma1); cerca(a.plano.sigmaN, ref.ej5.sigma_n); cerca(a.plano.tau, ref.ej5.tau);
  assert.ok(a.plano.admisible && a.invariantesConservados);
  cerca(a.tauMax, ref.mohr.tau_max); cerca(a.sigmaM, ref.esfdes.sigma_m); cerca(a.tauOct, ref.esfdes.tau_oct);
  const g = O.analisis(c, [1, 2, 2], 31, -57, 120);
  assert.ok(g.invariantesConservados);
  g.lambda.forEach((v, k) => cerca(v, a.lambda[k], 1e-9));
  // la tensión sobre un plano fijo en el espacio no depende de los ejes con que se describa σ
  cerca(g.plano.sigmaN, a.plano.sigmaN, 1e-9);
  assert.equal(O.analisis(c, [0, 0, 0]).plano, null);
  assert.equal(O.analisis(c, [NaN, 1, 0]).plano, null);
});

test("normalDesdeAngulos: ejes y vector unitario", () => {
  cerca(O.normalDesdeAngulos(0, 90)[0], 1, 1e-12); cerca(O.normalDesdeAngulos(90, 90)[1], 1, 1e-12);
  cerca(O.normalDesdeAngulos(0, 0)[2], 1, 1e-12);
  cerca(Math.hypot(...O.normalDesdeAngulos(37, 61)), 1, 1e-12);
});
