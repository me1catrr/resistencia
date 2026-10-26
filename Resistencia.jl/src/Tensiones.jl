"""
    Tensiones

Estado de tensiones en el espacio (tema E01).

# Convenciones (las mismas en las tres implementaciones; véase CLAUDE.md)
- Tracción positiva. Tensiones en MPa, longitudes en mm.
- `σ[i,j]`: el primer índice es la normal del plano y el segundo la dirección de
  la componente. Con `σ` simétrica, el vector tensión sobre el plano de normal `n`
  es `t = σ n`.
- Tensiones principales ordenadas `σ₁ ≥ σ₂ ≥ σ₃`.
- Cambio de base: `Q` tiene **por filas** los vectores de la nueva base escritos en
  la antigua; `σ' = Q σ Qᵀ`. «Rotar los ejes» un ángulo θ alrededor de un eje es
  `Q = R(θ)ᵀ`, con `R` la rotación activa: no es lo mismo que rotar el elemento.
"""
module Tensiones

using LinearAlgebra

export es_simetrica, normalizar, traccion, componentes_plano, matriz_rotacion_ejes,
       es_ortogonal, rotar, principales, principales_cubica, invariantes,
       esferico_desviador, octaedricas, circulos_mohr, tau_max, admisible,
       tension_desde_principales, componentes_desde_principales, clasificar_estado

