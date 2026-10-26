-- =============================================================================
-- pregunta.lua: incrusta preguntas desde su banco YAML (fuente única).
--
--   {{< pregunta e01-q07 >}}                    una pregunta
--   {{< pregunta todas >}}                      todo el banco
--   {{< pregunta todas clase=true >}}           solo las «Para clase»
--   {{< pregunta todas nivel=2 >}}              solo las de un nivel
--
-- El banco se declara en la cabecera de la página:
--   preguntas: preguntas.yml          (ruta relativa a la página)
--
-- Esquema de cada pregunta en el YAML:
--   id, tipo, nivel, clase (true), intentos, enunciado (markdown),
--   opciones: [{texto, correcta: true, feedback}],        (opcion, grafica, prediccion, error)
--   respuesta (vf: v|f; numerico: número), tol, tolrel, unidad,
--   pistas: [markdown, …], solucion (markdown), razonamiento (markdown, vf razonado).
-- Se leen como metadatos de Pandoc, así que fórmulas y markdown funcionan.
-- Este shortcode genera el MISMO div que se escribiría a mano; el resto lo hace ejercicios.lua.
-- =============================================================================

local cache = {}

local function str(x)
  if x == nil then return nil end
  local s = pandoc.utils.stringify(x)
  if s == "" then return nil end  -- Quarto pasa los argumentos ausentes como cadena vacía
  return s
end

local function dir_documento()
  local f = quarto and quarto.doc and quarto.doc.input_file or nil
  if f == nil then return "." end
  return f:match("^(.*)[/\\][^/\\]+$") or "."
end

local function cargar(meta)
  local rel = str(meta.preguntas)
  if rel == nil or rel == "" then
    error("pregunta: la página no declara `preguntas: archivo.yml` en su cabecera")
  end
  local ruta = pandoc.path.normalize(dir_documento() .. "/" .. rel)
  if cache[ruta] then return cache[ruta] end
  local f = io.open(ruta, "r")
  if f == nil then error("pregunta: no existe " .. ruta) end
  local txt = f:read("*a")
  f:close()
  local doc = pandoc.read("---\n" .. txt .. "\n---\n", "markdown")
  local banco = doc.meta.preguntas
  if banco == nil then error("pregunta: " .. ruta .. " no tiene la clave `preguntas:`") end
  cache[ruta] = banco
  return banco
end

local function bloques(v)
  if v == nil then return pandoc.Blocks({}) end
  local t = pandoc.utils.type(v)
  if t == "Blocks" then return v end
  if t == "Inlines" then return pandoc.Blocks({ pandoc.Plain(v) }) end
  return pandoc.Blocks({ pandoc.Plain({ pandoc.Str(tostring(v)) }) })
end

local function es_verdadero(v)
  return v ~= nil and (v == true or str(v) == "true")
end

local function construir(q)
  local id, tipo = str(q.id), str(q.tipo)
  if id == nil or tipo == nil then error("pregunta: toda pregunta necesita id y tipo") end
  local attrs = {}
  for _, k in ipairs({ "nivel", "intentos", "respuesta", "tol", "tolrel", "unidad", "razonado", "multiple" }) do
    if q[k] ~= nil then attrs[k] = str(q[k]) end
  end
  attrs["tipo"] = tipo
  if es_verdadero(q.clase) then attrs["clase"] = "si" end

  local contenido = pandoc.Blocks({})
  contenido:extend(bloques(q.enunciado))

  if q.opciones ~= nil then
    local items, correctas = {}, {}
    for i, op in ipairs(q.opciones) do
      local b = pandoc.Blocks(bloques(op.texto))
      if op.feedback ~= nil then
        b:insert(pandoc.BulletList({ bloques(op.feedback) }))
      end
      items[#items + 1] = b
      if es_verdadero(op.correcta) then correctas[#correctas + 1] = tostring(i) end
    end
    if #correctas > 0 then attrs["respuesta"] = table.concat(correctas, ",") end
    if #correctas > 1 then attrs["multiple"] = "si" end
    local clase = (tipo == "error") and "pasos" or "opciones"
    contenido:insert(pandoc.Div({ pandoc.OrderedList(items) }, pandoc.Attr("", { clase })))
  end
  if q.pistas ~= nil then
    for _, p in ipairs(q.pistas) do
      contenido:insert(pandoc.Div(bloques(p), pandoc.Attr("", { "pista" })))
    end
  end
  if q.razonamiento ~= nil then
    contenido:insert(pandoc.Div(bloques(q.razonamiento), pandoc.Attr("", { "razonamiento" })))
  end
  if q.solucion ~= nil then
    contenido:insert(pandoc.Div(bloques(q.solucion), pandoc.Attr("", { "solucion" })))
  end
  return pandoc.Div(contenido, pandoc.Attr(id, { "ejercicio" }, attrs))
end

return {
  ["pregunta"] = function(args, kwargs, meta)
    local que = str(args[1])
    if que == nil then error("pregunta: uso {{< pregunta id >}} o {{< pregunta todas >}}") end
    local banco = cargar(meta)
    if que ~= "todas" then
      for _, q in ipairs(banco) do
        if str(q.id) == que then return construir(q) end
      end
      error("pregunta: no hay ninguna pregunta con id «" .. que .. "»")
    end
    local filtro_clase = str(kwargs["clase"]) == "true"
    local filtro_nivel = str(kwargs["nivel"])
    local salida = pandoc.Blocks({})
    for _, q in ipairs(banco) do
      local ok = true
      if filtro_clase and not es_verdadero(q.clase) then ok = false end
      if filtro_nivel and str(q.nivel) ~= filtro_nivel then ok = false end
      if ok then salida:insert(construir(q)) end
    end
    return salida
  end,
}
