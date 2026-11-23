"use client";

import { api } from "@/lib/api";
import { brandCss } from "@/lib/branding";
import { newRequestId } from "@/lib/log";
import { useI18n } from "@/lib/i18n";
import {
  SETTINGS_CHANGED_EVENT,
  getSettings,
  isAutoPrint,
  type StoreSettings,
} from "@/lib/settings";
import { clearSession, hasModule, homePath, useSession } from "@/lib/session";
import type { CategoryDto } from "@/app/(panel)/categories/_components/CategoriesView";
import type { ProductDto } from "@/app/(panel)/products/_components/ProductsView";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  OrderTicket,
  TicketModal,
  printTicket,
} from "@/components/molecules/OrderTicket";
import { ExtrasModal, type ItemSelection } from "./ExtrasModal";
import { CartPanel } from "./CartPanel";
import { ConfirmLogoutModal } from "./ConfirmLogoutModal";
import { IDLE_MS, IdleOverlay } from "./IdleOverlay";
import { MenuSection } from "./MenuSection";
import { PayModal, type PayStep } from "./PayModal";
import { ReceiptModal } from "./ReceiptModal";
import { TerminalHeader } from "./TerminalHeader";
import { TokenSaleModal } from "./TokenSaleModal";
import {
  lineCents,
  taxCents,
  toCents,
  type CartItem,
  type LineMenu,
  type OrderDto,
  type ReceiptOrder,
  type StoreOpt,
  type TokenSale,
} from "./terminal-utils";

let nextCartId = 1;

