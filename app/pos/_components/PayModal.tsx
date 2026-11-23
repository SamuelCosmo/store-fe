"use client";

import { Modal } from "@/components/molecules/Modal";
import { useI18n } from "@/lib/i18n";
import { Banknote, CreditCard, Delete } from "lucide-react";
import type { CartItem } from "./terminal-utils";
import { lineNote, lineUnit } from "./terminal-utils";

export type PaymentMethod = "CASH" | "CARD" | "TOKEN";
export type PayStep = "form" | "confirm";

/** Modal de cobro: forma (método + teclado de efectivo + detalle) y
 *  confirmación. El canje con fichas entra directo a confirmación. */
export function PayModal({
  open,
  channel,
  step,
  payment,
  cashReceived,
  cart,
  tokenMode,
  tokensDue,
  subtotal,
  taxRate,
  taxAmount,
  total,
  paying,
  fmt,
  onClose,
  onStep,
  onPayment,
  onCashKey,
  onPay,
}: {
  open: boolean;
  channel: "POS" | "KIOSK";
  step: PayStep;
  payment: PaymentMethod;
  cashReceived: string;
  cart: CartItem[];
  tokenMode: boolean;
  tokensDue: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paying: boolean;
  fmt: Intl.NumberFormat;
  onClose: () => void;
  onStep: (step: PayStep) => void;
  onPayment: (method: PaymentMethod) => void;
  onCashKey: (key: string) => void;
  onPay: () => void;
}) {
  const { t } = useI18n();

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        onStep("form");
      }}
      title={t("pos.charge")}
      wide
    >
      {step === "confirm" ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">
            {t("pos.confirmCharge")}
          </p>
          <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3.5 text-sm">
            {payment === "TOKEN" ? (
              <p className="font-semibold text-text-primary">
                {t("pos.tokenCount", { n: tokensDue })}
                {" · "}
                {t("ticket.token")}
              </p>
            ) : (
              <>
                <p className="font-semibold text-text-primary">
                  {fmt.format(total)}
                  {" · "}
                  {payment === "CASH" ? t("ticket.cash") : t("ticket.card")}
                </p>
                {payment === "CASH" && (
                  <>
                    <p className="text-text-secondary">
                      {t("pos.cashReceived")}:{" "}
                      {fmt.format(Number(cashReceived))}
                    </p>
                    <p className="font-semibold text-success">
                      {t("pos.changeBack", {
                        v: fmt.format(Number(cashReceived) - total),
                      })}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() =>
                tokenMode ? onClose() : onStep("form")
              }
              disabled={paying}
              className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-surface disabled:opacity-60"
            >
              {t("common.back")}
            </button>
            <button
              onClick={onPay}
              disabled={paying}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {paying ? t("pos.charging") : t("common.accept")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {/* izquierda: método de pago + teclado para el efectivo */}
          <div className="flex flex-col gap-4">
            <div
              className={`grid gap-3 ${channel === "POS" ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {channel === "POS" && (
                <button
                  onClick={() => onPayment("CASH")}
                  aria-pressed={payment === "CASH"}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 py-3.5 text-sm font-bold transition-colors ${
                    payment === "CASH"
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border text-text-secondary hover:border-primary/40"
                  }`}
                >
                  <Banknote size={20} aria-hidden />
                  {t("ticket.cash")}
                </button>
              )}
              <button
                onClick={() => onPayment("CARD")}
                aria-pressed={payment === "CARD"}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-3.5 text-sm font-bold transition-colors ${
                  payment === "CARD"
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-text-secondary hover:border-primary/40"
                }`}
              >
                <CreditCard size={20} aria-hidden />
                {t("ticket.card")}
              </button>
            </div>

            {channel === "POS" && payment === "CASH" && (
              <>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="cash-received"
                    className="text-xs font-bold text-text-secondary"
                  >
                    {t("pos.cashReceived")}
                  </label>
                  <input
                    id="cash-received"
                    type="text"
                    inputMode="decimal"
                    readOnly
                    placeholder={fmt.format(total)}
                    value={cashReceived}
                    className="h-11 rounded-xl border border-border bg-background px-3.5 text-center text-lg font-bold text-text-primary tabular-nums outline-none"
                  />
                  {cashReceived !== "" &&
                    (Number(cashReceived) >= total ? (
                      <p className="rounded-lg border border-success/40 bg-success/5 px-3.5 py-2 text-sm font-semibold text-success">
                        {t("pos.changeBack", {
                          v: fmt.format(Number(cashReceived) - total),
                        })}
                      </p>
                    ) : (
                      <p className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2 text-sm font-semibold text-error">
                        {t("pos.missing", {
                          v: fmt.format(total - Number(cashReceived)),
                        })}
                      </p>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    ".",
                    "0",
                    "back",
                  ].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onCashKey(k)}
                      aria-label={
                        k === "back" ? t("common.delete") : undefined
                      }
                      className="flex h-12 items-center justify-center rounded-xl border border-border bg-surface text-lg font-bold text-text-primary transition-colors hover:border-primary/50 hover:bg-primary-light active:bg-primary-light"
                    >
                      {k === "back" ? <Delete size={18} aria-hidden /> : k}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onCashKey("clear")}
                    className="flex h-11 items-center justify-center rounded-xl border border-error/40 text-sm font-bold text-error transition-colors hover:bg-error/5"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => onCashKey("exact")}
                    className="col-span-2 flex h-11 items-center justify-center rounded-xl border border-success/40 text-sm font-bold text-success transition-colors hover:bg-success/5"
                  >
                    {t("pos.exactAmount")}
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => onStep("confirm")}
              disabled={
                cart.length === 0 ||
                (payment === "CASH" &&
                  (cashReceived === "" || Number(cashReceived) < total))
              }
              className="mt-auto w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {t("pos.chargeTotal", { v: fmt.format(total) })}
            </button>
          </div>

          {/* derecha: detalle del pedido */}
          <div className="flex max-h-[60vh] flex-col rounded-xl border border-border bg-surface/60 px-4 py-3.5 text-sm">
            <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
              {cart.map((item) => (
                <li key={item.id}>
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-text-primary">
                      {item.product.name}
                    </span>
                    <span className="shrink-0 font-semibold whitespace-nowrap text-text-primary tabular-nums">
                      {fmt.format(lineUnit(item))}
                    </span>
                  </div>
                  {lineNote(item) && (
                    <span className="text-xs text-text-secondary">
                      {lineNote(item)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-border pt-3 text-text-primary">
              <div className="flex justify-between">
                <dt className="text-text-secondary">{t("ticket.subtotal")}</dt>
                <dd className="tabular-nums">{fmt.format(subtotal)}</dd>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">
                    {t("ticket.tax", { rate: taxRate })}
                  </dt>
                  <dd className="tabular-nums">{fmt.format(taxAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-extrabold text-text-primary">
                <dt>{t("ticket.total")}</dt>
                <dd className="tabular-nums">{fmt.format(total)}</dd>
              </div>
              {payment === "CASH" &&
                cashReceived !== "" &&
                Number(cashReceived) >= total && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-text-secondary">
                        {t("ticket.received")}
                      </dt>
                      <dd className="tabular-nums">
                        {fmt.format(Number(cashReceived))}
                      </dd>
                    </div>
                    <div className="flex justify-between font-bold text-success">
                      <dt>{t("ticket.change")}</dt>
                      <dd className="tabular-nums">
                        {fmt.format(Number(cashReceived) - total)}
                      </dd>
                    </div>
                  </>
                )}
            </dl>
          </div>
        </div>
      )}
    </Modal>
  );
}
