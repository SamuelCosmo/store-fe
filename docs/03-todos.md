# 3. TODOs pendientes

En orden sugerido. Los TODO inline en código apuntan al mismo trabajo.

## Bloqueantes / corto plazo

- [x] **Route guard del panel** — `PanelGuard` en `(panel)/layout.tsx`:
      sin sesión (o expirada) → `/`; `/users` y `/settings` solo ADMIN,
      otros roles → `ROLE_HOME`. Sidebar filtra esas rutas por rol.
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
- [ ] **Páginas del sidebar que no existen** — `/inventory` y
      `/reservations` se quitaron del menú hasta implementarse.
      (Reportes vive dentro de `/dashboard`.)
- [x] **Settings persistidos en backend** — `/settings` sincroniza con
      `GET/PUT /api/clients/{id}/settings` (moneda, impuesto, countdown del
      kiosco, sesión por rol) y `GET/PUT /api/stores/{id}/settings`
      (nombre del menú + umbrales/sonido KDS por establecimiento).
      `localStorage` queda solo como cache (`lib/settings.ts`) que las
      terminales refrescan cada 60 s y al recuperar foco (`Providers`). El
      cierre
      de sesión por rol sigue siendo client-side (`iat` del JWT) — el `exp`
      sigue fijo hasta que el backend tenga TTL por rol. Pendiente ampliar
      parámetros (impresión, idle del kiosco) y usar `currency`/`taxRate`
      al cobrar.
- [ ] **Cerrar sesión en caja** — `OrderTerminal` no tiene logout; el
      único está en el sidebar del panel. Agregar botón en el header de la
      terminal solo cuando `channel === "POS"` — el kiosco (CUSTOMER) no
      debe tenerlo (limpia `store.session` y vuelve a `/`).
- [ ] **Orden de tamaños y extras por producto** — hoy `product.sizes` y
      `product.extras` vienen de un `Set` sin orden; el kiosco preselecciona
      el primero que llegue. Falta campo de prioridad (ej. `position` en
      `product_sizes`/`product_extras`, o respetar el orden de los arrays
      `sizeIds`/`extraIds` que ya se envían) + reordenar con drag and drop
      los seleccionados en `ProductModal.tsx`.
- [ ] **Tamaño default al pedir** — `ExtrasModal` ya preselecciona
      `sizes[0]`, pero ese primero es arbitrario hasta que exista la
      prioridad anterior; el default debe ser el primer tamaño asignado
      según el orden definido en el producto.
- [ ] **Ordenar por columnas en tablas del admin** — `/products`,
      `/categories`, `/stores`, `/users`: headers clickeables con sort
      asc/desc (estado local basta, los datos ya vienen completos).
- [ ] **Paginación en tablas del admin** — hoy cargan todo el catálogo;
      cuando crezca, paginar (cliente-side o `page`/`size` en el backend).
- [ ] **Refresco automático del catálogo en POS/kiosco** — la terminal
      carga productos/categorías/extras/tamaños solo al montar; la caja y
      el kiosco deben reflejar sin reload manual cuando el admin/gerente:
      crea/edita/desactiva un producto o categoría, y asigna o quita un
      extra o tamaño a un producto (desde `ProductsView`/`ProductModal` o
      las secciones Extras/Tamaños). Opciones: polling con `setInterval`,
      refetch al recuperar foco (`visibilitychange`) o SSE; TanStack Query
      lo resolvería con `refetchInterval`.
- [ ] **Login de correo case-insensitive** — `Usuario@x.com` y
      `usuario@x.com` deben ser la misma cuenta: normalizar
      (`trim().toLowerCase()`) al hacer login (`app/page.tsx`), al crear
      usuarios (`UserModal.tsx`) y en la búsqueda de credenciales del
      backend (columna unique en minúsculas o `lower(email)`).
- [ ] **Gráfica "Ventas por hora" del dashboard rota** — el bar chart
      manual de `DashboardView.tsx` (divs con height %) no está mostrando
      los datos de `GET /api/reports/dashboard` (`hourly`). Corregirlo
      (revisar el shape de `hourly`, horas faltantes y el cálculo de
      `maxHourly`) o reemplazarlo por una librería de charts — Recharts es
      la opción habitual en React; alternativas ligeras: Chart.js o
      Apache ECharts.

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
- [ ] **Tema nocturno (dark mode)** — toggle claro/oscuro en `/settings` o
      en el header. Los tokens viven en `@theme` de `globals.css`; con
      Tailwind v4 basta `@custom-variant dark` + overrides de las variables
      bajo `.dark`, y el toggle pone/quita la clase en `<html>` persistida
      en `localStorage` (preferencia por dispositivo, no por backend).
      Ojo con colores hardcodeados como `bg-[#fcfaf7]` en inputs.
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
- ✅ `/settings` sincronizada con la base de datos: por establecimiento
  (nombre del menú, umbrales/sonido KDS) y por cliente (moneda, impuesto,
  countdown del kiosco, duración de sesión por rol).
- ✅ Guard del panel con sesión + rol: `/users` y `/settings` solo para
  ADMIN; sidebar sticky a `h-screen`.
