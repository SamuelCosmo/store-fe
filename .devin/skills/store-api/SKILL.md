---
name: store-api
description: >
  Contrato de la REST API de store-be (Store Platform, Spring Boot,
  localhost:8080) que consume este frontend: auth/JWT, endpoints por
  superficie, reglas de negocio y formato de errores. Usar en CUALQUIER tarea
  que llame a la API, cree pantallas/módulos, maneje autenticación o modele
  datos del backend — también al decir "store api", "endpoint", "contrato".
  Fuente de verdad: ../store-be/docs/ (07-api, 10-frontend-screens,
  11-frontend-integration, 02-authentication, 13-modules-and-permissions).
---

# Store API — contrato para el frontend

Referencia destilada de `store-be/docs/`. Si algo difiere del código del
backend, el código gana — verificar en Swagger UI
(`http://localhost:8080/swagger-ui.html`) o en `../store-be/src/`.

## Base URL

```
NEXT_PUBLIC_API_URL=http://localhost:8080   # .env.local
```

## Autenticación

```text
POST /api/auth/register     # SUPERADMIN — primer ADMIN de un tenant sin admin
POST /api/auth/superadmin   # login de plataforma — solo cuentas SUPERADMIN
POST /api/auth/login        # { email, password, storeId } → AuthResponse
                            # con `token` (JWT) en el body
POST /api/auth/logout       # 204 — limpia cookies store_token de versiones
                            # previas; la sesión real muere al borrar el
                            # token local
POST /api/auth/stores       # { email, password } → [{id,name}] — pedirla cuando
                            # login responde "storeId required" (roles
                            # operativos con varias tiendas asignadas) →
                            # selector + reintento con storeId. El ADMIN no
                            # elige: entra client-wide y filtra por página
```

- JWT con claims `clientId`, `storeId`, `role` — el front lo guarda en la
  sesión local y lo manda como `Authorization: Bearer <token>` en `api()`.
- La sesión local guarda el token + metadata (userId, role, storeId,
  `loginAt` para el TTL por rol).
- Roles: `ADMIN`, `MANAGER`, `EMPLOYEE`, `CUSTOMER` (cuenta genérica de kiosko),
  `KITCHEN` (KDS; puede actualizar estatus de órdenes) y `SUPERADMIN`
  (cuenta de plataforma — `clientId`/`storeId` null en JWT y AuthResponse;
  su home es `/superadmin`).
- La sesión local guarda solo metadata (userId, role, storeId, `loginAt`
  para el TTL por rol) — el token no es legible desde JS.
- Un usuario puede operar varios stores (`user_stores`); el `storeId` activo
  se elige en el login y viaja en el JWT.
- **`storeId` NUNCA va en el body** de requests — el backend lo deriva del
  token. El query param `?storeId=` lo acepta `ADMIN` (cualquier tienda del
  cliente) y cualquier rol para sus tiendas **asignadas** (`user_stores`);
  otra tienda → 403.
- `GET /api/users/me/stores` → `[{id,name}]` de tiendas visibles del usuario
  (ADMIN: todas las del cliente; otros: asignadas vivas) — alimenta el
  selector multi-tienda del KDS.

## Enrutado por rol + módulos

Tras el login, enrutar según rol y módulos efectivos
(`user_modules ∩ client_modules`):

| Rol      | Destino                                    |
| -------- | ------------------------------------------ |
| ADMIN    | `/dashboard` (panel; también puede operar POS) |
| MANAGER  | `/dashboard` u operación según módulos         |
| EMPLOYEE | `/pos` o `/kitchen` según módulos        |
| CUSTOMER | `/kiosk`                                   |
| KITCHEN  | `/kitchen`                                  |

El frontend oculta rutas sin permiso (UX); el backend refuerza con
`@PreAuthorize`. Módulos vendibles: `CATALOG`, `INVENTORY`, `POS`, `KIOSK`,
`KDS`, `BAR`, `TOKENS`, `REPORTS`, `TICKETS`, `RESERVATIONS`.

## Endpoints

