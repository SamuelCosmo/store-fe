---
name: inventory-management
description: >
  Gestión de inventario para SAC+: stock, movimientos, warehouses,
  ajustes, unidades de medida, valuation y food cost del restaurante.
  Usar en TODO lo que toque existencias, compras, mermas o recetas —
  también al decir "inventario", "stock", "existencias", "receta",
  "ingrediente", "merma", "food cost".
---

# Inventory Management — SAC+

## Estado actual (verificado)

- `inventories` por `product_id`+`store_id`: `quantity`, `minStock`
  (umbral de alerta baja — usado en dashboard/reportes).
- `OrderService.create` descuenta stock en la misma transacción;
  `CANCELLED` (hasta PREPARING) lo restaura.
- `products.soldOut` ("86'd") manual desde POS — sin reset diario.
- **NO hay**: movimientos de inventario (entradas/salidas/ajustes con
  historial), warehouses múltiples, unidades de medida, números de serie,
  lotes, recetas/BOM, food cost, proveedores, compras.

## Modelo objetivo (futuro — no implementar sin requerimiento)

```
inventory_movements: id, store_id, product_id(ingredient_id), type
  (PURCHASE|SALE|ADJUSTMENT|WASTE|TRANSFER), quantity(+/-), unit_cost,
  reference (order_id/purchase_id), created_by, created_at
```

- Stock = suma de movimientos (o quantity cacheada + movements como
  audit trail).
- Recetas: `recipe_items` (product terminado → ingredientes + qty) para
  food cost y descuento automático de ingredientes al vender.
- Proveedores/compras: módulo ERP separado (ver business-domain-erp).

## Reglas al tocar inventario hoy

1. Descuento/restauración SIEMPRE en la transacción de la orden — nunca
   después ni en proceso separado.
2. `minStock` alimenta alertas del dashboard — respetar semántica.
3. `soldOut` es manual del staff; agotado real = stock 0 → back rechaza
   orden con `OUT_OF_STOCK` (código de error existente).
4. Multi-store: stock es POR STORE (inventories.store_id) — vender en
   tienda A no afecta tienda B.
5. Fichas (TOKEN) no tocan inventario de productos canjeables? — verificar:
   el canje descuenta stock igual que venta normal.

## Al implementar movimientos (futuro)

- Cada movimiento con tipo, cantidad firmada, referencia y autor → audit
  trail de inventario.
- Ajustes manuales requieren rol MANAGER+ y motivo.
- Valuation: promedio ponderado o FIFO — decidir y documentar.
- Reportes: rotación, mermas %, food cost % por producto.
