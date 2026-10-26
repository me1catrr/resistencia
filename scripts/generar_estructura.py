#!/usr/bin/env python3
"""Genera la navegación del sitio a partir de temario.toml.

Escribe:
  - _navegacion.yml                 barra superior y barras laterales
  - temas/elasticidad.qmd, temas/resistencia.qmd   índices de cada parte
Crea, solo si no existen:
  - el esqueleto temas/<slug>/index.qmd de cada tema y laboratorio/<slug>/index.qmd
  - la entrada de cada tema en _versiones.yml

Uso:
  python3 scripts/generar_estructura.py              genera
  python3 scripts/generar_estructura.py --comprobar  no escribe; falla si algo está desfasado

Solo biblioteca estándar.
"""
from __future__ import annotations

import json
import re
import sys
import tomllib
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ESTADOS = ("esqueleto", "borrador", "revisado", "publicado")
CABECERA_GENERADO = "<!-- GENERADO por scripts/generar_estructura.py desde temario.toml. No editar a mano. -->"


# --------------------------------------------------------------------------
# Lectura
# --------------------------------------------------------------------------
def cargar_temario(raiz: Path = RAIZ) -> dict:
    with open(raiz / "temario.toml", "rb") as f:
        t = tomllib.load(f)
    partes = {p["id"] for p in t["parte"]}
    for tema in t["tema"]:
        if tema["parte"] not in partes:
            raise SystemExit(f"temario.toml: el tema {tema['id']} usa la parte desconocida «{tema['parte']}»")
    ids = [x["id"] for x in t["tema"] + t["laboratorio"]]
    if len(ids) != len(set(ids)):
        raise SystemExit("temario.toml: hay identificadores repetidos")
    return t


def cabecera(ruta: Path) -> dict[str, str]:
    """Pares clave: valor de primer nivel de la cabecera YAML de un .qmd."""
    texto = ruta.read_text(encoding="utf-8")
    m = re.match(r"---\s*\n(.*?)\n---\s*(\n|$)", texto, re.S)
    if not m:
        return {}
    datos = {}
    for linea in m.group(1).splitlines():
        k = re.match(r"^([A-Za-z][\w-]*):\s*(.*?)\s*$", linea)
        if k:
            v = k.group(2)
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            datos[k.group(1)] = v
    return datos


def leer_versiones(raiz: Path = RAIZ) -> dict[str, dict[str, str]]:
    """Lee _versiones.yml (formato restringido de dos niveles)."""
    ruta = raiz / "_versiones.yml"
    if not ruta.exists():
        return {}
    versiones: dict[str, dict[str, str]] = {}
    actual = None
    for n, linea in enumerate(ruta.read_text(encoding="utf-8").splitlines(), 1):
        if not linea.strip() or linea.lstrip().startswith("#") or linea.strip() == "versiones:":
            continue
        a = re.match(r"^  ([a-z]\w*):\s*$", linea)
        b = re.match(r"^    ([a-z_]\w*):\s*(.*?)\s*$", linea)
        if a:
            actual = a.group(1)
            versiones[actual] = {}
        elif b and actual:
            v = b.group(2)
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            versiones[actual][b.group(1)] = v
        else:
            raise SystemExit(f"_versiones.yml:{n}: formato no admitido: {linea!r}")
    return versiones


# --------------------------------------------------------------------------
# Esqueletos
# --------------------------------------------------------------------------
def esqueleto_tema(t: dict, parte_titulo: str) -> str:
    codigo = t["id"].upper()
    return f"""---
title: {json.dumps(f"{codigo} · {t['titulo']}", ensure_ascii=False)}
tema-id: {t['id']}
tipo-pagina: tema
---

::: {{.aviso-esqueleto}}
**Pendiente de desarrollo.** Este tema ({parte_titulo}) forma parte del temario oficial de la
guía docente, pero todavía no tiene contenido. Su estructura de apartados se fijará cuando se
desarrolle; no se rellena con texto genérico.
:::
"""


def esqueleto_laboratorio(lab: dict) -> str:
    codigo = lab["id"].upper()
    return f"""---
title: {json.dumps(f"{codigo} · {lab['titulo']}", ensure_ascii=False)}
tema-id: {lab['id']}
tipo-pagina: laboratorio
---

::: {{.aviso-esqueleto}}
**Pendiente de desarrollo.** Práctica del programa de la guía docente. Aquí irán la ficha, los
objetivos, las variables, la plantilla de datos y la propuesta de informe. Los datos de los
equipos reales de la UCO se incorporarán cuando el profesorado los facilite: `[PENDIENTE: equipo UCO]`.
:::
"""


