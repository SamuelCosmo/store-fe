# 3. TODOs pendientes

En orden sugerido. Los TODO inline en código apuntan al mismo trabajo.

## Bloqueantes / corto plazo

- [ ] **Route guard del panel** — `(panel)/layout.tsx` no protege rutas:
      sin sesión se puede navegar a `/products`. Redirect a `/` en un client
      component tras hidratar (localStorage no existe en SSR).
- [ ] **Upload de imágenes de producto** — `ProductModal` tiene el
      contenedor placeholder; falta el servicio de subida (Azure Blob u
      otro) que devuelva el URL a guardar en `products.image`.
      TODO en `ProductModal.tsx`.
- [ ] **Items de orden con extras/tamaños** — depende del backend
      (`sizeId`/`extraIds` en `OrderItemRequest`, pendiente) y luego del UI
      del POS/kiosko.
- [ ] **Páginas del sidebar que no existen** — `/settings` enlaza a 404;
      `/inventory` y `/reservations` se quitaron del menú hasta implementarse.
      (Reportes vive dentro de `/dashboard`.)
- [ ] **Placeholders** — `/pos`, `/kiosk`, `/kitchen` son pantallas vacías.

## Iteración siguiente

- [x] **Dashboard real** — métricas del día via `GET /api/reports/dashboard`
      (KPIs, por hora, canal/tipo/pago, top productos, por empleado).
- [ ] **Módulos por usuario** — el sidebar muestra todo; filtrar por
      `user_modules ∩ client_modules` cuando el backend lo exponga.
- [ ] **Enrutado por rol + módulos tras login** — hoy solo se usa `ROLE_HOME`.
- [ ] **Cookie httpOnly para el token** — hoy `localStorage` (MVP); moverlo
      via Route Handler de Next.
- [ ] **TanStack Query** — cache/loading/error y polling (el KDS lo
      necesitará). Hoy: `fetch` + `useState` por componente.
- [ ] **i18n** — copy en español hardcodeado; selector pendiente.

## Hechos recientes (referencia)

- ✅ Login + logout con sesión persistida (hidratación post-mount).
- ✅ CRUD de establecimientos, categorías (multi-tienda), productos.
- ✅ Catálogos de extras y tamaños + asignación N:M con productos.
- ✅ Tabla de productos expandible con asignaciones; SKU/imagen URL.
- ✅ Rutas del panel fuera de `/dashboard` via route group `(panel)`.
