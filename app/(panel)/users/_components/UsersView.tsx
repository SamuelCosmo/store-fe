"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
import { useI18n, type TKey } from "@/lib/i18n";
import { useSession, type Role } from "@/lib/session";
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { StoreDto } from "../../stores/_components/StoresView";
import { useTableSort } from "../../_components/useTableSort";
import {
  PaginationBar,
  usePagination,
  type PageDto,
} from "../../_components/usePagination";
import { DeletedList } from "../../_components/DeletedList";
import { ConfirmPasswordModal } from "./ConfirmPasswordModal";
import { UserModal, type UserFormData } from "./UserModal";

export type UserDto = {
  id: number;
  clientId: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  storeIds: number[];
};

const GRID = "grid-cols-[1fr_140px_1fr_60px]";

const ROLE_STYLE: Record<Role, string> = {
  ADMIN: "bg-primary/10 text-primary",
  MANAGER: "bg-success/10 text-success",
  EMPLOYEE: "bg-surface text-text-secondary",
  CUSTOMER: "bg-warning/10 text-warning",
  KITCHEN: "bg-secondary/15 text-secondary-dark",
  SUPERADMIN: "bg-error/10 text-error",
};

type Confirm =
  | { kind: "toggle"; user: UserDto }
  | { kind: "delete"; user: UserDto }
  | { kind: "save"; data: UserFormData };