def crear_esqueletos(t: dict, raiz: Path, escribir: bool) -> list[str]:
    """Crea lo que falte. Devuelve las rutas que faltaban."""
    faltan = []
    partes = {p["id"]: p["titulo"] for p in t["parte"]}
    for tema in t["tema"]:
        ruta = raiz / "temas" / tema["slug"] / "index.qmd"
        if not ruta.exists():
            faltan.append(str(ruta.relative_to(raiz)))
            if escribir:
                ruta.parent.mkdir(parents=True, exist_ok=True)
                ruta.write_text(esqueleto_tema(tema, partes[tema["parte"]]), encoding="utf-8")
    for lab in t["laboratorio"]:
        ruta = raiz / "laboratorio" / lab["slug"] / "index.qmd"
        if not ruta.exists():
            faltan.append(str(ruta.relative_to(raiz)))
            if escribir:
                ruta.parent.mkdir(parents=True, exist_ok=True)
                ruta.write_text(esqueleto_laboratorio(lab), encoding="utf-8")
    return faltan


def completar_versiones(t: dict, raiz: Path, escribir: bool) -> list[str]:
    existentes = leer_versiones(raiz)
    nuevas = [x["id"] for x in t["tema"] if x["id"] not in existentes]
    if nuevas and escribir:
        ruta = raiz / "_versiones.yml"
        base = ruta.read_text(encoding="utf-8") if ruta.exists() else CABECERA_VERSIONES
        if not base.endswith("\n"):
            base += "\n"
        for i in nuevas:
            base += f'  {i}:\n    version: "0.0.1"\n    estado: esqueleto\n'
        ruta.write_text(base, encoding="utf-8")
    return nuevas


CABECERA_VERSIONES = """# Versión y estado de cada tema. Lo edita una persona (o se añade en esqueleto).
#   estado:            esqueleto | borrador | revisado | publicado
#   revision_tecnica:  fecha AAAA-MM-DD; SOLO si el profesor ha revisado de verdad el tema.
#                      Si falta, la web muestra «revisión técnica pendiente». No inventar fechas.
#   referencias:       claves de recursos/bibliografia.bib, separadas por comas, entre corchetes.
# La fecha de última modificación NO se escribe aquí: sale de git.
versiones:
"""


# --------------------------------------------------------------------------
# Navegación
# --------------------------------------------------------------------------
def titulo_de(ruta: Path) -> str:
    return cabecera(ruta).get("title") or ruta.stem


def _clave(p: Path):
    return (p.name != "index.qmd", p.name)


def listar(directorio: Path, raiz: Path) -> list[dict]:
    """Entradas de barra lateral de un directorio: index, .qmd sueltos y subdirectorios."""
    items: list[dict] = []
    if not directorio.is_dir():
        return items
    hijos = sorted(directorio.iterdir(), key=_clave)
    for p in hijos:
        if p.is_file() and p.suffix == ".qmd" and not p.name.startswith("_") \
                and cabecera(p).get("draft") != "true":
            items.append({"href": str(p.relative_to(raiz)), "text": titulo_de(p)})
    for p in hijos:
        if p.is_dir() and (p / "index.qmd").exists() and not p.name.startswith(("_", ".")):
            sub = listar(p, raiz)
            items.append({"section": titulo_de(p / "index.qmd"), "href": sub[0]["href"],
                          "contents": sub[1:]} if len(sub) > 1 else sub[0])
    return items


def construir(t: dict, raiz: Path) -> dict:
    partes = t["parte"]
    barra = [{"href": "index.qmd", "text": "Inicio"}]
    for p in partes:
        barra.append({"href": f"temas/{p['id']}.qmd", "text": p["menu"]})
    mas = []
    for a in t["area"]:
        if a["menu"] == "barra":
            barra.append({"href": a["indice"], "text": a["titulo"]})
        else:
            mas.append({"href": a["indice"], "text": a["titulo"]})
    barra.append({"text": "Más", "menu": mas})

    laterales = []
    for p in partes:
        contenido = [{"href": f"temas/{p['id']}.qmd", "text": f"{p['titulo']}: índice"}]
        for tema in (x for x in t["tema"] if x["parte"] == p["id"]):
            sub = listar(raiz / "temas" / tema["slug"], raiz)
            cod = tema["id"].upper()
            if not sub:
                continue  # sin carpeta todavía: lo señala --comprobar como «falta el esqueleto»
            if len(sub) == 1:
                contenido.append(sub[0])
            else:
                contenido.append({"section": f"{cod} · {tema['titulo']}", "href": sub[0]["href"],
                                  "contents": sub[1:]})
        laterales.append({"id": p["id"], "title": p["titulo"], "style": "docked",
                          "collapse-level": 1, "contents": contenido})
    for a in t["area"]:
        d = (raiz / a["indice"]).parent
        laterales.append({"id": a["id"], "title": a["titulo"], "style": "docked",
                          "collapse-level": 1, "contents": listar(d, raiz)})
    return {"website": {"navbar": {"left": barra}, "sidebar": laterales}}


# --- emisor YAML mínimo (suficiente para esta estructura) ---
def _escalar(v) -> str:
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return json.dumps(v, ensure_ascii=False)


