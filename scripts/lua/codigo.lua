-- =============================================================================
-- codigo.lua: muestra código desde el archivo fuente real, sin copiarlo a mano.
--
--   {{< codigo archivo="python/resistencia/tensiones.py" region="invariantes" lang="python" >}}
--
-- Muestra solo las líneas entre «#region nombre» y «#endregion» (también valen
-- «# region», «// region» y «-- region»). Las líneas marcadoras no se muestran.
-- Sin `region`, muestra el archivo entero. Si el archivo o la región no existen,
-- el render falla. Así lo que se ve en la web es lo que se ejecuta y se prueba.
-- =============================================================================

local function str(x)
  if x == nil then return nil end
  return pandoc.utils.stringify(x)
end

local function base_proyecto()
  if quarto and quarto.project and quarto.project.directory then
    return quarto.project.directory
  end
  return "."
end

local function marca(linea)
  local inicio = linea:match("^%s*[#/%-]+%s*region%s+([%w_%-]+)%s*$")
  if inicio then return "inicio", inicio end
  if linea:match("^%s*[#/%-]+%s*endregion%s*[%w_%-]*%s*$") then return "fin", nil end
  return nil, nil
end

return {
  ["codigo"] = function(args, kwargs)
    local archivo = str(kwargs["archivo"])
    local region = str(kwargs["region"])
    local lang = str(kwargs["lang"]) or ""
    if archivo == nil then error("codigo: falta archivo=") end
    local ruta = base_proyecto() .. "/" .. archivo
    local f = io.open(ruta, "r")
    if f == nil then error("codigo: no existe " .. ruta) end

    local salida, dentro, encontrada = {}, (region == nil), false
    for linea in f:lines() do
      local tipo, nombre = marca(linea)
      if tipo == "inicio" then
        if region ~= nil and nombre == region then dentro, encontrada = true, true end
      elseif tipo == "fin" then
        if region ~= nil and dentro then dentro = false end
      elseif dentro then
        salida[#salida + 1] = linea
      end
    end
    f:close()
    if region ~= nil and not encontrada then
      error("codigo: no hay «region " .. region .. "» en " .. archivo)
    end
    -- quita líneas en blanco sobrantes al principio y al final
    while #salida > 0 and salida[1]:match("^%s*$") do table.remove(salida, 1) end
    while #salida > 0 and salida[#salida]:match("^%s*$") do table.remove(salida) end
    if #salida == 0 then error("codigo: la región «" .. tostring(region) .. "» está vacía en " .. archivo) end

    local clases = {}
    if lang ~= "" then clases[1] = lang end
    local bloque = pandoc.CodeBlock(table.concat(salida, "\n"), pandoc.Attr("", clases, { fuente = archivo }))
    local pie = pandoc.Para({ pandoc.Emph({ pandoc.Str("Fuente: " .. archivo ..
      (region and (" · región " .. region) or "")) }) })
    return pandoc.Blocks({ bloque, pie })
  end,
}
