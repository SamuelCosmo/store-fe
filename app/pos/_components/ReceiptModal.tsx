"use client";

import { Modal } from "@/components/molecules/Modal";
import { useI18n } from "@/lib/i18n";
import { CircleCheck, Printer } from "lucide-react";
import type { ReceiptOrder } from "./terminal-utils";

/** Recibo tras cobrar: folio, total pagado, cambio y cuenta regresiva
 *  hacia el siguiente pedido (el kiosco vuelve solo a la bienvenida). */
export function ReceiptModal({
  receipt,
  countdown,
  fmt,
  canPrintTickets,
  onClose,
  onPrint,
}: {
  receipt: ReceiptOrder | null;
  countdown: number;
  fmt: Intl.NumberFormat;
  canPrintTickets: boolean;
  onClose: () => void;
  onPrint: (order: ReceiptOrder) => void;
}) {
  const { t } = useI18n();

  return (
    <Modal open={receipt !== null} onClose={onClose} title={t("pos.orderSent")}>
      {receipt && (
        <div className="flex flex-col items-center gap-4 text-center">
          <CircleCheck size={52} aria-hidden className="text-success" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-success">
              {t("pos.paymentSuccess")}
            </p>
            <p className="text-lg font-extrabold text-text-primary">
              {t("ticket.order", { n: receipt.number ?? receipt.id })}
            </p>
            <p className="text-sm text-text-secondary">
              {receipt.paymentMethod === "TOKEN"
                ? t("pos.tokenCount", { n: receipt.tokenAmount ?? 0 })
                : fmt.format(receipt.total)}{" "}
              ·{" "}
              {receipt.paymentMethod === "CASH"
                ? t("ticket.cash")
                : receipt.paymentMethod === "TOKEN"
                  ? t("ticket.token")
                  : t("ticket.card")}{" "}
              ·{" "}
              {receipt.orderType === "DINE_IN"
                ? t("ticket.dineIn")
                : t("ticket.takeaway")}
            </p>
            {/* el desglose real viene persistido en la orden */}
            {receipt.taxAmount > 0 && (
              <p className="text-xs text-text-muted">
                {t("ticket.tax", { rate: receipt.taxRate })}:{" "}
                {fmt.format(receipt.taxAmount)}
              </p>
            )}
            {receipt.change !== null && receipt.change > 0 && (
              <p className="mt-1 rounded-lg border border-success/40 bg-success/5 px-3.5 py-2 text-sm font-bold text-success">
                {t("pos.changeBack", { v: fmt.format(receipt.change) })}
              </p>
            )}
            <p className="mt-1 text-xs text-text-muted">
              {t("pos.inKitchen")}
            </p>
          </div>
          <button
            onClick={onClose}
            autoFocus
            className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("pos.newOrderIn", { n: countdown })}
          </button>
          {canPrintTickets && (
            <button
              type="button"
              onClick={() => onPrint(receipt)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-surface"
            >
              <Printer size={16} aria-hidden />
              {t("ticket.printTicket")}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
