"""Estado de tensiones en el espacio (tema E01).

Convenciones, las mismas que en Julia y JavaScript (véase CLAUDE.md):

* Tracción positiva. Tensiones en MPa, longitudes en mm.
* ``sigma[i, j]``: el primer índice es la normal del plano y el segundo la dirección
  de la componente. Con ``sigma`` simétrica, el vector tensión sobre el plano de
  normal ``n`` es ``t = sigma @ n``.
* Tensiones principales ordenadas ``s1 >= s2 >= s3``. ``v1`` y ``v2`` con su primera
  componente no nula positiva y ``v3 = v1 x v2`` (base dextrógira).
* Cambio de base: ``Q`` tiene **por filas** los vectores de la nueva base escritos en
  la antigua; ``sigma' = Q @ sigma @ Q.T``. Rotar los ejes un ángulo θ equivale a
  ``Q = R(θ).T`` con ``R`` la rotación activa: no es lo mismo que rotar el elemento.

La implementación de referencia es la de Julia (``Resistencia.jl``); esta se contrasta
con ``pruebas/referencia/e01.json``. Solo requiere numpy.
"""
from __future__ import annotations

import numpy as np

__all__ = [
    "es_simetrica", "normalizar", "traccion", "componentes_plano", "matriz_rotacion_ejes",
    "es_ortogonal", "rotar", "principales", "principales_cubica", "invariantes",
    "esferico_desviador", "octaedricas", "circulos_mohr", "tau_max", "admisible",
    "componentes_desde_principales", "tension_desde_principales",
]


def _matriz(sigma) -> np.ndarray:
    return np.asarray(sigma, dtype=float)


# region simetria
def es_simetrica(sigma, rtol: float = 1e-12) -> bool:
    """¿Es ``sigma`` una matriz 3×3 simétrica? (hipótesis clásica: sin pares distribuidos)."""
    s = _matriz(sigma)
    if s.shape != (3, 3):
        return False
    escala = max(1.0, float(np.max(np.abs(s))))
    return bool(np.max(np.abs(s - s.T)) <= rtol * escala)
# endregion simetria


def normalizar(n) -> np.ndarray:
    """Devuelve ``n`` normalizado; falla si es el vector nulo o no tiene 3 componentes."""
    v = np.asarray(n, dtype=float)
    if v.shape != (3,):
        raise ValueError("la normal debe tener 3 componentes")
    m = float(np.linalg.norm(v))
    if not m > 0:
        raise ValueError("la normal no puede ser el vector nulo")
    return v / m


# region traccion
def traccion(sigma, n) -> np.ndarray:
    """Vector tensión sobre el plano de normal ``n`` (fórmula de Cauchy, ``t = sigma n``)."""
    s = _matriz(sigma)
    if not es_simetrica(s):
        raise ValueError("sigma debe ser simétrica")
    return s @ normalizar(n)


def componentes_plano(sigma, n) -> dict:
    """Descompone ``t`` en ``sigma_n = t·n`` (con signo) y ``tau_vec = t - sigma_n n``."""
    nn = normalizar(n)
    t = traccion(sigma, nn)
    sigma_n = float(t @ nn)
    tau_vec = t - sigma_n * nn
    return {"t": t, "sigma_n": sigma_n, "tau": float(np.linalg.norm(tau_vec)), "tau_vec": tau_vec}
# endregion traccion


# region cambio_base
def matriz_rotacion_ejes(eje, theta: float) -> np.ndarray:
    """``Q`` para **rotar los ejes** un ángulo ``theta`` (rad) alrededor de ``eje``.

    Las filas de ``Q`` son los nuevos ejes. Para ``eje = z``: ``[[c, s, 0], [-s, c, 0], [0, 0, 1]]``.
    """
    k = normalizar(eje)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    R = np.cos(theta) * np.eye(3) + np.sin(theta) * K + (1 - np.cos(theta)) * np.outer(k, k)
    return R.T


def es_ortogonal(Q, rtol: float = 1e-12, propia: bool = False) -> bool:
    """¿Es ``Q`` ortogonal? Con ``propia=True`` exige además det Q = +1."""
    q = _matriz(Q)
    if q.shape != (3, 3):
        return False
    ok = bool(np.max(np.abs(q @ q.T - np.eye(3))) <= rtol)
    return ok and float(np.linalg.det(q)) > 0 if propia else ok


def rotar(sigma, Q) -> np.ndarray:
    """Componentes de ``sigma`` en la base cuyas filas son las de ``Q``: ``Q sigma Q^T``."""
    q = _matriz(Q)
    if not es_ortogonal(q):
        raise ValueError("Q no es ortogonal")
    return q @ _matriz(sigma) @ q.T
# endregion cambio_base


