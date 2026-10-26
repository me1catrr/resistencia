"""Pruebas de scripts/generar_estructura.py (solo biblioteca estándar)."""
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import generar_estructura as g  # noqa: E402

TEMARIO = """
[[parte]]
id = "p1"
titulo = "Parte uno"
menu = "Uno"

[[tema]]
id = "t01"
parte = "p1"
slug = "t01-prueba"
titulo = "Tema de prueba"

[[laboratorio]]
id = "l01"
slug = "l01-prueba"
titulo = "Lab de prueba"

[[area]]
id = "extra"
titulo = "Extra"
indice = "extra/index.qmd"
menu = "mas"
"""


def proyecto_falso() -> Path:
    base = Path(tempfile.mkdtemp())
    (base / "temario.toml").write_text(TEMARIO, encoding="utf-8")
    (base / "extra").mkdir()
    (base / "extra" / "index.qmd").write_text('---\ntitle: "Extra"\n---\n', encoding="utf-8")
    return base


class PruebaGenerador(unittest.TestCase):
    def test_crea_esqueletos_solo_si_no_existen(self):
        base = proyecto_falso()
        t = g.cargar_temario(base)
        faltan = g.crear_esqueletos(t, base, escribir=True)
        self.assertEqual(len(faltan), 2)
        idx = base / "temas" / "t01-prueba" / "index.qmd"
        idx.write_text('---\ntitle: "Editado a mano"\ntema-id: t01\n---\n', encoding="utf-8")
        g.crear_esqueletos(t, base, escribir=True)
        self.assertIn("Editado a mano", idx.read_text(encoding="utf-8"))

    def test_cabecera_del_esqueleto_es_coherente(self):
        base = proyecto_falso()
        t = g.cargar_temario(base)
        g.crear_esqueletos(t, base, escribir=True)
        c = g.cabecera(base / "temas" / "t01-prueba" / "index.qmd")
        self.assertEqual(c["tema-id"], "t01")
        self.assertEqual(c["tipo-pagina"], "tema")
        self.assertTrue(c["title"].startswith("T01 · "))

    def test_versiones_se_anaden_sin_pisar(self):
        base = proyecto_falso()
        t = g.cargar_temario(base)
        (base / "_versiones.yml").write_text(
            g.CABECERA_VERSIONES + '  t01:\n    version: "1.2.3"\n    estado: borrador\n', encoding="utf-8")
        self.assertEqual(g.completar_versiones(t, base, escribir=True), [])
        self.assertEqual(g.leer_versiones(base)["t01"]["version"], "1.2.3")

    def test_comprobar_detecta_desfase_y_se_corrige(self):
        base = proyecto_falso()
        t = g.cargar_temario(base)
        self.assertTrue(g.comprobar(t, base))  # nada generado todavía
        g.crear_esqueletos(t, base, escribir=True)
        g.completar_versiones(t, base, escribir=True)
        (base / "temas").mkdir(exist_ok=True)
        for ruta, texto in g.archivos_generados(t, base).items():
            ruta.write_text(texto, encoding="utf-8")
        self.assertEqual(g.comprobar(t, base), [])
        (base / "_navegacion.yml").write_text("# a mano\n", encoding="utf-8")
        self.assertTrue(any("desfasado" in e for e in g.comprobar(t, base)))

    def test_tema_id_incoherente(self):
        base = proyecto_falso()
        t = g.cargar_temario(base)
        g.crear_esqueletos(t, base, escribir=True)
        g.completar_versiones(t, base, escribir=True)
        idx = base / "temas" / "t01-prueba" / "index.qmd"
        idx.write_text(idx.read_text(encoding="utf-8").replace("tema-id: t01", "tema-id: otro"), encoding="utf-8")
        self.assertTrue(any("tema-id" in e for e in g.comprobar(t, base)))

    def test_formato_versiones_invalido(self):
        base = proyecto_falso()
        (base / "_versiones.yml").write_text("versiones:\n  t01:\n   mal sangrado: 1\n", encoding="utf-8")
        with self.assertRaises(SystemExit):
            g.leer_versiones(base)

    def test_repositorio_real_es_coherente(self):
        """El repositorio real no debe tener la navegación desfasada."""
        t = g.cargar_temario(RAIZ)
        self.assertEqual(g.comprobar(t, RAIZ), [])

    def test_temario_real_tiene_13_temas_y_4_laboratorios(self):
        t = g.cargar_temario(RAIZ)
        self.assertEqual(len(t["tema"]), 13)
        self.assertEqual(len(t["laboratorio"]), 4)
        self.assertEqual([x["id"] for x in t["tema"]][:2], ["e01", "e02"])


if __name__ == "__main__":
    unittest.main()
