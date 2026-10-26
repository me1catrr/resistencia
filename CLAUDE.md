# CLAUDE.md — RESISTENCIA

Reglas **obligatorias** para cualquier sesión de Claude Code (o de otro agente) en este repositorio. Si algo de aquí choca con una petición puntual del usuario, manda el usuario; si choca con tu criterio, mandan estas reglas.

## Qué es este proyecto

Libro interactivo en Quarto (publicable en GitHub Pages) para *Elasticidad y Resistencia de Materiales II* (código 280003), Grado en Ingeniería Mecánica, 2.º curso 2.º cuatrimestre, Universidad de Córdoba (EPSC, Departamento de Mecánica). Coordinador: Rafael Castro Triguero. Repositorio previsto: `me1catrr/resistencia`. Web prevista: `https://me1catrr.github.io/resistencia/`.

Es un recurso docente abierto. **No sustituye a la guía docente oficial.** Los temas son 13: E01–E06 (Elasticidad) y R07–R13 (Resistencia de Materiales). Solo E01 es contenido desarrollado en la primera iteración; E02–R13 son esqueletos navegables marcados «pendiente de desarrollo» y **no se rellenan con contenido genérico**.

Itinerarios: **A** (curso oficial) y **B** (profundización, opcional y visualmente diferenciado, nunca imprescindible para A).

## Arranque de sesión

1. Lee `CONTINUIDAD.md` (estado, decisiones, pendientes).
2. Comprueba `pwd`, `git status`, `git log --oneline -10`.
3. El trabajo debe estar en `~/Proyectos/resistencia`. **No trabajar en carpetas sincronizadas con iCloud** (Escritorio, Documentos): provocan duplicados `* 2.*` y lentitud. Si `pwd` está en iCloud, para y avisa.

## Fuente académica y qué es «oficial»

- Fuente primaria: guía docente 2026/27 en `referencias/guia-docente-2026-27.pdf` (**privada**, no se publica ni se versiona).
- La guía fija los 13 temas **solo por título**. Los apartados internos (E01.0–E01.13…) son **propuesta docente**, y así se rotulan.
- Distingue siempre, en el texto y en los metadatos: contenido obligatorio de la guía · recurso complementario · ampliación opcional (itinerario B) · propuesta metodológica no aprobada.
- No inventes competencias, resultados de aprendizaje ni criterios de evaluación. Competencias de la guía: COM02, C01, C24, HD01, HD18. Evaluación: examen 80 %, medios orales 10 %, producciones 10 %.
- Uso de IA permitido con transparencia: el contenido generado con IA se declara y **no se presenta como revisado por el profesor**.

## 1. Originalidad y propiedad intelectual

Todo el contenido es original. Prohibido:

- copiar literalmente capítulos de libros protegidos o párrafos extensos de páginas web;
- copiar ejercicios, figuras o soluciones de terceros sin licencia compatible o autorización;
- traducir contenido protegido y presentarlo como propio, o reproducir figuras con retoques superficiales;
- usar material generado por IA sin revisión técnica;
- inventar referencias o atribuir afirmaciones a autores sin comprobarlas;
- reutilizar imágenes sin comprobar derechos y atribución.

Permitido: explicar conceptos conocidos con redacción propia, derivaciones independientes, ejemplos originales y figuras diseñadas para el proyecto. Las ecuaciones estándar son de uso libre, pero su explicación y organización han de ser originales. Un resultado, método o hecho histórico atribuido a una fuente concreta se cita.

Licencias: **MIT** (código) y **CC BY-SA 4.0** (contenidos). Todo lo incorporado debe ser compatible.

## 2. Referencias y trazabilidad

- Bibliografía central: `recursos/bibliografia.bib` (BibTeX).
- Cada entrada lleva el campo `verificado`: `{sí: <cómo y cuándo>}` o `{no: <motivo>}`. Una entrada `no` **no puede respaldar afirmaciones** del texto.
- **Prohibido inventar** DOI, páginas, ediciones, años o URL. Si no se puede verificar, se omite el campo.
- Recursos web: URL estable y fecha de consulta.
- Distingue fuentes primarias, bibliografía de consulta y material complementario.
- Figuras de terceros: procedencia, licencia y condiciones en el pie. Preferir figuras originales (TikZ, SVG, gráficos programáticos).
- Bibliografía de la guía: Rodríguez-Avial Llardent (2023, UNED); Ortiz Berrocal (1998); Vázquez Fernández (1999); París Carballo (1998). Verificar cada una antes de citarla con datos finos.

## 3. Rigor matemático y físico

Convenciones **fijas** (no cambiarlas a mitad de proyecto; si hay que cambiarlas, se cambian en todo el repositorio y en las tres implementaciones a la vez):

