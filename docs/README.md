# Store Platform — Documentación del frontend

Docs del repo `store-fe` (Next.js). La fuente de verdad del negocio y de la
API vive en [`../../store-be/docs/`](../../store-be/docs/README.md); estos
documentos solo cubren cómo el frontend la consume.

## Índice

1. [Happy path](01-happy-path.md) — flujos implementados por pantalla y los
   endpoints que toca cada uno.
2. [Arquitectura y convenciones](02-architecture.md) — estructura del repo,
   sesión, API client, patrones de UI.
3. [TODOs](03-todos.md) — trabajo pendiente, en orden sugerido.

## Setup rápido

```bash
pnpm install
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8080
pnpm dev                          # http://localhost:3000
```

Requiere el backend corriendo (`store-be`: `docker compose up -d` +
`./mvnw spring-boot:run`). Smoke test del backend en
[`../../store-be/README.md`](../../store-be/README.md#happy-path-rápido-smoke-test)
— deja un tenant + usuario `admin@…` listo para entrar por `/`.