def a_yaml(obj, nivel: int = 0) -> list[str]:
    sangria = "  " * nivel
    lineas: list[str] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, (dict, list)) and v:
                lineas.append(f"{sangria}{k}:")
                lineas += a_yaml(v, nivel + 1)
            elif isinstance(v, (dict, list)):
                lineas.append(f"{sangria}{k}: []")
            else:
                lineas.append(f"{sangria}{k}: {_escalar(v)}")
    else:
        for el in obj:
            if isinstance(el, dict):
                sub = a_yaml(el, nivel + 1)
                sub[0] = f"{sangria}- " + sub[0].lstrip()
                lineas += sub
            else:
                lineas.append(f"{sangria}- {_escalar(el)}")
    return lineas


def texto_navegacion(t: dict, raiz: Path) -> str:
    cab = "# GENERADO por scripts/generar_estructura.py desde temario.toml. No editar a mano.\n"
    return cab + "\n".join(a_yaml(construir(t, raiz))) + "\n"


def pagina_parte(parte: dict, t: dict, raiz: Path) -> str:
    versiones = leer_versiones(raiz)
    filas = []
    for tema in (x for x in t["tema"] if x["parte"] == parte["id"]):
        estado = versiones.get(tema["id"], {}).get("estado", "esqueleto")
        enlace = f"[{tema['titulo']}]({tema['slug']}/index.qmd)"
        filas.append(f"| {tema['id'].upper()} | {enlace} | {estado} |")
    tabla = "\n".join(filas)
    return f"""---
title: {json.dumps(parte['titulo'], ensure_ascii=False)}
---

{CABECERA_GENERADO}

Temas de la parte **{parte['titulo']}** según la guía docente 2026/27. Los títulos son los
oficiales; los apartados internos de cada tema son propuesta docente.

| Tema | Título | Estado |
|---|---|---|
{tabla}

Estados: *esqueleto* (solo título), *borrador* (desarrollado, sin revisión del profesor),
*revisado* y *publicado*.
"""


def archivos_generados(t: dict, raiz: Path) -> dict[Path, str]:
    salida = {raiz / "_navegacion.yml": texto_navegacion(t, raiz)}
    for p in t["parte"]:
        salida[raiz / "temas" / f"{p['id']}.qmd"] = pagina_parte(p, t, raiz)
    return salida


# --------------------------------------------------------------------------
# Comprobaciones
# --------------------------------------------------------------------------
def comprobar(t: dict, raiz: Path) -> list[str]:
    errores: list[str] = []
    for f in crear_esqueletos(t, raiz, escribir=False):
        errores.append(f"falta el esqueleto {f}")
    for i in completar_versiones(t, raiz, escribir=False):
        errores.append(f"falta la entrada «{i}» en _versiones.yml")
    versiones = leer_versiones(raiz)
    for i, v in versiones.items():
        if i not in {x["id"] for x in t["tema"]}:
            errores.append(f"_versiones.yml: «{i}» no está en temario.toml")
        if v.get("estado") not in ESTADOS:
            errores.append(f"_versiones.yml: estado no válido en «{i}»: {v.get('estado')!r}")
        if "version" not in v:
            errores.append(f"_versiones.yml: «{i}» sin version")
    for x in t["tema"] + t["laboratorio"]:
        base = "temas" if x in t["tema"] else "laboratorio"
        idx = raiz / base / x["slug"] / "index.qmd"
        if idx.exists():
            c = cabecera(idx)
            if c.get("tema-id") != x["id"]:
                errores.append(f"{idx.relative_to(raiz)}: tema-id es {c.get('tema-id')!r}, debería ser {x['id']!r}")
    for a in t["area"]:
        if not (raiz / a["indice"]).exists():
            errores.append(f"falta la página de entrada del área: {a['indice']}")
    for ruta, texto in archivos_generados(t, raiz).items():
        if not ruta.exists() or ruta.read_text(encoding="utf-8") != texto:
            errores.append(f"{ruta.relative_to(raiz)} está desfasado: ejecuta scripts/generar_estructura.py")
    return errores


def main(argv: list[str]) -> int:
    t = cargar_temario()
    if "--comprobar" in argv:
        errores = comprobar(t, RAIZ)
        for e in errores:
            print("ERROR:", e)
        if errores:
            return 1
        print("Estructura coherente con temario.toml.")
        return 0
    for f in crear_esqueletos(t, RAIZ, escribir=True):
        print("creado", f)
    for i in completar_versiones(t, RAIZ, escribir=True):
        print("añadido a _versiones.yml:", i)
    # las páginas de parte dependen de _versiones.yml: ya completo
    (RAIZ / "temas").mkdir(exist_ok=True)
    for ruta, texto in archivos_generados(t, RAIZ).items():
        ruta.write_text(texto, encoding="utf-8")
        print("escrito", ruta.relative_to(RAIZ))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
