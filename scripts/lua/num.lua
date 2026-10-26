-- =============================================================================
-- num.lua: shortcode que inserta un número del JSON de referencia verificado.
--
--   {{< num e01 ej3.sigma1 dec=1 >}}            → 60,0   (texto, decimal con coma)
--   {{< num e01 ej3.sigma1 dec=1 unidad=MPa >}} → 60,0 MPa (espacio no separable)
--   {{< num e01 ej3.sigma1 dec=1 math=true unidad=MPa >}} → fórmula en línea 60{,}0\,\mathrm{MPa}
--
-- El primer argumento es el nombre del archivo pruebas/referencia/<nombre>.json;
-- el segundo, la ruta con puntos. Los índices de listas son numéricos y van
-- desde 1. Si algo falta, el render FALLA: ningún número se teclea a mano.
-- =============================================================================

local cache = {}

local function base_proyecto()
  if quarto and quarto.project and quarto.project.directory then
    return quarto.project.directory
  end
  return "."
end

local function cargar(nombre)
  if cache[nombre] then return cache[nombre] end
  local ruta = base_proyecto() .. "/pruebas/referencia/" .. nombre .. ".json"
  local f = io.open(ruta, "r")
  if f == nil then
    error("num: no existe " .. ruta .. " (¿se ha generado con scripts/generar_referencia_*.jl?)")
  end
  local txt = f:read("*a")
  f:close()
  local datos = pandoc.json.decode(txt, false)
  cache[nombre] = datos
  return datos
end

local function navegar(datos, ruta, nombre)
  local actual = datos
  for clave in ruta:gmatch("[^%.]+") do
    if type(actual) ~= "table" then
      error("num: «" .. ruta .. "» no existe en " .. nombre .. ".json (se detiene en «" .. clave .. "»)")
    end
    local k = tonumber(clave)
    if k ~= nil and actual[k] ~= nil then
      actual = actual[k]
    else
      actual = actual[clave]
    end
    if actual == nil then
      error("num: «" .. ruta .. "» no existe en " .. nombre .. ".json (falta «" .. clave .. "»)")
    end
  end
  if type(actual) ~= "number" then
    error("num: «" .. ruta .. "» en " .. nombre .. ".json no es un número")
  end
  return actual
end

local function formatear(x, dec, math_mode, signo)
  local s = string.format("%." .. dec .. "f", x)
  if tonumber(s) == 0 then s = s:gsub("^%-", "") end
  local negativo = s:sub(1, 1) == "-"
  if negativo then s = s:sub(2) end
  local coma = math_mode and "{,}" or ","
  s = s:gsub("%.", coma)
  if negativo then
    s = (math_mode and "-" or "−") .. s
  elseif signo then
    s = "+" .. s
  end
  return s
end

local function str(x)
  if x == nil then return nil end
  local s = pandoc.utils.stringify(x)
  if s == "" then return nil end  -- Quarto pasa los argumentos ausentes como cadena vacía
  return s
end

return {
  ["num"] = function(args, kwargs)
    local nombre, ruta = str(args[1]), str(args[2])
    if nombre == nil or ruta == nil then
      error("num: uso {{< num archivo ruta.con.puntos dec=2 >}}")
    end
    local dec = tonumber(str(kwargs["dec"]) or "2")
    local x = navegar(cargar(nombre), ruta, nombre)
    local math_mode = str(kwargs["math"]) == "true"
    local texto = formatear(x, dec, math_mode, str(kwargs["signo"]) == "true")
    local unidad = str(kwargs["unidad"])
    if math_mode then
      if unidad then texto = texto .. "\\,\\mathrm{" .. unidad .. "}" end
      return pandoc.Math("InlineMath", texto)
    end
    if unidad then texto = texto .. "\u{00A0}" .. unidad end
    return pandoc.Str(texto)
  end,
}
