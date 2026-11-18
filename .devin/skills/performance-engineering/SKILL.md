---
name: performance-engineering
description: >
  Performance para SAC+: Core Web Vitals del front, profiling del backend
  Spring Boot, optimización de queries JPA, caching y escalabilidad.
  Usar cuando algo esté lento, al agregar features pesadas o al preparar
  para más tenants — también al decir "lento", "performance", "optimizar",
  "cache", "N+1", "Core Web Vitals".
---

# Performance Engineering — SAC+

## Frontend (Next.js 16)

**Estado actual**:
- App Router con route groups `(panel)` — code splitting por ruta ✅
- `next/image` usado para logos (warning pendiente: width/height en
  sac-logo.png)
- Polling KDS: 1 request multi-status cada N seg — ya optimizado
- Dashboard: agregados SQL server-side — ya optimizado
- Sin TanStack Query — fetch+useState por componente (TODO conocido)

**Reglas**:
- Listas grandes: paginación server-side (ya existe `usePagination`)
- No cargar órdenes completas para listados — proyecciones ligeras
- Imágenes: `next/image` con width/height correctos
- Bundle: no importar librerías pesadas por un solo uso; `lucide-react`
  ya es tree-shakeable

**Core Web Vitals target**: LCP < 2.5s, INP < 200ms, CLS < 0.1 —
medir con Lighthouse en páginas clave (login, POS, dashboard).

## Backend (Spring Boot)

**Ya optimizado**:
- Dashboard: 9 queries agregadas SQL en vez de cargar entidades
- `@BatchSize(100)` en Order.items, Product, User — N+1 mitigado
- KDS multi-status: 1 query en vez de 4

**Patrones a mantener**:
- `GROUP BY`/`SUM`/`COUNT` en JPQL para métricas — nunca stream+reduce
- `Page` para listados grandes; array completo solo para catálogos
  pequeños (selects del POS)
- Índices en columnas de filtro frecuente (ver database-engineering)
- Evitar `findAll()` sin paginar en endpoints de lista

**Profiling**:
- Spring Actuator metrics (pendiente exponer)
- JFR/async-profiler para CPU/memoria en prod si hay lentitud
- Slow query log de Postgres (`log_min_duration_statement`)

## Database

- Índices compuestos para queries frecuentes:
  `orders(store_id, status, created_at)`, `orders(store_id, created_at)`
- `inventories` lookup por `(product_id, store_id)` único
- `app_logs` particionado por fecha si crece (hoy retención 30 días)

## Escalabilidad futura

| Cuello de botella | Cuándo | Solución |
|---|---|---|
| Rate limiter in-memory | >1 instancia backend | Redis o DB-backed |
| Polling KDS | muchos kioscos | WebSocket/SSE (pendiente) |
| Dashboard queries | millones de órdenes | materialized views / read replica |
| Uploads síncronos | archivos grandes | presigned URLs directo a S3 |

## Al crear features nuevas

- ¿Cuántos registros puede generar por día? ×365 → ¿la query escala?
- ¿Se llama en polling? → optimizar agresivamente
- ¿Carga entidades completas para contar? → usar agregado SQL
- ¿Nuevo endpoint de lista? → paginación + índice
