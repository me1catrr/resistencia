// Interfaz del simulador del tensor de tensiones 3D (tema E01).
// El cálculo está en tensor3d-modelo.js y ../tensiones.js (funciones puras, probadas).
// Aquí solo se construye el HTML/SVG y se conectan las entradas.
//
// Representación del elemento: proyección axonométrica FIJA (x hacia el observador, y a la
// derecha, z arriba), no un 3D libre: así no hay ilusiones de perspectiva engañosas. Se
// declara en pantalla y en las limitaciones de la página.

import {
  CASOS, NOMBRES_COMPONENTES, estadoInicial, calcular, geometriaMohr, flechasCubo, formato, numeroDeTexto,
  PROYECCION,
} from "./tensor3d-modelo.js";

let contador = 0;

const coma = (v) => String(v).replace(".", ",");

export function tablaMatriz(m, dec = 2) {
  const filas = m.map((f) => `<tr>${f.map((v) => `<td>${formato(v, dec)}</td>`).join("")}</tr>`).join("");
  return `<table class="t3d-matriz"><tbody>${filas}</tbody></table>`;
}

export function plantilla(id) {
  const opciones = CASOS.map((c, i) => `<option value="${i}">${c.nombre}</option>`).join("");
  const comp = NOMBRES_COMPONENTES.map((n, i) =>
    `<label for="${id}-c${i}">${n}</label><input id="${id}-c${i}" data-campo="c${i}" type="text" inputmode="decimal" autocomplete="off">`).join("");
  const vec = (pref, nombres) => nombres.map((n, i) =>
    `<label for="${id}-${pref}${i}">${n}</label><input id="${id}-${pref}${i}" data-campo="${pref}${i}" type="text" inputmode="decimal" autocomplete="off">`).join("");
  return `
<div class="t3d">
  <div class="t3d-controles">
    <fieldset class="t3d-caja">
      <legend>1 · Tensor (MPa)</legend>
      <label for="${id}-caso">Caso predefinido</label>
      <select id="${id}-caso">${opciones}</select>
      <div class="t3d-rejilla t3d-comp">${comp}</div>
      <button type="button" class="ej-boton secundario" data-accion="reiniciar">Reiniciar</button>
    </fieldset>
    <fieldset class="t3d-caja">
      <legend>2 · Plano (normal)</legend>
      <div class="t3d-rejilla">${vec("n", ["nx", "ny", "nz"])}</div>
      <p class="t3d-ayuda">No hace falta que sea unitaria: se normaliza.</p>
    </fieldset>
    <fieldset class="t3d-caja">
      <legend>3 · Giro de los ejes</legend>
      <div class="t3d-rejilla">${vec("e", ["eje x", "eje y", "eje z"])}</div>
      <label for="${id}-ang">Ángulo (°)</label>
      <div class="t3d-angulo">
        <input id="${id}-angr" data-campo="angr" type="range" min="-180" max="180" step="1" aria-label="Ángulo de giro, deslizador">
        <input id="${id}-ang" data-campo="ang" type="text" inputmode="decimal" autocomplete="off">
      </div>
      <label class="t3d-check"><input type="checkbox" data-campo="girados"> Mostrar el elemento en los ejes girados</label>
    </fieldset>
  </div>

  <div class="t3d-avisos" data-vista="avisos" role="alert"></div>

  <div class="t3d-vistas">
    <section class="t3d-caja"><h4>Matriz de tensiones</h4>
      <div data-vista="matrices"></div></section>
    <section class="t3d-caja"><h4>Elemento (proyección fija)</h4>
      <svg data-vista="cubo" viewBox="-140 -150 360 240" role="img" aria-labelledby="${id}-cubo-t ${id}-cubo-d">
        <title id="${id}-cubo-t">Elemento cúbico con las nueve componentes de tensión</title>
        <desc id="${id}-cubo-d"></desc>
      </svg></section>
    <section class="t3d-caja"><h4>Tensiones principales e invariantes</h4>
      <div data-vista="principales"></div></section>
    <section class="t3d-caja"><h4>Plano y vector tensión</h4>
      <div data-vista="plano"></div></section>
    <section class="t3d-caja t3d-ancha"><h4>Círculos de Mohr</h4>
      <svg data-vista="mohr" viewBox="0 0 520 280" role="img" aria-labelledby="${id}-mohr-t ${id}-mohr-d">
        <title id="${id}-mohr-t">Diagrama de Mohr con los tres círculos</title>
        <desc id="${id}-mohr-d"></desc>
      </svg></section>
  </div>
  <p class="t3d-resumen" data-vista="resumen" role="status" aria-live="polite"></p>
</div>`;
}

// ---------------------------------------------------------------- SVG
const NS = "http://www.w3.org/2000/svg";

