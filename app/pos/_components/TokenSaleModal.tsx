"use client";

import { Modal } from "@/components/molecules/Modal";
import { useI18n } from "@/lib/i18n";
import { Banknote, CircleCheck, CreditCard } from "lucide-react";
import type { TokenSale } from "./terminal-utils";

/** Venta de fichas físicas — el canje es una orden con pago TOKEN, esto
 *  solo cobra el paquete. Pasos: form → confirm → done. */
export function TokenSaleModal({
  sale,
  unitPrice,
  fmt,
  onChange,
  onClose,
  onSell,
}: {
  sale: TokenSale | null;
  unitPrice: number;
  fmt: Intl.NumberFormat;
  onChange: (sale: TokenSale | null) => void;
  onClose: () => void;
  onSell: () => void;
}) {
  const { t } = useI18n();
  if (!sale) {
    // Modal montado siempre para su transición — el contenido va vacío
    return (
      <Modal open={false} onClose={onClose} title={t("pos.sellTokens")}>
        {null}
      </Modal>
    );
  }

  const qty = Math.max(0, Math.floor(Number(sale.quantity) || 0));

  return (
    <Modal open onClose={onClose} title={t("pos.sellTokens")}>
      <div className="flex flex-col gap-5">
        {sale.step === "done" ? (
          <>
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CircleCheck
                size={52}
                aria-hidden
                className="text-success"
              />
              <p className="text-lg font-extrabold text-text-primary">
                {t("pos.tokenSaleDone")}
              </p>
              <p className="text-sm text-text-secondary">
                {t("pos.tokenCount", { n: qty })}
                {" · "}
                {fmt.format(qty * unitPrice)}
                {" · "}
                {sale.method === "CASH"
                  ? t("ticket.cash")
                  : t("ticket.card")}
              </p>
            </div>
            <button
              onClick={onClose}
              autoFocus
              className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover"
            >
              {t("common.close")}
            </button>
          </>
        ) : sale.step === "confirm" ? (
          <>
            <p className="text-sm text-text-secondary">
              {t("pos.confirmCharge")}
            </p>
            <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3.5 text-sm">
              <p className="font-semibold text-text-primary">
                {t("pos.tokenCount", { n: qty })}
                {" × "}
                {fmt.format(unitPrice)}
                {" = "}
                {fmt.format(qty * unitPrice)}
              </p>
              <p className="text-text-secondary">
                {sale.method === "CASH"
                  ? t("ticket.cash")
                  : t("ticket.card")}
              </p>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => onChange({ ...sale, step: "form" })}
                disabled={sale.busy}
                className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-surface disabled:opacity-60"
              >
                {t("common.back")}
              </button>
              <button
                onClick={onSell}
                disabled={sale.busy}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {sale.busy ? t("pos.charging") : t("common.accept")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold text-text-secondary">
              {t("pos.tokenUnitPrice", { v: fmt.format(unitPrice) })}
            </p>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="token-qty"
                className="text-xs font-bold text-text-secondary"
              >
                {t("pos.tokenQty")}
              </label>
              <input
                id="token-qty"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={sale.quantity}
                onChange={(e) =>
                  onChange({ ...sale, quantity: e.target.value })
                }
                className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["CASH", t("ticket.cash"), Banknote],
                  ["CARD", t("ticket.card"), CreditCard],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  onClick={() => onChange({ ...sale, method: value })}
                  aria-pressed={sale.method === value}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
                    sale.method === value
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border text-text-secondary hover:border-primary/40"
                  }`}
                >
                  <Icon size={17} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => onChange({ ...sale, step: "confirm" })}
              disabled={qty < 1}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {t("pos.chargeTotal", { v: fmt.format(qty * unitPrice) })}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