### Catálogo (ADMIN/MANAGER mutan; caja/kiosko leen solo `active`)

```text
POST/GET/GET{id}/PUT/DELETE   /api/categories        # GET ?storeId=
                            # DELETE → 400 si tiene productos enlazados
                                                   # Category: { storeIds[], name,
                                                   #   description, icon, active }
POST/GET/GET{id}/PUT/DELETE   /api/products          # GET ?storeId=&categoryId=
PATCH                         /api/products/{id}/active
PATCH                         /api/products/{id}/sold-out  # "86'd" — ADMIN/MANAGER/EMPLOYEE
# Product: { categoryId, name, description, sku, image, price,
#   tokenCost, sizeIds[], extraIds[] }
# ProductResponse agrega soldOut + extras[] alfabéticos y sizes[] en el
# orden global del catálogo (sizes.position). soldOut bloquea órdenes;
# el kiosco los oculta, la caja los muestra apagados para reactivarlos.
POST/GET/PUT/DELETE           /api/extras            # catálogo por cliente
POST/GET/PUT/DELETE           /api/sizes             # catálogo por cliente, GET ordenado por position
PUT                           /api/sizes/order       # body: [ids] → orden global del menú
# Extra/Size: { name, price, active, productIds[] } — asignación
# bidireccional: desde el producto (extraIds/sizeIds) o desde el
# extra/tamaño (productIds). price = cargo adicional sobre el precio.
GET/PUT                       /api/inventory/{productId}
```

**Borrado lógico / restauración:** los `DELETE` son soft delete
(`deleted_at` — el historial de órdenes conserva snapshots). En
categories/products/extras/sizes/users/stores:
`GET …​?deleted=true` lista SOLO borrados y `POST …​/{id}/restore` reactiva
(`POST /api/stores/{id}/restore` también existe). Restaurar un extra/tamaño
no lo re-vincula a productos; restaurar un usuario recupera su email
original (409 si ya se re-usó).

### Settings (GET para todo el tenant; PUT solo ADMIN)

```text
GET/PUT   /api/clients/{id}/settings   # { name, logoUrl, currency, taxRate,
                                       #   kioskReceiptSeconds, tokenPrice,
                                       #   sessionHours: { rol: horas } } (0 = no cerrar)
                                       # marca del tenant: name vacío se ignora;
                                       # logoUrl "" quita el logo. El logo se sube
                                       # con POST /api/uploads/brand (solo ADMIN →
                                       # clients/{id}/brand/; productos usa /api/uploads).
                                       # AuthResponse trae clientName/clientLogoUrl
                                       # (null en SUPERADMIN) — BrandMark los usa.
GET/PUT   /api/stores/{id}/settings    # { menuName, kitchenOkMin,
                                       #   kitchenWarnMin, kitchenSound }
# menuName es LEGACY (sin input en /settings): en pantallas y tickets se
# muestra clientName (clients.name — sección Marca); menuName vacío →
# fallback al name del store. El frontend cachea ambos en
# localStorage (lib/settings.ts: getSettings/refreshSettings) para lectura
# sync en terminales y en el chequeo de expiración de sesión.
```

### Stores, clients y users

**Paginación** — los `GET` de lista (`/api/products`, `/api/categories`,
`/api/clients/{id}/stores`, `/api/users`, `/api/orders`) aceptan
`?page=&size=&sort=prop,asc|desc&search=`. **Sin** `page`/`size` devuelven
el array completo (terminales/selects); **con** ellos devuelven `Page`
de Spring `{ content, totalElements, totalPages, ... }`. `search` filtra
server-side los campos visibles (case-insensitive). En el frontend esto
vive en `(panel)/_components/usePagination.tsx` (`usePagination`,
`PaginationBar`, `PageDto`) + `useTableSort` en modo `remote` para mandar
el `sort=` — ver `docs/03-todos.md` › paginación.

