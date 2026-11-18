---
name: business-domain-erp
description: >
  Dominio ERP multi-empresa para SAC+: sucursales, inventario, ventas,
  pagos, proveedores, compras, cajas, reportes y módulos configurables.
  Usar al diseñar features de negocio, nuevos módulos ERP o workflows de
  tenant — también al decir "ERP", "módulo", "plan", "feature", "sucursal".
---

# Business Domain — ERP multi-tenant

## Jerarquía de negocio (vigente)

```
SAC+ Platform
└── SUPERADMIN (plataforma)
    └── Client (tenant/empresa)
        ├── Settings (marca, moneda, impuestos, timezone, sessionHours)
        ├── Modules contratados (client_modules) + features
        ├── Plan (maxStores, maxPosPerStore, maxKiosksPerStore)
        └── Store[] (establecimientos/sucursales)
            ├── Branding propio (logo, colores)
            ├── Devices (POS/kiosco)
            └── Users asignados (user_stores)
```

## Módulos (estado real)

| Módulo | Estado |
|---|---|
| CATALOG | ✅ categories/products/extras/sizes/inventory |
| POS | ✅ OrderTerminal, cobro CASH/CARD/TOKEN |
| KIOSK | ✅ canal KIOSK, solo CARD |
| KDS | ✅ /kitchen, polling multi-status, sonido |
| TOKENS | ✅ venta/canje de fichas |
| REPORTS | ✅ dashboard agregado |
| TICKETS | ✅ impresión térmica 80mm |
| INVENTORY | 🟡 inventario básico por producto (stock), sin movimientos/warehouses |
| BAR | ⏳ pendiente backend |
| RESERVATIONS | ⏳ pendiente backend |

## Entitlements vs permisos (regla de oro)

- **Module entitlements** (`client_modules` ∩ `user_modules`): qué contrató
  la empresa / qué puede usar el usuario.
- **Feature flags**: capacidades dentro de un módulo (futuro).
- **User permissions**: rol + acciones específicas.
- El backend DEBE rechazar requests a módulos no contratados — el front
  solo oculta UI. Hoy la validación de módulos en backend es parcial
  (ver audit → gap HIGH).

## Planes y suscripciones (futuro)

`plans` → `plan_modules` → `subscriptions` → `tenant_modules` (override
por tenant). SuperAdmin asigna; el plan define defaults. Suspensión de
tenant = bloquear login sin borrar datos.

## Dominios ERP a futuro (no implementar aún)

Suppliers/purchasing, multi-warehouse, contabilidad, facturación CFDI,
RRHH, CRM, reservas/mesas, recetas/food cost, auditoría de cambios.
Cada uno = módulo nuevo con dependencias declaradas (ej. KDS requiere
ORDERS; KIOSK requiere MENU+ORDERS+PAYMENTS).

## Al diseñar un módulo nuevo

1. ¿Depende de otros módulos? Declarar `requires`.
2. ¿Datos por store o por client? (catálogo puede ser client-wide;
   órdenes siempre store).
3. ¿Afecta dinero? → transacción + idempotencia + audit.
4. ¿Afecta stock? → movimiento en `inventories` en la misma transacción.
5. ¿Nuevo entitlement? → `client_modules`/`user_modules` + validación
   backend + ocultar UI.
6. Documentar en `13-modules-and-permissions.md` + happy path.
