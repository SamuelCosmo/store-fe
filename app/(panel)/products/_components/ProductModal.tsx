"use client";

import { Modal } from "@/components/molecules/Modal";
import { ChevronDown, ImagePlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CategoryDto } from "../../categories/_components/CategoriesView";
import type { ExtraDto } from "./ExtrasSection";
import type { SizeDto } from "./SizesSection";
import type { Product } from "./ProductsView";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

type FormData = {
  name: string;
  description: string;
  sku: string;
  image: string;
  categoryId: number;
  price: number;
  tokenCost: number;
  active: boolean;
  sizeIds: number[];
  extraIds: number[];
};

export function ProductModal({
  open,
  product,
  categories,
  sizes,
  extras,
  onClose,
  onSave,
}: {
  open: boolean;
  product: Product | null;
  categories: CategoryDto[];
  sizes: SizeDto[];
  extras: ExtraDto[];
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? "Editar producto" : "Nuevo producto"}
      wide
    >
      {open && (
        <ProductForm
          key={product?.id ?? "new"}
          product={product}
          categories={categories}
          sizes={sizes}
          extras={extras}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
}

function ProductForm({
  product,
  categories,
  sizes,
  extras,
  onClose,
  onSave,
}: {
  product: Product | null;
  categories: CategoryDto[];
  sizes: SizeDto[];
  extras: ExtraDto[];
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  // TODO: product image upload — wire this container to an upload service
  // (e.g. Azure Blob) and persist the resulting URL in `products.image`.
  // ponytail: image is read-only until then — field stays in the payload.
  const image = product?.image ?? "";
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ?? categories[0]?.id ?? 0,
  );
  const [price, setPrice] = useState(product?.price.toString() ?? "");
  const [tokenCost, setTokenCost] = useState(product?.tokenCost ?? 0);
  const [active, setActive] = useState(product?.active ?? true);
  const [sizeIds, setSizeIds] = useState<number[]>(product?.sizeIds ?? []);
  const [extraIds, setExtraIds] = useState<number[]>(product?.extraIds ?? []);

  function toggleSize(id: number) {
    setSizeIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleExtra(id: number) {
    setExtraIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      description: description.trim(),
      sku: sku.trim(),
      image: image.trim(),
      categoryId,
      price: Number(price) || 0,
      tokenCost,
      active,
      sizeIds,
      extraIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[1fr_220px] gap-5">
      <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="prod-name"
          className="text-sm font-medium text-text-primary"
        >
          Nombre
        </label>
        <input
          id="prod-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="Ej. Ramen de chashu"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="prod-description"
          className="text-sm font-medium text-text-primary"
        >
          Descripción
        </label>
        <input
          id="prod-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej. Caldo tonkotsu, fideos, chashu"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prod-sku"
            className="text-sm font-medium text-text-primary"
          >
            Etiqueta
          </label>
          <input
            id="prod-sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Ej. KFR-TON"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prod-category"
            className="text-sm font-medium text-text-primary"
          >
            Categoría
          </label>
          <div className="relative">
            <select
              id="prod-category"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              required
              className={`${inputClass} appearance-none pr-9`}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prod-price"
            className="text-sm font-medium text-text-primary"
          >
            Precio
          </label>
          <input
            id="prod-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prod-tokens"
            className="text-sm font-medium text-text-primary"
          >
            Costo en fichas
          </label>
          <input
            id="prod-tokens"
            type="number"
            min="0"
            value={tokenCost}
            onChange={(e) => setTokenCost(Number(e.target.value) || 0)}
            className={inputClass}
          />
          <p className="text-[11px] text-text-muted">
            0 = no se canjea con fichas
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-primary"
        />
        Visible en el menú
      </label>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-text-primary">Imagen</p>
        <div
          aria-disabled
          className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-surface/50 text-text-muted"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria
            <img
              src={image}
              alt={name}
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            <>
              <ImagePlus size={22} aria-hidden />
              <p className="text-xs">
                Próximamente — subida de imágenes
              </p>
            </>
          )}
        </div>
      </div>
      </div>

      <div className="flex flex-col gap-5 border-l border-border pl-5">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="sr-only">Tamaños disponibles</legend>
          <p className="text-sm font-medium text-text-primary" aria-hidden>
            Tamaños
          </p>
          {sizes.filter((s) => s.active).length === 0 ? (
            <p className="text-xs text-text-muted">
              Aún no hay tamaños — créalos abajo en la sección Tamaños.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {sizes
                .filter((s) => s.active)
                .map((size) => (
                  <label
                    key={size.id}
                    className="flex cursor-pointer items-center justify-between gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface has-checked:border-primary has-checked:bg-primary-light"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={sizeIds.includes(size.id)}
                        onChange={() => toggleSize(size.id)}
                        className="size-4 accent-primary"
                      />
                      {size.name}
                    </span>
                    {size.price > 0 && (
                      <span className="text-xs text-text-secondary">
                        +{MXN.format(size.price)}
                      </span>
                    )}
                  </label>
                ))}
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="sr-only">Extras disponibles</legend>
          <p className="text-sm font-medium text-text-primary" aria-hidden>
            Extras
          </p>
        {extras.filter((e) => e.active).length === 0 ? (
          <p className="text-xs text-text-muted">
            Aún no hay extras — créalos abajo en la sección Extras.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {extras
              .filter((e) => e.active)
              .map((extra) => (
                <label
                  key={extra.id}
                  className="flex cursor-pointer items-center justify-between gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface has-checked:border-primary has-checked:bg-primary-light"
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={extraIds.includes(extra.id)}
                      onChange={() => toggleExtra(extra.id)}
                      className="size-4 accent-primary"
                    />
                    {extra.name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    +{MXN.format(extra.price)}
                  </span>
                </label>
              ))}
          </div>
        )}
        </fieldset>
      </div>

      <div className="col-span-2 mt-1 flex justify-end gap-2.5 border-t border-border pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
        >
          {product ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