| Aspecto | Convención |
|---|---|
| Signo | Tracción positiva |
| Índices | $\sigma_{ij}$: el primer índice es la normal del plano; el segundo, la dirección de la componente |
| Orden de principales | $\sigma_1 \ge \sigma_2 \ge \sigma_3$ |
| Unidades | Tensiones en MPa; longitudes en mm (fuerzas en N) |
| Cambio de base | $Q$ tiene **por filas** los vectores de la nueva base; $\sigma' = Q\,\sigma\,Q^\mathsf{T}$ |
| Rotaciones | Se distingue siempre entre **rotación de ejes** y **rotación física del elemento** |
| Simetría | $\sigma_{ij}=\sigma_{ji}$ solo bajo la hipótesis clásica (sin pares distribuidos); decláralo |

Reglas:

- Verifica toda expresión. Contrasta con un método independiente siempre que se pueda.
- No confundas tensiones con esfuerzos resultantes, ni deformaciones con desplazamientos. Distingue escalar, vector y tensor.
- Di cuándo una fórmula es general y cuándo depende de hipótesis (constitutivas, geométricas, de contorno) y de dominio de validez.
- Los números del texto **no se teclean a mano**: salen del JSON de referencia con el shortcode `{{< num … >}}`.

## 4. Calidad del código

- Julia y Python reproducibles; **ningún resultado numérico inventado**.
- Pruebas automáticas para los algoritmos principales, con casos de solución conocida.
- Separa cálculo científico y representación gráfica.
- Dependencias mínimas y justificadas, con versiones documentadas. Julia: solo stdlib (`LinearAlgebra`, `Test`). Python: `numpy` y `pytest` (matplotlib opcional). JS: sin dependencias. Herramientas del sitio: biblioteca estándar de Python.
- **Tres implementaciones independientes** del cálculo del tensor: Julia (referencia), Python (espejo) y JS (web). Las tres se comparan con `pruebas/referencia/*.json`, generado por Julia.
- **Ninguna página ejecuta código al renderizar** (sin `_freeze`). El código se muestra desde los archivos reales con el filtro `incluir_codigo.lua` (`#region`).
- Sin credenciales, tokens, datos personales ni información académica protegida en el repositorio.

## 5. Control de cambios (siete pasos)

Antes de tocar archivos importantes: (1) inspecciona el estado actual · (2) identifica dependencias · (3) planifica · (4) implementa · (5) ejecuta pruebas · (6) revisa el resultado visual · (7) documenta.

- No borres ni reestructures directorios sin necesidad justificada.
- **Prohibido sin autorización explícita del usuario:** `git push`, activar o configurar GitHub Pages, crear o modificar el remoto, instalar nada globalmente, operaciones destructivas (`reset --hard`, `clean -fd`, borrados masivos), conexiones reales a Moodle.
- Commits **locales** al cerrar cada etapa validada (render + pruebas en verde). Mensajes en español, imperativo, con prefijo de etapa (`E1:`, `E2:`…). **Nunca push.**
- No afirmes que una prueba ha pasado si no la has ejecutado en esta sesión. Si una herramienta no está disponible, dilo y documéntalo.

## 6. Versionado de contenidos

Cada tema muestra (filtro `version_tema.lua`): identificador, versión, estado, fecha y referencias principales.

- Estados: `esqueleto` → `borrador` → `revisado` → `publicado`.
- **Última modificación:** sale de `git log -1 --format=%cs -- <carpeta>`; sin commits se muestra «pendiente de primer commit».
- **Revisión técnica:** solo aparece si hay entrada en `_versiones.yml`, que escribe una persona tras revisar de verdad. Nunca inventes una fecha de revisión.
- E01 termina como **borrador (pendiente de revisión del profesor)**. Pasar a `revisado` es decisión exclusiva del profesor.

## 7. Material público y privado

- `referencias/` y `privado/` están en `.gitignore`, **fuera del render** y vigilados por `scripts/no_publicar.py` (falla si aparecen en `_site/`, junto con `moodle/` y PDF no autorizados).
- Las preguntas reservadas de examen y sus soluciones van **solo** en `privado/`. En el repositorio público solo hay material de entrenamiento.
- El PDF de la guía no se republica; se enlaza a la guía oficial de la UCO (si el enlace no se puede verificar: marcador `[PENDIENTE]`).

## 8. FigureLabs

- **Cupo máximo: 10 ilustraciones** en total. Solo conceptuales (motivación, portada); los esquemas mecánicos precisos se hacen en TikZ/SVG.
- Antes de usarla, inspecciona las capacidades del MCP. Cada ilustración se revisa técnicamente y se registra en `recursos/fig/REGISTRO-FIGURELABS.md` (fecha, prompt, resultado, revisión, uso). Lleva texto alternativo y pie.
- Sin retratos de personas reales. Sin imágenes decorativas.

