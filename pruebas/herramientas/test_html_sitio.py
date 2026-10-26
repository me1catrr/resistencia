"""Comprobaciones estáticas sobre el sitio ya construido (_site/). Se omiten si no existe.

Detectan LaTeX en bruto que el lector vería sin renderizar: títulos con $...$ que no
pasaron por Markdown, o pies de figura con fórmulas copiados como texto plano (lightbox).
"""
import glob
import html
import re
import unittest
from pathlib import Path

SITIO = Path(__file__).resolve().parents[2] / "_site"


def paginas():
    for f in sorted(glob.glob(str(SITIO / "**" / "*.html"), recursive=True)):
        h = Path(f).read_text(encoding="utf-8")
        if 'id="quarto-document-content"' in h:
            yield Path(f).relative_to(SITIO).as_posix(), h


@unittest.skipUnless(SITIO.is_dir(), "no hay _site: ejecuta antes quarto render")
class PruebaLatexVisible(unittest.TestCase):
    def test_no_hay_dolares_ni_comandos_en_el_texto_visible(self):
        fallos = []
        for nombre, h in paginas():
            main = h[h.index('id="quarto-document-content"'):]
            main = main[:main.index("</main>")]
            t = re.sub(r'<span class="math[^"]*">.*?</span>', "", main, flags=re.S)
            t = re.sub(r"<script.*?</script>", "", t, flags=re.S)
            t = html.unescape(re.sub(r"<[^>]+>", " ", t))
            fallos += [f"{nombre}: {m.strip()}" for m in re.findall(r".{20}\$[^$\s][^$]{0,40}\$.{0,10}", t)]
        self.assertEqual(fallos, [])

    def test_los_pies_de_figura_no_llevan_latex_en_atributos(self):
        fallos = []
        for nombre, h in paginas():
            for a in re.findall(r'(?:data-description|alt|title|aria-label)="([^"]*)"', h):
                if re.search(r"\\[A-Za-z]+|\\\(", html.unescape(a)):
                    fallos.append(f"{nombre}: {a[:70]}")
        self.assertEqual(fallos, [])


if __name__ == "__main__":
    unittest.main()
