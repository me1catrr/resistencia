-- =============================================================================
-- version_tema.lua: recuadro de versión y estado de cada tema.
--
-- Lee la entrada del tema en _versiones.yml (metadatos del proyecto, clave
-- «versiones») usando el campo `tema-id` de la página. La fecha de última
-- modificación sale de git; la de revisión técnica solo si figura en
-- _versiones.yml. Falla de forma visible si falta la entrada del tema.
-- Las páginas con tipo-pagina: tema llevan el recuadro completo; el resto de
-- páginas del tema, una línea.
-- =============================================================================

local ETIQUETA = {
  esqueleto = "Esqueleto",
  borrador = "Borrador",
  revisado = "Revisado",
  publicado = "Publicado",
}

local function txt(x)
  if x == nil then return "" end
  return pandoc.utils.stringify(x)
end

local function es_html()
  return FORMAT == "html" or (FORMAT ~= nil and FORMAT:match("^html") ~= nil)
end

local function dir_documento()
  local f = quarto and quarto.doc and quarto.doc.input_file or nil
  if f == nil then return nil end
  return f:match("^(.*)[/\\][^/\\]+$")
end

local function git(args)
  local ok, salida = pcall(pandoc.pipe, "git", args, "")
  if not ok then return nil end
  return (salida:gsub("%s+$", ""))
end

-- Devuelve texto de fecha y si hay cambios sin confirmar.
local function fecha_git()
  local d = dir_documento()
  if d == nil then return "fecha no disponible", false end
  local f = git({ "-C", d, "log", "-1", "--format=%cs", "--", d })
  local sucio = git({ "-C", d, "status", "--porcelain", "--", d })
  local pendiente = sucio ~= nil and sucio ~= ""
  if f == nil or f == "" then
    return "pendiente de primer commit", pendiente
  end
  return f, pendiente
end

local function referencias(v)
  local lista = v.referencias
  if lista == nil then return nil end
  local citaciones = pandoc.List()
  local items = (lista.t == "MetaList") and lista or { lista }
  for _, k in ipairs(items) do
    local clave = txt(k)
    -- también admite «a, b» en una sola cadena
    for c in clave:gmatch("[^,%s%[%]]+") do
      citaciones:insert(pandoc.Citation(c, "NormalCitation"))
    end
  end
  if #citaciones == 0 then return nil end
  return pandoc.Cite({ pandoc.Str("@" .. citaciones[1].id) }, citaciones)
end

local function Pandoc(doc)
  if not es_html() then return nil end
  local id = txt(doc.meta["tema-id"])
  if id == "" then return nil end
  local tipo = txt(doc.meta["tipo-pagina"])
  if tipo == "laboratorio" then return nil end

  local v = doc.meta.versiones and doc.meta.versiones[id]
  if v == nil then
    io.stderr:write("ERROR version_tema.lua: falta la entrada «" .. id .. "» en _versiones.yml\n")
    os.exit(1)
  end
  local estado = txt(v.estado)
  if ETIQUETA[estado] == nil then
    io.stderr:write("ERROR version_tema.lua: estado no válido «" .. estado .. "» en «" .. id .. "»\n")
    os.exit(1)
  end
  local fecha, sucio = fecha_git()
  local revision = txt(v.revision_tecnica)
  local rev_txt = (revision ~= "") and ("revisión técnica: " .. revision) or "revisión técnica pendiente"

  local linea1 = {
    pandoc.Strong({ pandoc.Str(id:upper()) }),
    pandoc.Str(" · versión " .. txt(v.version) .. " · "),
    pandoc.Span({ pandoc.Str(ETIQUETA[estado]) }, pandoc.Attr("", { "version-estado" })),
  }

  local clases = { "version-tema", "version-" .. estado }
  local bloques = pandoc.List()
  if tipo == "tema" then
    local f2 = "última modificación registrada en git: " .. fecha
    if sucio then f2 = f2 .. " (hay cambios sin confirmar)" end
    f2 = f2 .. " · " .. rev_txt
    bloques:insert(pandoc.Para(linea1))
    bloques:insert(pandoc.Para({ pandoc.Str(f2) }))
    local refs = referencias(v)
    if refs ~= nil then
      bloques:insert(pandoc.Para({ pandoc.Str("Referencias principales: "), refs }))
    end
    if estado == "borrador" then
      bloques:insert(pandoc.Para({ pandoc.Emph({ pandoc.Str(
        "Borrador pendiente de revisión por el profesor. Parte del contenido se ha elaborado con ayuda de herramientas de IA y no debe darse por revisado.") }) }))
    elseif estado == "esqueleto" then
      bloques:insert(pandoc.Para({ pandoc.Emph({ pandoc.Str("Pendiente de desarrollo.") }) }))
    end
  else
    table.insert(clases, "version-compacta")
    local linea = pandoc.List(linea1)
    linea:insert(pandoc.Str(" · " .. rev_txt))
    bloques:insert(pandoc.Para(linea))
  end
  table.insert(doc.blocks, 1, pandoc.Div(bloques, pandoc.Attr("", clases, { role = "note" })))
  return doc
end

return { { Pandoc = Pandoc } }
