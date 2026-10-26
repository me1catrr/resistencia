"""Pruebas de scripts/no_publicar.py (solo biblioteca estándar)."""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import no_publicar  # noqa: E402


def sitio_con(*archivos: str) -> Path:
    base = Path(tempfile.mkdtemp())
    for a in archivos:
        p = base / a
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("x")
    return base


class PruebaNoPublicar(unittest.TestCase):
    def test_sitio_limpio(self):
        self.assertEqual(no_publicar.revisar(sitio_con("index.html", "temas/a/index.html")), [])

    def test_detecta_carpetas_privadas(self):
        for carpeta in ("referencias", "privado", "moodle", "pruebas"):
            with self.subTest(carpeta=carpeta):
                problemas = no_publicar.revisar(sitio_con("index.html", f"{carpeta}/x.txt"))
                self.assertTrue(problemas, f"debería detectar {carpeta}/")

    def test_detecta_pdf(self):
        problemas = no_publicar.revisar(sitio_con("index.html", "guia/guia.pdf"))
        self.assertEqual(len(problemas), 1)
        self.assertIn("PDF", problemas[0])

    def test_pdf_autorizado(self):
        no_publicar.PDF_AUTORIZADOS.add("guia/ok.pdf")
        try:
            self.assertEqual(no_publicar.revisar(sitio_con("guia/ok.pdf")), [])
        finally:
            no_publicar.PDF_AUTORIZADOS.discard("guia/ok.pdf")

    def test_privado_anidado_no_es_falso_positivo(self):
        # «privado» como subcarpeta de otra no es la carpeta raíz privada
        self.assertEqual(no_publicar.revisar(sitio_con("temas/privado/x.html")), [])

    def test_carpeta_inexistente(self):
        self.assertTrue(no_publicar.revisar(Path("/no/existe/_site")))


if __name__ == "__main__":
    unittest.main()
