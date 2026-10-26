# Genera pruebas/referencia/e01.json con la implementación de referencia en Julia.
#
#   julia --project=Resistencia.jl scripts/generar_referencia_e01.jl
#
# Este JSON es la ÚNICA fuente de los números que muestran las páginas de E01
# (shortcode `num`) y el patrón con el que se contrastan Python y JavaScript.
# No se edita a mano. Solo biblioteca estándar (LinearAlgebra y Random).

using LinearAlgebra
using Random
using Resistencia.Tensiones

# ---------- escritor JSON mínimo (la biblioteca estándar no incluye uno) ----------
struct Obj
    pares::Vector{Pair{String,Any}}
end
obj(pares::Pair...) = Obj(collect(Pair{String,Any}, pares))

num(x::Integer) = string(x)
function num(x::AbstractFloat)
    isfinite(x) || error("valor no finito en la referencia: $x")
    x == 0 && return "0.0"             # evita «-0.0»
    return repr(Float64(x))
end

function json(io::IO, x, nivel = 0)
    sangria = "  "^nivel
    if x isa Obj
        println(io, "{")
        for (i, (k, v)) in enumerate(x.pares)
            print(io, sangria, "  ", repr(k), ": ")
            json(io, v, nivel + 1)
            println(io, i < length(x.pares) ? "," : "")
        end
        print(io, sangria, "}")
    elseif x isa AbstractMatrix
        print(io, "[")
        for i in 1:size(x, 1)
            json(io, collect(x[i, :]), nivel + 1)
            i < size(x, 1) && print(io, ", ")
        end
        print(io, "]")
    elseif x isa AbstractVector && all(e -> e isa Union{Number,Bool}, x)
        print(io, "[", join((e isa Bool ? string(e) : num(e) for e in x), ", "), "]")
    elseif x isa AbstractVector
        println(io, "[")
        for (i, v) in enumerate(x)
            print(io, sangria, "  ")
            json(io, v, nivel + 1)
            println(io, i < length(x) ? "," : "")
        end
        print(io, sangria, "]")
    elseif x isa Bool
        print(io, x)
    elseif x isa Number
        print(io, num(x))
    elseif x isa AbstractString
        print(io, repr(String(x)))
    else
        error("tipo no admitido en JSON: $(typeof(x))")
    end
end

# ---------- datos ----------
const σA = [24.0 48.0 0.0; 48.0 -4.0 0.0; 0.0 0.0 20.0]   # MPa; tensor común de los ejemplos

function resumen(σ)
    p = principales(σ)
    I1, I2, I3 = invariantes(σ)
    σm, S, J2, J3 = esferico_desviador(σ)
    σo, τo = octaedricas(σ)
    return obj("sigma" => σ, "principales" => p.valores, "vectores" => p.vectores,
               "invariantes" => [I1, I2, I3], "sigma_m" => σm, "desviador" => S,
               "J2" => J2, "J3" => J3, "desviador_principales" => p.valores .- σm,
               "sigma_oct" => σo, "tau_oct" => τo,
               "tau_max" => tau_max(p.valores))
end

function plano(σ, n)
    r = componentes_plano(σ, n)
    λ = principales(σ).valores
    c = circulos_mohr(λ)
    d(c0) = (r.σn - c0)^2 + r.τ^2          # distancia² del punto (σn, τ) al centro de cada círculo
    return obj("n" => normalizar(n), "t" => r.t, "sigma_n" => r.σn, "tau" => r.τ,
               "tau_vec" => r.τvec, "admisible" => admisible(r.σn, r.τ, λ),
               "dist2" => [d(c.c13), d(c.c12), d(c.c23)],
               "radios2" => [c.r13^2, c.r12^2, c.r23^2])
end

function circulos(λ)
    c = circulos_mohr(λ)
    return obj("c13" => c.c13, "r13" => c.r13, "c12" => c.c12, "r12" => c.r12,
               "c23" => c.c23, "r23" => c.r23)
end

# Ejemplo 1: depósito cilíndrico de pared delgada (p = 2 MPa, r = 200 mm, t = 5 mm)
let p = 2.0, r = 200.0, t = 5.0
    global ej1 = begin
        σθ = p * r / t
        σx = p * r / (2t)
        σ = Matrix(Diagonal([σx, σθ, 0.0]))
        res = resumen(σ)
        obj("p" => p, "r" => r, "t" => t, "sigma_theta" => σθ, "sigma_x" => σx,
            "sigma" => σ, "principales" => principales(σ).valores,
            "tau_max" => tau_max(principales(σ).valores),
            "circulos" => circulos(principales(σ).valores),
            # con la tensión radial de la cara interior (σr = −p) en lugar de despreciarla
            "sigma_r_interior" => -p,
            "tau_max_con_radial" => tau_max([σθ, σx, -p]),
            "cociente_p_sigma_theta" => p / σθ)
    end
end

# Barra a tracción uniaxial cortada por un plano de normal a θ del eje
let σ0 = 100.0, θg = 30.0
    θ = deg2rad(θg)
    σ = Matrix(Diagonal([σ0, 0.0, 0.0]))
    r = componentes_plano(σ, [cos(θ), sin(θ), 0])
    r45 = componentes_plano(σ, [1, 1, 0])
    Q = matriz_rotacion_ejes([0, 0, 1], θ)
    global ej_barra = obj("sigma0" => σ0, "theta_grados" => θg,
        "sigma_n" => r.σn, "tau" => r.τ, "t_modulo" => norm(r.t),
        "sigma_n_45" => r45.σn, "tau_45" => r45.τ,
        "Q" => Q, "sigma_prima" => rotar(σ, Q))
