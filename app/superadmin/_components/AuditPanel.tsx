"use client";

import {
  PaginationBar,
  usePagination,
  type PageDto,
} from "@/app/(panel)/_components/usePagination";
import { api } from "@/lib/api";
import { hasKey, useI18n, type TKey } from "@/lib/i18n";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

type Filters = {
  clientId: string;
  entityType: string;
  action: string;
  from: string;
  to: string;
};

const EMPTY: Filters = { clientId: "", entityType: "", action: "", from: "", to: "" };

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
  "suspend",
  "modules",
  "sold_out",
  "restock",
];

const ACTION_STYLE: Record<string, string> = {
  create: "bg-success/10 text-success",
  restore: "bg-success/10 text-success",
  update: "bg-primary/10 text-primary",
  settings: "bg-primary/10 text-primary",
  modules: "bg-primary/10 text-primary",
  reorder: "bg-primary/10 text-primary",
  set: "bg-primary/10 text-primary",
  purchase: "bg-primary/10 text-primary",
  activate: "bg-warning/15 text-warning",
  restock: "bg-warning/15 text-warning",
  cancel: "bg-error/10 text-error",
  delete: "bg-error/10 text-error",
  deactivate: "bg-error/10 text-error",
  suspend: "bg-error/10 text-error",
  sold_out: "bg-error/10 text-error",
};

const GRID = "grid-cols-[140px_170px_1fr_110px_1fr_1fr]";

const fieldClass =
  "h-10 rounded-lg border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

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

export function AuditPanel({
  clients,
}: {
  clients: { id: number; name: string }[];
}) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const { page, size, setPage, setSize } = usePagination();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [data, setData] = useState<PageDto<AuditEvent> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: "createdAt,desc",
    });
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      // datetime-local viene en hora local → ISO para el Instant del back
      params.set(key, key === "from" || key === "to" ? new Date(value).toISOString() : value);
    }
    return params.toString();
  }, [page, size, filters]);
  const key = `${query}#${nonce}`;
  const loading = loadedKey !== key;

  useEffect(() => {
    api<PageDto<AuditEvent>>(`/api/audit?${query}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("common.loadError")))
      .finally(() => setLoadedKey(`${query}#${nonce}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t es estable
  }, [query, nonce]);

  function apply(next: Filters) {
    setDraft(next);
    setFilters(next);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply(draft);
        }}
        className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-3 xl:grid-cols-[190px_170px_170px_190px_190px_auto]"
      >
        <select
          value={draft.clientId}
          onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}
          aria-label={t("logs.client")}
          className={fieldClass}
        >
          <option value="">{t("logs.allClients")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={draft.entityType}
          onChange={(e) => setDraft({ ...draft, entityType: e.target.value })}
          aria-label={t("audit.colEntity")}
          className={fieldClass}
        >
          <option value="">{t("audit.allEntities")}</option>
          {ENTITY_TYPES.map((v) => (
            <option key={v} value={v}>
              {auditLabel(t, "entity", v)}
            </option>
          ))}
        </select>
        <select
          value={draft.action}
          onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          aria-label={t("audit.colAction")}
          className={fieldClass}
        >
          <option value="">{t("audit.allActions")}</option>
          {ACTIONS.map((v) => (
            <option key={v} value={v}>
              {auditLabel(t, "action", v)}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={draft.from}
          onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          aria-label={t("logs.from")}
          title={t("logs.from")}
          className={fieldClass}
        />
        <input
          type="datetime-local"
          value={draft.to}
          onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          aria-label={t("logs.to")}
          title={t("logs.to")}
          className={fieldClass}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-[13px] font-bold text-white transition-colors hover:bg-primary-hover"
          >
            {t("common.search")}
          </button>
          <button
            type="button"
            onClick={() => apply(EMPTY)}
            className="h-10 rounded-lg border border-border px-3 text-[13px] font-semibold text-text-secondary transition-colors hover:bg-surface"
          >
            {t("logs.clear")}
          </button>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            aria-label={t("logs.refresh")}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:text-primary"
          >
            <RefreshCw size={15} aria-hidden className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div
          className={`grid ${GRID} gap-3 bg-surface px-4 py-2.5 text-[10px] tracking-wide text-text-muted uppercase`}
        >
          <span>{t("audit.colDate")}</span>
          <span>{t("audit.colActor")}</span>
          <span>{t("audit.colEntity")}</span>
          <span>{t("audit.colAction")}</span>
          <span>{t("audit.colScope")}</span>
          <span>{t("audit.colDetails")}</span>
        </div>
        {!data || data.content.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">
            {loading ? t("common.loading") : t("audit.empty")}
          </p>
        ) : (
          data.content.map((e) => {
            const lines = e.details ? detailLines(e.details) : [];
            const actor =
              e.actorName ?? e.actorEmail ?? (e.actorId ? `#${e.actorId}` : "—");
            // scope: tienda si existe, si no el tenant — SUPERADMIN ve ambos
            const scope = e.storeName ?? e.clientName;
            const scopeSub = e.storeName ? e.clientName : null;
            return (
              <div
                key={e.id}
                className={`grid ${GRID} items-start gap-3 border-b border-border px-4 py-2.5 text-[12px] last:border-b-0`}
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
                  <span className="text-[11px] text-text-muted">
                    {auditLabel(t, "entity", e.entityType)}
                  </span>
                  <span className="truncate font-semibold text-text-primary">
                    {e.entityLabel ?? (e.entityId ? `#${e.entityId}` : "—")}
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
                  <span className="truncate">{scope ?? "—"}</span>
                  {scopeSub && (
                    <span className="truncate text-[11px] text-text-muted">
                      {scopeSub}
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
        {data && (
          <PaginationBar
            page={page}
            pages={data.totalPages}
            size={size}
            total={data.totalElements}
            onPage={setPage}
            onSize={setSize}
          />
        )}
      </div>
    </div>
  );
}
