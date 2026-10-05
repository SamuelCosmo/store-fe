"use client";

import { BrandMark } from "@/components/molecules/BrandMark";
import { Modal } from "@/components/molecules/Modal";
import { api } from "@/lib/api";
import { SETTINGS_CHANGED_EVENT, getSettings } from "@/lib/settings";
import { TriangleAlert } from "lucide-react";
import { useSession } from "@/lib/session";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

type OrderDto = {
  id: number;
  channel: "POS" | "KIOSK";
  orderType: "DINE_IN" | "TAKEAWAY";
  paymentMethod: "CASH" | "CARD";
  status: OrderStatus;
  createdAt: string;
  items: { productId: number; productName: string; quantity: number }[];
};

const ACTIVE: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

// cadena del backend: PENDING→PREPARING→READY→COMPLETED (CONFIRMED queda
// opcional; el KDS pasa directo a PREPARING)
const NEXT: Partial<Record<OrderStatus, { label: string; to: OrderStatus }>> = {
  PENDING: { label: "Preparando", to: "PREPARING" },
  CONFIRMED: { label: "Preparando", to: "PREPARING" },
  PREPARING: { label: "Lista", to: "READY" },
  READY: { label: "Entregar", to: "COMPLETED" },
};

const STATUS_CHIP: Partial<Record<OrderStatus, string>> = {
  PREPARING: "Preparando",
  READY: "Lista",
};

function elapsedMin(createdAt: string, now: Date) {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000),
  );
}

// umbrales configurables en /settings (default: verde <8, amarillo <15, rojo ≥15)
function ageCls(min: number, okMin: number, warnMin: number) {
  if (min >= warnMin) return "bg-error/15";
  if (min >= okMin) return "bg-warning/20";
  return "bg-success/15";
}