end

# Barra colgada de peso propio (σzz = ρ g z): acero ≈ 77 kN/m³ = 7.7e-5 N/mm³
let ρg = 7.7e-5, L = 10_000.0
    global ej_peso = obj("rho_g" => ρg, "L" => L, "sigma_max" => ρg * L)
end

# Ejemplo 2: lectura física del tensor σA
ej2 = obj("sigma" => σA,
          "t_x" => traccion(σA, [1, 0, 0]), "t_y" => traccion(σA, [0, 1, 0]),
          "t_z" => traccion(σA, [0, 0, 1]),
          "tau_cara_x" => componentes_plano(σA, [1, 0, 0]).τ,
          "tau_cara_y" => componentes_plano(σA, [0, 1, 0]).τ,
          "tau_cara_z" => componentes_plano(σA, [0, 0, 1]).τ)

# Ejemplo 3: tensiones principales e invariantes
let pA = principales(σA)
    global ej3 = obj("sigma" => σA, "sigma1" => pA.valores[1], "sigma2" => pA.valores[2],
                     "sigma3" => pA.valores[3], "vectores" => pA.vectores,
                     "Q_principal" => pA.Q,
                     "invariantes" => collect(invariantes(σA)),
                     "I1" => invariantes(σA)[1], "I2" => invariantes(σA)[2], "I3" => invariantes(σA)[3],
                     "tau_max" => tau_max(pA.valores),
                     "cubica" => principales_cubica(σA))
end

# Ejemplo 4: cambio de base con Q racional (cos = 3/5, sin = 4/5, ejes girados alrededor de z)
let Q = [3/5 4/5 0; -4/5 3/5 0; 0 0 1], σp = rotar(σA, [3/5 4/5 0; -4/5 3/5 0; 0 0 1])
    global ej4 = obj("Q" => Q, "sigma_prima" => σp, "invariantes_prima" => collect(invariantes(σp)),
                     "Q_diagonaliza" => [4/5 3/5 0; -3/5 4/5 0; 0 0 1],
                     "sigma_diagonal" => rotar(σA, [4/5 3/5 0; -3/5 4/5 0; 0 0 1]))
end

# Ejemplo 5: plano oblicuo
ej5 = plano(σA, [1, 2, 2])

esfdes = resumen(σA)
mohr = obj("circulos" => circulos(principales(σA).valores),
           "oct_en_region" => let (so, to) = octaedricas(σA); admisible(so, to, principales(σA).valores) end,
           "tau_max" => tau_max(principales(σA).valores))

# Casos predefinidos del simulador
casos = Any[]
function añadir!(nombre, σ)
    push!(casos, obj("nombre" => nombre, "resumen" => resumen(σ)))
end
añadir!("uniaxial", Matrix(Diagonal([100.0, 0.0, 0.0])))
añadir!("biaxial", Matrix(Diagonal([80.0, 40.0, 0.0])))
añadir!("hidrostatico", Matrix(-50.0 * I(3)))
añadir!("cortante_puro", [0.0 30.0 0.0; 30.0 0.0 0.0; 0.0 0.0 0.0])
añadir!("cilindrico", Matrix(Diagonal([50.0, 10.0, 10.0])))
añadir!("generico", [30.0 10.0 -20.0; 10.0 -15.0 25.0; -20.0 25.0 40.0])
añadir!("ejemplos_sigmaA", σA)

# Tensores aleatorios con semilla fija, para contrastar Python y JavaScript
rng = MersenneTwister(20261026)
aleatorios = Any[]
for _ in 1:30
    A = round.(200 .* (rand(rng, 3, 3) .- 0.5); digits = 3)
    σ = (A + A') / 2
    n = round.(randn(rng, 3); digits = 3)
    eje = round.(randn(rng, 3); digits = 3)
    θ = round(6 * rand(rng); digits = 3)
    Q = matriz_rotacion_ejes(eje, θ)
    push!(aleatorios, obj("resumen" => resumen(σ), "plano" => plano(σ, n),
                          "eje" => eje, "angulo" => θ, "Q" => Q, "sigma_prima" => rotar(σ, Q)))
end

doc = obj(
    "version" => 1,
    "generado_por" => "scripts/generar_referencia_e01.jl (Resistencia.jl, Julia " * string(VERSION) * ")",
    "convenciones" => obj(
        "signo" => "traccion positiva",
        "indices" => "sigma[i,j]: i = normal del plano, j = direccion de la componente",
        "orden" => "sigma1 >= sigma2 >= sigma3",
        "unidades" => "MPa y mm",
        "Q" => "filas = vectores de la nueva base; sigma' = Q sigma Q^T",
        "vectores_principales" => "v1 y v2 con primera componente no nula positiva; v3 = v1 x v2",
    ),
    "sigmaA" => σA,
    "ej_barra" => ej_barra, "ej_peso" => ej_peso,
    "ej1" => ej1, "ej2" => ej2, "ej3" => ej3, "ej4" => ej4, "ej5" => ej5,
    "esfdes" => esfdes, "mohr" => mohr,
    "casos" => casos, "aleatorios" => aleatorios,
)

destino = joinpath(@__DIR__, "..", "pruebas", "referencia", "e01.json")
open(destino, "w") do io
    json(io, doc)
    println(io)
end
println("escrito ", normpath(destino))
