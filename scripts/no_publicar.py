#!/usr/bin/env python3
"""Guarda post-render: falla si en _site/ hay algo que no debe publicarse.

Comprueba que no aparezcan las carpetas privadas (referencias/, privado/, moodle/)
ni archivos PDF no autorizados. Quarto la ejecuta tras renderizar (post-render);
también puede ejecutarse a mano:  python3 scripts/no_publicar.py [carpeta]
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROHIBIDAS = ("referencias", "privado", "moodle", "_salida")
# PDF permitidos (ruta relativa a _site, con «/»). Por defecto, ninguno.
PDF_AUTORIZADOS: set[str] = set()


def revisar(sitio: Path) -> list[str]:
    problemas: list[str] = []
    if not sitio.is_dir():
        return [f"no existe la carpeta {sitio}"]
    for ruta in sorted(sitio.rglob("*")):
        rel = ruta.relative_to(sitio).as_posix()
        partes = rel.split("/")
        if ruta.is_dir() and partes[0] in PROHIBIDAS and len(partes) == 1:
            problemas.append(f"carpeta privada publicada: {rel}/")
        elif ruta.is_file():
            if partes[0] in PROHIBIDAS:
                problemas.append(f"archivo de carpeta privada publicado: {rel}")
            elif ruta.suffix.lower() == ".pdf" and rel not in PDF_AUTORIZADOS:
                problemas.append(f"PDF no autorizado: {rel}")
    return problemas


def main(argv: list[str]) -> int:
    if argv:
        sitio = Path(argv[0])
    elif os.environ.get("QUARTO_PROJECT_OUTPUT_DIR"):
        sitio = Path(os.environ["QUARTO_PROJECT_OUTPUT_DIR"])
    else:
        sitio = RAIZ / "_site"
    problemas = revisar(sitio)
    for p in problemas:
        print("ERROR no_publicar:", p, file=sys.stderr)
    if problemas:
        return 1
    print(f"no_publicar: {sitio} no contiene material privado ni PDF no autorizados.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
