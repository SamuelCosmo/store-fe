---
name: software-architecture
description: >
  Arquitectura de SAC+: monolito modular multi-tenant, separación de
  concerns, ADRs, deuda técnica y evaluación de escalabilidad. Usar en
  decisiones de diseño, nuevos módulos, refactors estructurales o cuando se
  dude si algo rompe los límites del sistema — también al decir "arquitectura",
  "diseño", "ADR", "monolito", "multi-tenant", "deuda técnica".
---

# Software Architecture — SAC+

## Arquitectura vigente (verificada)

**Monolito modular** Spring Boot 3.5 / Java 21:

```
com.store.platform
├── auth/          JWT, login, rate limiting, token_version
├── client/        tenants (clients) + settings + módulos contratados
├── store/         establecimientos (branches) + settings + branding
├── user/          usuarios, roles, user_stores, user_modules
├── category/ product/ extra/ size/ inventory/   catálogo
├── order/         órdenes, items, estados, refunds, folios
├── token/         fichas (venta y canje)
├── report/        dashboard y agregados
├── storage/       S3-compatible (uploads)
├── log/           app_logs + RequestLogFilter + /api/logs
└── (futuros)      shift/, audit/, payments/
```

Frontend Next.js 16 (App Router) consume la REST API con JWT Bearer.
**No hay microservicios ni microfrontends — y no se justifica introducirlos**
con la escala actual. Mantener el monolito modular.

## Reglas de diseño

- **Tenant = `Client`**, **branch = `Store`**. Todo dato de negocio cuelga de
  `store_id`; scoping vía JWT (`clientId`, `storeId`, `role`) +
  `StoreService.resolveScope/canScope`.
- **Un módulo = un paquete** con entity/repo/service/controller/dto propios.
  No mezclar dominios en un service.
- **El backend es la autoridad**: precios, impuestos, stock, estados,
  permisos. El frontend nunca decide dinero ni autorización.
- **Errores de usuario**: `BusinessException(code, …)` con código estable;
  nunca exponer mensajes técnicos.
- **Docs primero**: cambios de contrato/endpoints se documentan en
  `store-be/docs/07-api.md` y `11-frontend-integration.md` en el mismo cambio.

## Cuándo evaluar arquitectura

- Nuevo vertical (ej. clínica): evaluar si sus entidades cuelgan de
  `client`/`store` existentes o requieren módulo nuevo con dependencias.
- Antes de agregar una entidad: ¿necesita `client_id`/`store_id`? ¿índice?
- RLS de Postgres: evaluar como capa extra de aislamiento tenant (ver hallazgo
  en SAC_AUDIT_REPORT.md), no como reemplazo del scoping en service.

## ADRs

Decisiones ya tomadas (documentadas en docs/): JWT en body + Bearer (no
cookies), auth por `token_version`+TTL por rol, branding por establecimiento,
fichas sin wallet, agregados SQL en dashboard, rate limit en memoria.
Si se revierte una, documentar el porqué.
