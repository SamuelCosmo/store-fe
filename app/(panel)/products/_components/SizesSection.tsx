"use client";

import { Modal } from "@/components/molecules/Modal";
import { DeletedList } from "../../_components/DeletedList";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { getSettings } from "@/lib/settings";
import {
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { Product } from "./ProductsView";

export type SizeDto = {
  id: number;
  name: string;
  price: number;
  active: boolean;
  productIds: number[];
};

export function SizesSection({
  sizes,
  products,
  onChange,
  onError,
}: {
  sizes: SizeDto[];
  products: Product[];
  onChange: (sizes: SizeDto[], saved?: SizeDto) => void;
  onError: (message: string | null) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SizeDto | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const dragId = useRef<number | null>(null);
  const { t, lang } = useI18n();
  const toast = useToast();
  const MXN = new Intl.NumberFormat(lang === "en" ? "en-US" : "es-MX", {
    style: "currency",
    currency: getSettings().currency || "MXN",
  });

  async function persistOrder() {
    try {
      await api("/api/sizes/order", {
        method: "PUT",
        body: JSON.stringify(sizes.map((s) => s.id)),
      });
      toast.success(t("common.updated"));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("sizes.orderError"));
    }
  }

  async function save(data: { name: string; price: number; active: boolean }) {
    try {
      const saved = await api<SizeDto>(
        editing ? `/api/sizes/${editing.id}` : "/api/sizes",
        { method: editing ? "PUT" : "POST", body: JSON.stringify(data) },
      );
      setModalOpen(false);
      toast.success(editing ? t("common.updated") : t("common.saved"));
      onChange(
        editing
          ? sizes.map((s) => (s.id === saved.id ? saved : s))
          : [...sizes, saved],
        saved,
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : t("common.saveError"));
    }
  }

  async function toggleActive(size: SizeDto) {
    try {
      const saved = await api<SizeDto>(`/api/sizes/${size.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: size.name,
          price: size.price,
          active: !size.active,
        }),
      });
      onChange(sizes.map((s) => (s.id === saved.id ? saved : s)));
      toast.success(t("common.updated"));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("common.updateError"));
    }
  }

  async function remove(size: SizeDto) {
    try {
      await api(`/api/sizes/${size.id}`, { method: "DELETE" });
      onChange(sizes.filter((s) => s.id !== size.id));
      toast.success(t("common.deleted"));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("common.deleteError"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-text-primary">
            {t("products.tabSizes")}
          </h2>
          <p className="text-xs text-text-secondary">{t("sizes.subtitle")}</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface"
        >
          {t("sizes.new")}
          <Plus size={15} aria-hidden />
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="grid grid-cols-[1fr_140px_110px_110px_60px] items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase">
          <span>{t("sizes.colSize")}</span>
          <span>{t("products.tabProducts")}</span>
          <span>{t("sizes.colPrice")}</span>
          <span>{t("common.status")}</span>
          <span>{t("common.actions")}</span>
        </div>

        {sizes.length === 0 ? (
          <p className="px-3.5 py-8 text-center text-sm text-text-muted">
            {t("sizes.empty")}
          </p>
        ) : (
          sizes.map((size) => (
            <div
              key={size.id}
              draggable
              onDragStart={() => {
                dragId.current = size.id;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId.current === null || dragId.current === size.id) return;
                const from = sizes.findIndex((s) => s.id === dragId.current);
                const to = sizes.findIndex((s) => s.id === size.id);
                if (from === -1 || to === -1) return;
                const next = [...sizes];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                onChange(next);
              }}
              onDragEnd={() => {
                dragId.current = null;
                persistOrder();
              }}
              className="grid grid-cols-[1fr_140px_110px_110px_60px] min-h-[60px] items-center gap-4 border-b border-border px-3.5 py-3 last:border-b-0"
            >
              <p className="flex items-center gap-1.5 text-[13px] text-text-primary">
                <GripVertical
                  size={15}
                  aria-hidden
                  className="shrink-0 cursor-grab text-text-muted"
                />
                {size.name}
              </p>
              <p
                className="truncate text-xs text-text-secondary"
                title={size.productIds
                  .map((id) => products.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              >
                {size.productIds.length === 0
                  ? "—"
                  : t("extras.productsCount", { n: size.productIds.length })}
              </p>
              <p className="text-xs font-bold text-text-primary">
                {size.price > 0 ? `+${MXN.format(size.price)}` : "—"}
              </p>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${size.active
                      ? "bg-success/10 text-success"
                      : "bg-surface text-text-secondary"
                    }`}
                >
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full ${size.active ? "bg-success" : "bg-text-muted"}`}
                  />
                  {size.active ? t("common.active") : t("common.hidden")}
                </span>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  aria-label={t("common.editAria", { name: size.name })}
                  onClick={() => {
                    setEditing(size);
                    setModalOpen(true);
                  }}
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil size={17} aria-hidden />
                </button>
                <button
                  aria-label={t("common.moreAria", { name: size.name })}
                  aria-expanded={menuId === size.id}
                  aria-haspopup="menu"
                  onClick={() =>
                    setMenuId(menuId === size.id ? null : size.id)
                  }
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <MoreHorizontal size={17} aria-hidden />
                </button>

                {menuId === size.id && (
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
                          toggleActive(size);
                          setMenuId(null);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
                      >
                        {size.active ? (
                          <EyeOff size={15} aria-hidden />
                        ) : (
                          <Eye size={15} aria-hidden />
                        )}
                        {size.active ? t("common.hide") : t("common.show")}
                      </button>
                      <button
                        onClick={() => {
                          remove(size);
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
      </div>

      <DeletedList
        endpoint="/api/sizes"
        title={t("sizes.deletedTitle")}
        onRestored={() =>
          api<SizeDto[]>("/api/sizes").then(onChange).catch(() => {})
        }
      />

      <SizeModal
        open={modalOpen}
        size={editing}
        onClose={() => setModalOpen(false)}
        onSave={save}
      />
    </div>
  );
}

function SizeModal({
  open,
  size,
  onClose,
  onSave,
}: {
  open: boolean;
  size: SizeDto | null;
  onClose: () => void;
  onSave: (data: { name: string; price: number; active: boolean }) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(size ? "sizes.modalEdit" : "sizes.modalNew")}
    >
      {open && (
        <SizeForm key={size?.id ?? "new"} size={size} onSave={onSave} />
      )}
    </Modal>
  );
}

function SizeForm({
  size,
  onSave,
}: {
  size: SizeDto | null;
  onSave: (data: { name: string; price: number; active: boolean }) => void;
}) {
  const [name, setName] = useState(size?.name ?? "");
  const [price, setPrice] = useState(size?.price.toString() ?? "");
  const [active, setActive] = useState(size?.active ?? true);
  const { t } = useI18n();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave({ name: name.trim(), price: Number(price) || 0, active });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="size-name"
            className="text-sm font-medium text-text-primary"
          >
            {t("common.name")}
          </label>
          <input
            id="size-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder={t("sizes.namePh")}
            className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="size-price"
            className="text-sm font-medium text-text-primary"
          >
            {t("extras.priceLabel")}
          </label>
          <input
            id="size-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0.00"
            className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <p className="text-[11px] text-text-muted">
            {t("sizes.priceHint")}
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
        {t("common.available")}
      </label>

      <div className="mt-1 flex justify-end gap-2.5">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
        >
          {size ? t("common.saveChanges") : t("sizes.create")}
        </button>
      </div>
    </form>
  );
}
