"use client";

import { getSettings } from "@/lib/settings";
import { Printer } from "lucide-react";
import { createPortal } from "react-dom";
import { Modal } from "./Modal";

/** Campos de OrderResponse que necesita el ticket. */
export type TicketOrder = {
  id: number;
  // folio semanal por tienda persistido en la orden (backend: id para viejas)
  ticketNumber?: number | null;
  storeId: number;
  // nombre del negocio del tenant — gana sobre storeName en el encabezado
  clientName?: string | null;
  // vienen del endpoint /{id}/ticket; el POS/KDS pueden pasar el nombre por prop
  storeName?: string;
  storeAddress?: string | null;
  // logo del tenant — encabezado del ticket cuando existe
  logoUrl?: string | null;
  channel: "POS" | "KIOSK";
  orderType: "DINE_IN" | "TAKEAWAY";
  paymentMethod: "CASH" | "CARD";
  status: string;
  createdAt: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  // solo pagos en efectivo — el cambio lo calcula el backend
  cashReceived?: number | null;
  changeGiven?: number | null;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    sizeName: string | null;
    extras: { name: string; quantity: number }[] | null;
    notes: string | null;
  }[];
};

/** Ticket ~80mm — #print-ticket es lo único visible al imprimir (globals.css). */
export function OrderTicket({
  order,
  storeName,
  print = false,
}: {
  order: TicketOrder;
  storeName?: string;
  // solo la copia destinada al papel lleva el id (uno por página)
  print?: boolean;
}) {
  const fmt = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: getSettings().currency,
  });
  const when = new Date(order.createdAt).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <div
      id={print ? "print-ticket" : undefined}
      className="mx-auto w-full max-w-70 rounded-lg border border-dashed border-border bg-background px-5 py-4 font-mono text-[13px] leading-snug text-text-primary"
    >
      {order.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={order.logoUrl}
          alt=""
          className="mx-auto mb-1.5 max-h-16 w-auto object-contain"
        />
      )}
      <p className="text-center text-sm font-bold uppercase">
        {order.clientName ?? order.storeName ?? storeName ?? "Store"}
      </p>
      {order.storeAddress && (
        <p className="text-center text-[11px] text-text-secondary">
          {order.storeAddress}
        </p>
      )}
      <p className="text-center text-xs">
        Pedido #{order.ticketNumber ?? order.id}
      </p>
      <p className="mt-1 text-center text-[11px] text-text-secondary">
        {when} · {order.channel === "KIOSK" ? "Kiosco" : "Caja"} ·{" "}
        {order.orderType === "DINE_IN" ? "En mesa" : "Para llevar"}
      </p>
      {order.status === "CANCELLED" && (
        <p className="mt-1 text-center font-bold text-error">
          *** CANCELADA ***
        </p>
      )}
      <ul className="mt-2 flex flex-col gap-1.5 border-t border-dashed border-border pt-2">
        {order.items.map((item, i) => (
          <li key={`${item.productId}-${i}`}>
            <div className="flex justify-between gap-2">
              <span>
                {item.quantity}× {item.productName}
              </span>
              <span className="tabular-nums">
                {fmt.format(item.unitPrice * item.quantity)}
              </span>
            </div>
            {(item.sizeName ||
              (item.extras?.length ?? 0) > 0 ||
              item.notes) && (
              <span className="block text-[11px] text-text-secondary">
                {[
                  item.sizeName,
                  ...(item.extras ?? []).map((e) =>
                    e.quantity > 1 ? `${e.quantity}× ${e.name}` : e.name,
                  ),
                  item.notes && `“${item.notes}”`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>
      <dl className="mt-2 flex flex-col gap-0.5 border-t border-dashed border-border pt-2">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Subtotal</dt>
          <dd className="tabular-nums">{fmt.format(order.subtotal)}</dd>
        </div>
        {order.taxAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">Impuesto ({order.taxRate}%)</dt>
            <dd className="tabular-nums">{fmt.format(order.taxAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-dashed border-border pt-1 text-sm font-bold">
          <dt>Total</dt>
          <dd className="tabular-nums">{fmt.format(order.total)}</dd>
        </div>
        {order.cashReceived != null && (
          <>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Recibido</dt>
              <dd className="tabular-nums">{fmt.format(order.cashReceived)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Cambio</dt>
              <dd className="tabular-nums">
                {fmt.format(order.changeGiven ?? 0)}
              </dd>
            </div>
          </>
        )}
      </dl>
      <p className="mt-2 text-center text-[11px] text-text-secondary">
        Pago: {order.paymentMethod === "CASH" ? "Efectivo" : "Tarjeta"}
      </p>
    </div>
  );
}

/** Ticket + botón Imprimir (window.print). */
export function TicketModal({
  order,
  storeName,
  onClose,
}: {
  order: TicketOrder | null;
  storeName?: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={order !== null}
      onClose={onClose}
      title={order ? `Ticket #${order.id}` : "Ticket"}
    >
      {order && (
        <div className="flex flex-col gap-4">
          <OrderTicket order={order} storeName={storeName} />
          {/* copia de impresión: fuera del <dialog> (portaleada al body) —
              dentro del modal quedaría anclada/recortada al imprimir */}
          {typeof document !== "undefined" &&
            createPortal(
              <div aria-hidden className="invisible h-0 overflow-hidden">
                <OrderTicket order={order} storeName={storeName} print />
              </div>,
              document.body,
            )}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Printer size={16} aria-hidden />
            Imprimir
          </button>
        </div>
      )}
    </Modal>
  );
}
