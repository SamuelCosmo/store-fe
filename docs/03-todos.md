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
      subtotal + impuesto + total.
- [ ] **Descuento en la orden** — sin modelar. Diseño preferido:
      `orders.discount` (monto, no %) validado server-side
      (`total = subtotal + impuesto - descuento`, nunca negativo),
      input en el modal de cobro del POS y línea propia en el desglose
      del ticket. Por orden completa, no por línea.
- [ ] **Páginas del sidebar que no existen** — `/inventory` y
      `/reservations` se quitaron del menú hasta implementarse.
      (Reportes vive dentro de `/dashboard`.)
- [x] **Settings persistidos en backend** — `/settings` sincroniza con
      `GET/PUT /api/clients/{id}/settings` (marca: nombre+logo, moneda,
      impuesto, countdown del kiosco, sesión por rol) y
      `GET/PUT /api/stores/{id}/settings` (umbrales/sonido KDS por
      establecimiento; `menuName` quedó legacy oculto — en pantallas se
      muestra `clientName` de Marca).
      `localStorage` queda solo como cache (`lib/settings.ts`) que las
      terminales refrescan cada 60 s y al recuperar foco (`Providers`). El
      cierre
      de sesión por rol sigue siendo client-side (`iat` del JWT) — el `exp`
      sigue fijo hasta que el backend tenga TTL por rol. Pendiente ampliar
      parámetros (idle del kiosco) y usar `currency`/`taxRate`
      al cobrar. (Impresión quedó resuelta por equipo — ver ticket.)
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
- [x] **Soft delete en todo lo que se elimina** — `deletedAt` (Instant
      nullable) en productos, categorías, usuarios, tiendas, extras y
      tamaños. Los `DELETE` marcan la fila en vez de borrarla → el
      historial (order_items → products, orders → users) sobrevive.
      Todas las listas/queries filtran `deletedAt is null`; los lookups
      por id rechazan borrados (404) salvo los que usa el historial.
      Extras/tamaños se desvinculan de productos al borrar (el snapshot
      de la orden conserva nombre+precio). Al borrar un usuario su email
      se reescribe (`…​.deleted-{id}`) porque `users.email` es UNIQUE —
      libera el correo para re-registrarlo. La categoría sigue
      rechazando con 400 si tiene productos **vivos** enlazados.
      Restauración: cada listado acepta `?deleted=true` (devuelve solo
      borrados) y `POST /{id}/restore` reactiva la fila; el front comparte
      `DeletedList` (`(panel)/_components`) montado bajo cada tabla +
      toggle "Ver eliminados" en `/stores` (única con lista paginada —
      usa el mismo endpoint con `deleted=true`). `DELETE /api/stores/{id}`
      ya existe (ADMIN). Pendiente: purge definitivo (la fila queda para
      historial).

## Iteración siguiente

- [x] **Dashboard real** — métricas del día via `GET /api/reports/dashboard`
      (KPIs, por hora, canal/tipo/pago, top productos, por empleado).
- [x] **Dashboard: pedidos a tiempo vs atrasados** — `Order` ganó
      `preparingAt`/`readyAt`/`completedAt` (los pone
      `OrderService.updateStatus` en cada transición) y
      `DashboardResponse` devuelve conteo a tiempo/atrasados vs el
      umbral `kitchenWarnMin` del store. El dashboard lo muestra en su
      sección de tiempos. Órdenes viejas sin timestamps quedan fuera
      del conteo.
- [ ] **Módulos por usuario** — el sidebar muestra todo; filtrar por
      `user_modules ∩ client_modules` cuando el backend lo exponga.
