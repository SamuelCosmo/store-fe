"use client";

import { StatCard } from "@/components/molecules/StatCard";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useEffect, useState } from "react";
import { DashboardHeader } from "./DashboardHeader";

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const MXN_AXIS = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Nice Y ticks: step from {1,2,2.5,5}×10ⁿ so ~4 lines cover `max`. */
function yAxisTicks(max: number) {
  const rawStep = Math.max(1, max) / 4;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) ??
    10 * mag;
  const top = step * Math.ceil(max / step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

function hourLabel(hour: number) {
  return hour === 0
    ? "12am"
    : hour < 12
      ? `${hour}am`
      : hour === 12
        ? "12pm"
        : `${hour - 12}pm`;
}

const RANGES = [
  { id: "hoy", label: "Hoy", days: 0 },
  { id: "7d", label: "7 días", days: 6 },
  { id: "30d", label: "30 días", days: 29 },
  { id: "mes", label: "Este mes", days: -1 }, // month-to-date
] as const;

const LABELS: Record<string, string> = {
  POS: "Caja (POS)",
  KIOSK: "Kiosko",
  DINE_IN: "Comer aquí",
  TAKEAWAY: "Para llevar",
  CARD: "Tarjeta",
  CASH: "Efectivo",
};

type Slice = { key: string; orders: number; total: number };

type DashboardData = {
  totalSales: number;
  orders: number;
  avgTicket: number;
  cancelledOrders: number;
  refundedTotal: number;
  channels: Slice[];
  orderTypes: Slice[];
  payments: Slice[];
  hourly: { hour: number; total: number }[];
  topProducts: { productId: number; name: string; quantity: number; revenue: number }[];
  employees: { userId: number; name: string; orders: number; total: number }[];
};

function range(rangeId: (typeof RANGES)[number]["id"]): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  const days = RANGES.find((r) => r.id === rangeId)!.days;
  if (days === -1) from.setDate(1);
  else from.setDate(from.getDate() - days);
  // local YYYY-MM-DD — toISOString() is UTC and rolls to tomorrow after 6pm in UTC-6
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(from), to: iso(to) };
}