export function KitchenBoard() {
  const session = useSession();
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [storeName, setStoreName] = useState("Store");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<OrderDto | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const knownIds = useRef<Set<number> | null>(null);

  const chime = useCallback(() => {
    if (!getSettings().kitchen.sound) return;
    const ctx = (audioRef.current ??= new AudioContext());
    if (ctx.state === "suspended") void ctx.resume();
    [880, 1318].forEach((freq, i) => {
      const at = ctx.currentTime + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.3);
    });
  }, []);

  // AudioContext solo arranca tras un gesto del usuario (autoplay policy)
  useEffect(() => {
    const unlock = () => {
      audioRef.current ??= new AudioContext();
      if (audioRef.current.state === "suspended")
        void audioRef.current.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  // El nombre del menú viene de settings del establecimiento (con cache)
  useEffect(() => {
    const read = () => {
      const name = getSettings().general.menuName;
      if (name) setStoreName(name);
    };
    const id = setTimeout(read, 0);
    window.addEventListener(SETTINGS_CHANGED_EVENT, read);
    return () => {
      clearTimeout(id);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, read);
    };
  }, []);

  const load = useCallback(async () => {
    const lists = await Promise.all(
      ACTIVE.map((s) => api<OrderDto[]>(`/api/orders?status=${s}`)),
    );
    const next = lists.flat();
    // suena solo si llega un PENDING que no estaba; la primera carga no suena
    if (
      knownIds.current &&
      next.some((o) => o.status === "PENDING" && !knownIds.current!.has(o.id))
    ) {
      chime();
    }
    knownIds.current = new Set(next.map((o) => o.id));
    setOrders(next);
  }, [chime]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const first = setTimeout(() => {
      load()
        .then(() =>
          api<{ id: number; name: string }[]>(
            `/api/clients/${session.clientId}/stores`,
          ),
        )
        .then((stores) => {
          if (cancelled) return;
          setStoreName(
            stores.find((s) => s.id === session.storeId)?.name ??
              stores[0]?.name ??
              "Store",
          );
          setError(null);
        })
        .catch((e: unknown) => {
          if (!cancelled)
            setError(
              e instanceof Error
                ? e.message
                : "No se pudieron cargar las órdenes",
            );
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    const poll = setInterval(() => {
      load().catch(() => {});
    }, 10_000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [session, load]);

  const sorted = useMemo(
    () => [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders],
  );

  async function advance(order: OrderDto) {
    const next = NEXT[order.status];
    if (!next) return;
    setBusy(order.id);
    setError(null);
    try {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next.to }),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la orden");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(order: OrderDto) {
    setBusy(order.id);
    setError(null);
    try {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      setConfirmCancel(null);
      await load();
    } catch (e: unknown) {
      setConfirmCancel(null);
      setError(e instanceof Error ? e.message : "No se pudo cancelar la orden");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-border bg-background px-8">
        <BrandMark title={storeName.toUpperCase()} subtitle="Cocina" />
        <p className="text-lg font-bold text-text-secondary tabular-nums">
          {now
            ? now.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--"}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
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
            Inicia sesión para ver las órdenes.
          </p>
        ) : loading ? (
          <p className="py-16 text-center text-sm text-text-muted">
            Cargando órdenes…
          </p>
        ) : sorted.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-muted">
            Sin órdenes activas
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((o) => {
              const next = NEXT[o.status];
              const chip = STATUS_CHIP[o.status];
              const min = now ? elapsedMin(o.createdAt, now) : 0;
              const { okMin, warnMin } = getSettings().kitchen;
              return (
                <article
                  key={o.id}
                  className={`flex flex-col gap-3 rounded-xl p-4 shadow-[0_10px_28px_rgba(68,38,25,0.12)] ${ageCls(min, okMin, warnMin)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xl font-extrabold text-text-primary tabular-nums">
                      #{o.id}
                    </p>
                    <div className="flex items-center gap-2">
                      {chip && (
                        <span className="rounded-full bg-background/70 px-2.5 py-1 text-[11px] font-bold text-text-secondary">
                          {chip}
                        </span>
                      )}
                      <span className="text-sm font-extrabold text-text-primary tabular-nums">
                        {min} min
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-text-secondary">
                    {o.orderType === "DINE_IN" ? "En mesa" : "Para llevar"}
                    {" · "}
                    {o.channel === "KIOSK" ? "Kiosko" : "Caja"}
                  </p>

                  <ul className="flex flex-col gap-1 border-t border-text-primary/10 pt-3">
                    {o.items.map((item, idx) => (
                      <li
                        key={`${item.productId}-${idx}`}
                        className="flex gap-2 text-sm text-text-primary"
                      >
                        <span className="font-bold tabular-nums">
                          {item.quantity}×
                        </span>
                        <span>{item.productName}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex items-center gap-2 pt-1">
                    {next && (
                      <button
                        type="button"
                        onClick={() => advance(o)}
                        disabled={busy === o.id}
                        className="h-10 flex-1 rounded-xl bg-primary text-[13px] font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {next.label}
                      </button>
                    )}
                    {o.status !== "READY" && (
                      <button
                        type="button"
                        onClick={() => setConfirmCancel(o)}
                        disabled={busy === o.id}
                        className="h-10 rounded-xl border border-text-primary/20 bg-background/60 px-3 text-[13px] font-semibold text-text-secondary transition-colors hover:border-error/50 hover:text-error disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={confirmCancel !== null}
        onClose={() => setConfirmCancel(null)}
        title={`Cancelar pedido #${confirmCancel?.id ?? ""}`}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <TriangleAlert
              size={22}
              className="mt-0.5 shrink-0 text-error"
              aria-hidden
            />
            <p className="text-sm leading-relaxed text-text-secondary">
              El pedido se cancelará y se marcará como reembolso pendiente.
              El inventario configurado se repone. Esta acción no se puede
              deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setConfirmCancel(null)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => confirmCancel && cancel(confirmCancel)}
              disabled={busy === confirmCancel?.id}
              className="rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            >
              Cancelar pedido
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
