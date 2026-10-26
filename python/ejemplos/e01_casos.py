"""Estados particulares de E01 en Python: reconocerlos y calcular sus magnitudes.

Uso (desde la raíz del repositorio):  python3 python/ejemplos/e01_casos.py
Requiere numpy.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from resistencia import tensiones as T  # noqa: E402

# region casos
casos = {
    "Uniaxial": np.diag([100.0, 0.0, 0.0]),
    "Biaxial": np.diag([80.0, 40.0, 0.0]),
    "Cortante puro": np.array([[0.0, 30.0, 0.0], [30.0, 0.0, 0.0], [0.0, 0.0, 0.0]]),
    "Cilíndrico": np.diag([50.0, 10.0, 10.0]),
    "Hidrostático": -50.0 * np.eye(3),
    "Genérico": np.array([[24.0, 48.0, 0.0], [48.0, -4.0, 0.0], [0.0, 0.0, 20.0]]),
}

for nombre, sigma in casos.items():
    lam = T.principales(sigma)["valores"]          # σ1 ≥ σ2 ≥ σ3
    sm, _, J2, _ = T.esferico_desviador(sigma)
    print(f"{nombre:<14} → {T.clasificar_estado(sigma):<14}"
          f"principales = {np.round(lam, 1)}  τmáx = {T.tau_max(lam):.1f}"
          f"  σm = {sm:.1f}  J2 = {J2:.1f}")
# endregion casos

# El estado reconocido no depende de los ejes: se gira el cortante puro un ángulo cualquiera
Q = T.matriz_rotacion_ejes([1, 2, 3], 0.9)
print("Cortante puro con los ejes girados →", T.clasificar_estado(T.rotar(casos["Cortante puro"], Q)))