export function UsersView() {
  const session = useSession();
  const { t } = useI18n();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [reload, setReload] = useState(0);
  const { page, size, setPage, setSize } = usePagination();
  const { sorted, th, sort } = useTableSort(users, {
    name: (u) => u.name,
    role: (u) => u.role,
  }, { remote: true });

  const SORT_PROP = { name: "name", role: "role" } as const;
  const sortParam = sort
    ? `${SORT_PROP[sort.key]},${sort.dir === 1 ? "asc" : "desc"}`
    : "id,asc";

  // reordenar reinicia a la primera página
  useEffect(() => setPage(0), [sortParam, setPage]);

  // stores solo para resolver nombres — sin paginar (pocos por cliente)
  useEffect(() => {
    if (!session) return;
    api<StoreDto[]>(`/api/clients/${session.clientId}/stores`)
      .then(setStores)
      .catch(() => {});
  }, [session]);

  // la página de usuarios la sirve el backend: page/size/sort/search en la query
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      api<PageDto<UserDto>>(
        `/api/users?page=${page}&size=${size}&sort=${sortParam}&search=${encodeURIComponent(query)}`,
      )
        .then((r) => {
          if (r.content.length === 0 && r.totalElements > 0 && page > 0) {
            setPage(r.totalPages - 1);
            return;
          }
          setUsers(r.content);
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

  const storeName = (id: number) => stores.find((s) => s.id === id)?.name;

  async function saveUser(data: UserFormData, currentPassword: string) {
    const saved = await api<UserDto>(
      editing ? `/api/users/${editing.id}` : "/api/users",
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          ...data,
          password: data.password || null,
          currentPassword,
        }),
      },
    );
    if (editing) {
      setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
    } else {
      // el nuevo puede no caer en la página actual → refetch desde la 1a
      setPage(0);
      setReload((r) => r + 1);
    }
  }

  async function runConfirm(currentPassword: string) {
    if (!confirm) return;
    if (confirm.kind === "save") {
      await saveUser(confirm.data, currentPassword);
      setConfirm(null);
      setModalOpen(false);
      return;
    }
    const body = JSON.stringify({ currentPassword });
    if (confirm.kind === "toggle") {
      const saved = await api<UserDto>(
        `/api/users/${confirm.user.id}/active`,
        {
          method: "PATCH",
          body: JSON.stringify({
            active: !confirm.user.active,
            currentPassword,
          }),
        },
      );
      setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
    } else {
      await api(`/api/users/${confirm.user.id}`, {
        method: "DELETE",
        body,
      });
      setReload((r) => r + 1);
    }
    setConfirm(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")} />

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
            placeholder={t("users.search")}
            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("users.new")}
          <Plus size={15} aria-hidden />
        </button>
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
          {th("name", t("users.colUser"))}
          {th("role", t("users.colRole"))}
          <span>{t("common.stores")}</span>
          <span>{t("common.actions")}</span>
        </div>

        {!session ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {t("users.loginRequired")}
          </p>
        ) : loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {t("common.loading")}
          </p>
        ) : sorted.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {query ? t("common.noResults", { q: query }) : t("users.empty")}
          </p>
        ) : (
          sorted.map((user) => (
            <div
              key={user.id}
              className={`grid ${GRID} min-h-[74px] items-center gap-4 border-b border-border px-3.5 py-3 last:border-b-0 ${user.active ? "" : "opacity-60"}`}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                  <UserRound size={18} aria-hidden className="text-primary" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-[13px] text-text-primary">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] text-text-muted">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-[11px] font-bold ${ROLE_STYLE[user.role]}`}
                >
                  {t(`role.${user.role}` as TKey)}
                </span>
                {!user.active && (
                  <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-1.5 text-[11px] font-bold text-error">
                    {t("common.inactive")}
                  </span>
                )}
              </div>
              <p
                className="truncate text-xs text-text-secondary"
                title={user.storeIds
                  .map((id) => storeName(id))
                  .filter(Boolean)
                  .join(", ")}
              >
                {user.role === "ADMIN" || user.storeIds.length === 0
                  ? user.role === "ADMIN"
                    ? t("common.all")
                    : "—"
                  : user.storeIds
                      .map((id) => storeName(id) ?? `#${id}`)
                      .join(", ")}
              </p>
              <div className="relative flex items-center gap-2">
                <button
                  aria-label={t("common.editAria", { name: user.name })}
                  onClick={() => {
                    setEditing(user);
                    setModalOpen(true);
                  }}
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil size={17} aria-hidden />
                </button>
                <button
                  aria-label={t("common.moreAria", { name: user.name })}
                  aria-expanded={menuId === user.id}
                  aria-haspopup="menu"
                  onClick={() => setMenuId(menuId === user.id ? null : user.id)}
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <MoreHorizontal size={17} aria-hidden />
                </button>

                {menuId === user.id && (
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
                          setConfirm({ kind: "toggle", user });
                          setMenuId(null);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
                      >
                        {user.active ? (
                          <EyeOff size={15} aria-hidden />
                        ) : (
                          <Eye size={15} aria-hidden />
                        )}
                        {user.active
                          ? t("common.deactivate")
                          : t("common.activate")}
                      </button>
                      <button
                        onClick={() => {
                          setConfirm({ kind: "delete", user });
                          setMenuId(null);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-surface"
                      >
                        <Trash2 size={15} aria-hidden />
                        {t("common.delete")}
                      </button>
                    </div>
                  </>
                )}
              </div>
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

      <DeletedList
        endpoint="/api/users"
        title={t("users.deletedTitle")}
        onRestored={() => setReload((r) => r + 1)}
      />

      <UserModal
        open={modalOpen}
        user={editing}
        stores={stores}
        onClose={() => setModalOpen(false)}
        onSubmit={(data) => setConfirm({ kind: "save", data })}
      />

      <ConfirmPasswordModal
        open={confirm !== null}
        title={
          confirm?.kind === "save"
            ? t("users.confirmIdentity")
            : confirm?.kind === "delete"
              ? t("users.deleteTitle", { name: confirm.user.name })
              : confirm?.user.active
                ? t("users.deactivateTitle", { name: confirm.user.name })
                : t("users.activateTitle", { name: confirm?.user.name ?? "" })
        }
        description={
          confirm?.kind === "save"
            ? t(
                editing
                  ? "users.confirmSaveEdit"
                  : "users.confirmSaveNew",
                { name: confirm.data.name },
              )
            : confirm?.kind === "delete"
              ? t("users.confirmDeleteDesc")
              : t("users.confirmDesc")
        }
        confirmLabel={
          confirm?.kind === "save"
            ? t("common.confirm")
            : confirm?.kind === "delete"
              ? t("common.delete")
              : confirm?.user.active
                ? t("common.deactivate")
                : t("common.activate")
        }
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        onError={setError}
      />
    </div>
  );
}
