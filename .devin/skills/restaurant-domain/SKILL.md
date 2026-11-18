---
name: restaurant-domain
description: >
  Dominio de restaurante para SAC+: POS, cajas, kioscos, KDS, menú,
  modificadores, órdenes, mesas, recetas, food cost, inventario de
  alimentos y flujos de cocina. Usar en TODO lo que toque el vertical
  restaurante actual — también al decir "restaurante", "POS", "kiosco",
  "cocina", "KDS", "menú", "mesa", "receta", "food cost".
---

# Restaurant Domain — SAC+ (vertical actual)

## Funcionalidad implementada (verificada)

| Área | Estado | Detalle |
|---|---|---|
| Menú/catálogo | ✅ | categories, products, extras, sizes, imágenes S3, soldOut manual |
| POS | ✅ | OrderTerminal, cobro CASH/CARD/TOKEN, cashReceived/change, ticket auto |
| Kiosco | ✅ | canal KIOSK, solo CARD, countdown idle 90s, sin fichas |
| KDS | ✅ | /kitchen, polling multi-status, aging colors, sonido, roles varios |
| Órdenes | ✅ | DINE_IN/TAKEAWAY, items con size/extras/notes, estados, cancel+refund |
| Fichas | ✅ | venta CASH/CARD, canje TOKEN (tokenCost por producto) |
| Tickets | ✅ | 80mm térmico, folio semanal por tienda, auto-impresión por equipo |
| Inventario | 🟡 | stock por producto+store, minStock alert, sin movimientos |
| Reportes | ✅ | dashboard día: ventas, canal, pago, hourly, top productos, empleados |
| Multi-tienda | ✅ | stores con branding propio, user_stores, ?storeId= scoping |

## Funcionalidad pendiente (del audit)

- **Corte de caja por turno** — diseño en happy path (shift por store,
  fondo inicial, esperado vs contado, incluye fichas).
- **Mesas/reservaciones** — `tables`, `zones` (DINING/BAR), reservations
  con availability — backend pendiente.
- **Barra** — módulo BAR con items y estados — backend pendiente.
- **Recetas/food cost** — BOM de ingredientes, costing, mermas.
- **Movimientos de inventario** — compras, ajustes, transfers.
- **Descuentos** — por orden (subtotal+impuesto−descuento).
- **Propinas** — no modelado.
- **Comandas impresas a cocina** — solo pantalla KDS hoy.
- **Integración Bancomer** — terminal tarjeta pendiente del banco.

## Reglas de negocio del restaurante

1. **Precios sin IVA** — `total = subtotal + taxAmount` (taxRate del
   client, snapshot en orden). Nunca incluir impuesto en precio de
   catálogo.
2. **Canje de fichas**: solo POS, solo productos con `tokenCost > 0`,
   total $0, `tokenAmount` = fichas cobradas.
3. **Kiosco**: solo CARD (no efectivo ni fichas — sin supervisión).
4. **Cancelación**: hasta PREPARING inclusive → restaura stock;
   `refunded` decide `refund_status` (TOKEN siempre NONE).
5. **Folio**: `ticket_number` semanal consecutivo por tienda, lock
   pesimista — impresos y screen muestran el mismo.
6. **Stock por tienda**: vender en A no afecta B; `soldOut` manual por
   tienda.
7. **Impresión por equipo**: impresora = default del SO; auto-print es
   flag local del equipo (`store.print.auto`), no del tenant.

## Flujos críticos (happy path)

```
Login (rol+tienda) → POS/Kiosco → seleccionar productos+extras
→ cobro (CASH: efectivo recibido/cambio | CARD: placeholder | TOKEN: fichas)
→ orden PENDING → KDS PREPARING → READY → COMPLETED
→ ticket impreso (auto o manual) → reporte dashboard
```

## Al tocar el vertical

- ¿Afecta dinero? → transacción + idempotencia + tests.
- ¿Afecta stock? → movimiento en `inventories` en la misma TX.
- ¿Nuevo método de pago? → `payment-integration` skill + Bancomer TODO.
- ¿Nueva pantalla? → `frontend-engineering` + `store-api` skill.
- ¿Módulo nuevo? → `business-domain-erp` + entitlement backend.
