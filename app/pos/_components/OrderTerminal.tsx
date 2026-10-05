"use client";

import { BrandMark } from "@/components/molecules/BrandMark";
import { Modal } from "@/components/molecules/Modal";
import { api } from "@/lib/api";
import {
  SETTINGS_CHANGED_EVENT,
  getSettings,
  type StoreSettings,
} from "@/lib/settings";
import { useSession } from "@/lib/session";
import type { CategoryDto } from "@/app/(panel)/categories/_components/CategoriesView";
import type { ProductDto } from "@/app/(panel)/products/_components/ProductsView";
import {
  ArrowRight,
  Banknote,
  CircleCheck,
  CopyPlus,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Soup,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExtrasModal, type ItemSelection } from "./ExtrasModal";

type CartItem = {
  id: number;
  product: ProductDto;
  selection: ItemSelection;
};

let nextCartId = 1;

type OrderDto = {
  id: number;
  status: string;
  total: number;
  paymentMethod: "CASH" | "CARD";
  orderType: "DINE_IN" | "TAKEAWAY";
};

function lineUnit(item: CartItem) {
  return (
    item.product.price +
    (item.selection.size?.price ?? 0) +
    item.selection.extras.reduce(
      (sum, p) => sum + p.extra.price * p.quantity,
      0,
    )
  );
}

