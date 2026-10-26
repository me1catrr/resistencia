// Registro de simulaciones. El shortcode {{< simulacion id >}} deja un contenedor
// <div data-sim="id"> y este módulo importa ./<id>.js y llama a su función
// `montar(contenedor)`. Cada simulación es un módulo propio y no depende de las demás.
// Si falla, se dice en pantalla (y en consola), no se queda en blanco.

const ID_VALIDO = /^[\w-]+$/;

/**
 * Monta todas las simulaciones de un documento.
 * `importar` se puede sustituir en las pruebas.
 */
export async function montarSimulaciones(doc, importar = (url) => import(url), base = import.meta.url) {
  const resultados = [];
  for (const marco of doc.querySelectorAll("[data-sim]")) {
    const id = marco.dataset.sim;
    const destino = marco.querySelector("[data-sim-montaje]") || marco;
    try {
      if (!ID_VALIDO.test(id)) throw new Error("identificador no válido");
      const modulo = await importar(new URL(`./${id}.js`, base).href);
      if (typeof modulo.montar !== "function") throw new Error("el módulo no exporta montar()");
      destino.textContent = "";
      await modulo.montar(destino);
      resultados.push({ id, ok: true });
    } catch (e) {
      destino.textContent = `No se pudo cargar la simulación «${id}»: ${e.message}`;
      destino.classList.add("sim-error");
      if (typeof console !== "undefined") console.error(`Simulación ${id}:`, e);
      resultados.push({ id, ok: false, error: e.message });
    }
  }
  return resultados;
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => montarSimulaciones(document));
  } else {
    montarSimulaciones(document);
  }
}