```text
POST/GET/GET{id}/PUT/DELETE /api/stores  # ADMIN; DELETE = baja lógica
POST   /api/stores/{id}/restore          # ADMIN
POST   /api/clients                    # alta de tenant (plan: maxStores,
                            # adminName/adminEmail/adminPassword opcionales
                            # → crea también el ADMIN del tenant)
GET    /api/clients/{id}               #  maxPosPerStore, maxKiosksPerStore)
GET    /api/clients                    # SUPERADMIN — todos los tenants
PUT    /api/clients/{id}               # SUPERADMIN — nombre + límites del plan
GET/PUT /api/clients/{id}/admin        # SUPERADMIN — admin del tenant; el PUT
                            # pide superadminPassword (401 si falla) y la nueva
                            # adminPassword valida 8+ con may/min/dígito
GET    /api/clients/{id}/stores        # lista del cliente — paginable
GET    /api/users                      # ADMIN/MANAGER — lista del cliente, paginable
POST   /api/users                      # ADMIN — { name, email, password, role,
                                       #   storeIds[], currentPassword }
PUT    /api/users/{id}                 # ADMIN — password vacío = sin cambio
PATCH  /api/users/{id}/active          # ADMIN — { active, currentPassword }
DELETE /api/users/{id}                 # ADMIN — body { currentPassword }
```

- **Toda mutación de usuarios exige `currentPassword`** — la contraseña del
  admin logueado (re-auth server-side; 401 `Invalid credentials` si falla).
- Un admin no puede desactivarse, eliminarse ni cambiar su propio rol;
  `active=false` bloquea el login.

### Órdenes

```text
POST   /api/orders            # OrderRequest abajo
GET    /api/orders            # ?storeId=&status=&page=&size=&sort=
                            #  array para KDS · Page para historial
                            #  (default createdAt desc)
GET    /api/orders/{id}
PATCH  /api/orders/{id}/status
GET    /api/orders/{id}/ticket   # payload autocontenido para imprimir:
                                 #  OrderResponse + storeName (menuName ?: name)
                                 #  + storeAddress + clientName/logoUrl (marca
                                 #  del tenant; OrderResponse también las trae —
                                 #  encabezado del ticket cuando existe).
                                 #  Cualquier rol autenticado
                                 #  (CUSTOMER del kiosco incluido), scoping por
                                 #  store de sesión. El front imprime con
                                 #  window.print + #print-ticket (globals.css)
```

```json
// POST /api/orders — SIN storeId (sale del JWT)
{
  "channel": "POS | KIOSK",
  "orderType": "DINE_IN | TAKEAWAY",
  "paymentMethod": "CASH | CARD | TOKEN",
  "items": [{
    "productId": 1, "quantity": 2,
    "sizeId": 3,                                // opcional — asignado al producto
    "extras": [{ "extraId": 5, "quantity": 2 }],// opcional — idem
    "notes": "sin cebolla"                      // opcional, máx 500
  }]
}
// OrderItemResponse: + sizeName, extras[] ({name,price,quantity}), notes
// — snapshots; unitPrice ya incluye cargos de tamaño/extras (server-side).
```

```json
// PATCH /api/orders/{id}/status
{ "status": "PENDING | CONFIRMED | PREPARING | READY | COMPLETED | CANCELLED" }
```

**Reglas:**
- `channel=KIOSK` ⇒ solo `CARD`. `CUSTOMER` solo crea órdenes `KIOSK`.
- `paymentMethod=TOKEN` (canje de fichas): solo `POS`; exige que TODOS los
  ítems tengan `tokenCost > 0` → `total = 0`, `subtotal = 0`, `taxAmount = 0`
  y `OrderResponse.tokenAmount` = fichas cobradas (`order_items.token_cost`
  es el snapshot por ítem). `cashReceived`/`changeGiven` quedan null.
- Validación backend: productos activos del store de sesión + stock →
  descuenta inventario en la misma transacción. `sizeId`/`extras` deben
  estar asignados al producto (si no → 400); mismo producto con distinta
  selección queda como líneas separadas.
- `CANCELLED` permitido hasta `PREPARING` inclusive → restaura inventario y
  `refund_status=REFUNDED` (reembolso manual por staff).
