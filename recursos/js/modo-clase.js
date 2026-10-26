// Modo clase: proyección en aula. No es otra aplicación: solo añade la clase
// CSS `modo-clase` al <body> (los estilos están en resistencia.css).
//
//  - Se activa con el botón de la barra, la tecla «c» o ?clase=1 (?clase=0 lo apaga).
//  - La preferencia se recuerda en localStorage (con try/catch: puede no existir).
//  - En modo clase, «j» y «k» saltan al apartado siguiente y anterior.
//  - Los bloques «Para clase» y «Pausa activa» ofrecen un temporizador de 1 a 3 minutos.

const CLAVE = "resistencia.modoClase";

// ---------- Lógica pura (se prueba en modo-clase.test.js) ----------

/** Decide si el modo clase debe estar activo: la URL manda sobre lo guardado. */
export function modoInicial(search, guardado) {
  const param = new URLSearchParams(search || "").get("clase");
  if (param === "1") return true;
  if (param === "0") return false;
  return guardado === "1";
}

/** Índice del encabezado al que saltar, o -1. `tops` son posiciones absolutas, ordenadas. */
export function indiceSalto(tops, scrollY, direccion, margen = 10) {
  if (direccion > 0) {
    return tops.findIndex((t) => t > scrollY + margen);
  }
  for (let i = tops.length - 1; i >= 0; i--) {
    if (tops[i] < scrollY - margen) return i;
  }
  return -1;
}

/** 90 → «1:30». */
export function formatoTiempo(segundos) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** No interceptar teclas mientras se escribe. */
export function esCampoDeTexto(el) {
  if (!el || !el.tagName) return false;
  const t = el.tagName.toUpperCase();
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || el.isContentEditable === true;
}

// ---------- Interfaz (solo en el navegador) ----------

function leer() {
  try { return window.localStorage.getItem(CLAVE); } catch { return null; }
}
function guardar(valor) {
  try { window.localStorage.setItem(CLAVE, valor); } catch { /* sin almacenamiento: no pasa nada */ }
}

function iniciar() {
  const body = document.body;
  let boton = null;

  function aplicar(activo, persistir) {
    body.classList.toggle("modo-clase", activo);
    if (boton) {
      boton.setAttribute("aria-pressed", String(activo));
      boton.textContent = activo ? "Salir del modo clase" : "Modo clase";
    }
    if (persistir) guardar(activo ? "1" : "0");
    if (!activo) quitarTemporizador();
  }

  function crearBoton() {
    boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-modo-clase";
    boton.setAttribute("aria-pressed", "false");
    boton.title = "Proyección en aula (tecla c)";
    boton.addEventListener("click", () => aplicar(!body.classList.contains("modo-clase"), true));
    const barra = document.querySelector("#quarto-header .navbar-container, #quarto-header nav");
    if (barra) {
      const caja = document.createElement("div");
      caja.className = "ms-2";
      caja.append(boton);
      barra.append(caja);
    } else {
      boton.style.cssText = "position:fixed;right:1rem;top:1rem;z-index:2000";
      body.append(boton);
    }
  }

  // --- temporizador ---
  let reloj = null;
  let tarjeta = null;
  function quitarTemporizador() {
    if (reloj) { clearInterval(reloj); reloj = null; }
    if (tarjeta) { tarjeta.remove(); tarjeta = null; }
  }
  function arrancar(minutos) {
    quitarTemporizador();
    let restante = minutos * 60;
    tarjeta = document.createElement("div");
    tarjeta.className = "temporizador-clase";
    tarjeta.setAttribute("role", "timer");
    tarjeta.textContent = formatoTiempo(restante);
    body.append(tarjeta);
    reloj = setInterval(() => {
      restante -= 1;
      tarjeta.textContent = restante > 0 ? formatoTiempo(restante) : "Tiempo";
      if (restante <= 0) { clearInterval(reloj); reloj = null; }
    }, 1000);
  }
  function añadirControlesDeTiempo() {
    for (const bloque of document.querySelectorAll(".bloque-para-clase, .bloque-pausa")) {
      const cuerpo = bloque.querySelector(".bloque-cuerpo");
      if (!cuerpo || cuerpo.querySelector(".ctl-temporizador")) continue;
      const fila = document.createElement("p");
      fila.className = "ctl-temporizador";
      fila.append("Temporizador: ");
      for (const m of [1, 2, 3]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ej-boton secundario";
        b.textContent = `${m} min`;
        b.addEventListener("click", () => arrancar(m));
        fila.append(b);
      }
      cuerpo.append(fila);
    }
  }

  // --- salto entre apartados ---
  function saltar(direccion) {
    const encabezados = [...document.querySelectorAll("main h2")];
    const tops = encabezados.map((h) => h.getBoundingClientRect().top + window.scrollY);
    const i = indiceSalto(tops, window.scrollY, direccion);
    if (i < 0) return;
    const reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    encabezados[i].scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || esCampoDeTexto(e.target)) return;
    if (e.key === "c") {
      aplicar(!body.classList.contains("modo-clase"), true);
    } else if (body.classList.contains("modo-clase")) {
      if (e.key === "j") saltar(1);
      else if (e.key === "k") saltar(-1);
    }
  });

  crearBoton();
  añadirControlesDeTiempo();
  const activo = modoInicial(window.location.search, leer());
  aplicar(activo, window.location.search.includes("clase="));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
}
