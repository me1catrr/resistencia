# CONTINUIDAD

Registro de estado para retomar el trabajo en otra sesión. **Actualízalo al cerrar cada etapa.** Plan completo (fuera del repo): `~/.claude/plans/pasted-content-id-0a79-prompt-zesty-frost.md`. Para retomar: «Lee `CLAUDE.md` y `CONTINUIDAD.md` y continúa desde la siguiente etapa pendiente».

## Decisiones del usuario (vigentes)

- Commits locales al cerrar cada etapa validada. **Nunca push** sin autorización.
- Licencias: MIT (código) y CC BY-SA 4.0 (contenidos).
- Repositorio central `me1catrr/resistencia` (público, sin fork). Copia local en `~/Proyectos/resistencia`, fuera de iCloud. No se hace push ni se activa Pages sin autorización.
- FigureLabs: máximo 10 ilustraciones, conceptuales y revisadas técnicamente.
- El 26/10/2026 el usuario autorizó verbalmente añadir `origin` (ver «Pendientes»).

## Estado por etapas

| Etapa | Estado | Verificado con |
|---|---|---|
| Fase 0 · Traslado y comprobaciones | Hecha (26/10/2026) | `pwd`, `git status`, `git ls-remote`, SHA-256 de la guía |
| E1 · Gobierno del proyecto | Hecha (26/10/2026) | Revisión manual de los archivos; sin código que probar |
| E2 · Infraestructura Quarto | Hecha (26/10/2026) | `quarto render` sin avisos; `unittest` 15/15 |
| E3 · Navegación completa y esqueletos | Hecha (26/10/2026) | `generar_estructura.py --comprobar`; 35 páginas renderizadas |
| E4 · Diseño visual y modo clase | Hecha salvo revisión visual (26/10/2026) | contraste y lógica del modo clase en `node --test`; **sin revisar en navegador real** |
| E5 · Cuestionarios y simulaciones (sistemas) | Hecha salvo revisión en navegador (26/10/2026) | `node --test` 43/43 (DOM simulado); estructura HTML comprobada en `_site-pruebas` |
| E6 · Tema E01 (piloto) | **Borrador completo** (26/10/2026): 12 apartados + ejemplos, simulador, 27 cuestiones, código, defensa oral y sesión | render sin avisos; sin revisar en navegador; **pendiente de revisión del profesorado** |
| E7 · Simulador E01 y código Julia/Python | Hecha salvo prueba en navegador | Julia 1884, Python 11, JS 66 comprobaciones; `--comprobar` de TikZ y estructura |
| E8 · Sesión, laboratorio, evaluación, Moodle | Parcial: sesión de 90 min y banco de defensa oral de E01 hechos; **faltan** fichas de laboratorio, propuesta de evaluación oral, Moodle XML y `proyecto/moodle.qmd` | — |
| E9 · Pruebas, CI y cierre | Parcial: `publish.yml` (pruebas JS/Python de herramientas + render + Pages) creado; **faltan** Julia/pytest/Playwright en CI y comprobación de enlaces | — |

## Hechos comprobados (26/10/2026)

- Guía docente copiada en `referencias/guia-docente-2026-27.pdf` (privada; SHA-256 `eeab937b1ca9239087f71dc18d517418145f97eb0b55a48093df41709d0e3857`, igual que el original).
- `git ls-remote https://github.com/me1catrr/resistencia` → código 0 y sin referencias: el remoto parece existir pero vacío. No confirmado por HTTP.
- `~/Desktop/resistencia` ya no existe (lo borró el usuario).
- Herramientas: Quarto 1.10.19, Julia 1.12.3, Python 3.15.0, Node 26. `gh` con token de `me1catrr` caducado (el usuario tendría que ejecutar `gh auth login`).

## Decisiones de contenido de E01 (propuesta mía, pendiente de tu validación)

- Estructura de 12 apartados que reordena tu desglose: cambio de ejes **antes** de tensiones principales e invariantes; equilibrio interno **después** del tensor y de la fórmula de Cauchy y junto a las condiciones de contorno; octaédricas **después** de esférico/desviador; estados cilíndrico y esférico agrupados en «Estados particulares». Cuádricas de Lamé/Cauchy en recuadro de profundización.
- Se usa «desviador» (no «esviador»).
- Tensor común de los ejemplos 2–5: σ_A = [[24,48,0],[48,−4,0],[0,0,20]] MPa (principales exactas 60, 20, −40). Plano oblicuo n = (1,2,2)/3: σn = 280/9, τ = 200√2/9.
- Convención de signo de autovectores: v1 y v2 con primera componente no nula positiva y v3 = v1×v2 (base dextrógira), en las tres implementaciones.

## Desviaciones respecto al plan (y por qué)