- KDS usa: `PREPARING`, `READY`, `CANCELLED`.
- `PATCH /status` y `GET /api/orders` abiertos a ADMIN/MANAGER/EMPLOYEE/
  KITCHEN — el tablero `/kitchen` es accesible para todo el staff.
- `OrderResponse` incluye `subtotal`, `taxRate` (snapshot del taxRate del
  cliente al cobrar) y `taxAmount` — el impuesto se AGREGA: precios del
  catálogo no lo incluyen, `total = subtotal + taxAmount`; órdenes viejas
  devuelven `subtotal=total`, `taxRate=0`.
- `ticketNumber` es el folio semanal consecutivo por tienda (persistido
  en `orders.ticket_number` al crear, con lock sobre el store — no hay
  estimado front-side); mostrar `ticketNumber ?? id` (viejas → id).

- Pago en efectivo: `OrderRequest.cashReceived` (solo CASH) — el server
  valida ≥ total y persiste `changeGiven = cashReceived - total`;
  ambos vuelven en `OrderResponse`/`TicketResponse` (ticket muestra
  Recibido/Cambio). `null` en CARD.

### Extras del cliente

```text
# Fichas (TOKENS) ✅ — físicas/anónimas, sin wallet, solo caja
POST   /api/tokens             # { quantity, paymentMethod: CASH|CARD } —
                               #   venta: cobra quantity × clients.tokenPrice
                               #   (400 si tokenPrice ≤ 0 → POS oculta el botón)
GET    /api/tokens             # ?storeId=&from=&to= — ventas del rango (hoy)
# El canje NO es endpoint propio: es POST /api/orders con
# paymentMethod=TOKEN (ver reglas arriba). Solo products con tokenCost > 0.

# Barra (BAR) — pendiente en backend
GET    /api/bar/items?status=
PATCH  /api/bar/items/{id}/status

# Reportes (REPORTS) — ADMIN/MANAGER ✅
GET    /api/reports/dashboard?from=&to=&storeId=&top=
#   → { totalSales, orders, avgTicket, cancelledOrders, refundedTotal,
#       channels[], orderTypes[], payments[], hourly[], topProducts[],
#       employees[] } — CANCELLED no cuentan en ventas

# Mesas y reservaciones (RESERVATIONS) — pendiente en backend
GET    /api/tables?zone=                       # DINING | BAR (6 sillas)
POST   /api/tables
GET    /api/reservations/availability?date=&zone=
POST   /api/reservations                       # { tableId, date, timeSlot,
                                               #   partySize, customerName, phone }
GET    /api/reservations?date=&status=
PATCH  /api/reservations/{id}/status           # CONFIRMED/SEATED/CANCELLED/NO_SHOW

# Módulos — pendiente en backend
PUT    /api/clients/{id}/modules   # plataforma: módulos contratados
PUT    /api/users/{id}/modules     # admin del cliente: subconjunto ⊆ client_modules
GET    /api/modules/available
```

## Formato de errores

Todos los errores llegan como `ErrorResponse`:

```json
{
  "timestamp": "...",
  "status": 409,
  "error": "Conflict",
  "message": "Insufficient stock for product: Espresso",
  "path": "/api/orders",
  "fieldErrors": { "name": "must not be blank" }
}
```

Mapear `fieldErrors` a los campos del formulario; `message` es texto legible.

## Cambios al backend — actualiza los tests

Al tocar `store-be` (firmas de DTOs/records, constructores, comportamiento de
servicios), **actualiza los tests de `src/test/` en el mismo cambio** — el
build de Railway compila los tests (`mvnw install`) y rompe aunque el código
principal compile. Antes de cerrar: `./mvnw -q -DskipTests compile` +
`./mvnw -q test`.

## Decisiones de integración (docs/11)

- `fetch` nativo alcanza para empezar; `TanStack Query` recomendado para
  cache/loading/error y polling (el KDS hace polling de órdenes).
- No hay Express ni BFF — el backend Spring Boot ES el servidor.
- **CORS** ya configurado en `SecurityConfig` para `http://localhost:3000`.