## 9. Moodle

Solo diseño y documentación (`moodle/`, `proyecto/moodle.qmd`) y exportación a Moodle XML. Sin conexiones reales, sin tokens, sin datos de estudiantes. No suponer permisos de administrador ni servicios web activos.

## 10. Web pública, privacidad y accesibilidad

- Los cuestionarios son **formativos y locales**: no afirmes que se guardan, sincronizan o califican si no hay integración real. Aviso visible en la web.
- No recopilar datos personales. `localStorage` solo para preferencias (p. ej. modo clase), siempre en `try/catch`.
- Rutas **relativas** (la web cuelga de `/resistencia/`). Sin CDN de fuentes ni de scripts en tiempo de ejecución del aula.
- El color nunca es la única señal. Contraste ≥ 4,5:1 (con prueba). Interacción accesible por teclado; SVG con `role="img"` y descripción; entradas con etiqueta; resultados en región `aria-live`.
- Sin desbordamiento horizontal a 390, 768, 1280 y 1920 px.

## Estructura

Ver el árbol de directorios en `README.md`. Resumen de lo generado vs. fuente: `_navegacion.yml` se **genera** (`scripts/generar_estructura.py` desde `temario.toml`); no se edita a mano. `_site/`, `.quarto/` y `*_files/` no se versionan.

## Comandos habituales

```sh
quarto render                                   # sitio completo → _site/ (ejecuta la guarda no_publicar.py)
quarto render --profile pruebas                 # añade pruebas/web/componentes.qmd → _site-pruebas/ (nunca se publica)
python3 scripts/generar_estructura.py           # regenera _navegacion.yml, temas/elasticidad.qmd, temas/resistencia.qmd y esqueletos
python3 scripts/generar_estructura.py --comprobar
python3 -m unittest discover -s pruebas/herramientas     # herramientas del sitio (también las recoge pytest)
node --test "recursos/js/**/*.test.js"                    # JS: contraste, modo clase, ejercicios, simulaciones
```

Previstos en etapas posteriores: `python3 scripts/compilar_tikz.py --comprobar`, la suite Julia
(`julia --project=Resistencia.jl -e 'using Pkg; Pkg.test()'`) y `pytest python/ pruebas/web/`.

**Entorno restringido (sandbox de Claude Code):** Quarto necesita escribir su caché; si falla con
«unable to open database file», ejecuta `HOME=$TMPDIR/home quarto render`. Un servidor local y
Chromium no arrancan dentro del sandbox: la verificación en navegador real se hace en la máquina del usuario.

## Cómo añadir cosas

- **Carpeta nueva con `.qmd`:** añádela a la lista blanca `project.render` de `_quarto.yml`.
- **Tema o práctica nueva:** `temario.toml` → `generar_estructura.py`. Las páginas con `_` inicial y las `draft: true` no entran en los menús.
- **Bloques:** `::: {.definicion titulo="…"}` (también `teorema`, `ejemplo`, `advertencia`, `idea-clave`, `hipotesis`, `historia`, `para-clase`, `pausa`) y `::: {.profundiza titulo="…"}` para el itinerario B. `.solo-libro` oculta algo en modo clase.
- **Números del texto:** `{{< num e01 ej3.sigma1 dec=1 unidad=MPa >}}` desde `pruebas/referencia/e01.json`. Nunca teclear a mano un resultado.
- **Código mostrado:** `{{< codigo archivo="…" region="…" lang="python" >}}` con marcas `# region nombre` / `# endregion` en el fuente real.
- **Preguntas:** banco `preguntas.yml` por tema, `preguntas: preguntas.yml` en la cabecera de la página y `{{< pregunta e01-q07 >}}` o `{{< pregunta todas clase=true >}}`. A mano: `::: {#id .ejercicio tipo="opcion" nivel="2" respuesta="2"}` (ver cabecera de `scripts/lua/ejercicios.lua`).
- **Simulaciones:** copiar `simulaciones/_plantilla.qmd`; módulo en `recursos/js/sim/<id>.js` con `export function montar(contenedor)`; `{{< simulacion id >}}`.

## Idioma y estilo

Español de España, con todas las tildes. Decimales con coma en el texto (el shortcode `num` los formatea). Los identificadores de código y los términos técnicos pueden ir en su forma original. Texto claro, sin relleno.

## Cierre de sesión

Actualiza `CONTINUIDAD.md`: qué se hizo, qué está verificado y con qué comando, qué falta, decisiones tomadas. Si se acerca un límite de contexto, hazlo antes; no dejes trabajo a medias sin documentar.