export function DashboardView() {
  const session = useSession();
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]["id"]>("hoy");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const { from, to } = range(rangeId);
    api<DashboardData>(`/api/reports/dashboard?from=${from}&to=${to}`)
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar"),
      )
      .finally(() => setLoading(false));
  }, [session, rangeId]);

  const dineIn =
    data && data.orders > 0
      ? Math.round(
          ((data.orderTypes.find((t) => t.key === "DINE_IN")?.orders ?? 0) /
            data.orders) *
            100,
        )
      : 0;

  const maxHourly = Math.max(1, ...(data?.hourly.map((h) => h.total) ?? []));
  const yAxis = yAxisTicks(maxHourly);
  const maxRevenue = Math.max(1, ...(data?.topProducts.map((p) => p.revenue) ?? []));
  const maxEmp = Math.max(1, ...(data?.employees.map((e) => e.total) ?? []));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <DashboardHeader />
        <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setLoading(true);
                setRangeId(r.id);
              }}
              className={`rounded-lg px-3.5 py-2 text-[13px] transition-colors ${
                rangeId === r.id
                  ? "bg-primary font-semibold text-white"
                  : "text-text-secondary hover:bg-surface"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {error}
        </p>
      )}

      {!session || loading ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {session ? "Cargando…" : "Inicia sesión para ver el resumen."}
        </p>
      ) : data && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Ventas" value={MXN.format(data.totalSales)} hint={RANGES.find((r) => r.id === rangeId)!.label} />
            <StatCard label="Órdenes" value={String(data.orders)} hint={`Ticket promedio ${MXN.format(data.avgTicket)}`} />
            <StatCard label="Comer aquí" value={`${dineIn}%`} />
            <StatCard
              label="Cancelaciones"
              value={String(data.cancelledOrders)}
              hint={`${MXN.format(data.refundedTotal)} reembolsados`}
              danger={data.cancelledOrders > 0}
            />
          </div>

          <div className="grid grid-cols-[1fr_380px] gap-4">
            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
              <h2 className="text-sm font-semibold text-text-primary">
                Ventas por hora
              </h2>
              {data.hourly.length === 0 ? (
                <p className="py-10 text-center text-sm text-text-muted">
                  Sin ventas en el rango.
                </p>
              ) : (
                <div className="flex flex-col">
                  <div className="flex h-44 items-stretch gap-1.5">
                    <div className="flex w-9 shrink-0 flex-col-reverse justify-between text-right">
                      {yAxis.ticks.map((t, i) => (
                        <span
                          key={t}
                          className={`text-[10px] leading-none tabular-nums text-text-muted ${
                            i === 0
                              ? "translate-y-1/2"
                              : i === yAxis.ticks.length - 1
                                ? "-translate-y-1/2"
                                : ""
                          }`}
                        >
                          {MXN_AXIS.format(t)}
                        </span>
                      ))}
                    </div>
                    <div className="relative min-w-0 flex-1 border-b border-l border-border/60">
                      {yAxis.ticks.map((t) => (
                        <div
                          key={t}
                          aria-hidden
                          className="absolute right-0 left-0 border-t border-border/50"
                          style={{ bottom: `${(t / yAxis.top) * 100}%` }}
                        />
                      ))}
                      <div className="absolute inset-0 flex items-end gap-2 pl-1.5">
                        {data.hourly.map(({ hour, total }) => (
                          <div
                            key={hour}
                            className="flex h-full min-w-0 flex-1 flex-col justify-end"
                          >
                            <div
                              title={MXN.format(total)}
                              className="w-full rounded-t-md bg-primary/85 transition-colors hover:bg-primary"
                              style={{
                                height: `${(total / yAxis.top) * 100}%`,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pl-12">
                    {data.hourly.map(({ hour }) => (
                      <span
                        key={hour}
                        className="min-w-0 flex-1 pt-1.5 text-center text-[10px] text-text-muted"
                      >
                        {hourLabel(hour)}
                      </span>
                    ))}
                  </div>
                  <p className="pt-1.5 pl-12 text-center text-[10px] tracking-wide text-text-muted uppercase">
                    Hora del día
                  </p>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-5 rounded-2xl border border-border bg-background p-5">
              <ShareGroup title="Canal" slices={data.channels} total={data.orders} />
              <ShareGroup title="Tipo de orden" slices={data.orderTypes} total={data.orders} />
              <ShareGroup title="Pago" slices={data.payments} total={data.orders} />
            </section>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
              <h2 className="text-sm font-semibold text-text-primary">
                Productos más vendidos
              </h2>
              {data.topProducts.length === 0 ? (
                <p className="py-10 text-center text-sm text-text-muted">
                  Sin ventas en el rango.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.topProducts.map((p, i) => (
                    <div key={p.productId} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[13px] text-text-primary">
                          <span className="mr-2 text-[11px] font-bold text-text-muted">
                            {i + 1}
                          </span>
                          {p.name}
                        </p>
                        <p className="shrink-0 text-xs text-text-secondary">
                          {p.quantity} uds · {MXN.format(p.revenue)}
                        </p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
              <h2 className="text-sm font-semibold text-text-primary">
                Ventas por empleado
              </h2>
              {data.employees.length === 0 ? (
                <p className="py-10 text-center text-sm text-text-muted">
                  Sin ventas en el rango.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.employees.map((e) => (
                    <div key={e.userId} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[13px] text-text-primary">
                          {e.name}
                        </p>
                        <p className="shrink-0 text-xs text-text-secondary">
                          {e.orders} órdenes · {MXN.format(e.total)}
                        </p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${(e.total / maxEmp) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function ShareGroup({
  title,
  slices,
  total,
}: {
  title: string;
  slices: Slice[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold tracking-wide text-text-muted uppercase">
        {title}
      </p>
      {slices.length === 0 ? (
        <p className="text-xs text-text-muted">Sin datos.</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full">
            {slices.map((s, i) => (
              <div
                key={s.key}
                title={`${LABELS[s.key] ?? s.key} ${s.orders} órdenes`}
                className={i % 2 === 0 ? "bg-primary" : "bg-primary-light"}
                style={{ width: `${(s.orders / total) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {slices.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${i % 2 === 0 ? "bg-primary" : "bg-primary-light"}`}
                />
                <span className="text-text-secondary">
                  {LABELS[s.key] ?? s.key}
                </span>
                <span className="ml-auto font-semibold text-text-primary">
                  {total > 0 ? Math.round((s.orders / total) * 100) : 0}%
                </span>
                <span className="text-text-muted">{MXN.format(s.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
