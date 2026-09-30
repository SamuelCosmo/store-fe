"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import {
  ChevronDown,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CATEGORY_ICONS,
  type CategoryDto,
  type IconKey,
} from "../../categories/_components/CategoriesView";
import { ExtrasSection, type ExtraDto } from "./ExtrasSection";
import { ProductModal } from "./ProductModal";
import { SizesSection, type SizeDto } from "./SizesSection";

export type ProductDto = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  sku: string | null;
  image: string | null;
  price: number;
  active: boolean;
  tokenCost: number;
  extras: ExtraDto[];
  sizes: SizeDto[];
};

export type Product = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  sku: string;
  image: string;
  price: number;
  active: boolean;
  tokenCost: number;
  extraIds: number[];
  sizeIds: number[];
};

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function toProduct(dto: ProductDto): Product {
  return {
    id: dto.id,
    categoryId: dto.categoryId,
    name: dto.name,
    description: dto.description ?? "",
    sku: dto.sku ?? "",
    image: dto.image ?? "",
    price: dto.price,
    active: dto.active,
    tokenCost: dto.tokenCost,
    extraIds: dto.extras.map((e) => e.id),
    sizeIds: dto.sizes.map((s) => s.id),
  };
}

const GRID = "grid-cols-[1fr_140px_110px_140px_60px]";

type Tab = "productos" | "tamanos" | "extras";

const TABS: { id: Tab; label: string }[] = [
  { id: "productos", label: "Productos" },
  { id: "tamanos", label: "Tamaños" },
  { id: "extras", label: "Extras" },
];

