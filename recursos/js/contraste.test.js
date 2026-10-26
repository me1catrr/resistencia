// Comprueba el contraste WCAG (≥ 4,5:1 para texto) de los pares de color
// declarados en claro.scss y oscuro.scss. Si cambias un token, esta prueba avisa.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = (n) => fileURLToPath(new URL(`../css/${n}`, import.meta.url));

function tokens(archivo) {
  const t = {};
  for (const m of readFileSync(css(archivo), "utf8").matchAll(/^\$(r-[\w-]+):\s*(#[0-9a-fA-F]{6});/gm)) {
    t[m[1]] = m[2];
  }
  return t;
}
function lum(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contraste(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test("contraste: valores de referencia de la fórmula", () => {
  assert.ok(Math.abs(contraste("#000000", "#ffffff") - 21) < 1e-9);
  assert.ok(Math.abs(contraste("#777777", "#ffffff") - 4.48) < 0.01);
});

for (const archivo of ["claro.scss", "oscuro.scss"]) {
  const t = tokens(archivo);
  test(`${archivo}: define todos los tokens`, () => {
    for (const k of ["r-acero", "r-cobre", "r-verde", "r-violeta", "r-fondo", "r-superficie",
                     "r-texto", "r-tenue", "r-borde", "r-sobre-acento", "r-rojo", "r-rojo-fondo", "r-ambar", "r-ambar-fondo"]) {
      assert.ok(t[k], `falta $${k}`);
    }
  });
  test(`${archivo}: texto y acentos legibles sobre fondo y superficie (≥ 4,5)`, () => {
    for (const fondo of ["r-fondo", "r-superficie"]) {
      for (const fg of ["r-texto", "r-tenue", "r-acero", "r-cobre", "r-verde", "r-violeta"]) {
        const c = contraste(t[fg], t[fondo]);
        assert.ok(c >= 4.5, `${archivo}: ${fg} sobre ${fondo} = ${c.toFixed(2)}`);
      }
    }
  });
  test(`${archivo}: cajas de errores (rojo) e historia (ámbar): rótulo y texto legibles (≥ 4,5)`, () => {
    for (const [acento, fondo] of [["r-rojo", "r-rojo-fondo"], ["r-ambar", "r-ambar-fondo"]]) {
      for (const fg of [acento, "r-texto", "r-tenue"]) {
        const c = contraste(t[fg], t[fondo]);
        assert.ok(c >= 4.5, `${archivo}: ${fg} sobre ${fondo} = ${c.toFixed(2)}`);
      }
      // el acento también se lee sobre el fondo normal de la página
      assert.ok(contraste(t[acento], t["r-fondo"]) >= 4.5, `${archivo}: ${acento} sobre r-fondo`);
    }
  });
  test(`${archivo}: texto sobre botones de acento (≥ 4,5)`, () => {
    for (const bg of ["r-acero", "r-cobre"]) {
      const c = contraste(t["r-sobre-acento"], t[bg]);
      assert.ok(c >= 4.5, `${archivo}: r-sobre-acento sobre ${bg} = ${c.toFixed(2)}`);
    }
  });
  test(`${archivo}: el borde se distingue del fondo (≥ 1,3)`, () => {
    assert.ok(contraste(t["r-borde"], t["r-fondo"]) >= 1.3);
  });
}
