-- =============================================================================
-- recursos_globales.lua: carga en todas las páginas HTML lo que es común.
--
-- Inserta el script del modo clase como ARCHIVO (no incrustado), con una ruta
-- relativa a la raíz del proyecto, de modo que funciona bajo /resistencia/ y
-- en local. recursos/js/**/*.js se copia al sitio mediante `resources`.
-- =============================================================================

local function es_html()
  return FORMAT == "html" or (FORMAT ~= nil and FORMAT:match("^html") ~= nil)
end

local function offset()
  if quarto and quarto.project and quarto.project.offset then
    return quarto.project.offset
  end
  return "."
end

local function Pandoc(doc)
  if not es_html() then return nil end
  quarto.doc.include_text("after-body",
    '<script src="' .. offset() .. '/recursos/js/modo-clase.js" defer></script>')
  return nil
end

return { { Pandoc = Pandoc } }
