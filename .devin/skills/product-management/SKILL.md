---
name: product-management
description: >
  Análisis de requerimientos, historias de usuario, criterios de aceptación,
  reglas de negocio, alcance, MVP y priorización para SAC+. Usar en tareas que
  definan features nuevas, cambien comportamiento de negocio, estimen
  esfuerzo o requieran documentar decisiones de producto — también al decir
  "requerimiento", "user story", "MVP", "alcance", "priorizar".
---

# Product Management — SAC+

SAC+ es una plataforma SaaS multi-tenant (ERP modular) cuyo vertical actual
es un restaurante japonés con POS, kiosco, KDS y fichas. Futuro vertical
posible: clínica de audífonos (NO cliente confirmado).

## Antes de proponer una feature

1. **Leer el contexto**: `store-fe/docs/03-todos.md` (happy path),
   `store-be/docs/08-mvp-and-roadmap.md`, `store-be/docs/13-modules-and-permissions.md`.
2. **Identificar el tenant afectado**: ¿core de plataforma o módulo de un
   vertical? ¿Qué roles lo usan (SUPERADMIN, ADMIN, MANAGER, EMPLOYEE,
   KITCHEN, CUSTOMER)?
3. **Definir reglas de negocio**: quién puede hacerlo, en qué canal
   (POS/KIOSK), qué estados/transiciones aplica, qué pasa con inventario,
   pagos y tickets.

## Formato de requerimiento

Toda feature nueva debe documentarse con:

- **Historia**: Como `<rol>` quiero `<acción>` para `<beneficio>`.
- **Criterios de aceptación**: verificables, idealmente mapeados a endpoint
  o pantalla concreta.
- **Reglas de negocio**: validaciones, casos borde, permisos por rol.
- **Fuera de alcance**: qué NO incluye (evita scope creep).
- **Prioridad**: blocker / alto / medio / futuro.

## Priorización

Orden sugerido del proyecto: primero completitud del vertical restaurante
(corte de caja, bitácora, inventario real), luego enforcement de módulos/
planes, luego nuevos verticales. No proponer features de clínica de
audífonos salvo que sean fundación arquitectónica.

## Entregables

- TODOs en `store-fe/docs/03-todos.md` con metadata (prioridad, dependencias,
  criterios de aceptación, skill relevante).
- Si cambia arquitectura: ADR en `store-be/docs/` o sección en el doc
  correspondiente + actualizar `SAC_AUDIT_REPORT.md` si aplica.
