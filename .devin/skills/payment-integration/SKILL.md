---
name: payment-integration
description: >
  Integración de pagos para SAC+: pasarelas, terminales de tarjeta
  (Bancomer/BBVA pendiente), reconciliación, reembolsos, webhooks,
  idempotencia y ciclo de vida de transacciones. Usar en TODO lo que toque
  cobros, tarjetas, refunds o conciliación — también al decir "pago",
  "tarjeta", "terminal", "Bancomer", "refund", "webhook", "idempotencia".
---

# Payment Integration — SAC+

## Estado actual

- `paymentMethod`: `CASH | CARD | TOKEN` en `orders` y `token_transactions`.
- **CARD = placeholder**: se registra sin procesar — el cajero cobra en su
  terminal externa y confirma manualmente.
- **TOKEN**: canje de fichas físicas (`tokenCost` por producto, total $0,
  `tokenAmount` fichas cobradas).
- **Efectivo**: `cashReceived`/`changeGiven` persistidos y validados.
- **Idempotencia**: `Idempotency-Key` header en `POST /api/orders` y
  `POST /api/tokens` — reintento devuelve la operación ya creada.
- **Refunds**: `PATCH /orders/{id}/status` con `refunded: true` →
  `refund_status=REFUNDED` (solo pagos con dinero; TOKEN → NONE).
- Investigación de terminales: `store-be/docs/14-card-terminals.md` —
  BBVA Total POS, Billpocket, Mercado Pago Point, NetPay evaluados;
  **decisión: integración Bancomer (BBVA), spec del banco pendiente**.

## Decisiones de diseño ya tomadas

- `Client.paymentProvider` + credenciales POR TENANT (solo servidor —
  nunca al front).
- `Device` ↔ serial de terminal por establecimiento.
- Entidad `Payment` por intento de cobro (idempotencia/reconciliación).
- Webhook o polling de estatus del proveedor; la orden CARD entra a KDS
  SOLO con pago aprobado (flujo `PENDING_PAYMENT` → aprobado → `PENDING`).
- El front solo inicia/consulta estatus al backend — **nunca llama al
  proveedor directo**.
- Standalone/manual = fallback permanente.

## Reglas para cualquier feature de pago

1. **Dinero = centavos/`BigDecimal`** — nunca floats. `total =
   subtotal + taxAmount` (impuesto se AGREGA, precios sin IVA).
2. **Idempotency-Key obligatorio** en todo endpoint que cree un cobro —
   reintentos de red no duplican cargos.
3. **Reconciliación**: cada `Payment` guarda provider, providerRef,
   status, amount, createdAt — permite cruzar con estados de cuenta.
4. **Refunds**: registrar `refund_status` + quién/cuándo; dinero real
   devuelto por el proveedor cuando exista integración.
5. **Nunca** guardar PAN/CVV/datos de tarjeta — tokenización del
   proveedor únicamente.
6. **Webhooks**: verificar firma del proveedor, idempotentes, registrar
   payload para auditoría.
7. **Multi-tenant**: credenciales del proveedor por `client_id` — un
   tenant nunca ve transacciones de otro.

## Pendientes

- [ ] `TODO(bancomer)` en `OrderService.create` — esperar implementación
  del banco.
- [ ] Entidad `Payment` + `Client.paymentProvider` cuando se defina
  proveedor.
- [ ] Flujo PENDING_PAYMENT en orden CARD.
- [ ] Webhook/polling de estatus.
