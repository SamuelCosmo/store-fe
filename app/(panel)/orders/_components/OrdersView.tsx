"use client";

import {
  TicketModal,
  type TicketOrder,
} from "@/components/molecules/OrderTicket";
import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { useSession } from "@/lib/session";
import { ChevronDown, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import {
  PaginationBar,
  usePagination,
  type PageDto,
} from "../../_components/usePagination";

type OrderDto = TicketOrder;

const GRID =
  "grid-cols-[70px_150px_90px_110px_120px_80px_100px_50px]";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  PREPARING: "Preparando",
  READY: "Lista",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  CONFIRMED: "bg-primary/10 text-primary",
  PREPARING: "bg-primary/10 text-primary",
  READY: "bg-success/10 text-success",
  COMPLETED: "bg-surface text-text-secondary",
  CANCELLED: "bg-error/10 text-error",
};

export function OrdersView() {
  const session = useSession();
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [ticket, setTicket] = useState<OrderDto | null>(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const { page, size, setPage, setSize } = usePagination();

  // historial paginado: más recientes primero
  useEffect(() => {
    if (!session) return;
    api<PageDto<OrderDto>>(
      `/api/orders?page=${page}&size=${size}&sort=createdAt,desc${status ? `&status=${status}` : ""}`,
    )
      .then((r) => {
        if (r.content.length === 0 && r.totalElements > 0 && page > 0) {
          setPage(r.totalPages - 1);
          return;
        }
        setOrders(r.content);
        setMeta({ total: r.totalElements, pages: Math.max(1, r.totalPages) });
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar"),
      )
      .finally(() => setLoading(false));
  }, [session, page, size, status, setPage]);

  const fmt = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: getSettings().currency,
  });

  // el ticket trae nombre/dirección del store — si falla, la fila alcanza
  async function openTicket(o: OrderDto) {
    try {
      setTicket(await api<OrderDto>(`/api/orders/${o.id}/ticket`));
    } catch {
      setTicket(o);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pedidos"
        subtitle="Historial de órdenes — reimprime tickets cuando haga falta"
      />

      <div className="flex items-center justify-between gap-4">
        <label className="relative flex h-[42px] w-full max-w-[240px] items-center">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="h-full w-full appearance-none rounded-xl border border-border bg-background pr-9 pl-3.5 text-sm font-semibold text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          >
            <option value="">Todos los estatus</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            aria-hidden
            className="pointer-events-none absolute right-3 text-text-muted"
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-background p-5">
        <div
          className={`grid ${GRID} items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase`}
        >
          <span>Folio</span>
          <span>Fecha</span>
          <span>Canal</span>
          <span>Tipo</span>
          <span>Estatus</span>
          <span>Artículos</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {!session ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Inicia sesión para ver los pedidos.
          </p>
        ) : loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Cargando…
          </p>
        ) : orders.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {status
              ? `Sin pedidos con estatus “${STATUS_LABEL[status]}”.`
              : "Aún no hay pedidos."}
          </p>
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              className={`grid ${GRID} min-h-[56px] items-center gap-4 border-b border-border px-3.5 py-2.5 text-sm last:border-b-0 ${o.status === "CANCELLED" ? "opacity-60" : ""}`}
            >
              <span className="font-extrabold text-text-primary tabular-nums">
                #{o.id}
              </span>
              <span className="text-text-secondary tabular-nums">
                {new Date(o.createdAt).toLocaleString("es-MX", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              <span className="text-text-secondary">
                {o.channel === "KIOSK" ? "Kiosco" : "Caja"}
              </span>
              <span className="text-text-secondary">
                {o.orderType === "DINE_IN" ? "En mesa" : "Para llevar"}
              </span>
              <span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[o.status] ?? "bg-surface text-text-secondary"}`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </span>
              <span className="text-text-secondary tabular-nums">
                {o.items.reduce((n, i) => n + i.quantity, 0)}
              </span>
              <span className="text-right font-bold text-text-primary tabular-nums">
                {fmt.format(o.total)}
              </span>
              <button
                type="button"
                onClick={() => openTicket(o)}
                title="Reimprimir ticket"
                aria-label={`Reimprimir ticket del pedido ${o.id}`}
                className="flex size-9 items-center justify-center justify-self-end rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-primary"
              >
                <Printer size={16} aria-hidden />
              </button>
            </div>
          ))
        )}

        <PaginationBar
          page={page}
          pages={meta.pages}
          size={size}
          total={meta.total}
          onPage={setPage}
          onSize={setSize}
        />
      </div>

      <TicketModal order={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}
