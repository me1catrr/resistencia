"""Ejemplo de E01 en Python: el tensor común σ_A de los ejemplos del tema.

Uso (desde la raíz del repositorio):  python3 python/ejemplos/e01_ejemplo.py
Requiere numpy.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from resistencia import tensiones as T  # noqa: E402

np.set_printoptions(precision=4, suppress=True)

sigma = np.array([[24.0, 48.0, 0.0],
                  [48.0, -4.0, 0.0],
                  [0.0, 0.0, 20.0]])     # MPa

print("¿Simétrico?", T.es_simetrica(sigma))

# Tensiones y direcciones principales (σ1 ≥ σ2 ≥ σ3)
p = T.principales(sigma)
print("Tensiones principales (MPa):", p["valores"])
print("Direcciones principales (columnas):\n", p["vectores"])

# Invariantes: se pueden comprobar con las principales
I1, I2, I3 = T.invariantes(sigma)
print(f"I1 = {I1:.1f}   I2 = {I2:.1f}   I3 = {I3:.1f}")
s = p["valores"]
print("Con las principales:", s.sum(), s[0]*s[1] + s[1]*s[2] + s[2]*s[0], np.prod(s))

# Plano oblicuo de normal (1,2,2)/3
r = T.componentes_plano(sigma, [1, 2, 2])
print("t (MPa) =", r["t"], "  σn =", round(r["sigma_n"], 4), "  τ =", round(r["tau"], 4))
print("¿(σn, τ) es posible según Mohr?", T.admisible(r["sigma_n"], r["tau"], s))

# Cambio de ejes con cos = 3/5, sin = 4/5 alrededor de z
Q = np.array([[3/5, 4/5, 0], [-4/5, 3/5, 0], [0, 0, 1]])
sp = T.rotar(sigma, Q)
print("σ' =\n", sp)
print("Invariantes tras girar:", T.invariantes(sp))

# Esférico y desviador, octaédricas, τmax
sm, S, J2, _ = T.esferico_desviador(sigma)
print(f"σm = {sm:.4f}   J2 = {J2:.4f}   τmax = {T.tau_max(s):.1f}")
print("σoct, τoct =", T.octaedricas(sigma))
