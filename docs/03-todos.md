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
- [ ] **Pantalla de configuración del admin** (`/settings`) — parámetros por
      establecimiento/terminal: ajustes de la pantalla de cocina (umbrales de
      tiempo verde/amarillo/rojo, sonido de alerta), del kiosco (pantalla de
      espera, mensajes) y de la caja (propinas, métodos de pago habilitados),
      más parámetros generales del administrador. Requiere modelo/endpoints
      de settings en el backend (no existe).
- [ ] **Cerrar sesión en caja** — `OrderTerminal` no tiene logout; el
      único está en el sidebar del panel. Agregar botón en el header de la
      terminal solo cuando `channel === "POS"` — el kiosco (CUSTOMER) no
      debe tenerlo (limpia `store.session` y vuelve a `/`).
- [ ] **Orden de tamaños por producto** — hoy `product.sizes` viene de un
      `Set` sin orden; el kiosco preselecciona el primero que llegue. Falta
      campo de orden (ej. `position` en `product_sizes` o lista ordenada en
      `sizeIds`) + UI de reordenar en el modal de producto.
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
- [ ] **Impresión de ticket en caja** — botón en el modal de éxito del POS
      para imprimir ticket fiscal/cortesía; el kiosko solo muestra el folio.
      Requiere `GET /api/orders/{id}/ticket` en backend (pendiente).
- [ ] **Modo idle del kiosco** — screensaver/modo atracción cuando nadie lo
      usa + timeout que reinicia el pedido si el cliente abandona a mitad
      del carrito (hoy el kiosco no resetea por inactividad).
- [ ] **Fichas (venta y canje)** — pantalla o sección por definir (idea no
      cerrada): vender fichas en caja (`POST /api/tokens/purchase` —
      `{quantity, paymentMethod}`) y canjearlas por productos con
      `tokenCost > 0` (`POST /api/tokens/redeem`). Solo en caja, no en
      kiosco. Físicas/anónimas, sin wallet. Ambos endpoints pendientes en
      backend (módulo TOKENS).
- [ ] **Marcar agotado desde caja** ("86'd") — el cajero podría apagar un
      producto al vuelo y que deje de aparecer en caja/kiosco; el kiosko
      solo lee. Requiere flag de disponibilidad en backend (hoy solo existe
      `active`, pensado para el admin).
- [ ] **TanStack Query** — cache/loading/error y polling (el KDS lo
      necesitará). Hoy: `fetch` + `useState` por componente.
- [ ] **i18n** — copy en español hardcodeado; selector pendiente.

## Hechos recientes (referencia)

- ✅ Login + logout con sesión persistida (hidratación post-mount).
- ✅ CRUD de establecimientos, categorías (multi-tienda), productos.
- ✅ Catálogos de extras y tamaños + asignación N:M con productos.
- ✅ Tabla de productos expandible con asignaciones; SKU/imagen URL.
- ✅ Rutas del panel fuera de `/dashboard` via route group `(panel)`.
- ✅ KDS `/kitchen`: parrilla FIFO con fondo por antigüedad, avance
  PENDING→PREPARING→READY→COMPLETED, cancelación con modal, alerta sonora
  y rol `KITCHEN` (ruteo → `/kitchen`).
