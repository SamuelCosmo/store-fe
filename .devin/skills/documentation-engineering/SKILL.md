---
name: documentation-engineering
description: >
  Documentación técnica para SAC+: docs de API, arquitectura, base de datos,
  onboarding, runbooks y actualización del happy path. Usar al crear
  features, cambiar contratos o preparar releases — también al decir
  "documentar", "docs", "README", "runbook", "onboarding", "happy path".
---

# Documentation Engineering — SAC+

## Mapa de documentación vigente

**store-be/docs/** (numerados):
- `02-authentication.md` — JWT, roles, token_version, sessionHours
- `06-database.md` — esquema, entidades, relaciones
- `07-api.md` — referencia de endpoints
- `08-mvp-and-roadmap.md` — MVP, fases, pendientes backend
- `10-frontend-screens.md` — pantallas y flujos
- `11-frontend-integration.md` — contrato front↔back, errores, logging
- `12-client-extras.md` — módulos extra del cliente
- `13-modules-and-permissions.md` — módulos, roles, entitlements
- `14-card-terminals.md` — investigación terminales de pago
- `README.md` — índice

**store-fe/docs/**:
- `03-todos.md` — **happy path** principal (TODOs con ✅/pendientes)
- otros docs de pantallas/convenciones

**Raíz**: `AGENTS.md` (reglas agente), `README.md`, `CLAUDE.md` → AGENTS.

**Skills**: `.devin/skills/*/SKILL.md` — conocimiento operativo para el
agente (este archivo es uno de ellos).

## Reglas de documentación

1. **El código es fuente de verdad** — los docs describen; si difieren,
   el código gana y el doc se corrige.
2. **Todo cambio de contrato API actualiza `07-api.md` + `11-frontend-
   integration.md` + skill `store-api` en el mismo commit.**
3. **Features nuevas → happy path**: marcar completado solo lo verificado;
   agregar pendientes con prioridad/dependencias/criterios.
4. **Decisiones arquitectónicas → documentar el porqué** (sección en doc
   temático o ADR informal en `08-mvp-and-roadmap.md`).
5. **Secrets/credenciales NUNCA en docs** — solo nombres de variables.
6. **Lenguaje**: español para docs de negocio/happy path; inglés para
   commits, código, AGENTS.md, skills técnicas.

## Cuándo actualizar qué

| Cambio | Doc a actualizar |
|---|---|
| Endpoint nuevo/cambiado | `07-api.md`, `11-frontend-integration.md`, skill `store-api` |
| Nueva entidad/relación | `06-database.md` |
| Auth/roles/permisos | `02-authentication.md`, `13-modules-and-permissions.md` |
| Feature completada/pendiente | `03-todos.md` (happy path) |
| Decisión de arquitectura | `08-mvp-and-roadmap.md` o doc temático |
| Skill del agente | `.devin/skills/<name>/SKILL.md` |
| Nueva variable de entorno | `README.md`/`AGENTS.md` + devops-sre skill |
| Proceso operativo | runbook en docs/ o sección en AGENTS.md |

## Estándar de calidad para docs nuevos

- Propósito claro en el título
- Ejemplos de request/response reales (copiados del código, no inventados)
- Estados/enumos completos
- Códigos de error con su `err.<CODE>` del front
- Fecha/versión si es snapshot de una decisión
- Referencias cruzadas a skills relevantes

## Auditoría de documentación (pendiente)

- [ ] `06-database.md` desactualizado (no incluye `token_transactions`,
      `app_logs`, campos nuevos de orders/stores).
- [ ] `10-frontend-screens.md` puede no reflejar todas las pantallas
      actuales.
- [ ] Skill `store-api` es la referencia más actual del contrato —
      mantenerla sincronizada con `07-api.md`.
