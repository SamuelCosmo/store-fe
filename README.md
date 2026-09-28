# Store Platform — Frontend

Frontend del producto **Store Platform** (backend: [`store-be`](../store-be) —
monolito modular Java 21 + Spring Boot + PostgreSQL, multi-tenant).

Next.js (App Router) + React + TypeScript + Tailwind CSS. Consume la REST API
del backend; no hay servidor propio ni BFF por ahora.

## Requisitos

- Node.js + pnpm (`npm i -g pnpm` o Corepack; versión fijada en
  `packageManager` de `package.json`)
- Backend corriendo en `localhost:8080` (ver README de `store-be`)

## Configuración

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint       # eslint
pnpm build      # build de producción
```

Swagger UI del backend: http://localhost:8080/swagger-ui.html

## Superficies (pantallas)

Todas consumen la misma API. Tras el login se enruta por **rol + módulos**
efectivos del usuario (`user_modules ∩ client_modules`).

| Superficie        | Ruta       | Rol             | Consume |
| ----------------- | ---------- | --------------- | ------- |
| Login             | `/`        | todos           | `POST /api/auth/login`; si ya hay sesión redirige por rol |
| Panel Admin       | `/dashboard` | ADMIN, MANAGER  | CRUD stores/categories/products, inventory, reportes, mesas/reservaciones |
| Caja (POS)        | `/pos`     | EMPLOYEE        | `POST /api/orders` (CASH/CARD), fichas, ticket |
| Kiosko            | `/kiosk`   | CUSTOMER        | `POST /api/orders` (solo CARD; sesión ligada al store) |
| Cocina (KDS)      | `/kitchen` | EMPLOYEE        | `GET /api/orders?status=` + `PATCH .../status` |

## Autenticación

`POST /api/auth/login` → `{ token, role, ... }`. El JWT lleva `clientId`,
`storeId` y rol como claims; se envía como `Authorization: Bearer <token>`.

- MVP: token en `localStorage`. Iteración futura: cookie httpOnly via Route
  Handler de Next.js.
- `storeId` nunca va en el body de una orden — lo deriva el backend del JWT.
- El `?storeId=` opcional en GETs solo lo puede usar `ADMIN` (stores de su
  cliente).

## Reglas de negocio que condicionan el UI

- `channel=KIOSK` ⇒ solo `paymentMethod=CARD`.
- Estados de orden: `PENDING → CONFIRMED → PREPARING → READY → COMPLETED`;
  `CANCELLED` permitido hasta `PREPARING` (restaura inventario).
- Solo productos `active` se muestran en caja y kiosko.
- El frontend oculta rutas sin permiso (UX); el backend refuerza con
  `@PreAuthorize` por rol y por módulo.
- Errores llegan como `ErrorResponse` `{ status, error, message, path,
  fieldErrors }` — manejar `fieldErrors` en formularios.

## Referencia

- Skill del repo: `/store-api` — contrato de la API destilado.
- Docs fuente (backend): [`../store-be/docs/`](../store-be/docs/README.md) —
  especialmente `10-frontend-screens.md`, `11-frontend-integration.md` y
  `07-api.md`.
