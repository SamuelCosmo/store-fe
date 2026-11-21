---
name: database-engineering
description: >
  PostgreSQL 16 para store-be: entidades JPA, relaciones, normalización,
  índices, constraints, migraciones, integridad, aislamiento tenant y
  optimización de queries. Usar en cambios de esquema, entidades, queries
  lentas o decisiones de datos — también al decir "entidad", "tabla",
  "índice", "migración", "esquema", "query".
---

# Database Engineering — store-be (PostgreSQL 16)

## Modelo vigente

- `clients` = tenants · `stores` = establecimientos (branch) ·
  `users` + `user_stores` + `user_modules` · `client_modules`/`client_features`
- Catálogo: `categories`, `products`, `extras`, `sizes`, `product_extras`,
  `product_sizes`, `inventories`
- Ventas: `orders`, `order_items` (snapshots: sizeName, extras jsonb,
  notes, token_cost), `token_transactions`
- Soporte: `app_logs`, uploads a S3 (URLs en columnas, no binarios en DB)
- Soft delete: `deleted_at` en entities principales (restore endpoint).
- Todas las entidades de negocio cuelgan de `store_id` →
  `stores.client_id` (tenant). `orders.store_id`, `token_transactions.store_id`.

## Reglas

1. **Todo dato de negocio lleva `store_id`** (o `client_id` si es
   cross-store como users/settings de tenant). Nunca datos "sueltos".
2. **Índices**: FK columns (`store_id`, `client_id`, `order_id`,
   `product_id`) + columnas de filtro frecuente (`status`, `created_at`,
   `email` único por tenant donde aplique). Agregar índice en el mismo
   cambio que la query que lo necesita.
3. **Constraints**: `NOT NULL` en campos de negocio, `UNIQUE` donde el
   dominio lo exige (sku por tenant, email por tenant, ticket_number por
   store+semana), `CHECK` para enums de dinero/estado si aplica.
4. **Integridad referencial**: FK reales con `ON DELETE` pensado —
   soft-delete prefiere `RESTRICT`/`NO ACTION` para no romper historial.
   Snapshots en `order_items` preservan el ticket aunque el producto se
   borre.
5. **Migraciones**: Flyway activo (`src/main/resources/db/migration/V<N>__*.sql`)
   con `ddl-auto: validate` (`baseline-on-migrate: true`, `baseline-version: 0`).
   Todo cambio de entidad/esquema requiere nueva migración `V<N+1>__*.sql`
   en el mismo cambio; nunca editar migraciones ya aplicadas. Cambios
   destructivos (drop/rename de columna con datos) requieren estrategia
   expand/contract y aprobación previa (ver AGENTS.md).
6. **Tenant isolation**: el filtro `store_id`/`client_id` en service es la
   barrera actual. Evaluar PostgreSQL RLS como defensa en profundidad
   (pendiente en auditoría) — nunca confiar solo en filtros de aplicación.
7. **Dinero**: `BigDecimal`/`numeric` en columnas monetarias; jamás
   `float`/`double`. Snapshots de precio/impuesto en la orden (no calcular
   histórico con precios actuales).
8. **Timestamps**: `created_at`/`updated_at`/`deleted_at` con
   `Instant`/`OffsetDateTime` UTC; "hoy" del negocio se deriva de
   `clients.timezone` en service, no de la sesión DB.

## Queries

- Agregados en SQL (`GROUP BY`), no en memoria — patrón ya usado en
  `ReportService`/`ShiftService`(futuro).
- Cuidado con el shape de `Object[]` multi-columna en Spring Data
  (bug real ya corregido en `TokenSaleRepository.sumInRange`).
- `@BatchSize` para colecciones lazy calientes; `JOIN FETCH`/`EntityGraph`
  solo cuando se sabe que se necesitan.
- Paginación server-side para listados grandes (orders, logs, products).

## Verificación

- `./mvnw -q -DskipTests compile` + `./mvnw -q test` tras cambios de entidad.
- Explicar en el PR/cambio: ¿nuevos índices? ¿constraints? ¿impacto en
  filas existentes?
