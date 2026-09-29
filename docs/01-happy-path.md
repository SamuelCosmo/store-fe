# 1. Happy Path del frontend

Flujos tal como existen hoy. ✅ = implementado contra el backend real;
⬜ = placeholder (la ruta existe, la pantalla no).

## Login → `/` ✅

1. `POST /api/auth/login` con `{ email, password, storeId }`.
2. La respuesta `AuthResponse` (`token, userId, name, email, role, clientId,
   storeId`) se guarda en Redux + `localStorage` (`store.session`).
3. `Providers` rehidrata la sesión en `useEffect` (post-mount — evita el
   hydration mismatch de leer `localStorage` en SSR).
4. Redirect según `ROLE_HOME` (`lib/session.ts`):
   `ADMIN`/`MANAGER` → `/dashboard`, `EMPLOYEE` → `/pos`,
   `CUSTOMER` → `/kiosk`.
5. Logout desde `UserCard` → `clearSession()` + `router.push("/")`.

## Dashboard → `/dashboard` ✅ parcial

- Landing con `DashboardHeader` + `UserCard` dentro del shell del panel.
- ⬜ Falta: métricas/resumen del día (depende de `/api/reports/*`,
  pendiente en backend).

## Establecimientos → `/stores` ✅

- Lista `GET /api/clients/{id}/stores` (id del JWT guardado).
- Crear/editar `POST|PUT /api/stores` — `name`, `description`, `address`,
  `businessType`, `active`.
- Toggle activar/desactivar via `PUT` con `active` (no hay DELETE).

## Categorías → `/categories` ✅

- Lista `GET /api/categories` (scope por tienda de sesión; `?storeId=` solo
  para ADMIN sin store fijo).
- `CategoryModal`: `name`, `description`, `icon` (string, mapeado a lucide en
  el front), `active`, y `storeIds[]` — una categoría puede vivir en varias
  tiendas (`category_stores`).
- Crear/editar `POST|PUT /api/categories`, borrar `DELETE /api/categories/{id}`.

## Productos → `/products` ✅

Tres bloques en la misma página:

- **Tabla de productos** — thumbnail (o icono de la categoría), nombre,
  `SKU · …`, categoría, precio, pill Disponible/Agotado (`active`), acciones
  editar / ocultar (`PATCH /api/products/{id}/active`) / eliminar.
  Click en la fila la **expande** y muestra los tamaños y extras asignados.
- **ProductModal** — `categoryId`, `name`, `description`, `sku`, `price`,
  `tokenCost`, `active`, contenedor de imagen (placeholder — ver TODOs),
  columna derecha con checkboxes de **Tamaños** y **Extras** (`sizeIds` /
  `extraIds` en el payload).
- **SizesSection** — CRUD `/api/sizes` (`name`, `price` = cargo adicional,
  `active`). La asignación a productos SOLO se hace desde el ProductModal;
  la tabla muestra el conteo de productos como lectura.
- **ExtrasSection** — CRUD `/api/extras` (`name`, `price`, `active`) y desde
  su modal también se puede asignar a productos (`productIds`).

## Superficies pendientes ⬜

| Ruta       | Flujo esperado (spec: `store-be/docs/10-frontend-screens.md`) |
| ---------- | ------------------------------------------------------------ |
| `/pos`     | Armar orden → `POST /api/orders` (`channel: POS`, CASH/CARD), venta de fichas, ticket |
| `/kiosk`   | Mismo flujo con `channel: KIOSK` (solo CARD), sesión `CUSTOMER` ligada al store |
| `/kitchen` | `GET /api/orders?status=` + `PATCH .../status` (PREPARING/READY/CANCELLED), polling |

Reglas que el UI debe respetar: `channel=KIOSK` ⇒ solo `CARD`; cancelación
solo hasta `PREPARING`; `storeId` nunca va en el body — sale del JWT;
`fieldErrors` del `ErrorResponse` se mapean a los inputs.
