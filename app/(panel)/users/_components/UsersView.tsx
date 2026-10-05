"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
import { ROLE_LABEL, useSession, type Role } from "@/lib/session";
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
};

type Confirm =
  | { kind: "toggle"; user: UserDto }
  | { kind: "delete"; user: UserDto }
  | { kind: "save"; data: UserFormData };

export function UsersView() {
  const session = useSession();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      api<UserDto[]>("/api/users"),
      api<StoreDto[]>(`/api/clients/${session.clientId}/stores`),
    ])
      .then(([us, sts]) => {
        setUsers(us);
        setStores(sts);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar"),
      )
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()),
  );

  const { sorted, th } = useTableSort(filtered, {
    name: (u) => u.name,
    role: (u) => u.role,
  });

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
    setUsers((prev) =>
      editing
        ? prev.map((u) => (u.id === saved.id ? saved : u))
        : [...prev, saved],
    );
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
      setUsers((prev) => prev.filter((u) => u.id !== confirm.user.id));
    }
    setConfirm(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        subtitle="El equipo que opera tu negocio"
      />

      <div className="flex items-center justify-between gap-4">
        <label className="flex h-[42px] w-full max-w-[320px] items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <Search size={16} aria-hidden className="shrink-0 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar usuario…"
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
          Nuevo usuario
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
          {th("name", "Usuario")}
          {th("role", "Rol")}
          <span>Establecimientos</span>
          <span>Acción</span>
        </div>

        {!session ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Inicia sesión para ver los usuarios.
          </p>
        ) : loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Cargando…
          </p>
        ) : sorted.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {query
              ? `Sin resultados para “${query}”`
              : "Aún no hay usuarios. Crea el primero."}
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
                  {ROLE_LABEL[user.role]}
                </span>
                {!user.active && (
                  <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-1.5 text-[11px] font-bold text-error">
                    Inactivo
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
                    ? "Todos"
                    : "—"
                  : user.storeIds
                      .map((id) => storeName(id) ?? `#${id}`)
                      .join(", ")}
              </p>
              <div className="relative flex items-center gap-2">
                <button
                  aria-label={`Editar ${user.name}`}
                  onClick={() => {
                    setEditing(user);
                    setModalOpen(true);
                  }}
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil size={17} aria-hidden />
                </button>
                <button
                  aria-label={`Más acciones para ${user.name}`}
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
                        {user.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirm({ kind: "delete", user });
                          setMenuId(null);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-surface"
                      >
                        <Trash2 size={15} aria-hidden />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

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
            ? "Confirma tu identidad"
            : confirm?.kind === "delete"
              ? `Eliminar a ${confirm.user.name}`
              : confirm?.user.active
                ? `Desactivar a ${confirm.user.name}`
                : `Activar a ${confirm?.user.name}`
        }
        description={
          confirm?.kind === "save"
            ? `Ingresa tu contraseña para ${editing ? "guardar los cambios" : "crear el usuario"}.`
            : confirm?.kind === "delete"
              ? "Esta acción no se puede deshacer. Ingresa tu contraseña para confirmar."
              : "Ingresa tu contraseña para confirmar."
        }
        confirmLabel={
          confirm?.kind === "save"
            ? "Confirmar"
            : confirm?.kind === "delete"
              ? "Eliminar"
              : confirm?.user.active
                ? "Desactivar"
                : "Activar"
        }
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        onError={setError}
      />
    </div>
  );
}
