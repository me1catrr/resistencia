#!/usr/bin/env python3
"""Compila las figuras TikZ de recursos/tikz/*.tex a SVG en recursos/fig/.

  python3 scripts/compilar_tikz.py              compila las que hayan cambiado
  python3 scripts/compilar_tikz.py --forzar     recompila todas
  python3 scripts/compilar_tikz.py NOMBRE ...   solo esas
  python3 scripts/compilar_tikz.py --vista DIR  además deja un PNG de cada figura en DIR (para revisarlas)
  python3 scripts/compilar_tikz.py --comprobar  no compila; falla si algún SVG no
                                                corresponde a sus fuentes (para CI,
                                                que no necesita LaTeX)

Cada figura lleva un sello SHA-256 (recursos/fig/sellos.json) calculado sobre su
.tex, el estilo resistencia.sty y, si el .tex usa \\input{datos-e01}, el JSON de
referencia. Así un SVG nunca queda desfasado respecto a sus fuentes ni a los números
que dibuja. Requiere pdflatex y pdftocairo (poppler); el texto queda convertido a
trazos. Solo biblioteca estándar de Python.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
TIKZ = "recursos/tikz"
FIG = "recursos/fig"
ESTILO = "resistencia.sty"
JSON_DATOS = "pruebas/referencia/e01.json"
USA_DATOS = "datos-e01"
DATOS = "recursos/tikz/datos"   # tablas que genera Julia (scripts/generar_figuras_*.jl)
VERSION_SCRIPT = "1"  # súbela si cambia la forma de compilar


def datos_de(tex: Path, raiz: Path) -> list[Path]:
    """Tablas de datos (datos/NOMBRE.dat) que cita la figura, en orden alfabético."""
    nombres = sorted(set(re.findall(r"datos/([\w.\-]+\.(?:dat|txt))", tex.read_text(encoding="utf-8"))))
    return [raiz / DATOS / n for n in nombres]


def entradas(tex: Path, raiz: Path) -> list[Path]:
    """Archivos de los que depende el SVG de ``tex``."""
    lista = [tex, raiz / TIKZ / ESTILO]
    if USA_DATOS in tex.read_text(encoding="utf-8"):
        lista.append(raiz / JSON_DATOS)
    lista.extend(datos_de(tex, raiz))
    return lista


def sello(tex: Path, raiz: Path) -> str:
    h = hashlib.sha256(VERSION_SCRIPT.encode())
    for p in entradas(tex, raiz):
        h.update(p.name.encode())
        h.update(p.read_bytes())
    return h.hexdigest()


def leer_sellos(raiz: Path) -> dict:
    ruta = raiz / FIG / "sellos.json"
    return json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else {}


def guardar_sellos(raiz: Path, datos: dict) -> None:
    (raiz / FIG).mkdir(parents=True, exist_ok=True)
    (raiz / FIG / "sellos.json").write_text(
        json.dumps(datos, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def figuras(raiz: Path) -> list[Path]:
    return sorted((raiz / TIKZ).glob("*.tex"))


def comprobar(raiz: Path = RAIZ) -> list[str]:
    errores = []
    sellos = leer_sellos(raiz)
    for tex in figuras(raiz):
        nombre = tex.stem
        svg = raiz / FIG / f"{nombre}.svg"
        if not svg.exists():
            errores.append(f"{nombre}: falta {FIG}/{nombre}.svg (compila con scripts/compilar_tikz.py)")
        elif sellos.get(nombre) != sello(tex, raiz):
            errores.append(f"{nombre}: el SVG está desfasado respecto a sus fuentes (recompila)")
    for nombre in sellos:
        if not (raiz / TIKZ / f"{nombre}.tex").exists():
            errores.append(f"{nombre}: hay sello pero no existe {TIKZ}/{nombre}.tex")
    return errores


def macros_datos(raiz: Path) -> str:
    """Macros de LaTeX con los números de la referencia, para no copiarlos a mano."""
    d = json.loads((raiz / JSON_DATOS).read_text(encoding="utf-8"))
    p = d["ej3"]
    pl = d["ej5"]

    def f(x):
        return f"{x:.6f}"

    lineas = [
        f"\\newcommand{{\\Suno}}{{{f(p['sigma1'])}}}",
        f"\\newcommand{{\\Sdos}}{{{f(p['sigma2'])}}}",
        f"\\newcommand{{\\Stres}}{{{f(p['sigma3'])}}}",
        f"\\newcommand{{\\SigmaPlano}}{{{f(pl['sigma_n'])}}}",
        f"\\newcommand{{\\TauPlano}}{{{f(pl['tau'])}}}",
        f"\\newcommand{{\\SigmaTheta}}{{{f(d['ej1']['sigma_theta'])}}}",
        f"\\newcommand{{\\SigmaX}}{{{f(d['ej1']['sigma_x'])}}}",
        f"\\newcommand{{\\PresionP}}{{{f(d['ej1']['p'])}}}",
    ]
    return "\n".join(lineas) + "\n"


def compilar(tex: Path, raiz: Path, vista: Path | None = None) -> None:
    nombre = tex.stem
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        shutil.copy(tex, tmp / tex.name)
        shutil.copy(raiz / TIKZ / ESTILO, tmp / ESTILO)
        for d in datos_de(tex, raiz):
            if not d.exists():
                raise SystemExit(f"ERROR: {tex.name} necesita {d.relative_to(raiz)}; genera los datos con "
                                 "julia --project=Resistencia.jl scripts/generar_figuras_e01.jl")
            (tmp / "datos").mkdir(exist_ok=True)
            shutil.copy(d, tmp / "datos" / d.name)
        (tmp / f"{USA_DATOS}.tex").write_text(macros_datos(raiz), encoding="utf-8")
        r = subprocess.run(["pdflatex", "-interaction=nonstopmode", "-halt-on-error", tex.name],
                           cwd=tmp, capture_output=True, text=True)
        if r.returncode != 0:
            ultimas = "\n".join(r.stdout.splitlines()[-25:])
            raise SystemExit(f"ERROR compilando {nombre}:\n{ultimas}")
        destino = raiz / FIG / f"{nombre}.svg"
        destino.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(["pdftocairo", "-svg", f"{nombre}.pdf", str(destino)],
                           cwd=tmp, capture_output=True, text=True)
        if r.returncode != 0:
            raise SystemExit(f"ERROR convirtiendo {nombre} a SVG:\n{r.stderr}")
        if vista is not None:
            vista.mkdir(parents=True, exist_ok=True)
            subprocess.run(["pdftocairo", "-png", "-r", "110", "-singlefile", f"{nombre}.pdf",
                            str(vista / nombre)], cwd=tmp, check=True)


def main(argv: list[str]) -> int:
    if "--comprobar" in argv:
        errores = comprobar()
        for e in errores:
            print("ERROR:", e)
        if not errores:
            print(f"Figuras TikZ coherentes ({len(figuras(RAIZ))}).")
        return 1 if errores else 0
    forzar = "--forzar" in argv
    vista = None
    if "--vista" in argv:
        i = argv.index("--vista")
        vista = Path(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
        forzar = True
    nombres = [a for a in argv if not a.startswith("--")]
    sellos = leer_sellos(RAIZ)
    for tex in figuras(RAIZ):
        if nombres and tex.stem not in nombres:
            continue
        s = sello(tex, RAIZ)
        if not forzar and sellos.get(tex.stem) == s and (RAIZ / FIG / f"{tex.stem}.svg").exists():
            print("al día:", tex.stem)
            continue
        print("compilando:", tex.stem)
        compilar(tex, RAIZ, vista)
        sellos[tex.stem] = s
    guardar_sellos(RAIZ, sellos)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
