---
name: testing-qa
description: >
  Estrategia de pruebas para SAC+: unitarios JUnit/Mockito en store-be,
  typecheck/lint en store-fe, integración, aislamiento multi-tenant, gates
  de CI y criterios de "done". Usar al escribir o revisar tests, definir
  coverage o evaluar si una tarea está completa — también al decir "test",
  "prueba", "cobertura", "QA", "CI".
---

# Testing & QA — SAC+

## Estado actual

**store-be**: ~40 tests JUnit5 + Mockito (`*Test.java` junto a services).
Cubren: AuthService (rate limit, login), OrderService (creación, estados,
stock, refunds, idempotencia), ReportService (agregados), StoreService
(scoping), RateLimiter, GlobalExceptionHandler. **Sin H2** — no hay tests
de repositorio/DB reales en CI.

**store-fe**: sin suite de tests de componentes. Verificación = `tsc
--noEmit` + `eslint` + prueba manual en `pnpm dev`.

**CI**: Railway corre `mvnw install` (compila tests) en deploy; no hay
pipeline de CI separado con gates.

## Pirámide objetivo

```
        E2E (futuro: Playwright/Cypress)
      Integración (futuro: @DataJpaTest/@SpringBootTest con Testcontainers)
    Unitarios (actual: services con Mockito)
  Typecheck+Lint (actual front)
```

## Reglas

1. **"Done" = código + tests + verificación**, no solo compila.
   Backend: `./mvnw -q -DskipTests compile` + `./mvnw -q test`.
   Frontend: `npx tsc --noEmit` + `npx eslint <tocados>`.
2. **Todo cambio de firma/lógica de service actualiza `src/test/` en el
   mismo commit** (regla de AGENTS.md — Railway compila tests).
3. **Tests de negocio críticos** (donde está el dinero):
   - Órdenes: stock, totales con impuesto, TOKEN canje, cancelación+refund,
     idempotencia, folio único.
   - Auth: rate limit, roles, sessionHours, token_version.
   - Scoping: usuario de tienda A NO ve órdenes/usuarios de tienda B;
     MANAGER no accede a tienda no asignada.
4. **Tests de autorización negativa**: por cada endpoint nuevo, probar
   rol sin permiso → 403 y tenant ajeno → 403/404.
5. **Frontend**: cuando se justifique, agregar Vitest + React Testing
   Library para lógica de `lib/` (cálculos de dinero en centavos,
   `apiErrorMessage`, paginación). Componentes visuales: prueba manual.
6. **Regresión**: antes de release, smoke manual del happy path:
   login → catálogo → orden POS → KDS → corte (futuro) → reporte.

## Cobertura mínima por tipo de cambio

| Cambio | Test requerido |
|---|---|
| Nuevo endpoint/service | unitario de lógica + autorización negativa |
| Cambio de cálculo (impuestos, totales, stock) | unitario con casos borde |
| Nuevo código de error | `err.<CODE>` en i18n + test de mapeo si aplica |
| Query agregada nueva | test con mocks verificando shape de `Object[]` |
| Frontend lógica pura | Vitest cuando exista; mientras, verificación manual |

## Pendientes de calidad (del audit)

- [ ] Testcontainers/PostgreSQL real para repositories críticos.
- [ ] Suite E2E del happy path (login → orden → ticket).
- [ ] CI pipeline con `mvnw test` + `tsc` + `eslint` como gate.
- [ ] Mutation/coverage report (Jacoco) para visibilidad.
