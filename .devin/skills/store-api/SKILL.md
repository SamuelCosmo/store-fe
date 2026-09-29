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
- Roles: `ADMIN`, `MANAGER`, `EMPLOYEE`, `CUSTOMER` (cuenta genérica de kiosko).
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
# Product: { categoryId, name, description, sku, image, price,
#   tokenCost, sizeIds[], extraIds[] }
# ProductResponse incluye extras[] y sizes[] resueltos.
POST/GET/PUT/DELETE           /api/extras            # catálogo por cliente
POST/GET/PUT/DELETE           /api/sizes             # catálogo por cliente
# Extra/Size: { name, price, active, productIds[] } — asignación
# bidireccional: desde el producto (extraIds/sizeIds) o desde el
# extra/tamaño (productIds). price = cargo adicional sobre el precio.
GET/PUT                       /api/inventory/{productId}
```

### Stores y clients

```text
POST/GET/GET{id}/PUT   /api/stores     # ADMIN; ligado a clientId
POST   /api/clients                    # alta de tenant (plan: maxStores,
GET    /api/clients/{id}               #  maxPosPerStore, maxKiosksPerStore)
GET    /api/clients/{id}/stores
```

### Órdenes

```text
POST   /api/orders            # OrderRequest abajo
GET    /api/orders            # ?storeId=&status= (KDS filtra por estado)
GET    /api/orders/{id}
PATCH  /api/orders/{id}/status
GET    /api/orders/{id}/ticket   # payload para impresión
```

```json
// POST /api/orders — SIN storeId (sale del JWT)
{
  "channel": "POS | KIOSK",
  "orderType": "DINE_IN | TAKEAWAY",
  "paymentMethod": "CASH | CARD",
  "items": [{ "productId": 1, "quantity": 2 }]
}
```

```json
// PATCH /api/orders/{id}/status
{ "status": "PENDING | CONFIRMED | PREPARING | READY | COMPLETED | CANCELLED" }
```

**Reglas:**
- `channel=KIOSK` ⇒ solo `CARD`. `CUSTOMER` solo crea órdenes `KIOSK`.
- Validación backend: productos activos del store de sesión + stock →
  descuenta inventario en la misma transacción. Items duplicados se fusionan.
- `CANCELLED` permitido hasta `PREPARING` inclusive → restaura inventario y
  `refund_status=REFUNDED` (reembolso manual por staff).
- KDS usa: `PREPARING`, `READY`, `CANCELLED`.

### Extras del cliente (módulos opcionales)

```text
# Fichas (TOKENS) — físicas/anónimas, sin wallet
POST   /api/tokens/purchase    # { quantity, paymentMethod } — venta en caja
POST   /api/tokens/redeem      # { productId, quantity } — canje en barra;
                               #   solo products con tokenCost > 0

# Barra (BAR)
GET    /api/bar/items?status=
PATCH  /api/bar/items/{id}/status

# Reportes (REPORTS) — ADMIN/MANAGER
GET    /api/reports/sales/daily?date=
GET    /api/reports/top-products?from=&to=&limit=
GET    /api/reports/sales-by-employee?from=&to=

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
- Pendiente en backend: **CORS** para `http://localhost:3000`. Si un request
  falla sin response, revisar primero esto.
