"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import {
  Coffee,
  Cookie,
  Dessert,
  Eye,
  EyeOff,
  IceCreamBowl,
  MoreHorizontal,
  Pencil,
  Pizza,
  Plus,
  Search,
  Soup,
  Sparkles,
  Tag,
  Trash2,
  Wine,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryModal } from "./CategoryModal";

export type CategoryDto = {
  id: number;
  storeIds: number[];
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
};

export type StoreDto = { id: number; name: string };

type ProductDto = { id: number; categoryId: number };

export type Category = {
  id: number;
  name: string;
  description: string;
  products: number;
  active: boolean;
  icon: IconKey;
  storeIds: number[];
};

export const CATEGORY_ICONS = {
  tag: Tag,
  soup: Soup,
  rice: IceCreamBowl,
  wine: Wine,
  dessert: Dessert,
  sparkles: Sparkles,
  coffee: Coffee,
  cookie: Cookie,
  pizza: Pizza,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof CATEGORY_ICONS;

function toCategory(dto: CategoryDto, products: number): Category {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    products,
    active: dto.active,
    icon:
      dto.icon && dto.icon in CATEGORY_ICONS ? (dto.icon as IconKey) : "tag",
    storeIds: dto.storeIds,
  };
}

const GRID = "grid-cols-[1fr_200px_100px_110px_60px]";

export function CategoriesView() {
  const session = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      api<CategoryDto[]>("/api/categories"),
      api<ProductDto[]>("/api/products"),
      api<StoreDto[]>(`/api/clients/${session.clientId}/stores`),
    ])
      .then(([cats, products, storeList]) => {
        const counts = new Map<number, number>();
        for (const p of products) {
          counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
        }
        setCategories(cats.map((c) => toCategory(c, counts.get(c.id) ?? 0)));
        setStores(storeList);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar"),
      )
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = categories.filter((c) =>
    `${c.name} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
  );

  const storeName = (id: number) =>
    stores.find((s) => s.id === id)?.name ?? `#${id}`;

  async function save(data: {
    name: string;
    description: string;
    icon: IconKey;
    active: boolean;
    storeIds: number[];
  }) {
    const body = JSON.stringify({
      name: data.name,
      description: data.description,
      icon: data.icon,
      active: data.active,
      storeIds: data.storeIds,
    });
    try {
      const saved = await api<CategoryDto>(
        editing ? `/api/categories/${editing.id}` : "/api/categories",
        { method: editing ? "PUT" : "POST", body },
      );
      setModalOpen(false);
      setCategories((prev) =>
        editing
          ? prev.map((c) =>
              c.id === saved.id ? toCategory(saved, c.products) : c,
            )
          : [...prev, toCategory(saved, 0)],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  async function toggleActive(cat: Category) {
    try {
      const saved = await api<CategoryDto>(`/api/categories/${cat.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          active: !cat.active,
          storeIds: cat.storeIds,
        }),
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === saved.id ? toCategory(saved, c.products) : c)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }

  async function remove(cat: Category) {
    try {
      await api(`/api/categories/${cat.id}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const noStores = !loading && !error && stores.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías"
        subtitle="Organiza el menú para que sea fácil de explorar"
      />

      <div className="flex items-center justify-between gap-4">
        <label className="flex h-[42px] w-full max-w-[320px] items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <Search size={16} aria-hidden className="shrink-0 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar categoría…"
            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
        {!noStores && (
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Nueva categoría
            <Plus size={15} aria-hidden />
          </button>
        )}
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
          <span>Categoría</span>
          <span>Descripción</span>
          <span>Productos</span>
          <span>Estado</span>
          <span>Acción</span>
        </div>

        {!session ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Inicia sesión para ver las categorías.
          </p>
        ) : loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Cargando…
          </p>
        ) : noStores ? (
          <div className="flex flex-col items-center gap-3 px-3.5 py-10">
            <p className="text-sm text-text-secondary">
              Primero necesitas un establecimiento para tener categorías.
            </p>
            <Link
              href="/dashboard/stores"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Ir a Establecimientos
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {query
              ? `Sin resultados para “${query}”`
              : "Aún no hay categorías. Crea la primera."}
          </p>
        ) : (
          filtered.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon];
            return (
              <div
                key={cat.id}
                className={`grid ${GRID} min-h-[74px] items-center gap-4 border-b border-border px-3.5 py-3 last:border-b-0`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                    <Icon size={18} aria-hidden className="text-primary" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-[13px] text-text-primary">{cat.name}</p>
                    <p className="truncate text-[10px] text-text-muted">
                      {cat.storeIds.map(storeName).join(" · ")}
                    </p>
                  </div>
                </div>
                <p className="truncate text-xs text-text-secondary">
                  {cat.description}
                </p>
                <p className="text-xs font-bold text-text-primary">
                  {cat.products}
                </p>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
                      cat.active
                        ? "bg-success/10 text-success"
                        : "bg-surface text-text-secondary"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${cat.active ? "bg-success" : "bg-text-muted"}`}
                    />
                    {cat.active ? "Activa" : "Oculta"}
                  </span>
                </div>
                <div className="relative flex items-center gap-2">
                  <button
                    aria-label={`Editar ${cat.name}`}
                    onClick={() => {
                      setEditing(cat);
                      setModalOpen(true);
                    }}
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil size={17} aria-hidden />
                  </button>
                  <button
                    aria-label={`Más acciones para ${cat.name}`}
                    aria-expanded={menuId === cat.id}
                    aria-haspopup="menu"
                    onClick={() => setMenuId(menuId === cat.id ? null : cat.id)}
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <MoreHorizontal size={17} aria-hidden />
                  </button>

                  {menuId === cat.id && (
                    <>
                      <button
                        aria-hidden
                        tabIndex={-1}
                        onClick={() => setMenuId(null)}
                        className="fixed inset-0 z-10 cursor-default"
                      />
                      <div className="absolute top-full right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                        <button
                          onClick={() => {
                            toggleActive(cat);
                            setMenuId(null);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
                        >
                          {cat.active ? (
                            <EyeOff size={15} aria-hidden />
                          ) : (
                            <Eye size={15} aria-hidden />
                          )}
                          {cat.active ? "Ocultar" : "Mostrar"}
                        </button>
                        <button
                          onClick={() => {
                            remove(cat);
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
            );
          })
        )}
      </div>

      <CategoryModal
        open={modalOpen}
        category={editing}
        stores={stores}
        onClose={() => setModalOpen(false)}
        onSave={save}
      />
    </div>
  );
}
