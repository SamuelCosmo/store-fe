import type { ItemSelection } from "./ExtrasModal";
import type { ProductDto } from "@/app/(panel)/products/_components/ProductsView";
import type { TicketOrder } from "@/components/molecules/OrderTicket";

export type CartItem = {
  id: number;
  product: ProductDto;
  selection: ItemSelection;
};

export type OrderDto = TicketOrder;

/** Recibo del cobro: la orden + folio y cambio derivados. */
export type ReceiptOrder = OrderDto & {
  number: number | null;
  change: number | null;
};

// StoreOption (users/me/stores) y StoreResponse (clients/{id}/stores) traen
// la misma marca — logo + paleta de la terminal de ese establecimiento
export type StoreOpt = {
  id: number;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  canvasColor: string | null;
};

/** Estado del modal de venta de fichas. */
export type TokenSale = {
  quantity: string;
  method: "CASH" | "CARD";
  busy: boolean;
  step: "form" | "confirm" | "done";
};

/** Menú contextual de una línea del carrito (editar/duplicar/borrar). */
export type LineMenu = {
  item: CartItem;
  top: number;
  left: number;
};

// Dinero en centavos enteros — sumar floats (0.1 + 0.2) desfasa 1 centavo
// contra el BigDecimal del backend y "Exacto" quedaría corto.
export const toCents = (amount: number) => Math.round(amount * 100);

export function lineCents(item: CartItem) {
  return (
    toCents(item.product.price) +
    toCents(item.selection.size?.price ?? 0) +
    item.selection.extras.reduce(
      (sum, p) => sum + toCents(p.extra.price) * p.quantity,
      0,
    )
  );
}

export function lineUnit(item: CartItem) {
  return lineCents(item) / 100;
}

/** Igual que OrderService: subtotal × tasa / 100, HALF_UP a 2 decimales.
 *  Tasa en centésimas de % → todo entero, sin error de float. */
export function taxCents(subtotalCents: number, ratePct: number) {
  const rateBp = Math.round(ratePct * 100);
  return Math.floor((subtotalCents * rateBp + 5_000) / 10_000);
}

export function lineNote(item: CartItem) {
  return [
    item.selection.size?.name,
    ...item.selection.extras.map((p) =>
      p.quantity > 1 ? `${p.quantity}× ${p.extra.name}` : p.extra.name,
    ),
    item.selection.notes || null,
  ]
    .filter(Boolean)
    .join(" · ");
}
