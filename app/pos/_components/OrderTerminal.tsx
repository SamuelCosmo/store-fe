"use client";

import { BrandMark } from "@/components/molecules/BrandMark";
import { Modal } from "@/components/molecules/Modal";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  SETTINGS_CHANGED_EVENT,
  getSettings,
  isAutoPrint,
  type StoreSettings,
} from "@/lib/settings";
import { logoutSession } from "@/lib/api";
import { ROLE_HOME, useSession } from "@/lib/session";
import type { CategoryDto } from "@/app/(panel)/categories/_components/CategoriesView";
import type { ProductDto } from "@/app/(panel)/products/_components/ProductsView";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  ChefHat,
  CircleCheck,
  CircleSlash,
  Coins,
  CopyPlus,
  CreditCard,
  Delete,
  LogOut,
  MoreHorizontal,
  Pencil,
  Printer,
  Soup,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  OrderTicket,
  TicketModal,
  printTicket,
  type TicketOrder,
} from "@/components/molecules/OrderTicket";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { ExtrasModal, type ItemSelection } from "./ExtrasModal";

type CartItem = {
  id: number;
  product: ProductDto;
  selection: ItemSelection;
};

let nextCartId = 1;

type OrderDto = TicketOrder;

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

// kiosco 90 s / caja 3 min sin tocar → pantalla de espera
const IDLE_MS = { KIOSK: 90_000, POS: 180_000 } as const;

// olas del attract screen — cada SVG es 2× el ancho con el patrón
// periódico dos veces → translateX(-50%) da un loop infinito sin corte
const IDLE_WAVES = [
  {
    color: "#1e5fb8",
    height: "46%",
    duration: 30,
    reverse: false,
    d: "M0,60 Q300,20 600,60 T1200,60 T1800,60 T2400,60 L2400,120 L0,120 Z",
  },
  {
    color: "#2f74d6",
    height: "33%",
    duration: 19,
    reverse: true,
    d: "M0,70 Q300,15 600,70 T1200,70 T1800,70 T2400,70 L2400,120 L0,120 Z",
  },
  {
    color: "#5b9df0",
    height: "22%",
    duration: 12,
    reverse: false,
    d: "M0,65 Q200,20 400,65 T800,65 T1200,65 T1600,65 T2000,65 T2400,65 L2400,120 L0,120 Z",
  },
];

function SeaWaves() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#0b3d91]">
      <style>{`@keyframes wave-drift { to { transform: translateX(-50%); } }`}</style>
      {IDLE_WAVES.map((w, i) => (
        <div
          key={i}
          className="absolute inset-x-0 bottom-0"
          style={{ height: w.height }}
        >
          <svg
            viewBox="0 0 2400 120"
            preserveAspectRatio="none"
            className="h-full w-[200%]"
            style={{
              animation: `wave-drift ${w.duration}s linear infinite ${w.reverse ? "reverse" : ""}`,
            }}
          >
            <path fill={w.color} d={w.d} />
          </svg>
        </div>
      ))}
    </div>
  );
}


