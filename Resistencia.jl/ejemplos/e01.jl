# Ejemplo de E01 en Julia: el tensor común σ_A de los ejemplos del tema.
#
# Uso (desde la raíz del repositorio):
#   julia --project=Resistencia.jl Resistencia.jl/ejemplos/e01.jl
using Resistencia.Tensiones

σ = [24.0 48.0 0.0;
     48.0 -4.0 0.0;
     0.0 0.0 20.0]                    # MPa

println("¿Simétrico? ", es_simetrica(σ))

# Tensiones y direcciones principales (σ₁ ≥ σ₂ ≥ σ₃)
p = principales(σ)
println("Tensiones principales (MPa): ", p.valores)
println("Direcciones principales (columnas):"); display(p.vectores); println()

# Invariantes: se pueden comprobar con las principales
I1, I2, I3 = invariantes(σ)
println("I1 = $I1   I2 = $I2   I3 = $I3")
s = p.valores
println("Con las principales: ", sum(s), "  ", s[1]*s[2] + s[2]*s[3] + s[3]*s[1], "  ", prod(s))

# Plano oblicuo de normal (1,2,2)/3
r = componentes_plano(σ, [1, 2, 2])
println("t (MPa) = ", r.t, "   σn = ", round(r.σn; digits = 4), "   τ = ", round(r.τ; digits = 4))
println("¿(σn, τ) es posible según Mohr? ", admisible(r.σn, r.τ, s))

# Cambio de ejes con cos = 3/5, sin = 4/5 alrededor de z
Q = [3/5 4/5 0; -4/5 3/5 0; 0 0 1]
σp = rotar(σ, Q)
println("σ' ="); display(σp); println()
println("Invariantes tras girar: ", invariantes(σp))

# Esférico y desviador, octaédricas, τmax
σm, S, J2, _ = esferico_desviador(σ)
println("σm = ", round(σm; digits = 4), "   J2 = ", round(J2; digits = 4), "   τmax = ", tau_max(s))
println("σoct, τoct = ", octaedricas(σ))
