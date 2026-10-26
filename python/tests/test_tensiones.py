"""Pruebas de resistencia.tensiones: casos de solución conocida y contraste con Julia.

Se ejecutan con:  python3 -m unittest discover -s python/tests -t python
(pytest también las recoge).
"""
import json
import unittest
from math import sqrt
from pathlib import Path

import numpy as np

from resistencia import tensiones as T

RAIZ = Path(__file__).resolve().parents[2]
REF = json.loads((RAIZ / "pruebas" / "referencia" / "e01.json").read_text(encoding="utf-8"))
SA = np.array([[24.0, 48.0, 0.0], [48.0, -4.0, 0.0], [0.0, 0.0, 20.0]])


class Base(unittest.TestCase):
    def cerca(self, a, b, tol=1e-9, msg=""):
        a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
        lim = tol * np.maximum(1.0, np.abs(b))
        self.assertTrue(np.all(np.abs(a - b) <= lim), f"{msg}: {a} vs {b}")


class PruebaCasosConocidos(Base):
    def test_tensor_comun(self):
        p = T.principales(SA)
        self.cerca(p["valores"], [60, 20, -40])
        self.cerca(p["vectores"][:, 0], [0.8, 0.6, 0])
        self.cerca(p["vectores"][:, 1], [0, 0, 1])
        self.cerca(p["vectores"][:, 2], [0.6, -0.8, 0])
        self.assertAlmostEqual(float(np.linalg.det(p["vectores"])), 1.0, places=12)
        self.cerca(T.invariantes(SA), [40, -2000, -48000])
        self.cerca(T.principales_cubica(SA), [60, 20, -40])
        self.cerca(T.rotar(SA, p["Q"]), np.diag([60, 20, -40]))

    def test_plano_oblicuo(self):
        r = T.componentes_plano(SA, [1, 2, 2])
        self.cerca(r["t"], [40, 40 / 3, 40 / 3])
        self.cerca(r["sigma_n"], 280 / 9)
        self.cerca(r["tau"], 200 * sqrt(2) / 9)
        self.assertTrue(T.admisible(r["sigma_n"], r["tau"], [60, 20, -40]))
        self.assertLess(abs(float(r["tau_vec"] @ T.normalizar([1, 2, 2]))), 1e-12)
        V = T.principales(SA)["vectores"]
        sn, tau = T.componentes_desde_principales([60, 20, -40], V.T @ T.normalizar([1, 2, 2]))
        self.cerca(sn, 280 / 9)
        self.cerca(tau, 200 * sqrt(2) / 9)

    def test_uniaxial_hidrostatico_cortante(self):
        u = T.componentes_plano(np.diag([100.0, 0, 0]), [1, 1, 0])
        self.cerca(u["sigma_n"], 50)
        self.cerca(u["tau"], 50)
        h = -30 * np.eye(3)
        self.assertLess(T.componentes_plano(h, [1, 2, 3])["tau"], 1e-12)
        self.cerca(T.principales_cubica(h), [-30, -30, -30])
        c = np.array([[0, 25.0, 0], [25.0, 0, 0], [0, 0, 0]])
        self.cerca(T.principales(c)["valores"], [25, 0, -25], 1e-12)
        self.cerca(T.esferico_desviador(c)[2], 625)

    def test_cambio_de_base(self):
        th = 0.7
        Q = T.matriz_rotacion_ejes([0, 0, 1], th)
        c, s = np.cos(th), np.sin(th)
        self.cerca(Q, [[c, s, 0], [-s, c, 0], [0, 0, 1]])
        self.assertTrue(T.es_ortogonal(Q, propia=True))
        sr = T.rotar(np.diag([80.0, 0, 0]), Q)
        self.cerca(sr[0, 0], 80 * c * c)
        self.cerca(sr[0, 1], -80 * s * c)
        sp = T.rotar(SA, [[3 / 5, 4 / 5, 0], [-4 / 5, 3 / 5, 0], [0, 0, 1]])
        self.cerca([sp[0, 0], sp[1, 1], sp[0, 1]], [1304 / 25, -804 / 25, -672 / 25])
        self.cerca(T.invariantes(sp), T.invariantes(SA))
        self.cerca(T.rotar(T.rotar(SA, Q), Q.T), SA)
        with self.assertRaises(ValueError):
            T.rotar(SA, 2 * np.eye(3))

    def test_esferico_desviador_octaedricas_mohr(self):
        sm, S, J2, _ = T.esferico_desviador(SA)
        self.cerca(sm, 40 / 3)
        self.cerca(J2, 7600 / 3)
        self.cerca(np.trace(S), 0.0)
        _, tau_o = T.octaedricas(SA)
        self.cerca(tau_o, sqrt(15200) / 3)
        c = T.circulos_mohr([60, 20, -40])
        self.assertEqual((c["c13"], c["r13"], c["c12"], c["r12"], c["c23"], c["r23"]), (10, 50, 40, 20, -10, 30))
        self.assertEqual(T.tau_max([60, 20, -40]), 50)
        self.assertTrue(T.admisible(10, 50, [60, 20, -40]))
        self.assertFalse(T.admisible(100, 0, [60, 20, -40]))
        self.assertFalse(T.admisible(40, 5, [60, 20, -40]))
        self.assertFalse(T.admisible(-10, 5, [60, 20, -40]))
        with self.assertRaises(ValueError):
            T.circulos_mohr([20, 60, -40])

    def test_errores(self):
        no_sim = np.array([[1.0, 2, 0], [0, 1, 0], [0, 0, 1]])
        self.assertFalse(T.es_simetrica(no_sim))
        for f in (lambda: T.traccion(no_sim, [1, 0, 0]), lambda: T.normalizar([0, 0, 0]),
                  lambda: T.normalizar([1, 2]), lambda: T.principales(no_sim)):
            with self.assertRaises(ValueError):
                f()


