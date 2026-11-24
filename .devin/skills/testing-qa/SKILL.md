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

**store-be**: ~62 tests. Unitarios JUnit5 + Mockito (`*Test.java` junto a
services) + `security/CrossTenantIsolationTest` (HP-QA-05) +
`repository/PostgresRepositoryIT` (HP-QA-04: `@DataJpaTest` + Testcontainers
`postgres:16-alpine`, 7 tests sobre folio semanal, agregados, idempotencia y
soft-delete; requiere Docker — `docker-java 3.7.0` + `api.version=1.44` en
el bloque `static` para Docker Desktop Engine ≥28).

**store-fe**: 33 tests Vitest (`pnpm test`, `vitest.config.mts`, alias `@/`):
`lib/` (centavos, session, settings, log.redact, branding, password) +
`pos/_components/terminal-utils`. **E2E**: Playwright
(`e2e/happy-path.spec.ts`, `pnpm test:e2e`) — login → cobro POS → KDS →
recibo, contra el stack real (:8080 + Postgres) con fixture `e2e/seed.sql`
(tenant 9001, `e2e@sac.test`/`e2e-super-secret`). Gate local; en CI falta
levantar `store-be` en el runner.

**CI**: `.github/workflows/ci.yml` en ambos repos (push `main` + PRs):
`mvnw test` en store-be; `pnpm typecheck` + `lint` + `test` en store-fe.

## Pirámide

```
        E2E (Playwright, local — `pnpm test:e2e`)
      Integración (@DataJpaTest + Testcontainers — PostgresRepositoryIT)
    Unitarios (JUnit/Mockito back · Vitest front `lib/`)
  Typecheck+Lint (CI en cada PR)
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
5. **Frontend**: lógica pura nueva en `lib/`/`_components/*-utils` va con
   test Vitest. Componentes visuales: E2E si es flujo crítico, si no,
   prueba manual.
6. **Regresión**: antes de release, `pnpm test:e2e` cubre el happy path
   (login → orden POS → KDS → recibo); corte/reporte sigue manual.

## Cobertura mínima por tipo de cambio

| Cambio | Test requerido |
|---|---|
| Nuevo endpoint/service | unitario de lógica + autorización negativa |
| Cambio de cálculo (impuestos, totales, stock) | unitario con casos borde |
| Nuevo código de error | `err.<CODE>` en i18n + test de mapeo si aplica |
| Query agregada nueva | test con mocks verificando shape de `Object[]` |
| Frontend lógica pura | Vitest (`pnpm test`) |
| Flujo crítico de UI | caso en `e2e/` (Playwright) |

## Pendientes de calidad (del audit)

- [ ] E2E en CI (requiere levantar `store-be` + Postgres en el runner).
- [ ] Mutation/coverage report (Jacoco) para visibilidad.