# region simetria
"""
    es_simetrica(σ; rtol = 1e-12) -> Bool

Comprueba que `σ` es 3×3 y simétrica (hipótesis clásica: sin pares distribuidos).
"""
function es_simetrica(σ::AbstractMatrix; rtol = 1e-12)
    size(σ) == (3, 3) || return false
    escala = max(1.0, maximum(abs, σ))
    return maximum(abs, σ - σ') <= rtol * escala
end
# endregion simetria

"""Devuelve `n` normalizado. Falla si `n` es el vector nulo."""
function normalizar(n::AbstractVector)
    length(n) == 3 || throw(ArgumentError("la normal debe tener 3 componentes"))
    m = norm(n)
    m > 0 || throw(ArgumentError("la normal no puede ser el vector nulo"))
    return collect(float.(n)) ./ m
end

# region traccion
"""
    traccion(σ, n) -> t

Vector tensión sobre el plano de normal `n` (fórmula de Cauchy, `t = σ n`).
"""
function traccion(σ::AbstractMatrix, n::AbstractVector)
    es_simetrica(σ) || throw(ArgumentError("σ debe ser simétrica"))
    return σ * normalizar(n)
end

"""
    componentes_plano(σ, n) -> (t, σn, τ, τvec)

Descompone `t` en la parte normal `σn = t·n` (con signo: positiva si es de tracción)
y la tangencial `τvec = t − σn n`, con módulo `τ ≥ 0`.
"""
function componentes_plano(σ::AbstractMatrix, n::AbstractVector)
    n̂ = normalizar(n)
    t = traccion(σ, n̂)
    σn = dot(t, n̂)
    τvec = t - σn * n̂
    return (t = t, σn = σn, τ = norm(τvec), τvec = τvec)
end
# endregion traccion

# region cambio_base
"""
    matriz_rotacion_ejes(eje, θ) -> Q

`Q` para **rotar los ejes** un ángulo `θ` (rad) alrededor de `eje` (regla de la
mano derecha). Las filas de `Q` son los nuevos ejes. Para `eje = z`:
`Q = [c s 0; -s c 0; 0 0 1]`.
"""
function matriz_rotacion_ejes(eje::AbstractVector, θ::Real)
    k = normalizar(eje)
    K = [0 -k[3] k[2]; k[3] 0 -k[1]; -k[2] k[1] 0]
    R = cos(θ) * I + sin(θ) * K + (1 - cos(θ)) * (k * k')   # rotación activa (Rodrigues)
    return Matrix(R')                                        # Q = Rᵀ
end

"""¿`Q` es ortogonal (QQᵀ = I)? Con `propia = true`, exige además det Q = +1."""
function es_ortogonal(Q::AbstractMatrix; rtol = 1e-12, propia = false)
    size(Q) == (3, 3) || return false
    ok = maximum(abs, Q * Q' - I) <= rtol
    return propia ? (ok && det(Q) > 0) : ok
end

"""
    rotar(σ, Q) -> σ'

Componentes de `σ` en la base cuyas filas (en la base antigua) son las de `Q`:
`σ' = Q σ Qᵀ`.
"""
function rotar(σ::AbstractMatrix, Q::AbstractMatrix)
    es_ortogonal(Q) || throw(ArgumentError("Q no es ortogonal"))
    return Q * σ * Q'
end
# endregion cambio_base

# region principales
"""
    principales(σ) -> (valores, vectores, Q)

Tensiones principales ordenadas `σ₁ ≥ σ₂ ≥ σ₃` y sus direcciones (columnas de
`vectores`, unitarias). Convención de signo, común a las tres implementaciones:
`v₁` y `v₂` con su primera componente no nula positiva, y `v₃ = v₁ × v₂`, de modo
que la base principal es siempre dextrógira (det = +1). `Q = vectoresᵀ` pasa a la
base principal: `Q σ Qᵀ = diag(valores)`. Si hay valores repetidos, las direcciones
de ese subespacio no son únicas (se devuelve una base ortonormal cualquiera).
"""
function principales(σ::AbstractMatrix)
    es_simetrica(σ) || throw(ArgumentError("σ debe ser simétrica"))
    F = eigen(Symmetric(Matrix{Float64}(σ)))
    orden = sortperm(F.values; rev = true)
    λ = F.values[orden]
    V = F.vectors[:, orden]
    for j in 1:2
        i = findfirst(x -> abs(x) > 1e-12, V[:, j])
        if i !== nothing && V[i, j] < 0
            V[:, j] .*= -1
        end
    end
    V[:, 3] = cross(V[:, 1], V[:, 2])
    return (valores = λ, vectores = V, Q = Matrix(V'))
end

"""
    principales_cubica(σ) -> [σ₁, σ₂, σ₃]

Tensiones principales por la solución trigonométrica de la ecuación característica,
independiente de `eigen`. Sirve para contrastar `principales`. Limitación: cerca de
raíces dobles está mal condicionada (error relativo ~√ε ≈ 1e-8); el método de uso es
`principales`.
"""
function principales_cubica(σ::AbstractMatrix)
    I1, _, _ = invariantes(σ)
    σm = I1 / 3
    _, _, J2, J3 = esferico_desviador(σ)
    if J2 <= 1e-14 * max(1.0, abs(σm)^2)
        return fill(σm, 3)
    end
    arg = clamp((3 * sqrt(3) / 2) * J3 / J2^(3 / 2), -1.0, 1.0)
    θ = acos(arg) / 3
    r = 2 * sqrt(J2 / 3)
    return [σm + r * cos(θ - 2π * k / 3) for k in 0:2]
end
# endregion principales

# region invariantes
"""
    invariantes(σ) -> (I1, I2, I3)

`I1 = tr σ`, `I2 = ½[(tr σ)² − tr(σ²)]`, `I3 = det σ`. Son los coeficientes de la
ecuación característica `λ³ − I1 λ² + I2 λ − I3 = 0`.
"""
function invariantes(σ::AbstractMatrix)
    I1 = tr(σ)
    I2 = (tr(σ)^2 - tr(σ * σ)) / 2
    I3 = det(σ)
    return (I1, I2, I3)
end
# endregion invariantes

# region esferico_desviador
"""
    esferico_desviador(σ) -> (σm, S, J2, J3)

Tensión media `σm = tr σ / 3`, desviador `S = σ − σm I`, y sus invariantes
`J2 = ½ S:S` y `J3 = det S`.
"""
function esferico_desviador(σ::AbstractMatrix)
    σm = tr(σ) / 3
    S = Matrix{Float64}(σ) - σm * I
    J2 = sum(abs2, S) / 2
    J3 = det(S)
    return (σm, S, J2, J3)
end

"""
    octaedricas(σ) -> (σoct, τoct)

Tensiones sobre los planos octaédricos (normales `(±1,±1,±1)/√3` en ejes
principales): `σoct = I1/3`, `τoct = √(2 J2 / 3)`.
"""
function octaedricas(σ::AbstractMatrix)
    σm, _, J2, _ = esferico_desviador(σ)
    return (σm, sqrt(2 * J2 / 3))
end
# endregion esferico_desviador

# region mohr
"""
    circulos_mohr(λ) -> (c13, r13, c12, r12, c23, r23)

Centros y radios de los tres círculos de Mohr a partir de `σ₁ ≥ σ₂ ≥ σ₃`. El
círculo grande es el `13`.
"""
function circulos_mohr(λ::AbstractVector)
    s1, s2, s3 = λ
    s1 >= s2 >= s3 || throw(ArgumentError("las tensiones principales deben venir ordenadas σ₁ ≥ σ₂ ≥ σ₃"))
    return (c13 = (s1 + s3) / 2, r13 = (s1 - s3) / 2,
            c12 = (s1 + s2) / 2, r12 = (s1 - s2) / 2,
            c23 = (s2 + s3) / 2, r23 = (s2 - s3) / 2)
end

"""Tensión tangencial máxima absoluta, `(σ₁ − σ₃)/2`."""
tau_max(λ::AbstractVector) = (λ[1] - λ[3]) / 2

"""
    admisible(σn, τ, λ; tol = 1e-9) -> Bool

¿Es posible que un plano tenga tensión normal `σn` y tangencial `τ`? Solo si el
punto `(σn, |τ|)` está dentro del círculo grande y fuera de los dos pequeños.
"""
function admisible(σn::Real, τ::Real, λ::AbstractVector; tol = 1e-9)
    c = circulos_mohr(λ)
    d13 = (σn - c.c13)^2 + τ^2
    d12 = (σn - c.c12)^2 + τ^2
    d23 = (σn - c.c23)^2 + τ^2
    return d13 <= c.r13^2 + tol && d12 >= c.r12^2 - tol && d23 >= c.r23^2 - tol
end
# endregion mohr

# region clasificar
"""
    clasificar_estado(σ; rtol = 1e-9) -> Symbol

Reconoce el estado particular a partir de las tensiones principales:
`:esferico` (las tres iguales), `:uniaxial` (dos nulas), `:cortante_puro` (σ₂ = 0 y σ₁ = −σ₃),
`:biaxial` (una nula), `:cilindrico` (dos iguales y no nulas) o `:triaxial` (el resto).
La tolerancia es relativa a la mayor tensión principal en valor absoluto (o a 1 si es menor).
"""
function clasificar_estado(σ::AbstractMatrix; rtol = 1e-9)
    λ = principales(σ).valores
    escala = max(maximum(abs, λ), 1.0)
    nulo(x) = abs(x) <= rtol * escala
    igual(a, b) = abs(a - b) <= rtol * escala
    igual(λ[1], λ[2]) && igual(λ[2], λ[3]) && return :esferico
    ceros = count(nulo, λ)
    ceros == 2 && return :uniaxial
    if ceros == 1
        return (nulo(λ[2]) && igual(λ[1], -λ[3])) ? :cortante_puro : :biaxial
    end
    return (igual(λ[1], λ[2]) || igual(λ[2], λ[3])) ? :cilindrico : :triaxial
end
# endregion clasificar

# region desde_principales
"""
    componentes_desde_principales(λ, cosenos) -> (σn, τ)

Con los ejes principales como referencia y `cosenos = (l, m, n)` los cosenos
directores de la normal: `σn = Σ λᵢ nᵢ²`, `τ² = Σ λᵢ² nᵢ² − σn²`.
"""
function componentes_desde_principales(λ::AbstractVector, cosenos::AbstractVector)
    n = normalizar(cosenos)
    σn = sum(λ .* n .^ 2)
    τ2 = sum(λ .^ 2 .* n .^ 2) - σn^2
    return (σn, sqrt(max(τ2, 0.0)))
end

"""Tensor en ejes de partida a partir de valores principales y sus direcciones (columnas)."""
tension_desde_principales(λ::AbstractVector, V::AbstractMatrix) = Matrix(V * Diagonal(λ) * V')
# endregion desde_principales

end # module