class PruebaContrasteConJulia(Base):
    def resumen(self, r, etiqueta):
        sigma = np.array(r["sigma"])
        p = T.principales(sigma)
        self.cerca(p["valores"], r["principales"], 1e-9, etiqueta + " principales")
        self.cerca(T.principales_cubica(sigma), r["principales"], 1e-6, etiqueta + " cúbica")
        self.cerca(T.invariantes(sigma), r["invariantes"], 1e-9, etiqueta + " invariantes")
        sm, S, J2, J3 = T.esferico_desviador(sigma)
        self.cerca([sm, J2, J3], [r["sigma_m"], r["J2"], r["J3"]], 1e-9, etiqueta + " esf/des")
        self.cerca(T.octaedricas(sigma), [r["sigma_oct"], r["tau_oct"]], 1e-9, etiqueta + " oct")
        self.cerca(T.tau_max(p["valores"]), r["tau_max"], 1e-9, etiqueta + " tau_max")
        if min(p["valores"][0] - p["valores"][1], p["valores"][1] - p["valores"][2]) > 1e-6:
            self.cerca(p["vectores"], r["vectores"], 1e-8, etiqueta + " vectores")

    def test_ejemplos_y_casos(self):
        self.cerca(SA, REF["sigmaA"])
        r5 = T.componentes_plano(REF["sigmaA"], REF["ej5"]["n"])
        self.cerca(r5["t"], REF["ej5"]["t"])
        self.cerca([r5["sigma_n"], r5["tau"]], [REF["ej5"]["sigma_n"], REF["ej5"]["tau"]])
        self.cerca(T.rotar(REF["sigmaA"], REF["ej4"]["Q"]), REF["ej4"]["sigma_prima"])
        self.cerca(T.rotar(REF["sigmaA"], REF["ej4"]["Q_diagonaliza"]), REF["ej4"]["sigma_diagonal"])
        for caso in REF["casos"]:
            self.resumen(caso["resumen"], "caso " + caso["nombre"])

    def test_aleatorios(self):
        self.assertEqual(len(REF["aleatorios"]), 30)
        for i, a in enumerate(REF["aleatorios"]):
            self.resumen(a["resumen"], f"aleatorio {i}")
            r = T.componentes_plano(a["resumen"]["sigma"], a["plano"]["n"])
            self.cerca(r["t"], a["plano"]["t"])
            self.cerca([r["sigma_n"], r["tau"]], [a["plano"]["sigma_n"], a["plano"]["tau"]])
            self.assertEqual(T.admisible(r["sigma_n"], r["tau"], a["resumen"]["principales"], 1e-6), a["plano"]["admisible"])
            Q = T.matriz_rotacion_ejes(a["eje"], a["angulo"])
            self.cerca(Q, a["Q"])
            self.cerca(T.rotar(a["resumen"]["sigma"], Q), a["sigma_prima"])

    def test_propiedades_aleatorias(self):
        rng = np.random.default_rng(7)
        for _ in range(300):
            A = 200 * (rng.random((3, 3)) - 0.5)
            s = (A + A.T) / 2
            p = T.principales(s)
            self.cerca(p["valores"], T.principales_cubica(s), 1e-8)
            self.cerca(T.rotar(s, p["Q"]), np.diag(p["valores"]), 1e-8)
            Q = T.matriz_rotacion_ejes(rng.random(3) + 0.1, 6 * rng.random())
            self.cerca(T.invariantes(T.rotar(s, Q)), T.invariantes(s), 1e-8)
            r = T.componentes_plano(s, rng.standard_normal(3))
            self.cerca(r["t"] @ r["t"], r["sigma_n"] ** 2 + r["tau"] ** 2, 1e-9)
            self.assertTrue(T.admisible(r["sigma_n"], r["tau"], p["valores"], 1e-6))


if __name__ == "__main__":
    unittest.main()