export function ProductsView() {
  const session = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [extras, setExtras] = useState<ExtraDto[]>([]);
  const [sizes, setSizes] = useState<SizeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("productos");

  useEffect(() => {
    if (!session) return;
    Promise.all([
      api<ProductDto[]>("/api/products"),
      api<CategoryDto[]>("/api/categories"),
      api<ExtraDto[]>("/api/extras"),
      api<SizeDto[]>("/api/sizes"),
    ])
      .then(([prods, cats, exts, szs]) => {
        setProducts(prods.map(toProduct));
        setCategories(cats);
        setExtras(exts);
        setSizes(szs);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar"),
      )
      .finally(() => setLoading(false));
  }, [session]);

  const filtered = products.filter((p) =>
    `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
  );

  const categoryOf = (id: number) => categories.find((c) => c.id === id);

  async function save(data: {
    name: string;
    description: string;
    sku: string;
    image: string;
    categoryId: number;
    price: number;
    tokenCost: number;
    active: boolean;
    extraIds: number[];
    sizeIds: number[];
  }) {
    try {
      const saved = await api<ProductDto>(
        editing ? `/api/products/${editing.id}` : "/api/products",
        { method: editing ? "PUT" : "POST", body: JSON.stringify(data) },
      );
      setModalOpen(false);
      setProducts((prev) =>
        editing
          ? prev.map((p) => (p.id === saved.id ? toProduct(saved) : p))
          : [...prev, toProduct(saved)],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  async function toggleActive(product: Product) {
    try {
      const saved = await api<ProductDto>(
        `/api/products/${product.id}/active`,
        { method: "PATCH", body: JSON.stringify({ active: !product.active }) },
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === saved.id ? toProduct(saved) : p)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar");
    }
  }

  async function remove(product: Product) {
    try {
      await api(`/api/products/${product.id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  }

  const noCategories = !loading && !error && categories.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        subtitle="Administra los platos, precios y disponibilidad del menú"
      />

      <div role="tablist" className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors ${
              tab === t.id
                ? "border-primary font-semibold text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {error}
        </p>
      )}

      {tab === "productos" && (
      <>
      <div className="flex items-center justify-between gap-4">
        <label className="flex h-[42px] w-full max-w-[320px] items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <Search size={16} aria-hidden className="shrink-0 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
        {!noCategories && (
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Nuevo producto
            <Plus size={15} aria-hidden />
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div
          className={`grid ${GRID} items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase`}
        >
          <span>Producto</span>
          <span>Categoría</span>
          <span>Precio</span>
          <span>Disponibilidad</span>
          <span>Acción</span>
        </div>

        {!session ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Inicia sesión para ver los productos.
          </p>
        ) : loading ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            Cargando…
          </p>
        ) : noCategories ? (
          <div className="flex flex-col items-center gap-3 px-3.5 py-10">
            <p className="text-sm text-text-secondary">
              Primero necesitas una categoría para tener productos.
            </p>
            <Link
              href="/categories"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Ir a Categorías
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-text-muted">
            {query
              ? `Sin resultados para “${query}”`
              : "Aún no hay productos. Crea el primero."}
          </p>
        ) : (
          filtered.map((product) => {
            const cat = categoryOf(product.categoryId);
            const Icon = cat?.icon
              ? CATEGORY_ICONS[cat.icon as IconKey] ?? Tag
              : Tag;
            const expanded = expandedId === product.id;
            const assigned = product.extraIds
              .map((id) => extras.find((e) => e.id === id))
              .filter((e): e is ExtraDto => !!e);
            const assignedSizes = product.sizeIds
              .map((id) => sizes.find((s) => s.id === id))
              .filter((s): s is SizeDto => !!s);
            return (
              <div key={product.id} className="border-b border-border last:border-b-0">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={() => setExpandedId(expanded ? null : product.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(expanded ? null : product.id);
                  }
                }}
                className={`grid ${GRID} min-h-[86px] cursor-pointer items-center gap-4 px-3.5 py-2.5 transition-colors hover:bg-surface/50`}
              >
                <div className="flex items-center gap-3.5">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-[54px] w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-[54px] w-16 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                      <Icon size={20} aria-hidden className="text-primary" />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-[13px] text-text-primary">
                      {product.name}
                    </p>
                    <p className="truncate text-[10px] text-text-muted">
                      {product.sku ? `SKU · ${product.sku}` : "—"}
                      {product.extraIds.length > 0 &&
                        ` · ${product.extraIds.length} extra${product.extraIds.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
                <p className="truncate text-xs text-text-secondary">
                  {cat?.name ?? "—"}
                </p>
                <p className="text-xs text-text-primary">
                  {MXN.format(product.price)}
                </p>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
                      product.active
                        ? "bg-success/10 text-success"
                        : "bg-error/10 text-error"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`size-1.5 rounded-full ${product.active ? "bg-success" : "bg-error"}`}
                    />
                    {product.active ? "Disponible" : "Agotado"}
                  </span>
                </div>
                <div
                  className="relative flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    aria-label={`Editar ${product.name}`}
                    onClick={() => {
                      setEditing(product);
                      setModalOpen(true);
                    }}
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil size={17} aria-hidden />
                  </button>
                  <button
                    aria-label={`Más acciones para ${product.name}`}
                    aria-expanded={menuId === product.id}
                    aria-haspopup="menu"
                    onClick={() =>
                      setMenuId(menuId === product.id ? null : product.id)
                    }
                    className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <MoreHorizontal size={17} aria-hidden />
                  </button>

                  {menuId === product.id && (
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
                            toggleActive(product);
                            setMenuId(null);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
                        >
                          {product.active ? (
                            <EyeOff size={15} aria-hidden />
                          ) : (
                            <Eye size={15} aria-hidden />
                          )}
                          {product.active ? "Ocultar" : "Mostrar"}
                        </button>
                        <button
                          onClick={() => {
                            remove(product);
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
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={`text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {expanded && (
                <div className="flex flex-col gap-2.5 border-t border-border/60 bg-surface/40 px-3.5 py-3 pl-[100px]">
                  {assignedSizes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-text-muted uppercase">
                        Tamaños:
                      </span>
                      {assignedSizes.map((size) => (
                        <span
                          key={size.id}
                          className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] ${
                            size.active
                              ? "text-text-primary"
                              : "text-text-muted line-through"
                          }`}
                        >
                          {size.name}
                          {size.price > 0 && (
                            <span className="text-text-secondary">
                              +{MXN.format(size.price)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {assigned.length === 0 && assignedSizes.length === 0 ? (
                    <p className="text-xs text-text-muted">
                      Sin tamaños ni extras asignados.
                    </p>
                  ) : assigned.length === 0 ? (
                    <p className="text-xs text-text-muted">
                      Sin extras asignados.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wide text-text-muted uppercase">
                        Extras:
                      </span>
                      {assigned.map((extra) => (
                        <span
                          key={extra.id}
                          className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] ${
                            extra.active
                              ? "text-text-primary"
                              : "text-text-muted line-through"
                          }`}
                        >
                          {extra.name}
                          <span className="text-text-secondary">
                            +{MXN.format(extra.price)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {tab === "tamanos" && (
      <SizesSection
        sizes={sizes}
        products={products}
        onChange={(next: SizeDto[], saved?: SizeDto) => {
          setSizes(next);
          if (saved) {
            const wanted = new Set(saved.productIds);
            setProducts((prev) =>
              prev.map((p) => ({
                ...p,
                sizeIds: wanted.has(p.id)
                  ? [...new Set([...p.sizeIds, saved.id])]
                  : p.sizeIds.filter((id) => id !== saved.id),
              })),
            );
          }
        }}
        onError={setError}
      />
      )}

      {tab === "extras" && (
      <ExtrasSection
        extras={extras}
        products={products}
        onChange={(next: ExtraDto[], saved?: ExtraDto) => {
          setExtras(next);
          if (saved) {
            const wanted = new Set(saved.productIds);
            setProducts((prev) =>
              prev.map((p) => ({
                ...p,
                extraIds: wanted.has(p.id)
                  ? [...new Set([...p.extraIds, saved.id])]
                  : p.extraIds.filter((id) => id !== saved.id),
              })),
            );
          }
        }}
        onError={setError}
      />
      )}

      <ProductModal
        open={modalOpen}
        product={editing}
        categories={categories}
        sizes={sizes}
        extras={extras}
        onClose={() => setModalOpen(false)}
        onSave={save}
      />
    </div>
  );
}
