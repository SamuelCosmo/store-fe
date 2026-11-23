"use client";

import { useI18n } from "@/lib/i18n";
import {
  ArrowRight,
  CopyPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { CartItem, LineMenu } from "./terminal-utils";
import { lineNote, lineUnit } from "./terminal-utils";

/** Columna del pedido: tipo de orden, líneas del carrito con su menú de
 *  opciones, desglose y el botón de cobro. El dropdown de línea es `fixed`
 *  (escapa el overflow del aside) pero vive aquí por cohesión. */
export function CartPanel({
  orderType,
  onOrderType,
  cart,
  menu,
  onMenu,
  onMenuClose,
  onEdit,
  onDuplicate,
  onRemove,
  tokenMode,
  tokensDue,
  cartAllTokenable,
  subtotal,
  taxRate,
  taxAmount,
  total,
  fmt,
  onCheckout,
}: {
  orderType: "DINE_IN" | "TAKEAWAY";
  onOrderType: (value: "DINE_IN" | "TAKEAWAY") => void;
  cart: CartItem[];
  menu: LineMenu | null;
  onMenu: (menu: LineMenu) => void;
  onMenuClose: () => void;
  onEdit: (item: CartItem) => void;
  onDuplicate: (item: CartItem) => void;
  onRemove: (id: number) => void;
  tokenMode: boolean;
  tokensDue: number;
  cartAllTokenable: boolean;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  fmt: Intl.NumberFormat;
  onCheckout: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <aside className="flex w-[380px] shrink-0 flex-col gap-5 overflow-hidden rounded-2xl bg-surface p-6 shadow-[0_10px_28px_rgba(68,38,25,0.08)] xl:w-[432px]">
        <p className="text-2xl font-extrabold text-text-primary">
          {t("pos.newOrder")}
        </p>

        <div className="relative flex rounded-full bg-border p-1">
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary transition-transform duration-200 ease-out ${
              orderType === "TAKEAWAY" ? "translate-x-full" : "translate-x-0"
            }`}
          />
          {(
            [
              ["DINE_IN", t("ticket.dineIn")],
              ["TAKEAWAY", t("ticket.takeaway")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onOrderType(value)}
              aria-pressed={orderType === value}
              className={`relative z-10 flex-1 rounded-full py-2.5 text-xs font-bold transition-colors duration-200 ${
                orderType === value
                  ? "text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          onScroll={onMenuClose}
          className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto"
        >
          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">
              {t("pos.emptyCart")}
            </p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="text-sm font-semibold text-text-primary">
                    {item.product.name}
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    {lineNote(item) || "—"}
                  </p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-text-primary">
                  {tokenMode
                    ? t("pos.tokenCount", { n: item.product.tokenCost })
                    : fmt.format(lineUnit(item))}
                </p>
                <button
                  aria-label={t("pos.lineOptions", {
                    name: item.product.name,
                  })}
                  aria-expanded={menu?.item.id === item.id}
                  aria-haspopup="menu"
                  onClick={(e) => {
                    if (menu?.item.id === item.id) {
                      onMenuClose();
                      return;
                    }
                    const r = e.currentTarget.getBoundingClientRect();
                    const menuH = 3 * 42 + 8;
                    const openUp = r.bottom + menuH > window.innerHeight;
                    onMenu({
                      item,
                      top: openUp ? r.top - menuH - 4 : r.bottom + 4,
                      left: r.right - 176,
                    });
                  }}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-text-secondary transition-colors hover:border-primary hover:text-primary"
                >
                  <MoreHorizontal size={16} aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-dashed border-border" />

        {/* desglose estimado del carrito — el cobrado llega persistido en la orden */}
        <div className="flex flex-col gap-3">
          {tokenMode ? (
            <div className="flex items-center justify-between font-extrabold text-text-primary">
              <p className="text-base">{t("ticket.total")}</p>
              <p className="text-xl">
                {t("pos.tokenCount", { n: tokensDue })}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[13px] font-semibold">
                <p className="text-text-secondary">{t("ticket.subtotal")}</p>
                <p className="text-text-primary">{fmt.format(subtotal)}</p>
              </div>
              {taxRate > 0 && (
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <p className="text-text-secondary">
                    {t("ticket.tax", { rate: taxRate })}
                  </p>
                  <p className="text-text-primary">{fmt.format(taxAmount)}</p>
                </div>
              )}
              <div className="flex items-center justify-between font-extrabold text-text-primary">
                <p className="text-base">{t("ticket.total")}</p>
                <p className="text-xl">{fmt.format(total)}</p>
              </div>
            </>
          )}
        </div>
        {tokenMode && cart.length > 0 && !cartAllTokenable && (
          <p className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2.5 text-sm font-semibold text-error">
            {t("pos.notTokenable")}
          </p>
        )}

        <button
          onClick={onCheckout}
          disabled={cart.length === 0 || (tokenMode && !cartAllTokenable)}
          className="flex h-14 w-full items-center justify-end gap-2 rounded-2xl bg-primary px-5 text-[15px] font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {t("pos.pay")}
          <ArrowRight size={17} aria-hidden />
        </button>
      </aside>

      {menu && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={onMenuClose}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            style={{ top: menu.top, left: menu.left }}
            className="fixed z-50 w-44 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          >
            {(menu.item.product.extras.some((e) => e.active) ||
              menu.item.product.sizes.some((s) => s.active)) && (
              <button
                role="menuitem"
                onClick={() => {
                  onMenuClose();
                  onEdit(menu.item);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
              >
                <Pencil size={15} aria-hidden />
                {t("common.edit")}
              </button>
            )}
            <button
              role="menuitem"
              onClick={() => {
                onMenuClose();
                onDuplicate(menu.item);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
            >
              <CopyPlus size={15} aria-hidden />
              {t("pos.duplicate")}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                onMenuClose();
                onRemove(menu.item.id);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-surface"
            >
              <Trash2 size={15} aria-hidden />
              {t("common.delete")}
            </button>
          </div>
        </>
      )}
    </>
  );
}
