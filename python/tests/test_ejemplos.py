"""El script de ejemplo del tema E01 se ejecuta y da los resultados esperados."""
import subprocess
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


class PruebaEjemplo(unittest.TestCase):
    def test_ejecuta_y_da_los_resultados_del_tema(self):
        r = subprocess.run([sys.executable, str(RAIZ / "python" / "ejemplos" / "e01_ejemplo.py")],
                           capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr)
        salida = r.stdout
        for esperado in ("¿Simétrico? True", "[ 60.  20. -40.]", "I1 = 40.0   I2 = -2000.0",
                         "σn = 31.1111", "τ = 31.427", "¿(σn, τ) es posible según Mohr? True",
                         "σm = 13.3333   J2 = 2533.3333"):
            self.assertIn(esperado, salida)

    def test_script_de_casos_particulares(self):
        r = subprocess.run([sys.executable, str(RAIZ / "python" / "ejemplos" / "e01_casos.py")],
                           capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr)
        for esperado in ("→ uniaxial", "→ biaxial", "→ cortante_puro", "→ cilindrico", "→ esferico",
                         "→ triaxial", "τmáx = 50.0", "Cortante puro con los ejes girados → cortante_puro"):
            self.assertIn(esperado, r.stdout)


if __name__ == "__main__":
    unittest.main()
