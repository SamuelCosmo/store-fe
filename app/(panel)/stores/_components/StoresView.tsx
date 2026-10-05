"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
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
  Search,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTableSort } from "../../_components/useTableSort";
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
  { label: string; icon: LucideIcon }
> = {
  RESTAURANT: { label: "Restaurante", icon: UtensilsCrossed },
  RETAIL: { label: "Retail", icon: ShoppingBag },
  BAR: { label: "Bar", icon: Martini },
  CAFE: { label: "Café", icon: Coffee },
};

const GRID = "grid-cols-[1fr_200px_140px_140px_110px_60px]";

export function StoresView() {
  const session = useSession();
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StoreDto | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    api<StoreDto[]>(`/api/clients/${session.clientId}/stores`)
      .then(setStores)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar"),
      )
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = stores.filter((s) =>
    `${s.name} ${s.description ?? ""} ${s.address ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const { sorted, th } = useTableSort(filtered, {
    name: (s) => s.name,
    createdAt: (s) => s.createdAt,
  });

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
      setStores((prev) =>
        editing
          ? prev.map((s) => (s.id === saved.id ? saved : s))
          : [...prev, saved],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
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
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Establecimientos"
        subtitle="Las sucursales donde opera tu negocio"
      />

      <div className="flex items-center justify-between gap-4">
        <label className="flex h-[42px] w-full max-w-[320px] items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <Search size={16} aria-hidden className="shrink-0 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar establecimiento…"
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
          Nuevo establecimiento
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
          {th("name", "Establecimiento")}
          <span>Dirección</span>
          <span>Tipo</span>
          {th("createdAt", "Alta")}
          <span>Estado</span>
          <span>Acción</span>
        </div>

        {!session ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Inicia sesión para ver los establecimientos.
          </p>
        ) : loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Cargando…
          </p>
        ) : sorted.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {query
              ? `Sin resultados para “${query}”`
              : "Aún no hay establecimientos. Crea el primero."}
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
                  {type?.label ?? store.businessType}
                </p>
                <p className="text-xs text-text-secondary tabular-nums">
                  {new Date(store.createdAt).toLocaleDateString("es-MX", {
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
                    {store.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="relative flex items-center gap-2">
                  <button
                    aria-label={`Editar ${store.name}`}
                    onClick={() => {
                      setEditing(store);
                      setModalOpen(true);
                    }}
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil size={17} aria-hidden />
                  </button>
                  <button
                    aria-label={`Más acciones para ${store.name}`}
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
                          {store.active ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <StoreModal
        open={modalOpen}
        store={editing}
        onClose={() => setModalOpen(false)}
        onSave={save}
      />
    </div>
  );
}