function lineNote(item: CartItem) {
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



export function OrderTerminal({ channel }: { channel: "POS" | "KIOSK" }) {
  const session = useSession();
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [storeName, setStoreName] = useState("Store");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<
    (OrderDto & { number: number | null; change: number | null }) | null
  >(null);
  const [countdown, setCountdown] = useState(10);
  const [categoryId, setCategoryId] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY">("DINE_IN");
  const [customizing, setCustomizing] = useState<{
    product: ProductDto;
    initial?: ItemSelection;
    replaceId?: number;
  } | null>(null);
  const [menu, setMenu] = useState<{
    item: CartItem;
    top: number;
    left: number;
  } | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState<"CASH" | "CARD">(
    channel === "KIOSK" ? "CARD" : "CASH",
  );
  const [paying, setPaying] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  // null hasta que el cache del backend esté listo → fallbacks por campo
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    const read = () => setSettings(getSettings());
    const id = setTimeout(read, 0);
    window.addEventListener(SETTINGS_CHANGED_EVENT, read);
    return () => {
      clearTimeout(id);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, read);
    };
  }, []);

  const currency = settings?.currency ?? "MXN";
  const taxRate = settings?.taxRate ?? 0;
  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", { style: "currency", currency }),
    [currency],
  );

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      api<ProductDto[]>("/api/products?activeOnly=true"),
      api<CategoryDto[]>("/api/categories"),
      api<{ id: number; name: string }[]>(
        `/api/clients/${session.clientId}/stores`,
      ).catch(() => []),
    ])
      .then(([prods, cats, stores]) => {
        setProducts(prods);
        setCategories(cats.filter((c) => c.active));
        setStoreName(
          stores.find((s) => s.id === session.storeId)?.name ??
            stores[0]?.name ??
            "Store",
        );
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudo cargar el menú"),
      )
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    api<{ nextNumber: number }>("/api/orders/next-number")
      .then((r) => setNextNumber(r.nextNumber))
      .catch(() => setNextNumber(null));
  }, [session, receipt]);

  const visible = useMemo(
    () =>
      products.filter(
        (p) => categoryId === 0 || p.categoryId === categoryId,
      ),
    [products, categoryId],
  );

  const total = cart.reduce((sum, i) => sum + lineUnit(i), 0);
  // Precios del catálogo llevan el impuesto incluido: se desglosa en ticket
  const netTotal = taxRate > 0 ? total / (1 + taxRate / 100) : total;
  const taxAmount = total - netTotal;

  function addToCart(
    product: ProductDto,
    selection: ItemSelection,
    replaceId?: number,
  ) {
    setCart((prev) =>
      replaceId != null
        ? prev.map((i) => (i.id === replaceId ? { ...i, selection } : i))
        : [...prev, { id: nextCartId++, product, selection }],
    );
    setCustomizing(null);
  }

  function pick(product: ProductDto) {
    const customizable =
      product.extras.some((e) => e.active) || product.sizes.some((s) => s.active);
    if (customizable) setCustomizing({ product });
    else addToCart(product, { size: null, extras: [], notes: "" });
  }

  function removeLine(id: number) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function editLine(item: CartItem) {
    setCustomizing({
      product: item.product,
      initial: item.selection,
      replaceId: item.id,
    });
  }

  function duplicateLine(item: CartItem) {
    setCart((prev) => [
      ...prev,
      { id: nextCartId++, product: item.product, selection: item.selection },
    ]);
  }

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      // TODO: enviar sizeId/extraIds/notas por item cuando el backend los soporte.
      const order = await api<OrderDto>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          channel,
          orderType,
          paymentMethod: payment,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: 1,
          })),
        }),
      });
      setCart([]);
      setPayOpen(false);
      setCountdown(getSettings().kiosk.receiptSeconds);
      // change es solo display — el backend aún no guarda cashReceived/changeGiven
      setReceipt({
        ...order,
        number: nextNumber,
        change:
          payment === "CASH" ? Number(cashReceived) - total : null,
      });
    } catch (e) {
      setPayOpen(false);
      setError(e instanceof Error ? e.message : "No se pudo cobrar");
    } finally {
      setPaying(false);
    }
  }

  const closeReceipt = useCallback(() => {
    setReceipt(null);
    setOrderType("DINE_IN");
    setCategoryId(0);
    setMenu(null);
  }, []);

  useEffect(() => {
    if (!receipt) return;
    const tick = setInterval(
      () => setCountdown((c) => Math.max(0, c - 1)),
      1000,
    );
    const close = setTimeout(
      closeReceipt,
      getSettings().kiosk.receiptSeconds * 1000,
    );
    return () => {
      clearInterval(tick);
      clearTimeout(close);
    };
  }, [receipt, closeReceipt]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-border bg-background px-8">
        <BrandMark
          title={(settings?.general.menuName || storeName).toUpperCase()}
          subtitle={channel === "POS" ? "Punto de venta" : "Kiosko"}
        />
        <p className="text-lg font-bold text-text-secondary tabular-nums">
          {now
            ? now.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--"}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 p-6">
        <section className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {[{ id: 0, name: "Todo" }, ...categories].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`shrink-0 rounded-full border px-[18px] py-[11px] text-[13px] font-bold whitespace-nowrap transition-colors ${
                  categoryId === c.id
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-background text-text-secondary hover:text-text-primary"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
            >
              {error}
            </p>
          )}

          {!session ? (
            <p className="py-16 text-center text-sm text-text-muted">
              Inicia sesión para operar la terminal.
            </p>
          ) : loading ? (
            <p className="py-16 text-center text-sm text-text-muted">
              Cargando menú…
            </p>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">
              No hay productos disponibles en esta categoría.
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 auto-rows-[268px] grid-cols-2 gap-4 overflow-y-auto pb-1 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  aria-label={`Añadir ${p.name} al pedido`}
                  className="flex flex-col overflow-hidden rounded-2xl bg-background text-left shadow-[0_10px_28px_rgba(68,38,25,0.08)] transition-shadow hover:shadow-[0_14px_34px_rgba(68,38,25,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <div className="h-[160px] w-full shrink-0 overflow-hidden bg-surface-warm">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria
                      <img
                        src={p.image}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-text-muted">
                        <Soup size={36} aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2.5 font-extrabold text-text-primary">
                      <p className="min-w-0 flex-1 truncate text-[17px]">
                        {p.name}
                      </p>
                      <p className="pt-0.5 text-xs whitespace-nowrap">
                        {fmt.format(p.price)}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-xs leading-[1.35] font-semibold text-text-secondary">
                      {p.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="flex w-[380px] shrink-0 flex-col gap-5 overflow-hidden rounded-2xl bg-surface p-6 shadow-[0_10px_28px_rgba(68,38,25,0.08)] xl:w-[432px]">
          <p className="text-2xl font-extrabold text-text-primary">
            Nuevo pedido
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
                ["DINE_IN", "En mesa"],
                ["TAKEAWAY", "Para llevar"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setOrderType(value)}
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
            onScroll={() => setMenu(null)}
            className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto"
          >
            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">
                Toca un producto para agregarlo al pedido.
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
                    {fmt.format(lineUnit(item))}
                  </p>
                  <button
                    aria-label={`Opciones de ${item.product.name}`}
                    aria-expanded={menu?.item.id === item.id}
                    aria-haspopup="menu"
                    onClick={(e) => {
                      if (menu?.item.id === item.id) {
                        setMenu(null);
                        return;
                      }
                      const r = e.currentTarget.getBoundingClientRect();
                      const menuH = 3 * 42 + 8;
                      const openUp = r.bottom + menuH > window.innerHeight;
                      setMenu({
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

          {/* TODO: el backend aún no persiste el desglose de impuesto en la orden */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[13px] font-semibold">
              <p className="text-text-secondary">Subtotal</p>
              <p className="text-text-primary">{fmt.format(netTotal)}</p>
            </div>
            {taxRate > 0 && (
              <div className="flex items-center justify-between text-[13px] font-semibold">
                <p className="text-text-secondary">
                  Impuesto incluido ({taxRate}%)
                </p>
                <p className="text-text-primary">{fmt.format(taxAmount)}</p>
              </div>
            )}
            <div className="flex items-center justify-between font-extrabold text-text-primary">
              <p className="text-base">Total</p>
              <p className="text-xl">{fmt.format(total)}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setCashReceived("");
              setPayOpen(true);
            }}
            disabled={cart.length === 0}
            className="flex h-14 w-full items-center justify-end gap-2 rounded-2xl bg-primary px-5 text-[15px] font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            PAGAR
            <ArrowRight size={17} aria-hidden />
          </button>
        </aside>
      </div>

      {menu && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setMenu(null)}
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
                  setMenu(null);
                  editLine(menu.item);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
              >
                <Pencil size={15} aria-hidden />
                Editar
              </button>
            )}
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null);
                duplicateLine(menu.item);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
            >
              <CopyPlus size={15} aria-hidden />
              Duplicar
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setMenu(null);
                removeLine(menu.item.id);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-surface"
            >
              <Trash2 size={15} aria-hidden />
              Eliminar
            </button>
          </div>
        </>
      )}

      {customizing && (
        <ExtrasModal
          product={customizing.product}
          initial={customizing.initial}
          onClose={() => setCustomizing(null)}
          onAdd={(p, sel) => addToCart(p, sel, customizing.replaceId)}
        />
      )}

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Cobrar pedido"
      >
        <div className="flex flex-col gap-5">
          <div
            className={`grid gap-3 ${channel === "POS" ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {channel === "POS" && (
              <button
                onClick={() => setPayment("CASH")}
                aria-pressed={payment === "CASH"}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-sm font-bold transition-colors ${
                  payment === "CASH"
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-text-secondary hover:border-primary/40"
                }`}
              >
                <Banknote size={20} aria-hidden />
                Efectivo
              </button>
            )}
            <button
              onClick={() => setPayment("CARD")}
              aria-pressed={payment === "CARD"}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-sm font-bold transition-colors ${
                payment === "CARD"
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border text-text-secondary hover:border-primary/40"
              }`}
            >
              <CreditCard size={20} aria-hidden />
              Tarjeta
            </button>
          </div>

          {channel === "POS" && payment === "CASH" && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="cash-received"
                className="text-xs font-bold text-text-secondary"
              >
                Efectivo recibido
              </label>
              <input
                id="cash-received"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder={fmt.format(total)}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
              {cashReceived !== "" &&
                (Number(cashReceived) >= total ? (
                  <p className="rounded-lg border border-success/40 bg-success/5 px-3.5 py-2.5 text-sm font-semibold text-success">
                    Cambio a devolver: {fmt.format(Number(cashReceived) - total)}
                  </p>
                ) : (
                  <p className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2.5 text-sm font-semibold text-error">
                    Faltan {fmt.format(total - Number(cashReceived))}
                  </p>
                ))}
            </div>
          )}

          <button
            onClick={pay}
            disabled={
              paying ||
              cart.length === 0 ||
              (payment === "CASH" &&
                (cashReceived === "" || Number(cashReceived) < total))
            }
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {paying ? "Cobrando…" : `Cobrar ${fmt.format(total)}`}
          </button>
        </div>
      </Modal>

      <Modal
        open={receipt !== null}
        onClose={closeReceipt}
        title="Pedido enviado"
      >
        {receipt && (
          <div className="flex flex-col items-center gap-4 text-center">
            <CircleCheck size={52} aria-hidden className="text-success" />
            <div className="flex flex-col gap-1">
              <p className="text-lg font-extrabold text-text-primary">
                Pedido #{receipt.number ?? receipt.id}
              </p>
              <p className="text-sm text-text-secondary">
                {fmt.format(receipt.total)} ·{" "}
                {receipt.paymentMethod === "CASH" ? "Efectivo" : "Tarjeta"} ·{" "}
                {receipt.orderType === "DINE_IN" ? "En mesa" : "Para llevar"}
              </p>
              {taxRate > 0 && (
                <p className="text-xs text-text-muted">
                  Impuesto incluido ({taxRate}%):{" "}
                  {fmt.format(
                    receipt.total - receipt.total / (1 + taxRate / 100),
                  )}
                </p>
              )}
              {receipt.change !== null && receipt.change > 0 && (
                <p className="mt-1 rounded-lg border border-success/40 bg-success/5 px-3.5 py-2 text-sm font-bold text-success">
                  Cambio a devolver: {fmt.format(receipt.change)}
                </p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                La orden ya está en cocina.
              </p>
            </div>
            <button
              onClick={closeReceipt}
              autoFocus
              className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Nuevo pedido ({countdown}s)
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
