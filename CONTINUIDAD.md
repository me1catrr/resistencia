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
| E6 · Tema E01 (piloto) | **Borrador completo** (26/10/2026): 12 apartados + ejemplos, simulador, 27 cuestiones, código, defensa oral y sesión | render sin avisos; sin revisar en navegador; **pendiente de revisión del profesor** |
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
- No se ha usado FigureLabs (cupo de 10 intactas): las 10 figuras de E01 son TikZ originales.

## FASE DE MEJORA DE E01 (encargo del usuario, 26/10/2026) — LEER ANTES DE CONTINUAR

El usuario pidió **mejorar mucho E01 antes de seguir con otros temas**; E01 es la «fuente de mejora» que luego se replica.
Estado: push de `6fb7a76` hecho por el usuario (la web ya tiene los arreglos de LaTeX). Trabajo de mejora **pendiente**:

1. **Cajas de «datos históricos» más vistosas, con las referencias al lado** (margen). Usar `citation-location: margin`
   (hay que portar `referencias.lua` de `~/Desktop/resonancia/scripts/referencias.lua` para la lista final) y un color propio
   (ámbar/dorado) con comprobación de contraste. Ampliar la historia SOLO con hechos verificados por búsqueda web.
2. **Código de los casos particulares dentro del propio tema** (apartado 11), con pestañas Julia / Python. Crear
   `Resistencia.jl/ejemplos/e01_casos.jl` y `python/ejemplos/e01_casos.py` con `# region casos` y mostrarlos con `{{< codigo >}}`.
   Idem: pestañas de código en los apartados 3, 5, 6, 7, 9, 10 (reutilizando las regiones existentes).
3. **Simulaciones en cada apartado donde correspondan** (no solo en `14-simulador`) y también en el catálogo `simulaciones/`.
   El usuario dice que **las de RESONANCIA quedaban mejor**; las de aquí son JS puro + SVG (`recursos/js/sim/`). Inspeccionar
   cómo eran las de RESONANCIA (`~/Desktop/resonancia`, buscar páginas con simulaciones; `recursos/js/componentes/` solo tiene
   linea-temporal y permisos) y rediseñar: más visuales y más interactivas (deslizadores, vectores sobre el plano, curvas σn(θ), τ(θ)).
4. **Figuras: las letras se ven muy pequeñas.** Pasar los TikZ a 12 pt con etiquetas `\normalsize`, y que cada SVG se muestre con
   un ancho coherente (ancho natural × ~1,6, máx. 100 %) leyendo el `width="…pt"` del SVG desde un filtro Lua.
5. **Cajas ROJAS «Ojo: errores frecuentes en el alumnado»** (lenguaje inclusivo: «alumnado», «estudiantado», sin masculino genérico),
   invitando a revisar los errores típicos. Nueva clase `.errores` en `bloques.lua` + token `--r-rojo` (contraste ≥ 4,5).
   Convertir todas las `.advertencia titulo="Errores frecuentes"`. Pasada de lenguaje inclusivo por todo E01 (profesor→profesorado, etc.).
6. **FigureLabs:** el usuario quiere que se **intente** (no se ha usado nunca; cupo 10). Herramientas cargadas:
   `mcp__claude_ai_FigureLabs__figurelabs_project_bootstrap` / `_illustration` / `_plot` / `_flowchart`. Ideas: motivación
   (eje de transmisión, depósito a presión, unión soldada). Revisar técnicamente cada imagen y registrar en
   `recursos/fig/REGISTRO-FIGURELABS.md`. No retratos de personas reales.
7. **Más figuras con TikZ y Julia:** Julia calcula datos (usando `Resistencia.Tensiones`) → archivos `.dat` → TikZ/pgfplots dibuja.
   Candidatas: σn(θ) y τ(θ) de la barra; nube de planos en el diagrama de Mohr; polar de σn/τ para σA; mapa de color de σn
   sobre la esfera de normales; componentes σ' al girar los ejes (invariantes constantes); depósito, eje a torsión y unión soldada
   (ilustración); elipsoide de Lamé en 3D. Los `.dat` deben entrar en el sello SHA-256 de `scripts/compilar_tikz.py`.
8. **Verificación visual:** Chromium headless se colgó. Probar con más banderas (`--no-first-run --disable-extensions
   --disable-background-networking --disable-component-update --disable-sync --use-gl=swiftshader`, perfil en `/tmp/claude/…`,
   `dangerouslyDisableSandbox`, tiempo límite 40 s). PNG de figuras: `python3 scripts/compilar_tikz.py --vista DIR` y leer el PNG.

Después de E01 mejorado: replicar el patrón en E02…; luego E8 (laboratorio, evaluación oral, Moodle) y E9 (CI/Playwright/enlaces).
Restricciones permanentes: nunca `git push` (lo hace el usuario; mis intentos son denegados); commits locales por etapa.
