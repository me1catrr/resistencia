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
| E2 · Infraestructura Quarto | Pendiente | — |
| E3 · Navegación completa y esqueletos | Pendiente | — |
| E4 · Diseño visual y modo clase | Pendiente | — |
| E5 · Cuestionarios y simulaciones (sistemas) | Pendiente | — |
| E6 · Tema E01 (piloto) | Pendiente | — |
| E7 · Simulador E01 y código Julia/Python | Pendiente | — |
| E8 · Sesión, laboratorio, evaluación, Moodle | Pendiente | — |
| E9 · Pruebas, CI y cierre | Pendiente | — |

## Hechos comprobados (26/10/2026)

- Guía docente copiada en `referencias/guia-docente-2026-27.pdf` (privada; SHA-256 `eeab937b1ca9239087f71dc18d517418145f97eb0b55a48093df41709d0e3857`, igual que el original).
- `git ls-remote https://github.com/me1catrr/resistencia` → código 0 y sin referencias: el remoto parece existir pero vacío. No confirmado por HTTP.
- `~/Desktop/resistencia` ya no existe (lo borró el usuario).
- Herramientas: Quarto 1.10.19, Julia 1.12.3, Python 3.15.0, Node 26. `gh` con token de `me1catrr` caducado (el usuario tendría que ejecutar `gh auth login`).

## Pendientes y bloqueos

- **Remoto `origin` sin configurar.** El usuario lo autorizó, pero el clasificador de permisos de Claude Code bloqueó `git remote add origin https://github.com/me1catrr/resistencia.git`. Lo puede ejecutar el usuario directamente, o añadir una regla de permiso de Bash en su configuración.
- `LICENSE-CONTENIDO` lleva un aviso y los enlaces oficiales, pero **falta incorporar el texto legal completo** de CC BY-SA 4.0 (copiarlo de la URL oficial sin modificarlo).
- Verificar que no queda nada nuevo del proyecto en iCloud.
- Verificar con búsqueda web las referencias de la guía antes de citarlas con datos finos (E6).
