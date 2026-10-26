# RESISTENCIA

Libro interactivo de **Elasticidad y Resistencia de Materiales II** (280003) · Grado en Ingeniería Mecánica · Universidad de Córdoba (EPSC, Departamento de Mecánica). Hecho con [Quarto](https://quarto.org/). Pensado para seguirse en clase desde el ordenador y para estudiar después: explicaciones rigurosas, simulaciones, cuestionarios y código en Julia y Python.

- Web prevista: <https://me1catrr.github.io/resistencia/> (todavía **sin publicar**).
- Repositorio previsto: <https://github.com/me1catrr/resistencia>.
- Coordinador: Rafael Castro Triguero.

> **Estado: primera iteración en construcción (v0.1.0).** Es un recurso docente abierto y **no sustituye a la guía docente oficial** de la asignatura. Solo el tema E01 se desarrolla en esta iteración; E02–R13 son esqueletos. Los contenidos generados con ayuda de IA son **borradores pendientes de revisión del profesorado**.

## Contenido

13 temas: **Elasticidad** (E01 Estado de tensiones en el espacio · E02 Estado plano de tensiones · E03 Análisis de la deformación · E04 Relación entre tensiones y deformaciones · E05 Teoremas energéticos · E06 Criterios de agotamiento) y **Resistencia de Materiales** (R07 Tensiones normales · R08 Tensiones tangenciales en la flexión · R09 Deformaciones en flexión · R10 Flexión hiperestática · R11 Torsión uniforme · R12 Pandeo · R13 Acciones combinadas). Además: problemas, cuatro prácticas de laboratorio, simulaciones, programación, matemáticas, autoevaluación, historia y recursos.

Dos itinerarios: **A** (curso oficial) y **B** (profundización opcional, diferenciado visualmente).

## Estructura del repositorio

```
resistencia/
├── CLAUDE.md  AGENTS.md  README.md  CONTINUIDAD.md
├── LICENSE (MIT)  LICENSE-CONTENIDO (CC BY-SA 4.0)  CITATION.cff
├── _quarto.yml  temario.toml  _navegacion.yml (generado)  _versiones.yml
├── index.qmd  guia/  proyecto/
├── temas/  problemas/  laboratorio/  simulaciones/  programacion/
├── matematicas/  autoevaluacion/  historia/  recursos/
├── Resistencia.jl/   python/   scripts/   pruebas/   moodle/
├── referencias/  privado/        (en .gitignore: nunca se publican)
└── .github/workflows/
```

Las carpetas se van creando por etapas; ver [CONTINUIDAD.md](CONTINUIDAD.md) para saber qué existe ya.

## Requisitos

| Para… | Necesitas |
|---|---|
| Leer la web | Un navegador. Nada más. |
| Construir el sitio | [Quarto](https://quarto.org/docs/get-started/) 1.10.x, Python 3 (solo biblioteca estándar) y, para las figuras TikZ, LuaLaTeX/pdflatex y `dvisvgm` |
| Ejecutar el código Julia | [Julia](https://julialang.org/downloads/) 1.12 (solo biblioteca estándar) |
| Ejecutar el código Python | Python 3 con `numpy` (y `pytest` para las pruebas; `matplotlib` opcional) |
| Pruebas JS | Node 26 (sin dependencias) |

Versiones con las que se desarrolla: Quarto 1.10.19, Julia 1.12.3, Python 3.15, Node 26.

## Trabajo en varios equipos

El repositorio **no debe vivir en una carpeta de iCloud** (Escritorio, Documentos…): crea duplicados `* 2.*` y ralentiza todo. Usa `~/Proyectos/` y sincroniza solo con Git:

```sh
git clone https://github.com/me1catrr/resistencia.git ~/Proyectos/resistencia
cd ~/Proyectos/resistencia
git pull                     # antes de empezar
# … trabajar …
git add -A && git commit -m "E?: descripción"
git push                     # al terminar, si está autorizado
```

Las carpetas `referencias/` y `privado/` no se versionan: cópialas a mano entre equipos si las necesitas.

## Cómo se construye (previsto)

```sh
quarto render          # genera _site/ y ejecuta la guarda de publicación
quarto preview         # servidor local con recarga
```

Pruebas disponibles: `python3 -m unittest discover -s pruebas/herramientas` y
`node --test "recursos/js/**/*.test.js"` (ver `CLAUDE.md` para el resto).

Las páginas **no ejecutan código al renderizar**: las cifras salen de `pruebas/referencia/*.json` (generado por Julia y verificado con Python y JS).

## Contribuir y normas

Lee [CLAUDE.md](CLAUDE.md): contiene las reglas de originalidad, trazabilidad bibliográfica, convenciones de signos y control de cambios que aplican a personas y a agentes.

## Licencias

- Código: [MIT](LICENSE).
- Contenidos (texto, figuras originales, ejercicios): [CC BY-SA 4.0](LICENSE-CONTENIDO).
- El material de terceros indica su propia procedencia y licencia.

Para citar el proyecto, ver [CITATION.cff](CITATION.cff).
