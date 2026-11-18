---
name: frontend-engineering
description: >
  Convenciones de store-fe (Next.js 16 App Router, React, TypeScript,
  Tailwind v4): componentes, estado, forms, API client, errores/loading,
  i18n y rutas protegidas. Usar en CUALQUIER cambio de frontend — también al
  decir "componente", "página", "pantalla", "hook", "estado".
---

# Frontend Engineering — store-fe

## Stack

Next.js 16.3 (App Router) · React · TypeScript · Tailwind CSS v4 (tokens en
`globals.css` con `var()`, modo oscuro por clase `.dark`) · lucide-react ·
pnpm · Redux (sesión) · fetch nativo.

**IMPORTANTE**: esta versión de Next tiene breaking changes — leer
`node_modules/next/dist/docs/` antes de escribir código Next.

## Reglas obligatorias

1. **`api()` de `lib/api.ts`** para TODA llamada autenticada: inyecta
   `Authorization: Bearer`, manda `X-Request-Id`, traduce `err.<CODE>` a
   mensaje i18n. Nunca `fetch` crudo salvo login/superadmin/stores (sin
   sesión todavía) → usar `apiErrorMessage(status, body)`.
2. **`useSession`** para auth/rol/tienda activa; `saveSession`/`ROLE_HOME`
   para login y ruteo. JWT en sesión local (no cookie).
3. **`useI18n().t()`** para TODO texto visible — keys planas en
   `lib/i18n/es.json` + `en.json` (mismo set; `TKey` type-checka).
   Interpolación `{name}`. Nunca hardcodear strings de UI.
4. **Componentes**: `components/atoms|molecules|organisms` + vistas por
   página en `app/(panel)/<modulo>/`. Client components con `"use client"`.
   Estilo con tokens Tailwind (`bg-surface`, `text-primary`…) — nunca
   colores hex inline ni `dark:` variants.
5. **`PageHeader`** para encabezados de página del panel.
6. **Errores de API**: `ApiError` con `.code` y mensaje ya traducido —
   mostrar en toast; `· ref <id>` para soporte. Nunca mostrar `body.message`.
7. **Loading/empty states**: skeletons/spinners existentes + EmptyState;
   toda tabla/lista tiene estado vacío traducido.
8. **Route guard**: `(panel)/layout.tsx` (`PanelGuard`) ya protege; rutas
   nuevas ADMIN-only se agregan ahí y en `AdminSidebar` filtradas por rol.

## Formularios

- `useState` por campo + validación client-side espejo de la del backend
  (el server siempre re-valida — el front es UX).
- Passwords: nunca loguear ni enviar en `report()` (breadcrumbs ya
  enmascaran).
- Mutaciones destructivas piden `currentPassword` (convención backend).

## Dinero y cantidades

- **Centavos enteros** para sumas (`lineCents`/`taxCents` en
  `OrderTerminal`) con HALF_UP igual que `OrderService` — nunca floats
  para totales.
- Fechas/moneda formateadas por idioma (`es-MX`/`en-US`) vía helpers
  existentes.

## Multi-tienda

- `?storeId=` solo cuando el backend lo acepta (ADMIN cualquiera del
  cliente; operativos solo asignadas). El selector de tienda vive en
  sesión; KDS tiene selector propio vía `/api/users/me/stores`.

## Verificación antes de cerrar

- `npx tsc --noEmit` y `npx eslint <archivos tocados>` limpios.
- Probar el flujo real en `pnpm dev` (:3000) contra backend :8080.
- Si cambia un contrato del back → actualizar skill `store-api` +
  `lib/i18n` si hay códigos nuevos.