- **`referencias.lua` no se ha portado:** la lista de referencias final la hace Quarto de serie (`citation-location` por defecto); el filtro de RESONANCIA solo hacía falta con citas al margen.
- **`_brand.yml` sustituido** por dos temas SCSS (`recursos/css/claro.scss`, `oscuro.scss`) con los tokens de color; la prueba de contraste lee esos archivos.
- **`incluir_codigo` es un shortcode** (`{{< codigo … >}}`), no un filtro: es más explícito.
- **Pruebas de herramientas con `unittest`** (stdlib) en vez de `pytest`: `pytest` no está instalado; las recoge igualmente.
- **`render` en lista blanca** de carpetas, y perfil `pruebas` para la página de prueba de componentes.
- La fecha de última modificación de cada tema sale de git; mientras haya cambios sin confirmar se indica así.

## Pendientes y bloqueos

- **Remoto `origin` sin configurar.** El usuario lo autorizó, pero el clasificador de permisos de Claude Code bloqueó `git remote add origin https://github.com/me1catrr/resistencia.git`. Lo puede ejecutar el usuario directamente, o añadir una regla de permiso de Bash en su configuración.
- `LICENSE-CONTENIDO` lleva un aviso y los enlaces oficiales, pero **falta incorporar el texto legal completo** de CC BY-SA 4.0 (copiarlo de la URL oficial sin modificarlo).
- **Revisión visual y en navegador real pendiente** (portada, modo claro/oscuro, modo clase, ejercicios, móvil): Chromium headless se queda colgado en esta máquina y el sandbox no permite abrir un puerto local (`sandbox.network.allowLocalBinding: true` lo permitiría). Abrir `_site/` con `quarto preview` o `_site-pruebas/pruebas/web/componentes.html`.
- `pytest` y Playwright no están instalados; hará falta un `.venv` (con `uv`, requiere red) para E9.
- Verificar que no queda nada nuevo del proyecto en iCloud.
- Bibliografía: 6 fichas verificadas («sí»), 6 «parcial» y 1 «no» (Granados Romera/Garceta, no localizada). París Carballo y Vázquez Fernández (de la guía) siguen «parcial»: falta contrastarlas con catálogo. Las fuentes históricas (Cauchy 1823/1827, Mohr 1882, Lamé 1852, Timoshenko) no se han leído; se citan con cautela.
- Nomenclatura de las cuádricas «indicatriz/directriz» por contrastar con Ortiz Berrocal y Rodríguez-Avial (marcador en `08-lame.qmd`).
- `Pkg.test()` no se puede ejecutar en el sandbox (pide el registro por red): las pruebas de Julia se ejecutan directamente con `julia --project=Resistencia.jl Resistencia.jl/test/runtests.jl`.
- FigureLabs: 1 imagen generada y no incluida (ver `recursos/fig/REGISTRO-FIGURELABS.md`); las figuras de E01 son TikZ originales.

## FASE DE MEJORA DE E01 — HECHA (26/10/2026), pendiente de tu revisión

Hecho y verificado (render sin avisos; Julia 1896, Python 13, JS 67, herramientas 24; `--comprobar` de estructura y de las 20 figuras TikZ;
`node scripts/revisar_navegador.mjs` sin problemas a 390, 768 y 1200 px: sin errores de consola, de Observable JS ni desbordamiento):

1. Cajas ámbar «Datos históricos» con citas al margen y lista final de referencias (`referencias.lua`).
2. Cajas rojas «Ojo: errores frecuentes en el alumnado» en los apartados 01–12 y en los ejemplos (lenguaje inclusivo).
3. Código de los casos particulares dentro del tema (pestañas Julia / Python) en los apartados 03, 05, 06, 07, 09, 10 y 11.
4. Simulaciones en Observable JS en cada apartado (01–12) y simulador completo en `14-simulador`; catálogo en `simulaciones/index.qmd`.
   Física en módulos puros con pruebas (`recursos/js/sim/ojs-e01.js`).
5. Figuras con letra mayor (12 pt) y ancho proporcional; 20 figuras TikZ, varias con datos calculados por Julia (`recursos/tikz/datos/*.dat`, incluidos en el sello SHA-256).
6. FigureLabs: una prueba generada y **no usada** (ver `recursos/fig/REGISTRO-FIGURELABS.md`).
7. Herramientas: `scripts/captura.mjs` (capturas) y `scripts/revisar_navegador.mjs` (revisión automática en navegador real; comparten `scripts/lib/navegador.mjs`).

Pendiente de la mejora de E01:
- Revisión visual humana de todas las páginas (modo oscuro, modo clase) y revisión técnica del profesorado (E01 sigue en `borrador`).
- Decidir si se revisa/descarga la imagen de FigureLabs.
- Nomenclatura «indicatriz/directriz» de las cuádricas por contrastar.

Siguiente: con tu visto bueno, replicar el patrón en E02…; luego E8 (laboratorio, evaluación oral, Moodle) y E9 (CI con Julia/pytest/Playwright y enlaces).
Restricción permanente: `git push` solo con autorización expresa; commits locales por etapa.