export function svgCubo(res, vistaGirada, id) {
  const sigma = vistaGirada ? res.sigmaRot : res.sigma;
  const { flechas, p } = flechasCubo(sigma);
  const P = (x, y, z) => p(x, y, z).map((v) => v.toFixed(1)).join(",");
  const cara = (...pts) => `M${pts.map((q) => P(...q)).join("L")}Z`;
  const eje = vistaGirada ? ["x′", "y′", "z′"] : ["x", "y", "z"];
  let s = `
<defs>
  <marker id="${id}-pn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L8,4L0,8z" class="t3d-punta-n"/></marker>
  <marker id="${id}-pt" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L8,4L0,8z" class="t3d-punta-t"/></marker>
</defs>
<path d="M${P(0, 0, 0)}L${P(0, 1, 0)}M${P(0, 0, 0)}L${P(0, 0, 1)}M${P(0, 0, 0)}L${P(1, 0, 0)}" class="t3d-oculta"/>
<path d="${cara([1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1])}" class="t3d-cara t3d-cara-x"/>
<path d="${cara([1, 1, 0], [0, 1, 0], [0, 1, 1], [1, 1, 1])}" class="t3d-cara t3d-cara-y"/>
<path d="${cara([1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1])}" class="t3d-cara t3d-cara-z"/>`;
  for (const f of flechas) {
    if (f.longitud < 1) continue;
    const clase = f.normal ? "t3d-flecha-n" : "t3d-flecha-t";
    s += `<line x1="${f.desde[0].toFixed(1)}" y1="${f.desde[1].toFixed(1)}" x2="${f.hasta[0].toFixed(1)}" y2="${f.hasta[1].toFixed(1)}" class="${clase}" marker-end="url(#${id}-${f.normal ? "pn" : "pt"})"/>`;
    const dx = f.hasta[0] - f.desde[0];
    const dy = f.hasta[1] - f.desde[1];
    const m = Math.hypot(dx, dy) || 1;
    s += `<text x="${(f.hasta[0] + (dx / m) * 12).toFixed(1)}" y="${(f.hasta[1] + (dy / m) * 12 + 3).toFixed(1)}" class="t3d-rotulo" text-anchor="middle">${f.nombre}</text>`;
  }
  // ejes
  const o = [-120, 70];
  const e = (v, l) => [o[0] + l * v[0], o[1] - l * v[1]];
  const [ex, ey, ez] = [e(PROYECCION.x, 28), e(PROYECCION.y, 34), e(PROYECCION.z, 34)];
  s += `<g class="t3d-ejes"><line x1="${o[0]}" y1="${o[1]}" x2="${ex[0]}" y2="${ex[1]}"/><line x1="${o[0]}" y1="${o[1]}" x2="${ey[0]}" y2="${ey[1]}"/><line x1="${o[0]}" y1="${o[1]}" x2="${ez[0]}" y2="${ez[1]}"/>
<text x="${ex[0] - 8}" y="${ex[1] + 12}">${eje[0]}</text><text x="${ey[0] + 4}" y="${ey[1] + 4}">${eje[1]}</text><text x="${ez[0] - 4}" y="${ez[1] - 4}">${eje[2]}</text></g>`;
  return s;
}

export function descCubo(res, vistaGirada) {
  const s = vistaGirada ? res.sigmaRot : res.sigma;
  const f = (v) => formato(v, 1);
  return `Cubo visto en los ejes ${vistaGirada ? "girados" : "originales"}. Tensiones normales: σxx ${f(s[0][0])}, σyy ${f(s[1][1])}, σzz ${f(s[2][2])} MPa. ` +
    `Tangenciales: σxy ${f(s[0][1])}, σyz ${f(s[1][2])}, σzx ${f(s[2][0])} MPa.`;
}