export function OrderTerminal({ channel }: { channel: "POS" | "KIOSK" }) {
  const router = useRouter();
  const session = useSession();
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [storeName, setStoreName] = useState("Store");
  // selector multi-tienda (admin/gerente en caja) — como en el KDS
  const [storeOptions, setStoreOptions] = useState<
    { id: number; name: string }[]
  >([]);
  const [viewStore, setViewStore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<
    (OrderDto & { number: number | null; change: number | null }) | null
  >(null);
  const [countdown, setCountdown] = useState(10);
  const [ticket, setTicket] = useState<OrderDto | null>(null);
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
  const [payStep, setPayStep] = useState<"form" | "confirm">("form");
  // Solo caja: menú alterno que lista lo canjeable con fichas y cobra en TOKEN
  const [tokenMenu, setTokenMenu] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [payment, setPayment] = useState<"CASH" | "CARD" | "TOKEN">(
    channel === "KIOSK" ? "CARD" : "CASH",
  );
  const [tokenSale, setTokenSale] = useState<{
    quantity: string;
    method: "CASH" | "CARD";
    busy: boolean;
    step: "form" | "confirm" | "done";
  } | null>(null);
  const [paying, setPaying] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  // null hasta que el cache del backend esté listo → fallbacks por campo
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  // flag por equipo (impresora térmica conectada a esta terminal)
  const [autoPrint, setAutoPrint] = useState(false);
  const printedOrderId = useRef<number | null>(null);

  useEffect(() => {
    const read = () => {
      setSettings(getSettings());
      setAutoPrint(isAutoPrint());
    };
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
      new Intl.NumberFormat(locale, { style: "currency", currency }),
    [locale, currency],
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

  const load = useCallback(
    async (scope?: number | null) => {
      const sid = scope !== undefined ? scope : viewStore;
      const qs = sid != null ? `storeId=${sid}&` : "";
      const [prods, cats] = await Promise.all([
        api<ProductDto[]>(`/api/products?${qs}activeOnly=true`),
        api<CategoryDto[]>(`/api/categories?${qs}`),
      ]);
      setProducts(prods);
      setCategories(cats.filter((c) => c.active));
    },
    [viewStore],
  );

  // ¿puede elegir tienda? solo caja + admin/gerente — el resto usa la suya
  const pickable =
    channel === "POS" &&
    (session?.role === "ADMIN" || session?.role === "MANAGER");

  // Tiendas visibles — una vez por sesión; define el scope inicial.
  // (No va junto con el catálogo: si dependiera de `load`, cambiar de tienda
  // re-dispararía esto y resetearía viewStore — el selector "rebotaba".)
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const pick =
      channel === "POS" &&
      (session.role === "ADMIN" || session.role === "MANAGER");
    const storesCall = pick
      ? api<{ id: number; name: string }[]>(`/api/users/me/stores`)
      : api<{ id: number; name: string }[]>(
          `/api/clients/${session.clientId}/stores`,
        );
    storesCall
      .catch(() => [] as { id: number; name: string }[])
      .then((stores) => {
        if (cancelled) return;
        const initial = pick
          ? (session.storeId ?? stores[0]?.id ?? null)
          : null;
        setStoreOptions(stores);
        setViewStore(initial);
        setStoreName(
          stores.find((s) => s.id === (initial ?? session.storeId))?.name ??
            stores[0]?.name ??
            "Store",
        );
        if (pick && initial == null) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, channel]);

  // Catálogo — inicial + polling + al cambiar de tienda (load lleva el scope)
  useEffect(() => {
    if (!session) return;
    // admin/gerente sin scope aún: esperar a que lleguen las tiendas — sin
    // ?storeId= el backend no puede resolver el catálogo para ellos
    if (pickable && viewStore == null) return;
    let cancelled = false;
    const first = setTimeout(() => {
      load()
        .then(() => {
          if (!cancelled) setError(null);
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setError(
              e instanceof Error ? e.message : t("pos.loadError"),
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    // El catálogo se refresca solo: cada 30s y al recuperar foco
    const poll = setInterval(() => load().catch(() => {}), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t es estable
  }, [session, load, pickable, viewStore]);

  const resetTerminal = useCallback(() => {
    setCart([]);
    setMenu(null);
    setCustomizing(null);
    setPayOpen(false);
    setPayStep("form");
    setConfirmLogout(false);
    setReceipt(null);
  }, []);

  useEffect(() => {
    if (idle) return;
    // kiosco: el cliente abandonó → reinicia; caja: solo muestra la espera
    const goIdle = () => {
      setIdle(true);
      if (channel === "KIOSK") resetTerminal();
    };
    const arm = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(goIdle, IDLE_MS[channel]);
    };
    arm();
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [channel, idle, resetTerminal]);


  // selector de tienda en caja — solo gerente/admin con varias asignadas
  const canPickStore =
    channel === "POS" &&
    (session?.role === "ADMIN" || session?.role === "MANAGER") &&
    storeOptions.length > 1;

  function switchStore(id: number) {
    setViewStore(id);
    setStoreName(
      storeOptions.find((s) => s.id === id)?.name ?? "Store",
    );
    // el carrito tiene productos de la otra tienda — se descarta
    setCart([]);
    setCategoryId(0);
    setTokenMenu(false);
    setMenu(null);
  }

  // el kiosco esconde los agotados; la caja los muestra para poder reactivarlos
  const tokenMode = channel === "POS" && tokenMenu;
  const hasTokenable = products.some((p) => p.tokenCost > 0);

  const visible = useMemo(
    () =>
      products.filter(
        (p) =>
          (categoryId === 0 || p.categoryId === categoryId) &&
          (channel === "POS" || !p.soldOut) &&
          (!tokenMode || p.tokenCost > 0),
      ),
    [products, categoryId, channel, tokenMode],
  );

  const subtotal = cart.reduce((sum, i) => sum + lineUnit(i), 0);
  // El impuesto se agrega sobre el subtotal — los precios no lo incluyen
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  // fichas: solo si TODO el pedido es canjeable (tokenCost > 0 por producto)
  const tokensDue = cart.reduce((sum, i) => sum + i.product.tokenCost, 0);
  const cartAllTokenable =
    cart.length > 0 && cart.every((i) => i.product.tokenCost > 0);

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
    if (product.soldOut) return;
    const customizable =
      product.extras.some((e) => e.active) || product.sizes.some((s) => s.active);
    if (customizable) setCustomizing({ product });
    else addToCart(product, { size: null, extras: [], notes: "" });
  }

  function removeLine(id: number) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  async function toggleSoldOut(product: ProductDto) {
    try {
      const updated = await api<ProductDto>(
        `/api/products/${product.id}/sold-out`,
        { method: "PATCH", body: JSON.stringify({ soldOut: !product.soldOut }) },
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("pos.updateError"),
      );
    }
  }

  function editLine(item: CartItem) {
    setCustomizing({
      product: item.product,
      initial: item.selection,
      replaceId: item.id,
    });
  }

  // teclado numérico del modal de cobro — escribe sobre cashReceived
  function pressCashKey(k: string) {
    setCashReceived((v) => {
      if (k === "back") return v.slice(0, -1);
      if (k === "clear") return "";
      if (k === "exact") return total.toFixed(2);
      const next = k === "." ? (v.includes(".") ? v : v + ".") : v + k;
      const [, dec] = next.split(".");
      return dec && dec.length > 2 ? v : next;
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
      const order = await api<OrderDto>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          channel,
          orderType,
          paymentMethod: payment,
          ...(viewStore != null ? { storeId: viewStore } : {}),
          ...(payment === "CASH" && cashReceived !== ""
            ? { cashReceived: Number(cashReceived) }
            : {}),
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: 1,
            sizeId: i.selection.size?.id ?? null,
            extras: i.selection.extras.map((p) => ({
              extraId: p.extra.id,
              quantity: p.quantity,
            })),
            notes: i.selection.notes || null,
          })),
        }),
      });
      setCart([]);
      setPayOpen(false);
      setCountdown(getSettings().kiosk.receiptSeconds);
      setReceipt({
        ...order,
        number: order.ticketNumber ?? null,
        // changeGiven viene del backend (persistido); fallback al cálculo local
        change:
          order.changeGiven ??
          (payment === "CASH" ? Number(cashReceived) - total : null),
      });
    } catch (e) {
      setPayOpen(false);
      setError(e instanceof Error ? e.message : t("pos.payError"));
    } finally {
      setPaying(false);
    }
  }

  async function sellTokens() {
    if (!tokenSale) return;
    setTokenSale({ ...tokenSale, busy: true });
    setError(null);
    try {
      await api("/api/tokens", {
        method: "POST",
        body: JSON.stringify({
          quantity: Math.floor(Number(tokenSale.quantity)),
          paymentMethod: tokenSale.method,
          ...(viewStore != null ? { storeId: viewStore } : {}),
        }),
      });
      setTokenSale({ ...tokenSale, busy: false, step: "done" });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("pos.tokenSaleError"),
      );
      setTokenSale(null);
    }
  }

  const closeReceipt = useCallback(() => {
    setReceipt(null);
    setOrderType("DINE_IN");
    setCategoryId(0);
    setMenu(null);
  }, []);

  // Auto-imprime el ticket al cobrar — imprime la copia oculta de abajo
  // (@media print solo muestra #print-ticket). Una vez por orden.
  useEffect(() => {
    if (!receipt || !autoPrint || printedOrderId.current === receipt.id) {
      return;
    }
    printedOrderId.current = receipt.id;
    const t = setTimeout(printTicket, 250);
    return () => clearTimeout(t);
  }, [receipt, autoPrint]);

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
          title={
            (session?.clientName || settings?.general.menuName || storeName
            ).toUpperCase()
          }
          subtitle={channel === "POS" ? t("pos.subtitle") : t("ticket.kiosk")}
          logoUrl={session?.clientLogoUrl}
        />
        <div className="flex items-center gap-4">
          <p className="text-lg font-bold text-text-secondary tabular-nums">
            {now
              ? now.toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </p>
          <ThemeToggle />
          {/* venta de fichas — solo caja y solo si el tenant fijó precio */}
          {channel === "POS" && (settings?.tokenPrice ?? 0) > 0 && (
            <button
              onClick={() =>
                setTokenSale({
                  quantity: "",
                  method: "CASH",
                  busy: false,
                  step: "form",
                })
              }
              aria-label={t("pos.sellTokens")}
              title={t("pos.sellTokens")}
              className="flex h-10 items-center gap-2 rounded-full border border-border px-3.5 text-xs font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Coins size={15} aria-hidden />
              {t("pos.sellTokens")}
            </button>
          )}
          {/* admin/gerente: la caja es una visita desde el panel — solo
              "Volver". El cajero (EMPLOYEE) conserva cocina + cerrar sesión */}
          {channel === "POS" &&
          (session?.role === "ADMIN" || session?.role === "MANAGER") ? (
            <Link
              href={ROLE_HOME[session.role]}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowLeft size={14} aria-hidden />
              {t("common.back")}
            </Link>
          ) : channel === "POS" ? (
            <Link
              href="/kitchen"
              aria-label={t("pos.kitchenBoard")}
              title={t("pos.kitchenBoard")}
              className="flex size-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ChefHat size={17} aria-hidden />
            </Link>
          ) : null}
          {/* El kiosco (CUSTOMER) no tiene logout: es una cuenta compartida */}
          {channel === "POS" &&
          session?.role !== "ADMIN" &&
          session?.role !== "MANAGER" && (
            <button
              onClick={() => setConfirmLogout(true)}
              aria-label={t("user.logout")}
              className="flex size-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-error/50 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <LogOut size={17} aria-hidden />
            </button>
          )}
        </div>
      </header>

      {/* selector de establecimiento — gerente/admin con varias tiendas (caja) */}
      {canPickStore && (
        <div className="flex shrink-0 items-center px-6 pt-4 pb-1">
          <select
            id="pos-store"
            aria-label={t("nav.stores")}
            value={viewStore ?? ""}
            onChange={(e) => switchStore(Number(e.target.value))}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-primary outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            {storeOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-6 p-6">
        <section className="flex min-w-0 flex-1 flex-col gap-5">
          {channel === "POS" && hasTokenable && (
            <div className="relative flex w-64 rounded-full bg-border p-1">
              <span
                aria-hidden
                className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary transition-transform duration-200 ease-out ${
                  tokenMenu ? "translate-x-full" : "translate-x-0"
                }`}
              />
              {(
                [
                  [false, t("pos.menuMain")],
                  [true, t("pos.menuTokens")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  onClick={() => setTokenMenu(value)}
                  aria-pressed={tokenMenu === value}
                  className={`relative z-10 flex-1 rounded-full py-2 text-xs font-bold transition-colors duration-200 ${
                    tokenMenu === value
                      ? "text-white"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {[{ id: 0, name: t("common.all") }, ...categories].map((c) => (
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
              {t("pos.loginRequired")}
            </p>
          ) : loading ? (
            <p className="py-16 text-center text-sm text-text-muted">
              {t("pos.loadingMenu")}
            </p>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">
              {t("pos.emptyCategory")}
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 auto-rows-[268px] grid-cols-2 gap-4 overflow-y-auto pb-1 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => (
                <div key={p.id} className="relative">
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    disabled={p.soldOut}
                    aria-label={t("pos.addToOrder", { name: p.name })}
                    className={`flex size-full flex-col overflow-hidden rounded-2xl bg-background text-left shadow-[0_10px_28px_rgba(68,38,25,0.08)] transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      p.soldOut
                        ? "opacity-60"
                        : "hover:shadow-[0_14px_34px_rgba(68,38,25,0.14)]"
                    }`}
                  >
                    <div className="relative h-[160px] w-full shrink-0 overflow-hidden bg-surface-warm">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria
                        <img
                          src={p.image}
                          alt=""
                          className={`size-full object-cover ${p.soldOut ? "grayscale" : ""}`}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-text-muted">
                          <Soup size={36} aria-hidden />
                        </div>
                      )}
                      {p.soldOut && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-extrabold tracking-widest text-white uppercase">
                          {t("products.soldOut")}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2.5 font-extrabold text-text-primary">
                        <p className="min-w-0 flex-1 truncate text-[17px]">
                          {p.name}
                        </p>
                        <p className="pt-0.5 text-xs whitespace-nowrap">
                          {tokenMode
                            ? t("pos.tokenCount", { n: p.tokenCost })
                            : fmt.format(p.price)}
                        </p>
                      </div>
                      <p className="line-clamp-2 text-xs leading-[1.35] font-semibold text-text-secondary">
                        {p.description}
                      </p>
                    </div>
                  </button>
                  {channel === "POS" && (
                    <button
                      type="button"
                      onClick={() => toggleSoldOut(p)}
                      aria-pressed={p.soldOut}
                      aria-label={
                        p.soldOut
                          ? t("pos.markAvailableAria", { name: p.name })
                          : t("pos.markSoldOutAria", { name: p.name })
                      }
                      title={
                        p.soldOut
                          ? t("pos.markAvailable")
                          : t("pos.markSoldOut")
                      }
                      className={`absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        p.soldOut
                          ? "bg-error text-white"
                          : "bg-white/90 text-text-secondary hover:text-error"
                      }`}
                    >
                      <CircleSlash size={15} aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

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
            onClick={() => {
              setCashReceived("");
              if (tokenMode) {
                setPayment("TOKEN");
                setPayStep("confirm");
              } else {
                setPayment("CASH");
                setPayStep("form");
              }
              setPayOpen(true);
            }}
            disabled={cart.length === 0 || (tokenMode && !cartAllTokenable)}
            className="flex h-14 w-full items-center justify-end gap-2 rounded-2xl bg-primary px-5 text-[15px] font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
          >
            {t("pos.pay")}
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
                {t("common.edit")}
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
              {t("pos.duplicate")}
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
              {t("common.delete")}
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
        onClose={() => {
          setPayOpen(false);
          setPayStep("form");
        }}
        title={t("pos.charge")}
        wide
      >
        {payStep === "confirm" ? (
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
                  tokenMode ? setPayOpen(false) : setPayStep("form")
                }
                disabled={paying}
                className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-surface disabled:opacity-60"
              >
                {t("common.back")}
              </button>
              <button
                onClick={pay}
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
                  onClick={() => setPayment("CASH")}
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
                onClick={() => setPayment("CARD")}
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
                      onClick={() => pressCashKey(k)}
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
                    onClick={() => pressCashKey("clear")}
                    className="flex h-11 items-center justify-center rounded-xl border border-error/40 text-sm font-bold text-error transition-colors hover:bg-error/5"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => pressCashKey("exact")}
                    className="col-span-2 flex h-11 items-center justify-center rounded-xl border border-success/40 text-sm font-bold text-success transition-colors hover:bg-success/5"
                  >
                    {t("pos.exactAmount")}
                  </button>
                </div>
              </>
            )}

            <button
              onClick={() => setPayStep("confirm")}
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
            <dl className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-border pt-3">
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

      {/* Venta de fichas físicas — el canje es una orden con pago TOKEN. */}
      <Modal
        open={tokenSale !== null}
        onClose={() => setTokenSale(null)}
        title={t("pos.sellTokens")}
      >
        {tokenSale &&
          (() => {
            const qty = Math.max(0, Math.floor(Number(tokenSale.quantity) || 0));
            const unit = settings?.tokenPrice ?? 0;
            return (
              <div className="flex flex-col gap-5">
                {tokenSale.step === "done" ? (
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
                        {fmt.format(qty * unit)}
                        {" · "}
                        {tokenSale.method === "CASH"
                          ? t("ticket.cash")
                          : t("ticket.card")}
                      </p>
                    </div>
                    <button
                      onClick={() => setTokenSale(null)}
                      autoFocus
                      className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover"
                    >
                      {t("common.close")}
                    </button>
                  </>
                ) : tokenSale.step === "confirm" ? (
                  <>
                    <p className="text-sm text-text-secondary">
                      {t("pos.confirmCharge")}
                    </p>
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border px-4 py-3.5 text-sm">
                      <p className="font-semibold text-text-primary">
                        {t("pos.tokenCount", { n: qty })}
                        {" × "}
                        {fmt.format(unit)}
                        {" = "}
                        {fmt.format(qty * unit)}
                      </p>
                      <p className="text-text-secondary">
                        {tokenSale.method === "CASH"
                          ? t("ticket.cash")
                          : t("ticket.card")}
                      </p>
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setTokenSale({ ...tokenSale, step: "form" })
                        }
                        disabled={tokenSale.busy}
                        className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-surface disabled:opacity-60"
                      >
                        {t("common.back")}
                      </button>
                      <button
                        onClick={sellTokens}
                        disabled={tokenSale.busy}
                        className="flex-1 rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                      >
                        {tokenSale.busy
                          ? t("pos.charging")
                          : t("common.accept")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm font-semibold text-text-secondary">
                      {t("pos.tokenUnitPrice", { v: fmt.format(unit) })}
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
                        value={tokenSale.quantity}
                        onChange={(e) =>
                          setTokenSale({
                            ...tokenSale,
                            quantity: e.target.value,
                          })
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
                          onClick={() =>
                            setTokenSale({ ...tokenSale, method: value })
                          }
                          aria-pressed={tokenSale.method === value}
                          className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-colors ${
                            tokenSale.method === value
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
                      onClick={() =>
                        setTokenSale({ ...tokenSale, step: "confirm" })
                      }
                      disabled={qty < 1}
                      className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                    >
                      {t("pos.chargeTotal", { v: fmt.format(qty * unit) })}
                    </button>
                  </>
                )}
              </div>
            );
          })()}
      </Modal>

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title={t("user.logout")}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <TriangleAlert
              size={22}
              className="mt-0.5 shrink-0 text-error"
              aria-hidden
            />
            <p className="text-sm leading-relaxed text-text-secondary">
              {t("common.confirmLogout")}
              {cart.length > 0 && t("common.confirmLogoutCart")}
            </p>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmLogout(false)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
            >
              {t("common.back")}
            </button>
            <button
              type="button"
              onClick={() => {
                logoutSession();
                router.push("/");
              }}
              className="rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
            >
              {t("user.logout")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={receipt !== null}
        onClose={closeReceipt}
        title={t("pos.orderSent")}
      >
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
              onClick={closeReceipt}
              autoFocus
              className="w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("pos.newOrderIn", { n: countdown })}
            </button>
            <button
              type="button"
              onClick={() => setTicket(receipt)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-surface"
            >
              <Printer size={16} aria-hidden />
              {t("ticket.printTicket")}
            </button>
          </div>
        )}
      </Modal>

      {/* copia oculta para la auto-impresión: solo sale en papel
          (h-0 la colapsa en pantalla; en print #print-ticket es absolute y
          escapa el overflow:hidden del padre estático) */}
      {receipt && autoPrint && !ticket && (
        <div aria-hidden className="print-copy invisible h-0 overflow-hidden">
          <OrderTicket order={receipt} storeName={storeName} print />
        </div>
      )}

      <TicketModal
        order={ticket}
        storeName={storeName}
        onClose={() => setTicket(null)}
      />

      {idle && channel === "KIOSK" && (
        <button
          onClick={() => setIdle(false)}
          className="fixed inset-0 z-[60] text-white"
        >
          <SeaWaves />
          <span className="relative z-10 flex h-full flex-col items-center justify-center gap-3">
            <span className="text-4xl font-extrabold tracking-tight">
              {(settings?.general.menuName || storeName).toUpperCase()}
            </span>
            <span className="text-base font-medium opacity-90">
              {t("pos.idleKiosk")}
            </span>
          </span>
        </button>
      )}

      {idle && channel === "POS" && (
        <div className="fixed inset-0 z-[60] text-white">
          <SeaWaves />
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5">
            <p className="text-4xl font-extrabold tracking-tight">
              {(settings?.general.menuName || storeName).toUpperCase()}
            </p>
            <p className="text-base font-medium opacity-90">
              {t("pos.idlePos")}
            </p>
            <div className="mt-2 flex gap-3">
              <button
                onClick={() => setIdle(false)}
                className="rounded-xl border border-white/50 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                {t("pos.continue")}
              </button>
              <button
                onClick={() => {
                  resetTerminal();
                  setIdle(false);
                }}
                className="rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-primary transition-colors hover:opacity-90"
              >
                {t("pos.newSale")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
