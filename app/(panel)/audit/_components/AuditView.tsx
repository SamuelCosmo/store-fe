"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
import { hasKey, useI18n, type TKey } from "@/lib/i18n";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  PaginationBar,
  usePagination,
  type PageDto,
} from "../../_components/usePagination";

type AuditEvent = {
  id: number;
  createdAt: string;
  actorId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  entityType: string;
  action: string;
  entityId: number | null;
  entityLabel: string | null;
  storeId: number | null;
  storeName: string | null;
  clientId: number | null;
  clientName: string | null;
  details: Record<string, unknown> | null;
};

const GRID = "grid-cols-[150px_170px_1fr_120px_120px_1fr]";

const ENTITY_TYPES = [
  "category",
  "product",
  "extra",
  "size",
  "store",
  "user",
  "client",
  "order",
  "token_sale",
  "inventory",
  "device",
];

const ACTIONS = [
  "create",
  "update",
  "delete",
  "restore",
  "settings",
  "cancel",
  "purchase",
  "set",
  "reorder",
  "activate",
  "deactivate",
  "sold_out",
  "restock",
];

const ACTION_STYLE: Record<string, string> = {
  create: "bg-success/10 text-success",
  restore: "bg-success/10 text-success",
  update: "bg-primary/10 text-primary",
  settings: "bg-primary/10 text-primary",
  reorder: "bg-primary/10 text-primary",
  set: "bg-primary/10 text-primary",
  purchase: "bg-primary/10 text-primary",
  activate: "bg-warning/15 text-warning",
  restock: "bg-warning/15 text-warning",
  cancel: "bg-error/10 text-error",
  delete: "bg-error/10 text-error",
  deactivate: "bg-error/10 text-error",
  sold_out: "bg-error/10 text-error",
};

function auditLabel(
  t: (key: TKey) => string,
  prefix: "entity" | "action",
  value: string,
): string {
  const key = `audit.${prefix}.${value}`;
  return hasKey(key) ? t(key) : value;
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** details llega como {campo: {from,to}} en updates o {campo: valor}
 *  en creates/settings — una línea legible por campo. */
function detailLines(details: Record<string, unknown>): string[] {
  return Object.entries(details).map(([field, v]) => {
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      "from" in v &&
      "to" in v
    ) {
      const d = v as { from: unknown; to: unknown };
      return `${field}: ${fmtValue(d.from)} → ${fmtValue(d.to)}`;
    }
    return `${field}: ${fmtValue(v)}`;
  });
}

export function AuditView() {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const { page, size, setPage, setSize } = usePagination();

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: "createdAt,desc",
    });
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);
    api<PageDto<AuditEvent>>(`/api/audit?${params}`)
      .then((r) => {
        if (r.content.length === 0 && r.totalElements > 0 && page > 0) {
          setPage(r.totalPages - 1);
          return;
        }
        setEvents(r.content);
        setMeta({ total: r.totalElements, pages: Math.max(1, r.totalPages) });
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.loadError")),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t es estable
  }, [page, size, entityType, action, setPage]);

  const selectClass =
    "h-[42px] w-full appearance-none rounded-xl border border-border bg-background pr-9 pl-3.5 text-sm font-semibold text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex h-[42px] w-full max-w-[220px] items-center">
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(0);
            }}
            className={selectClass}
          >
            <option value="">{t("audit.allEntities")}</option>
            {ENTITY_TYPES.map((v) => (
              <option key={v} value={v}>
                {auditLabel(t, "entity", v)}
              </option>
            ))}
          </select>
          <ChevronDown
            size={15}
            aria-hidden
            className="pointer-events-none absolute right-3 text-text-muted"
          />
        </label>
        <label className="relative flex h-[42px] w-full max-w-[220px] items-center">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
            className={selectClass}
          >
            <option value="">{t("audit.allActions")}</option>
            {ACTIONS.map((v) => (
              <option key={v} value={v}>
                {auditLabel(t, "action", v)}
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
          <span>{t("audit.colDate")}</span>
          <span>{t("audit.colActor")}</span>
          <span>{t("audit.colEntity")}</span>
          <span>{t("audit.colAction")}</span>
          <span>{t("audit.colScope")}</span>
          <span>{t("audit.colDetails")}</span>
        </div>

        {!events.length && loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {t("common.loading")}
          </p>
        ) : events.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {t("audit.empty")}
          </p>
        ) : (
          events.map((e) => {
            const lines = e.details ? detailLines(e.details) : [];
            const actor =
              e.actorName ?? e.actorEmail ?? (e.actorId ? `#${e.actorId}` : "—");
            return (
              <div
                key={e.id}
                className={`grid ${GRID} min-h-[56px] items-center gap-4 border-b border-border px-3.5 py-2.5 text-sm last:border-b-0`}
              >
                <span className="text-text-secondary tabular-nums">
                  {new Date(e.createdAt).toLocaleString(locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-text-primary">
                    {actor}
                  </span>
                  {e.actorRole && (
                    <span className="text-[11px] text-text-muted">
                      {e.actorRole}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-text-secondary">
                    {auditLabel(t, "entity", e.entityType)}
                  </span>
                  <span className="truncate text-[13px] font-semibold text-text-primary">
                    {e.entityLabel ??
                      (e.entityId ? `#${e.entityId}` : "—")}
                  </span>
                </span>
                <span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ACTION_STYLE[e.action] ?? "bg-surface text-text-secondary"}`}
                  >
                    {auditLabel(t, "action", e.action)}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col text-text-secondary">
                  <span className="truncate">{e.storeName ?? "—"}</span>
                  {e.clientName && e.storeName && (
                    <span className="truncate text-[11px] text-text-muted">
                      {e.clientName}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  {lines.length === 0 ? (
                    <span className="text-text-muted">{t("audit.noDetails")}</span>
                  ) : (
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-primary marker:hidden [&::-webkit-details-marker]:hidden">
                        {t("audit.details", { n: lines.length })}
                      </summary>
                      <ul className="mt-1.5 flex max-h-32 flex-col gap-0.5 overflow-y-auto rounded-lg bg-surface p-2.5 text-xs text-text-secondary">
                        {lines.map((line, i) => (
                          <li key={i} className="break-words">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </span>
              </div>
            );
          })
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
    </div>
  );
}
