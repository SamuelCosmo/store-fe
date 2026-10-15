"use client";

import {
  PaginationBar,
  usePagination,
  type PageDto,
} from "@/app/(panel)/_components/usePagination";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AppLog = {
  id: number;
  createdAt: string;
  level: "ERROR" | "WARN" | "INFO";
  logger: string;
  message: string;
  stack: string | null;
  requestId: string | null;
  userId: number | null;
  clientId: number | null;
  storeId: number | null;
  role: string | null;
};

type Filters = {
  level: string;
  q: string;
  requestId: string;
  clientId: string;
  from: string;
  to: string;
};

const EMPTY: Filters = { level: "", q: "", requestId: "", clientId: "", from: "", to: "" };

const LEVEL_CLASS: Record<AppLog["level"], string> = {
  ERROR: "bg-error/10 text-error",
  WARN: "bg-warning/15 text-warning",
  INFO: "bg-surface text-text-secondary",
};

const fieldClass =
  "h-10 rounded-lg border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

/** Eventos del front llegan como `client <tipo> {json}` → JSON indentado. */
function pretty(message: string): string {
  const start = message.indexOf("{");
  if (start < 0) return message;
  try {
    return message.slice(0, start) + "\n" + JSON.stringify(JSON.parse(message.slice(start)), null, 2);
  } catch {
    return message;
  }
}

export function LogsPanel({ clients }: { clients: { id: number; name: string }[] }) {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const { page, size, setPage, setSize } = usePagination();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [data, setData] = useState<PageDto<AppLog> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  // refresh manual re-pide la misma query
  const [nonce, setNonce] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
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
    api<PageDto<AppLog>>(`/api/logs?${query}`)
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
    setOpen(null);
  }

  const clientName = (id: number | null) =>
    id == null ? null : (clients.find((c) => c.id === id)?.name ?? `#${id}`);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply(draft);
        }}
        className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[120px_1fr_180px_180px] lg:grid-cols-[120px_1fr_170px_170px_190px_190px_auto]"
      >
        <select
          value={draft.level}
          onChange={(e) => setDraft({ ...draft, level: e.target.value })}
          aria-label={t("logs.level")}
          className={fieldClass}
        >
          <option value="">{t("logs.allLevels")}</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
        </select>
        <input
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          placeholder={t("logs.searchPh")}
          className={fieldClass}
        />
        <input
          value={draft.requestId}
          onChange={(e) => setDraft({ ...draft, requestId: e.target.value })}
          placeholder={t("logs.refPh")}
          className={fieldClass}
        />
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
        <div className="grid grid-cols-[150px_64px_56px_1fr_170px] gap-3 bg-surface px-4 py-2.5 text-[10px] tracking-wide text-text-muted uppercase">
          <span>{t("logs.colTime")}</span>
          <span>{t("logs.level")}</span>
          <span>{t("logs.colSource")}</span>
          <span>{t("logs.colMessage")}</span>
          <span>{t("logs.colContext")}</span>
        </div>
        {!data || data.content.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">
            {loading ? t("common.loading") : t("logs.empty")}
          </p>
        ) : (
          data.content.map((row) => {
            const front = row.logger === "client";
            const expanded = open === row.id;
            return (
              <div key={row.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : row.id)}
                  aria-expanded={expanded}
                  className="grid w-full grid-cols-[150px_64px_56px_1fr_170px] items-start gap-3 px-4 py-2.5 text-left text-[12px] transition-colors hover:bg-surface"
                >
                  <span className="text-text-secondary tabular-nums">
                    {new Date(row.createdAt).toLocaleString(locale)}
                  </span>
                  <span
                    className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_CLASS[row.level]}`}
                  >
                    {row.level}
                  </span>
                  <span className="text-text-muted">
                    {front ? t("logs.front") : t("logs.back")}
                  </span>
                  <span
                    className={`font-mono text-text-primary ${expanded ? "break-all" : "truncate"}`}
                  >
                    {row.message}
                  </span>
                  <span className="truncate text-text-secondary">
                    {[clientName(row.clientId), row.role, row.userId && `u${row.userId}`, row.storeId && `s${row.storeId}`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </button>
                {expanded && (
                  <div className="flex flex-col gap-3 bg-surface/60 px-4 pt-1 pb-4">
                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-text-secondary">
                      <span className="font-mono">{row.logger}</span>
                      {row.requestId && (
                        <button
                          type="button"
                          onClick={() => apply({ ...EMPTY, requestId: row.requestId! })}
                          className="rounded-md border border-border px-2 py-1 font-mono text-primary transition-colors hover:bg-background"
                        >
                          {t("logs.trace", { ref: row.requestId })}
                        </button>
                      )}
                    </div>
                    <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] whitespace-pre-wrap text-text-primary">
                      {pretty(row.message)}
                    </pre>
                    {row.stack && (
                      <pre className="max-h-96 overflow-auto rounded-lg border border-error/30 bg-background p-3 font-mono text-[11px] whitespace-pre text-error">
                        {row.stack}
                      </pre>
                    )}
                  </div>
                )}
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