export function svgMohr(res, geo, id) {
  const { c13, c12, c23, y0, ancho, margen } = geo;
  const arco = (c) => (c.r < 0.5 ? "" : `M${(c.cx + c.r).toFixed(1)},${c.cy.toFixed(1)}A${c.r.toFixed(1)},${c.r.toFixed(1)} 0 0 0 ${(c.cx - c.r).toFixed(1)},${c.cy.toFixed(1)}`);
  const cerrado = (c) => (c.r < 0.5 ? "" : `${arco(c)}Z`);
  let s = `<path d="${cerrado(c13)}${cerrado(c12)}${cerrado(c23)}" class="t3d-region" fill-rule="evenodd"/>`;
  s += `<line x1="${margen - 20}" y1="${y0}" x2="${ancho - margen + 20}" y2="${y0}" class="t3d-eje"/>`;
  if (geo.xCero > margen - 10 && geo.xCero < ancho - margen + 10) {
    s += `<line x1="${geo.xCero}" y1="${y0 + 4}" x2="${geo.xCero}" y2="${margen - 14}" class="t3d-eje"/><text x="${geo.xCero + 5}" y="${margen - 8}" class="t3d-rotulo">τ</text>`;
  }
  s += `<text x="${ancho - margen + 22}" y="${y0 + 4}" class="t3d-rotulo">σ</text>`;
  s += `<path d="${arco(c13)}" class="t3d-c13"/><path d="${arco(c12)}" class="t3d-c12"/><path d="${arco(c23)}" class="t3d-c23"/>`;
  for (const m of geo.marcas) {
    s += `<line x1="${m.px}" y1="${y0 - 4}" x2="${m.px}" y2="${y0 + 4}" class="t3d-eje"/>`;
  }
  // etiquetas de las principales: si coinciden, una sola
  const vistos = new Map();
  geo.marcas.forEach((m, i) => {
    const clave = m.px.toFixed(0);
    vistos.set(clave, (vistos.get(clave) ? vistos.get(clave) + "=" : "") + `σ${i + 1}`);
  });
  const dibujados = new Set();
  geo.marcas.forEach((m) => {
    const clave = m.px.toFixed(0);
    if (dibujados.has(clave)) return;
    dibujados.add(clave);
    s += `<text x="${m.px}" y="${y0 + 20}" text-anchor="middle" class="t3d-rotulo">${vistos.get(clave)} = ${formato(m.valor, 1)}</text>`;
  });
  if (geo.punto) {
    s += `<line x1="${geo.punto.px}" y1="${y0}" x2="${geo.punto.px}" y2="${geo.punto.py}" class="t3d-guia"/>`;
    s += `<circle cx="${geo.punto.px}" cy="${geo.punto.py}" r="4.5" class="${geo.punto.admisible ? "t3d-punto" : "t3d-punto-mal"}"/>`;
    s += `<text x="${geo.punto.px + 8}" y="${geo.punto.py - 8}" class="t3d-rotulo">(σn, τ)</text>`;
  }
  s += `<text x="${margen}" y="${margen - 14}" class="t3d-rotulo">τmáx = ${formato(res.tauMax, 1)} MPa</text>`;
  return s;
}

