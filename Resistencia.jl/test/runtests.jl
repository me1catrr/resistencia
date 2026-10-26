using Test
using LinearAlgebra
using Random
using Resistencia.Tensiones

# Tensor común de los ejemplos de E01 (MPa). Se construyó para que las tensiones
# principales sean exactas: σ₁ = 60 en (4,3,0)/5, σ₂ = 20 en z, σ₃ = −40 en (3,−4,0)/5
# (el signo de cada dirección es convención: aquí v₃ = v₁ × v₂).
const σA = [24.0 48.0 0.0; 48.0 -4.0 0.0; 0.0 0.0 20.0]

@testset "Tensiones" begin

    @testset "simetría y normales" begin
        @test es_simetrica(σA)
        @test !es_simetrica([1.0 2.0 0.0; 0.0 1.0 0.0; 0.0 0.0 1.0])
        @test !es_simetrica(ones(2, 2))
        @test normalizar([3, 4, 0]) ≈ [0.6, 0.8, 0.0]
        @test_throws ArgumentError normalizar([0, 0, 0])
        @test_throws ArgumentError normalizar([1, 2])
        @test_throws ArgumentError traccion([1.0 2.0 0.0; 0.0 1.0 0.0; 0.0 0.0 1.0], [1, 0, 0])
    end

    @testset "uniaxial: solución exacta sobre un plano a 45°" begin
        σ = Matrix(Diagonal([100.0, 0.0, 0.0]))
        r = componentes_plano(σ, [1, 1, 0])
        @test r.σn ≈ 50.0
        @test r.τ ≈ 50.0
        @test r.t ≈ [100 / √2, 0.0, 0.0]
        @test traccion(σ, [2, 0, 0]) ≈ [100.0, 0.0, 0.0]   # la normal se normaliza
    end

    @testset "hidrostático: τ = 0 en cualquier plano" begin
        σ = Matrix(-30.0 * I(3))
        for n in ([1, 0, 0], [1, 2, 3], [-1, 1, 5])
            r = componentes_plano(σ, n)
            @test r.σn ≈ -30.0
            @test r.τ < 1e-12
        end
        λ = principales(σ).valores
        @test all(λ .≈ -30.0)
        @test principales_cubica(σ) ≈ [-30.0, -30.0, -30.0]
        σm, S, J2, J3 = esferico_desviador(σ)
        @test σm ≈ -30.0
        @test norm(S) < 1e-12 && abs(J2) < 1e-12
    end

    @testset "cortante puro: σ = (τ, 0, −τ)" begin
        τ0 = 25.0
        σ = [0.0 τ0 0.0; τ0 0.0 0.0; 0.0 0.0 0.0]
        @test principales(σ).valores ≈ [τ0, 0.0, -τ0] atol = 1e-12
        @test invariantes(σ)[1] ≈ 0.0 atol = 1e-12
        σm, _, J2, _ = esferico_desviador(σ)
        @test σm ≈ 0.0 atol = 1e-12
        @test J2 ≈ τ0^2                      # J2 = τ² en cortante puro
        @test tau_max(principales(σ).valores) ≈ τ0
    end

    @testset "tensor común σA: tensiones principales, direcciones e invariantes" begin
        p = principales(σA)
        @test p.valores ≈ [60.0, 20.0, -40.0]
        @test p.vectores[:, 1] ≈ [0.8, 0.6, 0.0]
        @test p.vectores[:, 2] ≈ [0.0, 0.0, 1.0]
        @test p.vectores[:, 3] ≈ [0.6, -0.8, 0.0]
        @test det(p.vectores) ≈ 1.0                      # base dextrógira
        @test p.Q * σA * p.Q' ≈ Diagonal(p.valores) atol = 1e-12
        @test es_ortogonal(p.Q; propia = true)
        I1, I2, I3 = invariantes(σA)
        @test I1 ≈ 40.0
        @test I2 ≈ -2000.0
        @test I3 ≈ -48000.0
        # invariantes a partir de las principales
        s = p.valores
        @test I1 ≈ sum(s)
        @test I2 ≈ s[1] * s[2] + s[2] * s[3] + s[3] * s[1]
        @test I3 ≈ prod(s)
        @test principales_cubica(σA) ≈ [60.0, 20.0, -40.0]
    end

    @testset "plano oblicuo de normal (1,2,2)/3 en σA" begin
        r = componentes_plano(σA, [1, 2, 2])
        @test r.t ≈ [40.0, 40 / 3, 40 / 3]
        @test r.σn ≈ 280 / 9
        @test r.τ ≈ 200 * √2 / 9
        @test r.σn^2 + r.τ^2 ≈ sum(abs2, r.t)         # |t|² = σn² + τ²
        @test abs(dot(r.τvec, normalizar([1, 2, 2]))) < 1e-12   # τ es tangente al plano
        λ = principales(σA).valores
        @test admisible(r.σn, r.τ, λ)
        # mismo resultado desde las tensiones principales y los cosenos en ejes principales
        V = principales(σA).vectores
        cos_p = V' * normalizar([1, 2, 2])
        σn2, τ2 = componentes_desde_principales(λ, cos_p)
        @test σn2 ≈ r.σn
        @test τ2 ≈ r.τ
    end

    @testset "cambio de base" begin
        θ = 0.7
        Q = matriz_rotacion_ejes([0, 0, 1], θ)
        c, s = cos(θ), sin(θ)
        @test Q ≈ [c s 0; -s c 0; 0 0 1]
        @test es_ortogonal(Q; propia = true)
        # uniaxial: los ejes girados ven σ'₁₁ = σ cos²θ y σ'₁₂ = −σ sinθ cosθ
        σ0 = 80.0
        σr = rotar(Matrix(Diagonal([σ0, 0.0, 0.0])), Q)
        @test σr[1, 1] ≈ σ0 * c^2
        @test σr[1, 2] ≈ -σ0 * s * c
        @test σr[2, 2] ≈ σ0 * s^2
        # cos = 3/5, sin = 4/5 (racional) sobre σA, con valores exactos
        Qr = [3/5 4/5 0; -4/5 3/5 0; 0 0 1]
        σp = rotar(σA, Qr)
        @test σp[1, 1] ≈ 1304 / 25
        @test σp[2, 2] ≈ -804 / 25
        @test σp[1, 2] ≈ -672 / 25
        @test σp[3, 3] ≈ 20.0
        @test all(invariantes(σp) .≈ invariantes(σA))
        # rotación con Q principal: queda diagonal; con cos=4/5, sin=3/5 (tg θ = 3/4)
        @test rotar(σA, [4/5 3/5 0; -3/5 4/5 0; 0 0 1]) ≈ Diagonal([60.0, -40.0, 20.0]) atol = 1e-12
        @test_throws ArgumentError rotar(σA, 2 * Matrix(I(3)))
        # rotar ejes y rotar el elemento son operaciones inversas
        @test rotar(rotar(σA, Q), Q') ≈ σA
    end

    @testset "esférico, desviador y octaédricas" begin
        σm, S, J2, J3 = esferico_desviador(σA)
        @test σm ≈ 40 / 3
        @test tr(S) ≈ 0.0 atol = 1e-12
        @test S + σm * I ≈ σA
        I1, I2, _ = invariantes(σA)
        @test J2 ≈ (I1^2 - 3 * I2) / 3                # J2 = (I1² − 3 I2)/3
        @test J2 ≈ 7600 / 3
        σo, τo = octaedricas(σA)
        @test σo ≈ 40 / 3
        @test τo ≈ √15200 / 3
        s = principales(σA).valores
        @test τo ≈ sqrt((s[1] - s[2])^2 + (s[2] - s[3])^2 + (s[3] - s[1])^2) / 3
    end

    @testset "círculos de Mohr y región admisible" begin
        λ = [60.0, 20.0, -40.0]
        c = circulos_mohr(λ)
        @test (c.c13, c.r13) == (10.0, 50.0)
        @test (c.c12, c.r12) == (40.0, 20.0)
        @test (c.c23, c.r23) == (-10.0, 30.0)
        @test tau_max(λ) == 50.0
        @test admisible(10.0, 50.0, λ)                # cima del círculo grande
        @test admisible(60.0, 0.0, λ) && admisible(-40.0, 0.0, λ) && admisible(20.0, 0.0, λ)
        @test !admisible(100.0, 0.0, λ)               # fuera del círculo grande
        @test !admisible(40.0, 5.0, λ)                # dentro del círculo 12: imposible
        @test !admisible(-10.0, 5.0, λ)               # dentro del círculo 23: imposible
        @test !admisible(10.0, 60.0, λ)               # τ mayor que τmax
        @test_throws ArgumentError circulos_mohr([20.0, 60.0, -40.0])   # sin ordenar
    end

    @testset "valores propios dobles (estado cilíndrico)" begin
        σ = Matrix(Diagonal([50.0, 10.0, 10.0]))
        @test principales(σ).valores ≈ [50.0, 10.0, 10.0]
        @test principales_cubica(σ) ≈ [50.0, 10.0, 10.0] atol = 1e-6   # raíz doble: mal condicionada
        @test circulos_mohr([50.0, 10.0, 10.0]).r23 == 0.0
        # cualquier dirección perpendicular a x es principal: τ = 0 sobre ese plano
        r = componentes_plano(σ, [0, 1, 1])
        @test r.τ < 1e-12
    end

    @testset "tensores aleatorios: eigen frente a la solución de la cúbica" begin
        rng = MersenneTwister(1)
        for _ in 1:200
            A = 200 .* (rand(rng, 3, 3) .- 0.5)
            σ = (A + A') / 2
            p = principales(σ)
            @test p.valores ≈ principales_cubica(σ) atol = 1e-8
            @test issorted(p.valores; rev = true)
            @test det(p.vectores) ≈ 1.0 atol = 1e-9          # base dextrógira
            @test p.Q * σ * p.Q' ≈ Diagonal(p.valores) atol = 1e-8
            I1, I2, I3 = invariantes(σ)
            @test I1 ≈ sum(p.valores) atol = 1e-8
            @test I3 ≈ prod(p.valores) rtol = 1e-8 atol = 1e-6
            # invariancia frente a una rotación cualquiera
            Q = matriz_rotacion_ejes(rand(rng, 3) .+ 0.1, 6 * rand(rng))
            @test all(isapprox.(invariantes(rotar(σ, Q)), (I1, I2, I3); rtol = 1e-8, atol = 1e-6))
            # coherencia de Mohr: cualquier plano da un punto admisible
            n = randn(rng, 3)
            r = componentes_plano(σ, n)
            @test admisible(r.σn, r.τ, p.valores; tol = 1e-6)
            # |t|² = σn² + τ²
            @test sum(abs2, r.t) ≈ r.σn^2 + r.τ^2 rtol = 1e-9
        end
    end
end