- [ ] **Enrutado por rol + módulos tras login** — hoy solo se usa `ROLE_HOME`.
- [x] **Selector de establecimiento en login** — cuando login responde
      `storeId required` (rol operativo con varias tiendas asignadas) el
      front consulta `POST /api/auth/stores` (mismas credenciales →
      `[{id, name}]`) y abre un modal "Elige el establecimiento" con
      select + Aceptar; el reintento manda `storeId`. Una sola tienda →
      flujo igual que antes. El ADMIN nunca elige: entra `clientId`-wide
      y filtra tiendas en cada página (con 1 asignada se resuelve sola).
- [x] **Ruta `/superadmin` (admin de plataforma)** — login propio +
      listado/alta/edición de clientes (nombre + límites del plan:
      `maxStores`, `maxPosPerStore`, `maxKiosksPerStore`). Backend: rol
      `SUPERADMIN` sin `clientId`/`storeId` en el JWT, `GET /api/clients`
      y `PUT /api/clients/{id}` restringidos a ese rol. La cuenta se crea
      por SQL directo (no por la app). Edición del admin del tenant:
      `GET/PUT /api/clients/{id}/admin` (SUPERADMIN, confirma su propia
      contraseña; la nueva del admin valida las reglas de `UserRequest`)
      + modal "Admin" por fila en la tabla. Pendiente: módulos
      contratados (`PUT /api/clients/{id}/modules`) y settings del
      cliente.
- [x] **Superadmin: crear admin al crear cliente** — `ClientRequest`
      acepta `adminName`/`adminEmail`/`adminPassword` opcionales; si viene
      email, `ClientService.create()` crea el `User` ADMIN del tenant en
      la misma transacción (email normalizado + duplicados → 400/409; si
      falla, rollback del cliente). El form de alta de `/superadmin` pide
      los 3 campos (email+password requeridos); el PUT los ignora.
- [x] **Pantalla de pedidos de cocina para caja/admin/gerente** —
      `/kitchen` ya es accesible para todo el staff: entrada "Cocina" en
      el sidebar del panel (icono ChefHat) + botón en el header del POS.
      `KitchenBoard` muestra "Volver" a `ROLE_HOME` para roles ≠ KITCHEN
      y redirige CUSTOMER → `/kiosk`. Backend ya permitía
      `PATCH /{id}/status` a ADMIN/MANAGER/EMPLOYEE/KITCHEN y `GET
      /api/orders` hace scoping por store de sesión — cancelar restaura
      inventario y marca `refund_status=REFUNDED`.
