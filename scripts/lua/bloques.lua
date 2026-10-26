-- =============================================================================
-- bloques.lua: bloques didácticos con borde, icono y rótulo de texto.
--
-- ::: {.definicion titulo="Tensión"} … :::  →  recuadro con rótulo «Definición · Tensión».
-- Clases: definicion, teorema, ejemplo, advertencia, idea-clave, hipotesis,
-- historia, para-clase, pausa. El color nunca es la única señal: el rótulo es
-- texto y el icono lo pone el CSS. La clase .resolucion es un <details> plegado con la
-- resolución de un ejemplo. La clase .profundiza (itinerario B) se
-- convierte en un <details> plegable.
-- =============================================================================

local ROTULO = {
  ["definicion"] = "Definición",
  ["teorema"] = "Teorema",
  ["ejemplo"] = "Ejemplo",
  ["advertencia"] = "Atención",
  ["idea-clave"] = "Idea clave",
  ["hipotesis"] = "Hipótesis y validez",
  ["historia"] = "Historia",
  ["para-clase"] = "Para clase",
  ["pausa"] = "Pausa activa",
}

local function esc(t)
  return (t:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"))
end

-- Un título puede llevar fórmulas ($\sigma_A$): se interpreta como Markdown, no como texto plano.
local function inlines_titulo(texto)
  local ok, doc = pcall(pandoc.read, texto, "markdown")
  local b = ok and doc.blocks[1] or nil
  if b ~= nil and (b.t == "Para" or b.t == "Plain") then return pandoc.Inlines(b.content) end
  return pandoc.Inlines({ pandoc.Str(texto) })
end

-- HTML de unos inlines (las fórmulas salen como \(…\), que MathJax procesa en el documento).
local function html_inlines(inlines)
  return (pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), "html"):gsub("%s+$", ""))
end

local function es_html()
  return FORMAT == "html" or (FORMAT ~= nil and FORMAT:match("^html") ~= nil)
end

local function Div(el)
  if not es_html() then return nil end

  if el.classes:includes("profundiza") then
    local titulo = el.attributes["titulo"]
    local resumen = esc("Profundización — opcional")
    if titulo ~= nil and titulo ~= "" then
      resumen = resumen .. ": " .. html_inlines(inlines_titulo(titulo))
    end
    local clases = { "profundiza", "bloque", "bloque-profundiza" }
    local abre = pandoc.RawBlock("html",
      '<details class="' .. table.concat(clases, " ") .. '"><summary>' .. resumen .. '</summary>')
    local cierra = pandoc.RawBlock("html", "</details>")
    local salida = pandoc.List({ abre })
    salida:extend(el.content)
    salida:insert(cierra)
    return salida
  end

  if el.classes:includes("resolucion") then
    local titulo = el.attributes["titulo"]
    local resumen = "Resolución"
    if titulo ~= nil and titulo ~= "" then
      resumen = resumen .. ": " .. html_inlines(inlines_titulo(titulo))
    end
    local salida = pandoc.List({ pandoc.RawBlock("html",
      '<details class="resolucion bloque"><summary>' .. resumen .. '</summary>') })
    salida:extend(el.content)
    salida:insert(pandoc.RawBlock("html", "</details>"))
    return salida
  end

  for clase, rotulo in pairs(ROTULO) do
    if el.classes:includes(clase) then
      local titulo = el.attributes["titulo"]
      local contenido = pandoc.Inlines({ pandoc.Str(rotulo) })
      if titulo ~= nil and titulo ~= "" then
        contenido:insert(pandoc.Str(" · "))
        contenido:extend(inlines_titulo(titulo))
      end
      local cabecera = pandoc.Div({ pandoc.Plain(contenido) }, pandoc.Attr("", { "bloque-titulo" }))
      local cuerpo = pandoc.Div(el.content, pandoc.Attr("", { "bloque-cuerpo" }))
      el.attributes["titulo"] = nil
      el.content = { cabecera, cuerpo }
      el.classes:insert("bloque")
      el.classes:insert("bloque-" .. clase)
      return el
    end
  end
  return nil
end

-- Las figuras TikZ llevan fórmulas en el pie; el lightbox copia el pie como texto plano y
-- MathJax no actúa en su ventana, así que se dejan fuera (en modo clase ya se ven grandes).
local function Image(el)
  if es_html() and el.classes:includes("figura-tikz") and not el.classes:includes("nolightbox") then
    el.classes:insert("nolightbox")
    return el
  end
  return nil
end

return { { Image = Image, Div = Div } }