# region principales
def principales(sigma) -> dict:
    """Tensiones principales ``s1 >= s2 >= s3``, direcciones (columnas) y ``Q = vectores.T``.

    Convención de signo: ``v1`` y ``v2`` con su primera componente no nula positiva y
    ``v3 = v1 x v2``. Con valores repetidos, las direcciones de ese subespacio no son únicas.
    """
    s = _matriz(sigma)
    if not es_simetrica(s):
        raise ValueError("sigma debe ser simétrica")
    w, V = np.linalg.eigh(s)
    orden = np.argsort(w)[::-1]
    valores = w[orden]
    V = V[:, orden].copy()
    for j in range(2):
        no_nulas = np.flatnonzero(np.abs(V[:, j]) > 1e-12)
        if no_nulas.size and V[no_nulas[0], j] < 0:
            V[:, j] *= -1
    V[:, 2] = np.cross(V[:, 0], V[:, 1])
    return {"valores": valores, "vectores": V, "Q": V.T.copy()}


def principales_cubica(sigma) -> np.ndarray:
    """Principales por la solución trigonométrica de la cúbica (independiente de ``eigh``).

    Sirve para contrastar ``principales``. Cerca de raíces dobles está mal condicionada
    (error relativo ~1e-8); el método de uso es ``principales``.
    """
    s = _matriz(sigma)
    sigma_m = float(np.trace(s)) / 3
    _, _, J2, J3 = esferico_desviador(s)
    if J2 <= 1e-14 * max(1.0, sigma_m ** 2):
        return np.full(3, sigma_m)
    arg = float(np.clip((3 * np.sqrt(3) / 2) * J3 / J2 ** 1.5, -1.0, 1.0))
    th = np.arccos(arg) / 3
    r = 2 * np.sqrt(J2 / 3)
    return np.array([sigma_m + r * np.cos(th - 2 * np.pi * k / 3) for k in range(3)])
# endregion principales


# region invariantes
def invariantes(sigma) -> tuple[float, float, float]:
    """``I1 = tr``, ``I2 = ½[(tr)² − tr(σ²)]``, ``I3 = det`` (ecuación característica λ³ − I1λ² + I2λ − I3 = 0)."""
    s = _matriz(sigma)
    I1 = float(np.trace(s))
    I2 = (I1 ** 2 - float(np.trace(s @ s))) / 2
    return I1, I2, float(np.linalg.det(s))
# endregion invariantes


# region esferico_desviador
def esferico_desviador(sigma) -> tuple[float, np.ndarray, float, float]:
    """Devuelve ``(sigma_m, S, J2, J3)``: tensión media, desviador y sus invariantes."""
    s = _matriz(sigma)
    sigma_m = float(np.trace(s)) / 3
    S = s - sigma_m * np.eye(3)
    return sigma_m, S, float(np.sum(S * S)) / 2, float(np.linalg.det(S))


def octaedricas(sigma) -> tuple[float, float]:
    """``(sigma_oct, tau_oct) = (I1/3, sqrt(2 J2 / 3))``."""
    sigma_m, _, J2, _ = esferico_desviador(sigma)
    return sigma_m, float(np.sqrt(2 * J2 / 3))
# endregion esferico_desviador


# region mohr
def circulos_mohr(lam) -> dict:
    """Centros y radios de los tres círculos de Mohr (el grande es el ``13``)."""
    s1, s2, s3 = (float(x) for x in lam)
    if not (s1 >= s2 >= s3):
        raise ValueError("las tensiones principales deben venir ordenadas s1 >= s2 >= s3")
    return {"c13": (s1 + s3) / 2, "r13": (s1 - s3) / 2,
            "c12": (s1 + s2) / 2, "r12": (s1 - s2) / 2,
            "c23": (s2 + s3) / 2, "r23": (s2 - s3) / 2}


def tau_max(lam) -> float:
    """Tensión tangencial máxima absoluta ``(s1 - s3)/2``."""
    return (float(lam[0]) - float(lam[2])) / 2


def admisible(sigma_n: float, tau: float, lam, tol: float = 1e-9) -> bool:
    """¿Puede un plano tener ``(sigma_n, tau)``? Dentro del círculo grande y fuera de los dos pequeños."""
    c = circulos_mohr(lam)
    d13 = (sigma_n - c["c13"]) ** 2 + tau ** 2
    d12 = (sigma_n - c["c12"]) ** 2 + tau ** 2
    d23 = (sigma_n - c["c23"]) ** 2 + tau ** 2
    return bool(d13 <= c["r13"] ** 2 + tol and d12 >= c["r12"] ** 2 - tol and d23 >= c["r23"] ** 2 - tol)
# endregion mohr


# region desde_principales
def componentes_desde_principales(lam, cosenos) -> tuple[float, float]:
    """Con ejes principales como referencia y cosenos directores ``(l, m, n)`` de la normal."""
    n = normalizar(cosenos)
    lam = np.asarray(lam, dtype=float)
    sigma_n = float(np.sum(lam * n ** 2))
    tau2 = float(np.sum(lam ** 2 * n ** 2)) - sigma_n ** 2
    return sigma_n, float(np.sqrt(max(tau2, 0.0)))


def tension_desde_principales(lam, V) -> np.ndarray:
    """Tensor en los ejes de partida a partir de valores principales y sus direcciones (columnas)."""
    V = _matriz(V)
    return V @ np.diag(np.asarray(lam, dtype=float)) @ V.T
# endregion desde_principales
