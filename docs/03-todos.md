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
- [x] **Items de orden con extras/tamaños** — `OrderItemRequest` acepta
      `sizeId`, `extras[{extraId,quantity}]` y `notes`; el server valida
      que pertenezcan al producto y calcula `unitPrice` con los cargos.
      Snapshot en `order_items` (`sizeName`, `extras` jsonb, `notes`) y en
      `OrderItemResponse`; el KDS muestra tamaño/extras/notas.
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
- [x] **Cerrar sesión en caja** — botón de logout en el header de
      `OrderTerminal` solo cuando `channel === "POS"` (limpia
      `store.session` y vuelve a `/`); el kiosco no lo tiene.
- [x] **Orden global de tamaños** — `sizes.position` (entero, null va al
      final) define el orden del menú para todos los productos; se ordena
      con drag and drop en la sección Tamaños de `/products` →
      `PUT /api/sizes/order` (`[ids]` en el orden nuevo). `ProductResponse`
      ordena `sizes` por `position` (nulls last, luego nombre) — el kiosco
      preselecciona `sizes[0]` = primer tamaño del catálogo. Extras quedan
      como `Set` ordenados alfabéticos en la response (case-insensitive).
      Nota: quedaron columnas `position` sin usar en las join tables
      `product_sizes`/`product_extras` del intento anterior — inofensivas.
- [x] **Tamaño default al pedir** — `ExtrasModal` preselecciona
      `sizes[0]`, que ahora es el primer tamaño del catálogo según
      `sizes.position`.
- [x] **Ordenar por columnas en tablas del admin** — hook compartido
      `useTableSort` (`(panel)/_components/useTableSort.tsx`) con headers
      clickeables asc/desc: `/products` (nombre/categoría/precio),
      `/categories` (nombre/# productos), `/stores` (nombre/alta),
      `/users` (nombre/rol). La sección Tamaños no se ordena — su orden
      ES el del menú.
- [ ] **Paginación backend + frontend** — hoy todos los `GET` de lista
      devuelven todo de golpe y las vistas cargan el catálogo completo.
      Backend: soportar `page`/`size`/`sort` (Spring `Pageable` → `Page<T>`)
      en `/api/products`, `/api/categories`, `/api/stores`, `/api/users` y
      sobre todo `/api/orders` (la lista crece sin parar — paginar por
      fecha/estatus). Frontend: controles de paginación en las tablas del
      admin (`/products`, `/categories`, `/stores`, `/users`) que pidan la
      página al server en vez de ordenar/filtrar todo en cliente — el sort
      de `useTableSort` debería viajar como `sort=` al endpoint, y el
      usuario elige filas por página entre 5/10/15/20/25. Mientras tanto,
      paginación client-side como paso intermedio.
- [x] **Refresco automático del catálogo en POS/kiosco** — la terminal
      reconsulta productos/categorías cada 30 s y al recuperar foco
      (`visibilitychange`), así altas/ediciones/bajas del admin se ven sin
      reload. Extras/tamaños vienen embebidos en `ProductDto`, así que se
      refrescan junto con el producto. SSE/TanStack Query quedan como
      alternativa si se necesita latencia menor.
- [x] **Login de correo case-insensitive** — el backend guarda emails en
      minúsculas (`UserService.normalizeEmail`, usado en create/update/
      register) y busca con `IgnoreCase` (login, seeder, checks de
      duplicado). Front normaliza en login y `UserModal`.
- [x] **Gráfica "Ventas por hora" del dashboard** — las columnas tenían
      altura auto → el `%` de cada barra resolvía a 0. Columnas ahora
      `h-full justify-end`; sin librería extra.

## Iteración siguiente

- [x] **Dashboard real** — métricas del día via `GET /api/reports/dashboard`
      (KPIs, por hora, canal/tipo/pago, top productos, por empleado).
- [ ] **Módulos por usuario** — el sidebar muestra todo; filtrar por
      `user_modules ∩ client_modules` cuando el backend lo exponga.
- [ ] **Enrutado por rol + módulos tras login** — hoy solo se usa `ROLE_HOME`.
- [ ] **Pantalla de pedidos de cocina para caja/admin/gerente** — hoy
      `/kitchen` solo es el home de KITCHEN y no tiene entrada desde el
      panel ni desde el POS. Dar acceso a `EMPLOYEE` (caja), `ADMIN` y
      `MANAGER` (link en el sidebar del panel y/o vista dentro de
      `OrderTerminal`) reutilizando `KitchenBoard`, sobre todo para
      cancelar pedidos ya hechos (`PATCH /api/orders/{id}/status` →
      `CANCELLED`, permitido hasta `PREPARING`: restaura inventario y
      marca `refund_status=REFUNDED`). Verificar en backend que
      `GET /api/orders` y ese `PATCH` no estén restringidos por
      `@PreAuthorize` solo a KITCHEN.
- [ ] **Cookie httpOnly para el token** — hoy `localStorage` (MVP); moverlo
      via Route Handler de Next.
- [ ] **Impresión de ticket en caja** — botón en el modal de éxito del POS
      para imprimir ticket fiscal/cortesía; el kiosko solo muestra el folio.
      Requiere `GET /api/orders/{id}/ticket` en backend (pendiente).
- [x] **Modo idle en caja y kiosco** — en `OrderTerminal`: kiosco 90 s /
      caja 3 min sin `pointerdown`/`keydown` → pantalla de espera. Kiosco
      limpia el pedido y un toque lo descarta; caja NO limpia — la
      pantalla ofrece "Continuar con el pedido" o "Comenzar pedido nuevo"
      (este último sí resetea).
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
- ✅ Orden global de tamaños (drag en sección Tamaños →
  `PUT /api/sizes/order`) y extras alfabéticos.
- ✅ Órdenes con tamaño/extras/notas cobrados server-side; KDS los
  muestra por línea.
- ✅ Sort por columnas en tablas del admin, idle del kiosco, login
  case-insensitive y ejes con ticks en "Ventas por hora".