export function OrderTerminal({ channel }: { channel: "POS" | "KIOSK" }) {
  const router = useRouter();
  const session = useSession();
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [storeName, setStoreName] = useState("Store");
  // selector multi-tienda (admin/gerente en caja) — como en el KDS
  const [storeOptions, setStoreOptions] = useState<StoreOpt[]>([]);
  const [viewStore, setViewStore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptOrder | null>(null);
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
  const [menu, setMenu] = useState<LineMenu | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("form");
  // Solo caja: menú alterno que lista lo canjeable con fichas y cobra en TOKEN
  const [tokenMenu, setTokenMenu] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [payment, setPayment] = useState<"CASH" | "CARD" | "TOKEN">(
    channel === "KIOSK" ? "CARD" : "CASH",
  );
  const [tokenSale, setTokenSale] = useState<TokenSale | null>(null);
  const [paying, setPaying] = useState(false);
  // Idempotency-Key del cobro: estable mientras el pedido no cambie — si
  // la red se corta tras cobrar, reintentar devuelve la orden ya creada en
  // vez de duplicarla. Carrito nuevo (o cobro exitoso, que lo vacía) → key nuevo.
  const payKey = useRef("");
  // mismo criterio para la venta de fichas: se renueva solo tras una venta
  // exitosa — si falló la red y el cajero reintenta, el server devuelve la
  // venta ya registrada en vez de cobrar dos veces
  const tokenKey = useRef(newRequestId());
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

  // cocina no vende y un cambio de módulos en caliente expulsa de inmediato
  useEffect(() => {
    if (!session) return;
    const reqModule = channel === "KIOSK" ? "KIOSK" : "POS";
    if (session.role === "KITCHEN" || !hasModule(session, reqModule)) {
      const dest = homePath(session);
      if (dest === "/") clearSession();
      router.replace(dest);
    }
  }, [session, channel, router]);

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
      ? api<StoreOpt[]>(`/api/users/me/stores`)
      : api<StoreOpt[]>(`/api/clients/${session.clientId}/stores`);
    storesCall
      .catch(() => [] as StoreOpt[])
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

  // marca del establecimiento operado — logo/nombre en navbar y paleta
  // (viewStore = la elegida en el selector; si no hay, la de la sesión)
  const brand = useMemo(
    () =>
      storeOptions.find((s) => s.id === (viewStore ?? session?.storeId)) ??
      null,
    [storeOptions, viewStore, session?.storeId],
  );
  const brandStyle = useMemo(() => brandCss(brand), [brand]);

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

  // El impuesto se agrega sobre el subtotal — los precios no lo incluyen
  const subtotalCents = cart.reduce((sum, i) => sum + lineCents(i), 0);
  const taxAmountCents = taxCents(subtotalCents, taxRate);
  const subtotal = subtotalCents / 100;
  const taxAmount = taxAmountCents / 100;
  const total = (subtotalCents + taxAmountCents) / 100;
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

  useEffect(() => {
    payKey.current = newRequestId();
  }, [cart, orderType, viewStore]);

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const order = await api<OrderDto>("/api/orders", {
        method: "POST",
        headers: { "Idempotency-Key": payKey.current },
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
          (payment === "CASH"
            ? (toCents(Number(cashReceived)) - toCents(total)) / 100
            : null),
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
        headers: { "Idempotency-Key": tokenKey.current },
        body: JSON.stringify({
          quantity: Math.floor(Number(tokenSale.quantity)),
          paymentMethod: tokenSale.method,
          ...(viewStore != null ? { storeId: viewStore } : {}),
        }),
      });
      tokenKey.current = newRequestId();
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

  const canPrintTickets = hasModule(session, "TICKETS");

  // Auto-imprime el ticket al cobrar — imprime la copia oculta de abajo
  // (@media print solo muestra #print-ticket). Una vez por orden.
  useEffect(() => {
    if (
      !receipt ||
      !autoPrint ||
      !canPrintTickets ||
      printedOrderId.current === receipt.id
    ) {
      return;
    }
    printedOrderId.current = receipt.id;
    const t = setTimeout(printTicket, 250);
    return () => clearTimeout(t);
  }, [receipt, autoPrint, canPrintTickets]);

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

  const brandName = brand?.name ?? session?.clientName ?? storeName;

  return (
    <div className="store-brand flex h-screen flex-col overflow-hidden bg-canvas">
      {brandStyle && <style>{brandStyle}</style>}
      <TerminalHeader
        channel={channel}
        brandName={brandName}
        logoUrl={brand?.logoUrl ?? session?.clientLogoUrl ?? null}
        now={now}
        canSellTokens={
          hasModule(session, "TOKENS") && (settings?.tokenPrice ?? 0) > 0
        }
        onSellTokens={() =>
          setTokenSale({
            quantity: "",
            method: "CASH",
            busy: false,
            step: "form",
          })
        }
        onLogout={() => setConfirmLogout(true)}
        canPickStore={canPickStore}
        viewStore={viewStore}
        storeOptions={storeOptions}
        onSwitchStore={switchStore}
      />

      <div className="flex min-h-0 flex-1 gap-6 p-6">
        <MenuSection
          channel={channel}
          hasTokenable={hasTokenable}
          tokenMenu={tokenMenu}
          onTokenMenu={setTokenMenu}
          categories={categories}
          categoryId={categoryId}
          onCategory={setCategoryId}
          error={error}
          loading={loading}
          products={visible}
          tokenMode={tokenMode}
          fmt={fmt}
          onPick={pick}
          onToggleSoldOut={toggleSoldOut}
        />
        <CartPanel
          orderType={orderType}
          onOrderType={setOrderType}
          cart={cart}
          menu={menu}
          onMenu={setMenu}
          onMenuClose={() => setMenu(null)}
          onEdit={editLine}
          onDuplicate={duplicateLine}
          onRemove={removeLine}
          tokenMode={tokenMode}
          tokensDue={tokensDue}
          cartAllTokenable={cartAllTokenable}
          subtotal={subtotal}
          taxRate={taxRate}
          taxAmount={taxAmount}
          total={total}
          fmt={fmt}
          onCheckout={() => {
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
        />
      </div>

      {customizing && (
        <ExtrasModal
          product={customizing.product}
          initial={customizing.initial}
          onClose={() => setCustomizing(null)}
          onAdd={(p, sel) => addToCart(p, sel, customizing.replaceId)}
        />
      )}

      <PayModal
        open={payOpen}
        channel={channel}
        step={payStep}
        payment={payment}
        cashReceived={cashReceived}
        cart={cart}
        tokenMode={tokenMode}
        tokensDue={tokensDue}
        subtotal={subtotal}
        taxRate={taxRate}
        taxAmount={taxAmount}
        total={total}
        paying={paying}
        fmt={fmt}
        onClose={() => setPayOpen(false)}
        onStep={setPayStep}
        onPayment={setPayment}
        onCashKey={pressCashKey}
        onPay={pay}
      />

      {/* Venta de fichas físicas — el canje es una orden con pago TOKEN. */}
      <TokenSaleModal
        sale={tokenSale}
        unitPrice={settings?.tokenPrice ?? 0}
        fmt={fmt}
        onChange={setTokenSale}
        onClose={() => setTokenSale(null)}
        onSell={sellTokens}
      />

      <ConfirmLogoutModal
        open={confirmLogout}
        cartHasItems={cart.length > 0}
        onClose={() => setConfirmLogout(false)}
      />

      <ReceiptModal
        receipt={receipt}
        countdown={countdown}
        fmt={fmt}
        canPrintTickets={canPrintTickets}
        onClose={closeReceipt}
        onPrint={setTicket}
      />

      {/* copia oculta para la auto-impresión: solo sale en papel
          (h-0 la colapsa en pantalla; en print #print-ticket es absolute y
          escapa el overflow:hidden del padre estático) */}
      {receipt && autoPrint && canPrintTickets && !ticket && (
        <div aria-hidden className="print-copy invisible h-0 overflow-hidden">
          <OrderTicket order={receipt} storeName={storeName} print />
        </div>
      )}

      <TicketModal
        order={ticket}
        storeName={storeName}
        onClose={() => setTicket(null)}
      />

      {idle && (
        <IdleOverlay
          channel={channel}
          brandName={
            brand?.name ?? settings?.general.menuName ?? storeName
          }
          onContinue={() => setIdle(false)}
          onNewSale={() => {
            resetTerminal();
            setIdle(false);
          }}
        />
      )}
    </div>
  );
}
