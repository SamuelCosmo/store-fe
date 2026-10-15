"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { Modal } from "@/components/molecules/Modal";
import { api } from "@/lib/api";
import { useI18n, type TKey } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import {
  Building2,
  Coffee,
  Eye,
  EyeOff,
  Martini,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTableSort } from "../../_components/useTableSort";
import {
  PaginationBar,
  usePagination,
  type PageDto,
} from "../../_components/usePagination";
import { StoreModal } from "./StoreModal";

export type StoreDto = {
  id: number;
  clientId: number;
  name: string;
  description: string | null;
  address: string | null;
  businessType: BusinessType;
  active: boolean;
  createdAt: string;
};

export type BusinessType = "RESTAURANT" | "RETAIL" | "BAR" | "CAFE";

export const BUSINESS_TYPES: Record<
  BusinessType,
  { key: TKey; icon: LucideIcon }
> = {
  RESTAURANT: { key: "stores.type.RESTAURANT", icon: UtensilsCrossed },
  RETAIL: { key: "stores.type.RETAIL", icon: ShoppingBag },
  BAR: { key: "stores.type.BAR", icon: Martini },
  CAFE: { key: "stores.type.CAFE", icon: Coffee },
};

const GRID = "grid-cols-[1fr_200px_140px_140px_110px_60px]";

