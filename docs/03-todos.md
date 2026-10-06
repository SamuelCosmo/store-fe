# 3. TODOs pendientes

En orden sugerido. Los TODO inline en código apuntan al mismo trabajo.

## Bloqueantes / corto plazo

- [x] **Route guard del panel** — `PanelGuard` en `(panel)/layout.tsx`:
      sin sesión (o expirada) → `/`; `/users` y `/settings` solo ADMIN,
      otros roles → `ROLE_HOME`. Sidebar filtra esas rutas por rol.
- [x] **Upload de imágenes de producto** — bucket S3-compatible local
      (`adobe/s3mock` en docker-compose, servicio `storage`, :9090,
      persiste en volumen) + `POST /api/uploads` (ADMIN/MANAGER,
      multipart `file`, máx 5 MB, jpg/png/webp/gif) via `StorageService`
      (MinIO SDK apuntando al endpoint). Devuelve `{url}` público que se
      guarda en `products.image`; s3mock sirve GETs anónimos → los
      `<img>` leen directo. `ProductModal`: clic en el área → file
      picker → sube y muestra preview + "Quitar". Migración a Railway:
      cambiar las env `STORAGE_*` al bucket real (S3-compatible).
      Pendiente de producción: política de lectura pública del bucket y
      borrar la imagen vieja al reemplazarla.
- [x] **Items de orden con extras/tamaños** — `OrderItemRequest` acepta
      `sizeId`, `extras[{extraId,quantity}]` y `notes`; el server valida
      que pertenezcan al producto y calcula `unitPrice` con los cargos.
      Snapshot en `order_items` (`sizeName`, `extras` jsonb, `notes`) y en
      `OrderItemResponse`; el KDS muestra tamaño/extras/notas.
- [x] **IVA en la orden** — `orders` persiste `subtotal`, `taxRate`
      (snapshot del `taxRate` del cliente al cobrar) y `taxAmount`; el
      impuesto se agrega: los precios del catálogo no lo incluyen y el
      server suma `taxAmount = subtotal × rate` (`total = subtotal +
      taxAmount`). `OrderResponse` los devuelve (órdenes viejas →
      `subtotal=total`, `taxRate=0`) y el ticket de la terminal muestra
      subtotal + impuesto + total. Pendiente: **descuento** en la
      orden (monto o % — sin modelar).
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
- [x] **Paginación en tablas del admin (server-side)** — los `GET` de
      lista aceptan `page`/`size`/`sort`/`search`: sin esos params
      devuelven el array completo (terminales/selects siguen igual); con
      ellos devuelven un `Page` de Spring (`content`, `totalElements`,
      `totalPages`). Implementado en `/api/products`, `/api/categories`,
      `/api/clients/{id}/stores`, `/api/users` y `/api/orders` (historial:
      `createdAt desc` por default, filtra por `status`). Las vistas
      `/products`, `/categories`, `/stores` y `/users` usan
      `usePagination` + `PaginationBar` (`(panel)/_components/
      usePagination.tsx`): "n–m de total", flechas ‹ ›, selector de filas
      5/10/15/20/25; la búsqueda va con debounce 250 ms y el sort viaja
      como `sort=` al server (`useTableSort` en modo `remote`), así que
      ordenan/buscan sobre TODO el dataset, no solo la página cargada.
      Cambiar query/sort/tamaño reinicia a la página 1; borrar la última
      fila de una página retrocede sola. Detalles: el conteo de productos
      de una categoría ya viene en `CategoryResponse.products` (no se
      baja la lista entera); las tabs Tamaños/Extras de `/products`
      cargan el catálogo completo lazy porque asignan sobre todos.
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
- [x] **Pantalla de pedidos de cocina para caja/admin/gerente** —
      `/kitchen` ya es accesible para todo el staff: entrada "Cocina" en
      el sidebar del panel (icono ChefHat) + botón en el header del POS.
      `KitchenBoard` muestra "Volver" a `ROLE_HOME` para roles ≠ KITCHEN
      y redirige CUSTOMER → `/kiosk`. Backend ya permitía
      `PATCH /{id}/status` a ADMIN/MANAGER/EMPLOYEE/KITCHEN y `GET
      /api/orders` hace scoping por store de sesión — cancelar restaura
      inventario y marca `refund_status=REFUNDED`.
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
- [x] **Marcar agotado desde caja** ("86'd") — `products.soldOut` +
      `PATCH /api/products/{id}/sold-out` (ADMIN/MANAGER/EMPLOYEE). En el
      POS cada tarjeta lleva un toggle (⊘) arriba a la derecha; el
      producto agotado queda apagado con badge "AGOTADO" y no se puede
      añadir al pedido; el kiosco lo oculta y `POST /api/orders` lo
      rechaza si llega en el request. Manual — sin reset diario.
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
- ✅ Tablero `/kitchen` accesible para todo el staff (sidebar + botón en
  el POS); CUSTOMER redirige a su home.
- ✅ "86'd" desde caja: toggle en cada tarjeta del POS, oculto en kiosco,
  rechazado por `POST /api/orders`.
- ✅ IVA persistido en la orden (`subtotal`/`taxRate`/`taxAmount`) y
  mostrado en el ticket.
- ✅ Paginación server-side (`page`/`size`/`sort`/`search` → `Page`) con
  selector 5/10/15/20/25 en las tablas del admin; los endpoints siguen
  devolviendo array completo sin esos params.
