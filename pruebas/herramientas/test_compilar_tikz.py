"""Pruebas de scripts/compilar_tikz.py que no necesitan LaTeX (sellos y comprobación)."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import compilar_tikz as c  # noqa: E402


def proyecto(usa_datos=False) -> Path:
    b = Path(tempfile.mkdtemp())
    (b / "recursos" / "tikz").mkdir(parents=True)
    (b / "recursos" / "fig").mkdir(parents=True)
    (b / "pruebas" / "referencia").mkdir(parents=True)
    (b / "recursos" / "tikz" / "resistencia.sty").write_text("% estilo", encoding="utf-8")
    (b / "pruebas" / "referencia" / "e01.json").write_text("{}", encoding="utf-8")
    tex = "\\input{datos-e01}\n" if usa_datos else "% sin datos\n"
    (b / "recursos" / "tikz" / "f1.tex").write_text(tex, encoding="utf-8")
    return b


class PruebaSellos(unittest.TestCase):
    def test_sin_svg_falla(self):
        b = proyecto()
        self.assertTrue(any("falta" in e for e in c.comprobar(b)))

    def test_coherente_y_se_desfasa(self):
        b = proyecto()
        (b / "recursos" / "fig" / "f1.svg").write_text("<svg/>", encoding="utf-8")
        c.guardar_sellos(b, {"f1": c.sello(b / "recursos" / "tikz" / "f1.tex", b)})
        self.assertEqual(c.comprobar(b), [])
        (b / "recursos" / "tikz" / "f1.tex").write_text("% cambiado\n", encoding="utf-8")
        self.assertTrue(any("desfasado" in e for e in c.comprobar(b)))

    def test_el_estilo_forma_parte_del_sello(self):
        b = proyecto()
        tex = b / "recursos" / "tikz" / "f1.tex"
        s1 = c.sello(tex, b)
        (b / "recursos" / "tikz" / "resistencia.sty").write_text("% otro estilo", encoding="utf-8")
        self.assertNotEqual(s1, c.sello(tex, b))

    def test_los_datos_forman_parte_del_sello_solo_si_se_usan(self):
        sin = proyecto(usa_datos=False)
        con = proyecto(usa_datos=True)
        s_sin, s_con = (c.sello(b / "recursos" / "tikz" / "f1.tex", b) for b in (sin, con))
        for b in (sin, con):
            (b / "pruebas" / "referencia" / "e01.json").write_text('{"x": 1}', encoding="utf-8")
        self.assertEqual(s_sin, c.sello(sin / "recursos" / "tikz" / "f1.tex", sin))
        self.assertNotEqual(s_con, c.sello(con / "recursos" / "tikz" / "f1.tex", con))

    def test_las_tablas_de_datos_forman_parte_del_sello(self):
        b = proyecto()
        (b / "recursos" / "tikz" / "datos").mkdir()
        (b / "recursos" / "tikz" / "datos" / "curva.dat").write_text("x y\n0 0\n", encoding="utf-8")
        tex = b / "recursos" / "tikz" / "f1.tex"
        tex.write_text("\\addplot table {datos/curva.dat};\n", encoding="utf-8")
        s1 = c.sello(tex, b)
        self.assertEqual([p.name for p in c.datos_de(tex, b)], ["curva.dat"])
        (b / "recursos" / "tikz" / "datos" / "curva.dat").write_text("x y\n0 1\n", encoding="utf-8")
        self.assertNotEqual(s1, c.sello(tex, b))

    def test_sello_huerfano(self):
        b = proyecto()
        c.guardar_sellos(b, {"fantasma": "x"})
        self.assertTrue(any("fantasma" in e for e in c.comprobar(b)))

    def test_macros_desde_el_json_real(self):
        raiz = Path(__file__).resolve().parents[2]
        m = c.macros_datos(raiz)
        self.assertIn("\\newcommand{\\Suno}{60.000000}", m)
        self.assertIn("\\newcommand{\\Stres}{-40.000000}", m)


if __name__ == "__main__":
    unittest.main()
