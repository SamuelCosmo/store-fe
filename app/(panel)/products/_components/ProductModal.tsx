"use client";

import { Modal } from "@/components/molecules/Modal";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { ChevronDown, ImagePlus, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CategoryDto } from "../../categories/_components/CategoriesView";
import type { ExtraDto } from "./ExtrasSection";
import type { SizeDto } from "./SizesSection";
import type { Product } from "./ProductsView";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

function OptionChecklist({
  items,
  selectedIds,
  onToggle,
  emptyHint,
}: {
  items: { id: number; name: string; price: number }[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  emptyHint: string;
}) {
  const { lang } = useI18n();
  const fmt = new Intl.NumberFormat(lang === "en" ? "en-US" : "es-MX", {
    style: "currency",
    currency: getSettings().currency || "MXN",
  });
  if (items.length === 0) {
    return <p className="text-xs text-text-muted">{emptyHint}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const selected = selectedIds.includes(item.id);
        return (
          <label
            key={item.id}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              selected
                ? "border-primary bg-primary-light"
                : "border-border hover:bg-surface"
            }`}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(item.id)}
              className="size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1 truncate text-text-primary">
              {item.name}
            </span>
            {item.price > 0 && (
              <span className="shrink-0 text-xs text-text-secondary">
                +{fmt.format(item.price)}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

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
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(product ? "products.modalEdit" : "products.modalNew")}
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
  const [image, setImage] = useState(product?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(
    product?.categoryId ?? categories[0]?.id ?? 0,
  );
  const [price, setPrice] = useState(product?.price.toString() ?? "");
  const [tokenCost, setTokenCost] = useState(product?.tokenCost ?? 0);
  const [active, setActive] = useState(product?.active ?? true);
  const [sizeIds, setSizeIds] = useState<number[]>(product?.sizeIds ?? []);
  const [extraIds, setExtraIds] = useState<number[]>(product?.extraIds ?? []);
  const { t } = useI18n();

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

  async function uploadImage(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ url: string }>("/api/uploads", {
        method: "POST",
        body: fd,
      });
      setImage(res.url);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : t("common.uploadError"));
    } finally {
      setUploading(false);
    }
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
          {t("common.name")}
        </label>
        <input
          id="prod-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder={t("products.namePh")}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="prod-description"
          className="text-sm font-medium text-text-primary"
        >
          {t("common.description")}
        </label>
        <input
          id="prod-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("products.descPh")}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prod-sku"
            className="text-sm font-medium text-text-primary"
          >
            {t("products.sku")}
          </label>
          <input
            id="prod-sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder={t("products.skuPh")}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prod-category"
            className="text-sm font-medium text-text-primary"
          >
            {t("products.colCategory")}
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
            {t("common.price")}
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
            {t("products.tokenCost")}
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
            {t("products.tokenCostHint")}
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
        {t("products.visible")}
      </label>

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-text-primary">
          {t("products.image")}
        </p>
        <input
          id="product-image-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadImage(file);
            e.target.value = "";
          }}
        />
        <label
          htmlFor="product-image-upload"
          className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface/50 text-text-muted transition-colors hover:border-primary hover:text-primary"
        >
          {uploading ? (
            <>
              <Loader2 size={22} aria-hidden className="animate-spin" />
              <p className="text-xs">{t("common.uploading")}</p>
            </>
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL del bucket
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <ImagePlus size={22} aria-hidden />
              <p className="text-xs">{t("products.uploadHint")}</p>
            </>
          )}
        </label>
        <div className="flex items-center justify-between">
          {uploadError ? (
            <p className="text-xs text-error">{uploadError}</p>
          ) : (
            <p className="text-[11px] text-text-muted">
              {t("products.uploadSpec")}
            </p>
          )}
          {image && !uploading && (
            <button
              type="button"
              onClick={() => setImage("")}
              className="text-[11px] font-semibold text-text-secondary transition-colors hover:text-error"
            >
              {t("common.remove")}
            </button>
          )}
        </div>
      </div>
      </div>

      <div className="flex flex-col gap-5 border-l border-border pl-5">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="sr-only">{t("products.sizesAvailable")}</legend>
          <p className="text-sm font-medium text-text-primary" aria-hidden>
            {t("products.tabSizes")}
          </p>
          <OptionChecklist
            items={sizes.filter((s) => s.active)}
            selectedIds={sizeIds}
            onToggle={toggleSize}
            emptyHint={t("products.sizesEmptyHint")}
          />
          <p className="text-[11px] text-text-muted">
            {t("products.sizesOrderHint")}
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="sr-only">{t("products.extrasAvailable")}</legend>
          <p className="text-sm font-medium text-text-primary" aria-hidden>
            {t("products.tabExtras")}
          </p>
          <OptionChecklist
            items={extras.filter((e) => e.active)}
            selectedIds={extraIds}
            onToggle={toggleExtra}
            emptyHint={t("products.extrasEmptyHint")}
          />
        </fieldset>
      </div>

      <div className="col-span-2 mt-1 flex justify-end gap-2.5 border-t border-border pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
        >
          {product ? t("common.saveChanges") : t("products.create")}
        </button>
      </div>
    </form>
  );
}
