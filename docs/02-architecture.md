# 2. Arquitectura y convenciones

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS v4 +
Redux Toolkit + lucide-react. Sin BFF: el frontend llama directo a la REST
API de Spring Boot con `fetch` nativo.

## Estructura

```text
app/
  page.tsx                  # "/" — Login
  layout.tsx                # shell global + <Providers>
  (panel)/                  # route group: sidebar compartido, sin prefijo URL
    layout.tsx              #   AdminSidebar + <main>
    _components/            #   compartidas del panel (AdminSidebar)
    dashboard/              # /dashboard
    categories/             # /categories
    products/               # /products (+ _components: view, modals, sections)
    stores/                 # /stores
  pos/ kiosk/ kitchen/      # placeholders fuera del (panel)
components/
  Providers.tsx             # Redux Provider + hidratación de sesión
  molecules/  organisms/    # UI compartida (Modal, PageHeader, Sidebar…)
lib/
  api.ts                    # wrapper fetch: BASE + Authorization + ErrorResponse
  session.ts                # AuthResponse, ROLE_HOME, helpers de sesión
  store.ts                  # Redux store; persiste sesión en localStorage
```

## Convenciones

- **Rutas nuevas del panel** van en `app/(panel)/<nombre>` — URL limpia sin
  perder el sidebar. Solo salir del grupo si la pantalla no debe tener
  sidebar (POS/kiosko/KDS pueden diferir).
- **`_components/`** por página para lo que no se reutiliza fuera.
- **Llamadas a la API** siempre via `api()` de `lib/api.ts` — adjunta el JWT
  y normaliza errores a `Error.message`. Nada de `fetch` suelto.
- **Estado**: Redux solo para sesión. Datos de servidor (catálogos, órdenes)
  viven en estado local del componente (`useState` + `useEffect`); TanStack
  Query es la migración recomendada, no aún hecha.
- **`storeId`/`clientId` nunca se piden al usuario ni van en el body** —
  salen del JWT/sesión (`useSession()`).
- Diseño: tokens de Tailwind (`bg-canvas`, `text-error`, etc.), Inter, iconos
  `lucide-react`. La referencia visual de `/products` salió de un frame de
  Figma adaptado a estos tokens.

## Verificación

```bash
pnpm lint       # eslint — debe pasar limpio antes de commit
pnpm build      # next build — incluye typecheck
```

Si el IDE marca `Cannot find module` en archivos que sí existen (pasa tras
crear archivos desde fuera), reinicia el TS server:
`Ctrl+Shift+P → TypeScript: Restart TS Server`.
