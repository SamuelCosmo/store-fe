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
POST /api/auth/register     # solo crea el PRIMER usuario (ADMIN) del tenant
POST /api/auth/login        # { email, password, storeId } → { token, role, ... }
```

- JWT con claims `clientId`, `storeId`, `role` — enviar como
  `Authorization: Bearer <token>`.
- Roles: `ADMIN`, `MANAGER`, `EMPLOYEE`, `CUSTOMER` (cuenta genérica de kiosko),
  `KITCHEN` (KDS; puede actualizar estatus de órdenes).
- MVP: token en `localStorage`. Futuro: cookie httpOnly via Route Handler.
- Un usuario puede operar varios stores (`user_stores`); el `storeId` activo
  se elige en el login y viaja en el JWT.
- **`storeId` NUNCA va en el body** de requests — el backend lo deriva del
  token. El query param `?storeId=` solo lo puede usar `ADMIN`.

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

### Settings (GET para todo el tenant; PUT solo ADMIN)

```text
GET/PUT   /api/clients/{id}/settings   # { currency, taxRate,
                                       #   kioskReceiptSeconds,
                                       #   sessionHours: { rol: horas } } (0 = no cerrar)
GET/PUT   /api/stores/{id}/settings    # { menuName, kitchenOkMin,
                                       #   kitchenWarnMin, kitchenSound }
# menuName vacío → se usa el name del store. El frontend cachea ambos en
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
POST/GET/GET{id}/PUT   /api/stores     # ADMIN; ligado a clientId
POST   /api/clients                    # alta de tenant (plan: maxStores,
GET    /api/clients/{id}               #  maxPosPerStore, maxKiosksPerStore)
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
GET    /api/orders/next-number  # → { nextNumber } — folio semanal (reset lunes)
GET    /api/orders/{id}
PATCH  /api/orders/{id}/status
GET    /api/orders/{id}/ticket   # payload autocontenido para imprimir:
                                 #  OrderResponse + storeName (menuName ?: name)
                                 #  + storeAddress. Cualquier rol autenticado
                                 #  (CUSTOMER del kiosco incluido), scoping por
                                 #  store de sesión. El front imprime con
                                 #  window.print + #print-ticket (globals.css)
```

```json
// POST /api/orders — SIN storeId (sale del JWT)
{
  "channel": "POS | KIOSK",
  "orderType": "DINE_IN | TAKEAWAY",
  "paymentMethod": "CASH | CARD",
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

**Pendiente en backend:** `cashReceived`/`changeGiven` para pago en efectivo.

### Extras del cliente (módulos opcionales — TODOS pendientes en backend)

```text
# Fichas (TOKENS) — físicas/anónimas, sin wallet
POST   /api/tokens/purchase    # { quantity, paymentMethod } — venta en caja
POST   /api/tokens/redeem      # { productId, quantity } — canje en barra;
                               #   solo products con tokenCost > 0

# Barra (BAR)
GET    /api/bar/items?status=
PATCH  /api/bar/items/{id}/status

# Reportes (REPORTS) — ADMIN/MANAGER ✅
GET    /api/reports/dashboard?from=&to=&storeId=&top=
#   → { totalSales, orders, avgTicket, cancelledOrders, refundedTotal,
#       channels[], orderTypes[], payments[], hourly[], topProducts[],
#       employees[] } — CANCELLED no cuentan en ventas

# Mesas y reservaciones (RESERVATIONS)
GET    /api/tables?zone=                       # DINING | BAR (6 sillas)
POST   /api/tables
GET    /api/reservations/availability?date=&zone=
POST   /api/reservations                       # { tableId, date, timeSlot,
                                               #   partySize, customerName, phone }
GET    /api/reservations?date=&status=
PATCH  /api/reservations/{id}/status           # CONFIRMED/SEATED/CANCELLED/NO_SHOW

# Módulos
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

## Decisiones de integración (docs/11)

- `fetch` nativo alcanza para empezar; `TanStack Query` recomendado para
  cache/loading/error y polling (el KDS hace polling de órdenes).
- No hay Express ni BFF — el backend Spring Boot ES el servidor.
- **CORS** ya configurado en `SecurityConfig` para `http://localhost:3000`.
