-- =============================================================================
-- simulacion.lua: shortcode que monta una simulación interactiva.
--
--   {{< simulacion tensor3d >}}
--
-- Genera el contenedor y carga, como archivo, recursos/js/sim/registro.js, que
-- importa recursos/js/sim/<id>.js y llama a su función `montar(contenedor)`.
-- Sin JavaScript se muestra un aviso. Las 10 secciones de cada página de
-- simulación (objetivo, fundamento, hipótesis, entradas, visualización,
-- resultados, interpretación, limitaciones, ejercicios, validación) las escribe
-- el autor; véase simulaciones/_plantilla.qmd.
-- =============================================================================

local montado = false

local function offset()
  if quarto and quarto.project and quarto.project.offset then return quarto.project.offset end
  return "."
end

return {
  ["simulacion"] = function(args)
    local id = args[1] and pandoc.utils.stringify(args[1]) or nil
    if id == nil or not id:match("^[%w%-_]+$") then
      error("simulacion: uso {{< simulacion id >}} con un id alfanumérico")
    end
    if not montado then
      montado = true
      quarto.doc.include_text("after-body",
        '<script type="module" src="' .. offset() .. '/recursos/js/sim/registro.js"></script>')
    end
    local html = '<div class="sim-marco" data-sim="' .. id .. '">' ..
      '<div class="sim-montaje" data-sim-montaje aria-live="polite">' ..
      '<p class="sim-cargando">Cargando simulación…</p></div>' ..
      '<noscript><p class="aviso">Esta simulación necesita JavaScript activado.</p></noscript></div>'
    return pandoc.RawBlock("html", html)
  end,
}
