import test from "node:test";
import assert from "node:assert/strict";
import { modoInicial, indiceSalto, formatoTiempo, esCampoDeTexto } from "./modo-clase.js";

test("modoInicial: la URL manda sobre lo guardado", () => {
  assert.equal(modoInicial("?clase=1", null), true);
  assert.equal(modoInicial("?clase=1", "0"), true);
  assert.equal(modoInicial("?clase=0", "1"), false);
  assert.equal(modoInicial("", "1"), true);
  assert.equal(modoInicial("", "0"), false);
  assert.equal(modoInicial("", null), false);
  assert.equal(modoInicial("?otro=3", null), false);
  assert.equal(modoInicial(undefined, null), false);
});

test("indiceSalto: siguiente y anterior", () => {
  const tops = [0, 500, 1200, 2000];
  assert.equal(indiceSalto(tops, 0, 1), 1);
  assert.equal(indiceSalto(tops, 500, 1), 2); // ya estamos en el 1: va al 2
  assert.equal(indiceSalto(tops, 1500, 1), 3);
  assert.equal(indiceSalto(tops, 2000, 1), -1); // no hay siguiente
  assert.equal(indiceSalto(tops, 1500, -1), 2);
  assert.equal(indiceSalto(tops, 500, -1), 0); // en el 1: va al 0
  assert.equal(indiceSalto(tops, 0, -1), -1);
});

test("indiceSalto: tolera el margen de pocos píxeles", () => {
  const tops = [0, 500];
  assert.equal(indiceSalto(tops, 495, 1), -1); // 500 está dentro del margen: ya estamos ahí
  assert.equal(indiceSalto(tops, 505, -1), 0);
});

test("formatoTiempo", () => {
  assert.equal(formatoTiempo(60), "1:00");
  assert.equal(formatoTiempo(90), "1:30");
  assert.equal(formatoTiempo(9), "0:09");
  assert.equal(formatoTiempo(-5), "0:00");
  assert.equal(formatoTiempo(180), "3:00");
});

test("esCampoDeTexto", () => {
  assert.equal(esCampoDeTexto({ tagName: "input" }), true);
  assert.equal(esCampoDeTexto({ tagName: "TEXTAREA" }), true);
  assert.equal(esCampoDeTexto({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(esCampoDeTexto({ tagName: "DIV" }), false);
  assert.equal(esCampoDeTexto(null), false);
});
