-- =============================================================================
-- ejercicios.lua: convierte los divs ::: {.ejercicio …} en tarjetas interactivas.
--
-- Estructura de entrada (a mano o generada por el shortcode `pregunta`):
--
--   ::: {#e01-q01 .ejercicio tipo="opcion" nivel="2" clase="si" intentos="2" respuesta="2"}
--   Enunciado (cualquier bloque).
--
--   ::: opciones
--   1. Texto de la opción 1
--      - Por qué no es correcta (retroalimentación, sublista)
--   2. Texto de la opción 2
--      - Por qué sí
--   :::
--   ::: pista
--   Primera pista.
--   :::
--   ::: solucion
--   Solución desarrollada.
--   :::
--   :::
--
-- Tipos: opcion, vf, numerico, error, prediccion, grafica, reflexion, oral, problema.
-- Atributos: tipo, nivel (1-4), clase (si), intentos, respuesta, tol, tolrel,
-- unidad, razonado (si), multiple (si). Los renombra a data-* para ejercicios.js.
-- Este filtro solo estructura el HTML; la interacción es de ejercicios.js, que se
-- carga como archivo. Sin JavaScript, todo (incluida la solución) queda visible.
-- =============================================================================

local TIPOS = {
  opcion = true, vf = true, numerico = true, error = true, prediccion = true,
  grafica = true, reflexion = true, oral = true, problema = true,
}
local ATRIBUTOS = { "tipo", "nivel", "clase", "intentos", "respuesta", "tol", "tolrel",
                    "unidad", "razonado", "multiple" }
local NIVELES = { "Fundamentos", "Aplicación", "Integración", "Desafío (opcional)" }
local ETIQUETA_TIPO = {
  opcion = "Opción múltiple", vf = "Verdadero o falso", numerico = "Respuesta numérica",
  error = "Encuentra el error", prediccion = "Predicción", grafica = "Interpreta la gráfica",
  reflexion = "Reflexión", oral = "Para comentar en voz alta", problema = "Problema",
}

local cuenta = 0
local avisado = false

local function es_html()
  return FORMAT == "html" or (FORMAT ~= nil and FORMAT:match("^html") ~= nil)
end

local function offset()
  if quarto and quarto.project and quarto.project.offset then return quarto.project.offset end
  return "."
end

local function si(v)
  return v ~= nil and (v == "si" or v == "sí" or v == "true" or v == "1")
end

local function div(clases, contenido, atributos)
  return pandoc.Div(contenido, pandoc.Attr("", clases, atributos or {}))
end

-- Convierte el primer OrderedList/BulletList de un div en opciones con feedback.
local function convertir_lista(contenedor, clase_item)
  local lista
  for _, b in ipairs(contenedor.content) do
    if b.t == "OrderedList" or b.t == "BulletList" then lista = b; break end
  end
  if lista == nil then return nil end
  local salida = pandoc.List()
  for i, item in ipairs(lista.content) do
    local bloques = pandoc.List(item)
    local feedback = pandoc.List()
    if #bloques > 1 and bloques[#bloques].t == "BulletList" then
      local fb = bloques:remove(#bloques)
      for _, sub in ipairs(fb.content) do feedback:extend(sub) end
    end
    local partes = { div({ "ej-texto" }, bloques) }
    if #feedback > 0 then partes[#partes + 1] = div({ "ej-feedback" }, feedback) end
    salida:insert(div({ clase_item }, partes, { ["data-indice"] = tostring(i) }))
  end
  return salida
end

local function Div(el)
  if not es_html() then return nil end
  if not el.classes:includes("ejercicio") then return nil end

  local tipo = el.attributes["tipo"]
  if tipo == nil or not TIPOS[tipo] then
    io.stderr:write("AVISO ejercicios.lua: ejercicio sin tipo válido (" .. tostring(tipo) ..
                    ") en id=" .. tostring(el.identifier) .. "\n")
    return nil
  end
  cuenta = cuenta + 1
  local id = el.identifier
  if id == nil or id == "" then
    id = "ej-sin-id-" .. cuenta
    io.stderr:write("AVISO ejercicios.lua: ejercicio de tipo " .. tipo ..
                    " sin id; el progreso no se conservará de forma estable (" .. id .. ")\n")
  end

  local nivel = tonumber(el.attributes["nivel"] or "")
  local enunciado, opciones, pistas, solucion, razonamiento = pandoc.List(), nil, pandoc.List(), nil, nil
  for _, b in ipairs(el.content) do
    if b.t == "Div" and (b.classes:includes("opciones") or b.classes:includes("pasos")) then
      opciones = convertir_lista(b, b.classes:includes("pasos") and "ej-paso" or "ej-opcion")
    elseif b.t == "Div" and b.classes:includes("pista") then
      pistas:insert(div({ "ej-pista" }, b.content))
    elseif b.t == "Div" and b.classes:includes("solucion") then
      solucion = div({ "ej-solucion" }, b.content)
    elseif b.t == "Div" and b.classes:includes("razonamiento") then
      razonamiento = div({ "ej-razonamiento" }, b.content)
    else
      enunciado:insert(b)
    end
  end

  local insignias = pandoc.List()
  if nivel and NIVELES[nivel] then
    insignias:insert(pandoc.Span({ pandoc.Str("Nivel " .. nivel .. " · " .. NIVELES[nivel]) },
      pandoc.Attr("", { "ej-insignia", "ej-nivel-" .. nivel })))
  end
  if si(el.attributes["clase"]) then
    insignias:insert(pandoc.Span({ pandoc.Str("Para clase") }, pandoc.Attr("", { "ej-insignia", "ej-clase" })))
  end
  insignias:insert(pandoc.Span({ pandoc.Str(ETIQUETA_TIPO[tipo]) }, pandoc.Attr("", { "ej-insignia", "ej-tipo" })))

  local partes = pandoc.List()
  partes:insert(div({ "ej-cabecera" }, { pandoc.Plain(insignias:map(function(s) return s end)) }))
  partes:insert(div({ "ej-enunciado" }, enunciado))
  if opciones then
    local clase = (tipo == "error") and "ej-pasos" or "ej-opciones"
    partes:insert(div({ clase }, opciones))
  end
  if #pistas > 0 then partes:insert(div({ "ej-pistas" }, pistas)) end
  if razonamiento then partes:insert(razonamiento) end
  if solucion then partes:insert(solucion) end

  local atributos = { ["data-tipo"] = tipo }
  for _, a in ipairs(ATRIBUTOS) do
    local v = el.attributes[a]
    if v ~= nil and a ~= "tipo" then atributos["data-" .. a] = v end
  end
  atributos["role"] = "group"
  atributos["aria-label"] = ETIQUETA_TIPO[tipo]

  local clases = { "ejercicio", "ej-" .. tipo }
  local nuevo = pandoc.Div(partes, pandoc.Attr(id, clases, atributos))

  if not avisado then
    avisado = true
    local aviso = div({ "aviso", "aviso-ejercicios" }, {
      pandoc.Para({ pandoc.Strong({ pandoc.Str("Cuestiones formativas y locales. ") }),
        pandoc.Str("Se corrigen en tu navegador: no se envía ni se guarda nada en ningún servidor " ..
                   "y no cuentan para la nota. Tu progreso se recuerda solo en este navegador.") }),
    })
    return { aviso, nuevo }
  end
  return nuevo
end

local function Pandoc(doc)
  if cuenta == 0 or not es_html() then return nil end
  quarto.doc.include_text("after-body",
    '<script type="module" src="' .. offset() .. '/recursos/js/ejercicios.js"></script>')
  return nil
end

return { { Div = Div }, { Pandoc = Pandoc } }
