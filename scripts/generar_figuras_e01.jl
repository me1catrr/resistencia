# Genera los datos numéricos de las figuras de E01 que dibuja TikZ/pgfplots.
#
#   julia --project=Resistencia.jl scripts/generar_figuras_e01.jl
#
# Cada archivo de recursos/tikz/datos/*.dat sale de la implementación de referencia
# (Resistencia.Tensiones), no de fórmulas copiadas en el dibujo. scripts/compilar_tikz.py
# incluye estos archivos en el sello SHA-256 de cada figura. Solo biblioteca estándar.

using LinearAlgebra
using Random
using Resistencia.Tensiones

const σA = [24.0 48.0 0.0; 48.0 -4.0 0.0; 0.0 0.0 20.0]
const DESTINO = joinpath(@__DIR__, "..", "recursos", "tikz", "datos")
mkpath(DESTINO)

fmt(x) = x == 0 ? "0" : string(round(Float64(x); sigdigits = 7))

function escribir(nombre, cabecera::Vector{String}, filas)
    open(joinpath(DESTINO, nombre), "w") do io
        println(io, join(cabecera, " "))
        for f in filas
            if f === :salto
                println(io)
            else
                println(io, join(fmt.(f), " "))
            end
        end
    end
    println("escrito ", nombre)
end

# 1. Barra uniaxial: σn(θ) y τ(θ) del plano cuya normal forma θ con el eje
let σ0 = 100.0, σ = Matrix(Diagonal([100.0, 0.0, 0.0]))
    filas = Any[]
    for θg in 0:1:90
        θ = deg2rad(θg)
        r = componentes_plano(σ, [cos(θ), sin(θ), 0])
        push!(filas, [θg, r.σn, r.τ])
    end
    escribir("barra.dat", ["theta", "sn", "tau"], filas)
    puntos = Any[]
    for θg in (30, 45)
        θ = deg2rad(θg)
        r = componentes_plano(σ, [cos(θ), sin(θ), 0])
        push!(puntos, [θg, r.σn, r.τ])
    end
    escribir("barra_puntos.dat", ["theta", "sn", "tau"], puntos)
end

# 2. Nube de planos en el diagrama de Mohr de σA: normales uniformes en la esfera
let rng = MersenneTwister(20261026), filas = Any[]
    λ = principales(σA).valores
    for _ in 1:2500
        n = normalizar(randn(rng, 3))
        r = componentes_plano(σA, n)
        push!(filas, [r.σn, r.τ])
    end
    escribir("nube.dat", ["sn", "tau"], filas)
end

# 3. σn y τ de σA en los planos que contienen al eje z (normal en el plano xy a φ del eje x)
let filas = Any[]
    for φg in 0:1:180
        φ = deg2rad(φg)
        r = componentes_plano(σA, [cos(φ), sin(φ), 0])
        push!(filas, [φg, r.σn, r.τ])
    end
    escribir("plano_xy.dat", ["phi", "sn", "tau"], filas)
    p = principales(σA)
    ang1 = rad2deg(atan(p.vectores[2, 1], p.vectores[1, 1]))   # dirección de σ1 respecto de x
    escribir("plano_xy_extremos.dat", ["phi", "sn", "tau"],
             [[ang1, componentes_plano(σA, p.vectores[:, 1]).σn, 0.0],
              [ang1 + 90, componentes_plano(σA, p.vectores[:, 3]).σn, 0.0],
              [ang1 + 45, componentes_plano(σA, [cos(deg2rad(ang1 + 45)), sin(deg2rad(ang1 + 45)), 0]).σn,
                          componentes_plano(σA, [cos(deg2rad(ang1 + 45)), sin(deg2rad(ang1 + 45)), 0]).τ]])
end

# 4. Componentes de σ' al girar los ejes alrededor de z, e invariante I1
let filas = Any[]
    for θg in 0:1:180
        Q = matriz_rotacion_ejes([0, 0, 1], deg2rad(θg))
        s = rotar(σA, Q)
        push!(filas, [θg, s[1, 1], s[2, 2], s[1, 2], s[1, 1] + s[2, 2] + s[3, 3]])
    end
    escribir("rotacion.dat", ["theta", "sxx", "syy", "sxy", "I1"], filas)
end

# 5. Mapa de σn sobre la esfera de normales de σA (acimut φ 0–355°, polar ϑ 0–180°, paso 5°)
let filas = Any[]
    for ϑg in 0:5:180
        for φg in 0:5:355
            ϑ, φ = deg2rad(ϑg), deg2rad(φg)
            n = [sin(ϑ) * cos(φ), sin(ϑ) * sin(φ), cos(ϑ)]
            push!(filas, [φg, ϑg, componentes_plano(σA, n).σn])
        end
        push!(filas, :salto)
    end
    escribir("esfera.dat", ["phi", "theta", "sn"], filas)
end

# 5b. Direcciones principales (± v_i) sobre el mapa: acimut y ángulo polar
let p = principales(σA), filas = Any[]
    for i in 1:3, signo in (1, -1)
        v = signo * p.vectores[:, i]
        push!(filas, [mod(rad2deg(atan(v[2], v[1])), 360), rad2deg(acos(clamp(v[3], -1, 1))), i])
    end
    escribir("esfera_principales.dat", ["phi", "theta", "i"], filas)
end

# 6. Elipsoide de Lamé de σA en sus ejes principales: t = (σ1 n1, σ2 n2, σ3 n3)
let λ = principales(σA).valores, filas = Any[]
    for ϑg in 30:30:150          # paralelos
        for φg in 0:10:360
            ϑ, φ = deg2rad(ϑg), deg2rad(φg)
            n = [sin(ϑ) * cos(φ), sin(ϑ) * sin(φ), cos(ϑ)]
            push!(filas, [λ[1] * n[1], λ[2] * n[2], λ[3] * n[3]])
        end
        push!(filas, :salto)
    end
    escribir("lame_paralelos.dat", ["t1", "t2", "t3"], filas)
    filas = Any[]
    for φg in 0:45:315           # meridianos
        for ϑg in 0:10:180
            ϑ, φ = deg2rad(ϑg), deg2rad(φg)
            n = [sin(ϑ) * cos(φ), sin(ϑ) * sin(φ), cos(ϑ)]
            push!(filas, [λ[1] * n[1], λ[2] * n[2], λ[3] * n[3]])
        end
        push!(filas, :salto)
    end
    escribir("lame_meridianos.dat", ["t1", "t2", "t3"], filas)
end

# 7. Estados particulares: tensiones principales y τmax de los casos del simulador
let filas = Any[]
    casos = [("uniaxial", Matrix(Diagonal([100.0, 0, 0]))), ("biaxial", Matrix(Diagonal([80.0, 40, 0]))),
             ("cortante", [0.0 30 0; 30 0 0; 0 0 0]), ("cilindrico", Matrix(Diagonal([50.0, 10, 10]))),
             ("hidrostatico", Matrix(-50.0 * I(3)))]
    open(joinpath(DESTINO, "casos.dat"), "w") do io
        println(io, "i s1 s2 s3 taumax nombre")
        for (i, (nombre, σ)) in enumerate(casos)
            λ = principales(σ).valores
            println(io, join(fmt.([i - 1, λ[1], λ[2], λ[3], tau_max(λ)]), " "), " ", nombre)
        end
    end
    println("escrito casos.dat")
end