- [x] **Cookie httpOnly para el token** — el JWT viaja en la cookie
      `store_token` (httpOnly, Path=/, Max-Age = `JWT_EXPIRATION_MS`);
      `POST /api/auth/login` y `/superadmin` la setean, `POST
      /api/auth/logout` la expira (JS no puede borrar httpOnly).
      `api()` usa `credentials: "include"` y ya no manda `Authorization`;
      el body del login ya no trae `token` (`@JsonIgnore`). La sesión
      local guarda `loginAt` para el TTL por rol — el `exp` real lo
      refuerza el server (401 → cierra sesión; 403 solo es "sin
      permiso"). Filtro acepta cookie o Bearer (scripts), y en mutaciones
      con cookie exige `Origin` en la allowlist de CORS (CSRF).
      Config: `COOKIE_SECURE=true` + `COOKIE_SAMESITE=None` en Railway
      (fe/be son sitios distintos por public suffix); en local queda
      `Lax` (localhost es same-site). Sesiones viejas con `token` en
      localStorage se descartan como expiradas → re-login una vez.
- [x] **Impresión/reimpresión de tickets** — `OrderTicket` +
      `TicketModal` compartidos (`components/molecules/OrderTicket.tsx`)
      renderizan el ticket desde `OrderResponse` (items, tamaño/extras/
      notas, subtotal/impuesto/total, canal/pago/tipo, CANCELADA marcada)
      y `window.print()` + `@media print` en `globals.css` imprimen solo
      `#print-ticket`. Botón "Imprimir ticket" en el recibo del POS,
      icono de impresora por orden en `/kitchen`, y nueva página `/orders`
      del panel (historial paginado con filtro de estatus) para reimprimir
      tickets viejos — usa `GET /api/orders/{id}/ticket` (backend: trae
      `storeName`/`storeAddress` para el encabezado; scoping por store de
      sesión, abierto a CUSTOMER para el kiosco). POS/KDS imprimen con la
      orden que ya tienen en memoria.
      **Hardware del cliente**: Rongta ACE H1-UE — térmica 80mm ESC/POS,
      USB+Serial+Ethernet (sin WiFi/BT), autocortadora y soporte de cajón.
      **Decisión de hardware**: impresora por equipo = impresora
      predeterminada del SO en cada caja/kiosco (nivel 1, sin agente ni
      cola de impresión). Para impresión silenciosa lanzar Chrome con
      `--kiosk-printing`. Si se necesita ESC/POS (corte, cajón, impresora
      de cocina aparte) → agente local tipo QZ Tray.
      **Auto-impresión al cobrar**: flag por equipo `store.print.auto`
      en localStorage (`isAutoPrint`/`setAutoPrint` en `lib/settings.ts`)
      con switch "Imprimir ticket al cobrar" en `/settings` → sección
      Impresión (solo afecta la terminal donde se activa — la impresora
      es hardware del equipo, no config del tenant). Al confirmar el cobro,
      `OrderTerminal` imprime una copia oculta del ticket (una vez por
      orden, `printedOrderId`); el botón "Imprimir ticket" sigue para
      reimpresión manual. Setup del equipo: instalar driver Rongta USB,
      dejarla como impresora predeterminada, activar el switch y lanzar
      Chrome con `--kiosk-printing`. Pendiente: prueba física real (el
      corte lo da el driver; cajón de dinero se configura en el driver o
      requerirá ESC/POS/agente).
- [x] **Corregir formato de impresión del ticket** — `globals.css` ahora
      imprime térmico: `@page { size: 80mm auto; margin: 0 }` (rollo
      continuo sin alto fijo), `#print-ticket` a `width: 80mm` con
      padding `4mm 3mm`, fuente 11px/1.35, sin borde ni radio, y el logo
      limitado a `14mm` de alto para no quemar tinta. Aplica igual en
      POS, KDS y reimpresión de `/orders`. Pendiente solo la prueba en
      impresora física real.
- [x] **Modo idle en caja y kiosco** — en `OrderTerminal`: kiosco 90 s /
      caja 3 min sin `pointerdown`/`keydown` → pantalla de espera. Kiosco
      limpia el pedido y un toque lo descarta; caja NO limpia — la
      pantalla ofrece "Continuar con el pedido" o "Comenzar pedido nuevo"
      (este último sí resetea).
- [ ] **Pago con tarjeta en terminal física** — hoy `paymentMethod: CARD`
      se registra sin procesar nada. Investigación hecha (doc completo en
      `store-be/docs/14-card-terminals.md`): el proveedor/terminal es
      **por restaurante** (cada tenant trae su cuenta y sus terminales —
      la plataforma no toca dinero). Opciones analizadas:
      - **BBVA Total POS** — terminal bancaria integrada por TCP/IP en
        red local; requiere contrato con ejecutivo + spec de protocolo
        (no público) + agente local por equipo + certificación BBVA.
        Depósito directo a la cuenta BBVA del restaurante.
      - **Billpocket Ultra** (BBVA, cloud push, beta) — push-notifications
        a la terminal por serial + webhook; dev env sin dinero real.
      - **Mercado Pago Point** — cloud push a sus devices, sandbox
        inmediato; dinero cae a wallet MP y se transfiere a CLABE.
      - **NetPay Smart** — REST push a terminal PAX, deposita a cualquier
        banco vía SPEI; pide terminal de pruebas + certificación.
      - **Standalone/manual** — funciona hoy: cajero cobra en su terminal
        y confirma en el POS (fallback permanente).
      Diseño acordado: `Client.paymentProvider` + credenciales por
      tenant (solo servidor), `Device` ↔ serial de terminal, entidad
      `Payment` por intento (idempotencia/reconciliación), webhook o
      polling de estatus, y la orden CARD entra a KDS solo con pago
      aprobado. El front solo inicia/consulta estatus al back — nunca
      llama al proveedor. Bloqueado por: decisión del cliente + cuenta/
      credenciales del proveedor elegido (PDF entregado al cliente:
      `docs/terminales-pago-cliente.pdf`).
- [x] **Fichas (venta y canje)** — físicas/anónimas, sin wallet, solo en
      caja. Backend: `POST /api/tokens` `{quantity, paymentMethod}` crea
      un `TokenTransaction` SALE (conteo de ingreso); `paymentMethod:
      TOKEN` en `POST /api/orders` canjea (descuenta `tokenCost` por
      producto, `total = 0`, `tokenAmount` en la orden + snapshot
      `token_cost` por ítem). `clients.tokenPrice` (settings) es el
      precio de venta. Front: `tokenCost` en `ProductModal`, precio por
      ficha en `/settings`, botón "Vender fichas" (icono Coins) en el
      header del POS visible solo si `tokenPrice > 0`, y tercer método
      "Fichas" en el modal de cobro (habilitado solo si todo el pedido
      es canjeable). El kiosco no vende ni acepta fichas (guard de
      canal). El ticket impreso muestra la línea "Fichas" y pago TOKEN.
- [x] **Marcar agotado desde caja** ("86'd") — `products.soldOut` +
      `PATCH /api/products/{id}/sold-out` (ADMIN/MANAGER/EMPLOYEE). En el
      POS cada tarjeta lleva un toggle (⊘) arriba a la derecha; el
      producto agotado queda apagado con badge "AGOTADO" y no se puede
      añadir al pedido; el kiosco lo oculta y `POST /api/orders` lo
      rechaza si llega en el request. Manual — sin reset diario.
- [ ] **TanStack Query** — cache/loading/error y polling (el KDS lo
      necesitará). Hoy: `fetch` + `useState` por componente.
- [x] **Tema nocturno (dark mode)** — `ThemeToggle` compartido
      (`components/molecules/ThemeToggle.tsx`) alterna la clase `.dark`
      en `<html>` persistida en `localStorage["store.theme"]`; un script
      inline en `layout.tsx` la aplica antes del primer paint. Los tokens
      se sobreescriben bajo `.dark` en `globals.css` (paleta propia:
      superficies gris-frío, primary `#2f7cb8`, semánticos adaptados) —
      sin variantes `dark:` porque las utilidades ya usan `var()`.
      Toggle presente en: login, footer del sidebar, header del POS,
      header de cocina y `/superadmin`.
- [x] **Branding del cliente (logo + nombre)** — `clients.logo_url` +
      `name`/`logoUrl` en `GET/PUT /api/clients/{id}/settings` (`""`
      quita el logo); `POST /api/uploads/brand` (solo ADMIN) guarda en
      `clients/{id}/brand/`; `AuthResponse` trae `clientName`/
      `clientLogoUrl` y `OrderResponse`/`TicketResponse` traen `logoUrl`.
      Front: sección "Marca" en `/settings` (nombre + upload + preview +
      quitar), `BrandMark` muestra logo+nombre del tenant en sidebar/
      POS/kiosco/KDS (`session.clientName` gana sobre `menuName`; cae al
      logo/nombre de plataforma si no hay), y el ticket imprime
      `clientName`+logo en el encabezado (fallback `storeName`). El
      login conserva la marca SAC+ (el tenant aún no se conoce ahí).
- [ ] **Página de cuenta (settings por usuario)** — el menú del
      `UserCard` tenía un item "Configuración" que apuntaba a `/settings`
      (settings del tenant) — se quitó porque ahí va una página aparte
      con ajustes de la CUENTA logueada: cambiar su nombre, su correo y
      su contraseña (con confirmación), quizá tema preferido. Endpoints
      pendientes en backend (`PATCH /api/users/me` o similar; hoy solo el
      admin edita usuarios vía `/api/users/{id}`).
- [x] **i18n completo** — `lib/i18n.tsx`: `LangProvider` + `useI18n()`
      (`{ lang, setLang, t }`), diccionarios planos en
      `lib/i18n/es.json` + `lib/i18n/en.json` (mismo set de keys, ~450),
      interpolación `{name}`, `TKey = keyof typeof es` (una key inválida
      rompe `tsc`), fallback a español, persistido por equipo en
      `localStorage` (`store.lang`). Selector "Idioma" en `/settings`.
      `translateNow()` exportado para código fuera de React (fallbacks
      de error por status en `lib/api.ts`). Migradas TODAS las
      pantallas: login, panel (dashboard, categorías, productos,
      extras/tamaños, tiendas, usuarios, pedidos, settings), POS/kiosco
      (`OrderTerminal` + `ExtrasModal`), KDS, `/superadmin`, ticket,
      modales compartidos, paginación y lista de eliminados. Los
      formatos de fecha/moneda siguen el idioma (`es-MX`/`en-US`).
- [x] **`cashReceived`/`changeGiven` en la orden** — `OrderRequest`
      acepta `cashReceived` (solo CASH); el server valida ≥ total y
      persiste `change_given = cash_received - total`. Vuelven en
      `OrderResponse`/`TicketResponse` y el ticket impreso muestra
      Recibido/Cambio; el recibo del POS usa `changeGiven` del backend.
- [x] **Folio de ticket persistido** — `orders.ticket_number`:
      consecutivo semanal por tienda (max+1 desde el lunes) asignado en
      `OrderService.create` con lock pesimista sobre el store — no hay
      duplicados con cajas en paralelo. `OrderResponse`/`TicketResponse`
      lo devuelven (viejas → `id`); POS, KDS, `/orders` y el ticket
      impreso muestran el mismo folio. El endpoint estimado
      `GET /api/orders/next-number` se eliminó. La tabla `tickets` de
      `06-database.md` queda como opción futura (si hace falta audit de
      impresiones — `printed_at`).
- [x] **Colapsar el sidebar del admin a iconos** — rail de iconos que se
      expande al hover (`onMouseEnter`/`onMouseLeave`, 76px ↔ 248px con
      `transition-[width]`); sin botón ni preferencia persistida — es
      comportamiento fijo. Colapsado: `NavItem` solo icono con
      `title`/`aria-label`, `BrandMark` solo logo, `UserCard` solo avatar
      (menú centrado). `collapsed` es prop opcional en los componentes —
      otras superficies que reutilicen `Sidebar` la heredan gratis.

## Producción (antes de Railway)

- [x] **`DataSeeder` sin perfil** — resuelto por env: `SEED_DEV_DATA`
      gatea el seed (`app.seed.dev-data`, default `true` local;
      `false` en Railway).
- [x] **Endpoints de alta abiertos** — cerrados: `POST /api/clients` y
      `POST /api/auth/register` ahora requieren `SUPERADMIN`
      (`@PreAuthorize`); en `SecurityConfig` solo quedan públicos
      `login`, `superadmin`, `stores` (login) y `/api/media/**`.
- [x] **Config por env** — `JWT_SECRET` y `CORS_ORIGINS` ya vienen de
      env (Railway los tiene); los defaults que quedan en
      `application.yml` son solo para dev local.
- [x] **Limpieza de imágenes huérfanas** — `StorageService.deleteByUrl`
      borra del bucket el objeto viejo al reemplazar/quitar imagen de
      producto o logo de marca (best-effort: un fallo de storage no
      invalida el update). Solo borra objetos del bucket propio — URLs
      externas se ignoran. En soft-delete la fila conserva su imagen
      (queda para historial/restore).

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