export function StoresView() {
  const session = useSession();
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoreDto | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [reload, setReload] = useState(0);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleted, setDeleted] = useState<StoreDto[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<StoreDto | null>(null);
  const [busy, setBusy] = useState(false);
  const { page, size, setPage, setSize } = usePagination();
  const { sorted, th, sort } = useTableSort(stores, {
    name: (s) => s.name,
    createdAt: (s) => s.createdAt,
  }, { remote: true });

  const SORT_PROP = { name: "name", createdAt: "createdAt" } as const;
  const sortParam = sort
    ? `${SORT_PROP[sort.key]},${sort.dir === 1 ? "asc" : "desc"}`
    : "id,asc";

  // reordenar reinicia a la primera página
  useEffect(() => setPage(0), [sortParam, setPage]);

  // la página la sirve el backend: page/size/sort/search viajan en la query
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      api<PageDto<StoreDto>>(
        `/api/clients/${session.clientId}/stores?page=${page}&size=${size}&sort=${sortParam}&search=${encodeURIComponent(query)}`,
      )
        .then((r) => {
          // la página quedó vacía tras borrar la última fila → retrocede
          if (r.content.length === 0 && r.totalElements > 0 && page > 0) {
            setPage(r.totalPages - 1);
            return;
          }
          setStores(r.content);
          setMeta({ total: r.totalElements, pages: Math.max(1, r.totalPages) });
        })
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : t("common.loadError")),
        )
        .finally(() => setLoading(false));
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t es estable
  }, [session, page, size, sortParam, query, reload, setPage]);

  // lista de eliminadas — sin paginar (volumen bajo), se recarga con `reload`
  useEffect(() => {
    if (!session || !showDeleted) return;
    api<StoreDto[]>(`/api/clients/${session.clientId}/stores?deleted=true`)
      .then(setDeleted)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.loadError")),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t es estable
  }, [session, showDeleted, reload]);

  async function remove(store: StoreDto) {
    setBusy(true);
    try {
      await api(`/api/stores/${store.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.deleteError"));
    } finally {
      setBusy(false);
    }
  }

  async function restore(store: StoreDto) {
    try {
      await api(`/api/stores/${store.id}/restore`, { method: "POST" });
      setReload((r) => r + 1);
      setDeleted((prev) => prev.filter((s) => s.id !== store.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.restoreError"));
    }
  }

  async function save(data: {
    name: string;
    description: string;
    address: string;
    businessType: BusinessType;
    active: boolean;
  }) {
    const body = JSON.stringify(data);
    try {
      const saved = await api<StoreDto>(
        editing ? `/api/stores/${editing.id}` : "/api/stores",
        { method: editing ? "PUT" : "POST", body },
      );
      setModalOpen(false);
      if (editing) {
        setStores((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      } else {
        // el nuevo puede no caer en la página actual → refetch desde la 1a
        setPage(0);
        setReload((r) => r + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveError"));
    }
  }

  async function toggleActive(store: StoreDto) {
    try {
      const saved = await api<StoreDto>(`/api/stores/${store.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: store.name,
          description: store.description,
          address: store.address,
          businessType: store.businessType,
          active: !store.active,
        }),
      });
      setStores((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.updateError"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("stores.title")} subtitle={t("stores.subtitle")} />

      <div className="flex items-center justify-between gap-4">
        <label className="flex h-[42px] w-full max-w-[320px] items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <Search size={16} aria-hidden className="shrink-0 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t("stores.search")}
            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            onClick={() => setShowDeleted((v) => !v)}
            aria-pressed={showDeleted}
            className={`flex h-[42px] items-center gap-1.5 rounded-xl border px-4 text-[13px] font-medium transition-colors ${
              showDeleted
                ? "border-primary bg-primary-light text-primary"
                : "border-border text-text-secondary hover:text-text-primary"
            }`}
          >
            <Trash2 size={15} aria-hidden />
            {showDeleted ? t("stores.viewActive") : t("stores.viewDeleted")}
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex h-[42px] items-center gap-1.5 rounded-xl bg-primary px-4.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("stores.new")}
            <Plus size={15} aria-hidden />
          </button>
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

      {showDeleted && (
        <div className="rounded-2xl border border-border bg-background p-5">
          <div
            className={`grid ${GRID} items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase`}
          >
            <span>{t("stores.colName")}</span>
            <span>{t("stores.colAddress")}</span>
            <span>{t("stores.colType")}</span>
            <span>{t("stores.colCreated")}</span>
            <span>{t("common.status")}</span>
            <span>{t("common.actions")}</span>
          </div>
          {deleted.length === 0 ? (
            <p className="px-3.5 py-10 text-center text-sm text-text-muted">
              {t("stores.noneDeleted")}
            </p>
          ) : (
            deleted.map((store) => {
              const type = BUSINESS_TYPES[store.businessType];
              const Icon = type?.icon ?? Building2;
              return (
                <div
                  key={store.id}
                  className={`grid ${GRID} min-h-[74px] items-center gap-4 border-b border-border px-3.5 py-3 last:border-b-0`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface">
                      <Icon size={18} aria-hidden className="text-text-muted" />
                    </div>
                    <p className="truncate text-[13px] text-text-secondary">
                      {store.name}
                    </p>
                  </div>
                  <p className="truncate text-xs text-text-secondary">
                    {store.address || "—"}
                  </p>
                  <p className="truncate text-xs text-text-secondary">
                    {type ? t(type.key) : store.businessType}
                  </p>
                  <p className="text-xs text-text-secondary tabular-nums">
                    {new Date(store.createdAt).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <span className="inline-flex w-fit items-center rounded-full bg-error/10 px-2.5 py-1.5 text-[11px] font-bold text-error">
                    {t("stores.deletedBadge")}
                  </span>
                  <button
                    onClick={() => restore(store)}
                    aria-label={t("common.restoreAria", { name: store.name })}
                    title={t("common.restore")}
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <RotateCcw size={17} aria-hidden />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      <div
        className={`rounded-2xl border border-border bg-background p-5 ${showDeleted ? "hidden" : ""}`}
      >
        <div
          className={`grid ${GRID} items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase`}
        >
          {th("name", t("stores.colName"))}
          <span>{t("stores.colAddress")}</span>
          <span>{t("stores.colType")}</span>
          {th("createdAt", t("stores.colCreated"))}
          <span>{t("common.status")}</span>
          <span>{t("common.actions")}</span>
        </div>

        {!session ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {t("stores.loginRequired")}
          </p>
        ) : loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {t("common.loading")}
          </p>
        ) : sorted.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {query ? t("common.noResults", { q: query }) : t("stores.empty")}
          </p>
        ) : (
          sorted.map((store) => {
            const type = BUSINESS_TYPES[store.businessType];
            const Icon = type?.icon ?? Building2;
            return (
              <div
                key={store.id}
                className={`grid ${GRID} min-h-[74px] items-center gap-4 border-b border-border px-3.5 py-3 last:border-b-0`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                    <Icon size={18} aria-hidden className="text-primary" />
                  </div>
                  <p className="truncate text-[13px] text-text-primary">
                    {store.name}
                  </p>
                </div>
                <p className="truncate text-xs text-text-secondary">
                  {store.address || "—"}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {type ? t(type.key) : store.businessType}
                </p>
                <p className="text-xs text-text-secondary tabular-nums">
                  {new Date(store.createdAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
                      store.active
                        ? "bg-success/10 text-success"
                        : "bg-surface text-text-secondary"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${store.active ? "bg-success" : "bg-text-muted"}`}
                    />
                    {store.active ? t("common.active") : t("common.inactive")}
                  </span>
                </div>
                <div className="relative flex items-center gap-2">
                  <button
                    aria-label={t("common.editAria", { name: store.name })}
                    onClick={() => {
                      setEditing(store);
                      setModalOpen(true);
                    }}
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil size={17} aria-hidden />
                  </button>
                  <button
                    aria-label={t("common.moreAria", { name: store.name })}
                    aria-expanded={menuId === store.id}
                    aria-haspopup="menu"
                    onClick={() =>
                      setMenuId(menuId === store.id ? null : store.id)
                    }
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <MoreHorizontal size={17} aria-hidden />
                  </button>

                  {menuId === store.id && (
                    <>
                      <button
                        aria-hidden
                        tabIndex={-1}
                        onClick={() => setMenuId(null)}
                        className="fixed inset-0 z-10 cursor-default"
                      />
                      <div className="absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                        <button
                          onClick={() => {
                            toggleActive(store);
                            setMenuId(null);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
                        >
                          {store.active ? (
                            <EyeOff size={15} aria-hidden />
                          ) : (
                            <Eye size={15} aria-hidden />
                          )}
                          {store.active
                            ? t("common.deactivate")
                            : t("common.activate")}
                        </button>
                        <button
                          onClick={() => {
                            setConfirmDelete(store);
                            setMenuId(null);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-error/5"
                        >
                          <Trash2 size={15} aria-hidden />
                          {t("common.delete")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
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

      <StoreModal
        open={modalOpen}
        store={editing}
        onClose={() => setModalOpen(false)}
        onSave={save}
      />

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("stores.deleteTitle")}
      >
        {confirmDelete && (
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-text-secondary">
              {t("stores.deleteText", { name: confirmDelete.name })}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => remove(confirmDelete)}
                disabled={busy}
                className="rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-60"
              >
                {busy ? t("common.deleting") : t("common.delete")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
