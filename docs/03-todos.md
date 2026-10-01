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
- [ ] **Items de orden con extras/tamaños** — la UI del POS/kiosko ya
      selecciona tamaño, extras y notas; falta que el backend acepte
      `sizeId`/`extraIds`/`notes` en `OrderItemRequest` y cobre los cargos
      (hoy el total mostrado puede diferir del cobrado). TODO en
      `OrderTerminal.tsx`.
- [ ] **IVA/descuento en la orden** — el panel muestra solo subtotal=total;
      agregar cuando el backend los modele.
- [ ] **Páginas del sidebar que no existen** — `/settings` enlaza a 404;
      `/inventory` y `/reservations` se quitaron del menú hasta implementarse.
      (Reportes vive dentro de `/dashboard`.)
- [ ] **Placeholder restante** — `/kitchen` (KDS) sigue vacío.
- [ ] **Ordenar por columnas en tablas del admin** — `/products`,
      `/categories`, `/stores`, `/users`: headers clickeables con sort
      asc/desc (estado local basta, los datos ya vienen completos).
- [ ] **Paginación en tablas del admin** — hoy cargan todo el catálogo;
      cuando crezca, paginar (cliente-side o `page`/`size` en el backend).
- [ ] **Refresco automático del catálogo en POS/kiosco** — la terminal
      carga productos/categorías/extras/tamaños solo al montar; dar de alta
      o editar algo requiere reload manual. Opciones: polling con
      `setInterval`, refetch al recuperar foco (`visibilitychange`) o SSE;
      TanStack Query lo resolvería con `refetchInterval`.

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
