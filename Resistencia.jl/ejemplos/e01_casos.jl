# Estados particulares de E01 en Julia: reconocerlos y calcular sus magnitudes.
#
# Uso (desde la raíz del repositorio):
#   julia --project=Resistencia.jl Resistencia.jl/ejemplos/e01_casos.jl
using LinearAlgebra
using Resistencia.Tensiones

# region casos
casos = [
    ("Uniaxial",      Matrix(Diagonal([100.0, 0.0, 0.0]))),
    ("Biaxial",       Matrix(Diagonal([80.0, 40.0, 0.0]))),
    ("Cortante puro", [0.0 30.0 0.0; 30.0 0.0 0.0; 0.0 0.0 0.0]),
    ("Cilíndrico",    Matrix(Diagonal([50.0, 10.0, 10.0]))),
    ("Hidrostático",  Matrix(-50.0 * I(3))),
    ("Genérico",      [24.0 48.0 0.0; 48.0 -4.0 0.0; 0.0 0.0 20.0]),
]

for (nombre, σ) in casos
    λ = principales(σ).valores                 # σ₁ ≥ σ₂ ≥ σ₃
    σm, _, J2, _ = esferico_desviador(σ)
    println(rpad(nombre, 14), " → ", rpad(clasificar_estado(σ), 14),
            "principales = ", round.(λ; digits = 1),
            "  τmáx = ", round(tau_max(λ); digits = 1),
            "  σm = ", round(σm; digits = 1),
            "  J₂ = ", round(J2; digits = 1))
end
# endregion casos

# El estado reconocido no depende de los ejes: se gira el cortante puro un ángulo cualquiera
Q = matriz_rotacion_ejes([1, 2, 3], 0.9)
println("Cortante puro con los ejes girados → ", clasificar_estado(rotar(casos[3][2], Q)))