// ---------------------------------------------------------------- montaje
export function montar(contenedor) {
  const id = `t3d${++contador}`;
  contenedor.innerHTML = plantilla(id);
  const q = (s) => contenedor.querySelector(s);
  const campo = (n) => q(`[data-campo="${n}"]`);
  const vista = (n) => q(`[data-vista="${n}"]`);

  function escribir(estado) {
    estado.c.forEach((v, i) => { campo(`c${i}`).value = coma(v); });
    estado.n.forEach((v, i) => { campo(`n${i}`).value = coma(v); });
    estado.eje.forEach((v, i) => { campo(`e${i}`).value = coma(v); });
    campo("ang").value = coma(estado.anguloGrados);
    campo("angr").value = String(Math.max(-180, Math.min(180, estado.anguloGrados)));
    campo("girados").checked = estado.ejesGirados;
  }

  function leer() {
    const num = (n) => { const v = numeroDeTexto(campo(n).value); return v === null ? NaN : v; };
    return {
      c: [0, 1, 2, 3, 4, 5].map((i) => num(`c${i}`)),
      n: [0, 1, 2].map((i) => num(`n${i}`)),
      eje: [0, 1, 2].map((i) => num(`e${i}`)),
      anguloGrados: num("ang"),
      ejesGirados: campo("girados").checked,
    };
  }

  function pintar() {
    const estado = leer();
    const res = calcular(estado);
    const dec = 2;

    vista("avisos").textContent = res.avisos.join(" ");

    vista("matrices").innerHTML =
      `<p class="t3d-sub">σ (ejes originales)</p>${tablaMatriz(res.sigma, dec)}` +
      `<p class="t3d-sub">σ′ = Q σ Qᵀ (ejes girados ${formato(estado.anguloGrados, 1)}°)</p>${tablaMatriz(res.sigmaRot, dec)}` +
      (res.Q ? `<p class="t3d-sub">Q (filas = ejes nuevos)</p>${tablaMatriz(res.Q, 3)}` : "");

    const cubo = vista("cubo");
    for (const nodo of [...cubo.querySelectorAll(":scope > :not(title):not(desc)")]) nodo.remove();
    cubo.insertAdjacentHTML("beforeend", svgCubo(res, estado.ejesGirados, id));
    q(`#${id}-cubo-d`).textContent = descCubo(res, estado.ejesGirados);

    const p = res.principales;
    const filas = p.valores.map((v, i) => {
      const dir = [0, 1, 2].map((r) => formato(p.vectores[r][i], 3)).join("; ");
      return `<tr><th scope="row">σ${i + 1}</th><td>${formato(v, dec)}</td><td>(${dir})</td></tr>`;
    }).join("");
    const inv = (a, b) => ["I₁", "I₂", "I₃"].map((n, i) =>
      `<tr><th scope="row">${n}</th><td>${formato(a[i], dec)}</td><td>${formato(b[i], dec)}</td></tr>`).join("");
    const ed = res.esfericoDesviador;
    vista("principales").innerHTML =
      `<table class="t3d-tabla"><thead><tr><th>Principal</th><th>Valor (MPa)</th><th>Dirección (x; y; z)</th></tr></thead><tbody>${filas}</tbody></table>` +
      `<table class="t3d-tabla"><thead><tr><th>Invariante</th><th>Ejes originales</th><th>Ejes girados</th></tr></thead><tbody>${inv(res.invariantes, res.invariantesRot)}</tbody></table>` +
      `<p class="${res.invariantesConservados ? "t3d-ok" : "t3d-mal"}">${res.invariantesConservados ? "✔ Los invariantes se conservan al girar los ejes." : "✘ Los invariantes NO se conservan: algo falla."}</p>` +
      `<p>σm = ${formato(ed.sigmaM, dec)} MPa · J₂ = ${formato(ed.J2, dec)} MPa² · τoct = ${formato(res.octaedricas.tauOct, dec)} MPa · τmáx = ${formato(res.tauMax, dec)} MPa</p>`;

    const pl = res.plano;
    vista("plano").innerHTML = pl
      ? `<p>n̂ = (${pl.n.map((v) => formato(v, 3)).join("; ")})</p>` +
        `<p>t = σ n̂ = (${pl.t.map((v) => formato(v, dec)).join("; ")}) MPa, |t| = ${formato(Math.hypot(...pl.t), dec)} MPa</p>` +
        `<p>σn = ${formato(pl.sigmaN, dec)} MPa (${pl.sigmaN >= 0 ? "tracción" : "compresión"}) · τ = ${formato(pl.tau, dec)} MPa</p>` +
        `<p class="${pl.admisible ? "t3d-ok" : "t3d-mal"}">${pl.admisible ? "✔ El par (σn, τ) está en la región de Mohr." : "✘ El par (σn, τ) queda fuera de la región de Mohr: error de cálculo."}</p>`
      : `<p class="t3d-mal">Introduce una normal no nula.</p>`;

    const geo = geometriaMohr(res);
    const mohr = vista("mohr");
    for (const nodo of [...mohr.querySelectorAll(":scope > :not(title):not(desc)")]) nodo.remove();
    mohr.insertAdjacentHTML("beforeend", svgMohr(res, geo, id));
    q(`#${id}-mohr-d`).textContent =
      `Tensiones principales ${p.valores.map((v) => formato(v, 1)).join(", ")} MPa; tensión tangencial máxima ${formato(res.tauMax, 1)} MPa.` +
      (pl ? ` Punto del plano elegido: σn ${formato(pl.sigmaN, 1)} MPa, τ ${formato(pl.tau, 1)} MPa, ${pl.admisible ? "dentro" : "fuera"} de la región admisible.` : "");

    vista("resumen").textContent =
      `σ₁ = ${formato(p.valores[0], 1)}, σ₂ = ${formato(p.valores[1], 1)}, σ₃ = ${formato(p.valores[2], 1)} MPa; τmáx = ${formato(res.tauMax, 1)} MPa.` +
      (pl ? ` En el plano elegido: σn = ${formato(pl.sigmaN, 1)} MPa y τ = ${formato(pl.tau, 1)} MPa.` : "");
  }

  contenedor.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.campo === "angr") campo("ang").value = coma(t.value);
    if (t.dataset && t.dataset.campo === "ang") {
      const v = numeroDeTexto(t.value);
      if (v !== null) campo("angr").value = String(Math.max(-180, Math.min(180, v)));
    }
    if (t.id && t.id.endsWith("-caso")) return;
    pintar();
  });
  contenedor.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id && t.id.endsWith("-caso")) {
      const caso = CASOS[Number(t.value)];
      caso.c.forEach((v, i) => { campo(`c${i}`).value = coma(v); });
    }
    pintar();
  });
  contenedor.addEventListener("click", (e) => {
    if (e.target.dataset && e.target.dataset.accion === "reiniciar") {
      escribir(estadoInicial());
      q(`#${id}-caso`).value = String(CASOS.length - 1);
      pintar();
    }
  });

  escribir(estadoInicial());
  q(`#${id}-caso`).value = String(CASOS.length - 1);
  pintar();
}
