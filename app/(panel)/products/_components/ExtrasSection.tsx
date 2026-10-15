"use client";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getSettings } from "@/lib/settings";
import { DeletedList } from "../../_components/DeletedList";
import { Modal } from "@/components/molecules/Modal";
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import type { Product } from "./ProductsView";

export type ExtraDto = {
  id: number;
  name: string;
  price: number;
  active: boolean;
  productIds: number[];
};

export function ExtrasSection({
  extras,
  products,
  onChange,
  onError,
}: {
  extras: ExtraDto[];
  products: Product[];
  onChange: (extras: ExtraDto[], saved?: ExtraDto) => void;
  onError: (message: string | null) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExtraDto | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const { t, lang } = useI18n();
  const MXN = new Intl.NumberFormat(lang === "en" ? "en-US" : "es-MX", {
    style: "currency",
    currency: getSettings().currency || "MXN",
  });

  async function save(data: { name: string; price: number; active: boolean }) {
    try {
      const saved = await api<ExtraDto>(
        editing ? `/api/extras/${editing.id}` : "/api/extras",
        { method: editing ? "PUT" : "POST", body: JSON.stringify(data) },
      );
      setModalOpen(false);
      onChange(
        editing
          ? extras.map((e) => (e.id === saved.id ? saved : e))
          : [...extras, saved],
        saved,
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : t("common.saveError"));
    }
  }

  async function toggleActive(extra: ExtraDto) {
    try {
      const saved = await api<ExtraDto>(`/api/extras/${extra.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: extra.name,
          price: extra.price,
          active: !extra.active,
        }),
      });
      onChange(extras.map((e) => (e.id === saved.id ? saved : e)));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("common.updateError"));
    }
  }

  async function remove(extra: ExtraDto) {
    try {
      await api(`/api/extras/${extra.id}`, { method: "DELETE" });
      onChange(extras.filter((e) => e.id !== extra.id));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("common.deleteError"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-text-primary">
            {t("products.tabExtras")}
          </h2>
          <p className="text-xs text-text-secondary">
            {t("extras.subtitle")}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface"
        >
          {t("extras.new")}
          <Plus size={15} aria-hidden />
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="grid grid-cols-[1fr_140px_110px_110px_60px] items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase">
          <span>{t("extras.colExtra")}</span>
          <span>{t("products.tabProducts")}</span>
          <span>{t("common.price")}</span>
          <span>{t("common.status")}</span>
          <span>{t("common.actions")}</span>
        </div>

        {extras.length === 0 ? (
          <p className="px-3.5 py-8 text-center text-sm text-text-muted">
            {t("extras.empty")}
          </p>
        ) : (
          extras.map((extra) => (
            <div
              key={extra.id}
              className="grid grid-cols-[1fr_140px_110px_110px_60px] min-h-[60px] items-center gap-4 border-b border-border px-3.5 py-3 last:border-b-0"
            >
              <p className="text-[13px] text-text-primary">{extra.name}</p>
              <p
                className="truncate text-xs text-text-secondary"
                title={extra.productIds
                  .map((id) => products.find((p) => p.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              >
                {extra.productIds.length === 0
                  ? "—"
                  : t("extras.productsCount", { n: extra.productIds.length })}
              </p>
              <p className="text-xs font-bold text-text-primary">
                +{MXN.format(extra.price)}
              </p>
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
                    extra.active
                      ? "bg-success/10 text-success"
                      : "bg-surface text-text-secondary"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full ${extra.active ? "bg-success" : "bg-text-muted"}`}
                  />
                  {extra.active ? t("common.active") : t("common.hidden")}
                </span>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  aria-label={t("common.editAria", { name: extra.name })}
                  onClick={() => {
                    setEditing(extra);
                    setModalOpen(true);
                  }}
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil size={17} aria-hidden />
                </button>
                <button
                  aria-label={t("common.moreAria", { name: extra.name })}
                  aria-expanded={menuId === extra.id}
                  aria-haspopup="menu"
                  onClick={() =>
                    setMenuId(menuId === extra.id ? null : extra.id)
                  }
                  className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <MoreHorizontal size={17} aria-hidden />
                </button>

                {menuId === extra.id && (
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
                          toggleActive(extra);
                          setMenuId(null);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
                      >
                        {extra.active ? (
                          <EyeOff size={15} aria-hidden />
                        ) : (
                          <Eye size={15} aria-hidden />
                        )}
                        {extra.active ? t("common.hide") : t("common.show")}
                      </button>
                      <button
                        onClick={() => {
                          remove(extra);
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
        endpoint="/api/extras"
        title={t("extras.deletedTitle")}
        onRestored={() =>
          api<ExtraDto[]>("/api/extras").then(onChange).catch(() => {})
        }
      />

      <ExtraModal
        open={modalOpen}
        extra={editing}
        onClose={() => setModalOpen(false)}
        onSave={save}
      />
    </div>
  );
}

function ExtraModal({
  open,
  extra,
  onClose,
  onSave,
}: {
  open: boolean;
  extra: ExtraDto | null;
  onClose: () => void;
  onSave: (data: { name: string; price: number; active: boolean }) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(extra ? "extras.modalEdit" : "extras.modalNew")}
    >
      {open && (
        <ExtraForm key={extra?.id ?? "new"} extra={extra} onSave={onSave} />
      )}
    </Modal>
  );
}

function ExtraForm({
  extra,
  onSave,
}: {
  extra: ExtraDto | null;
  onSave: (data: { name: string; price: number; active: boolean }) => void;
}) {
  const [name, setName] = useState(extra?.name ?? "");
  const [price, setPrice] = useState(extra?.price.toString() ?? "");
  const [active, setActive] = useState(extra?.active ?? true);
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
            htmlFor="extra-name"
            className="text-sm font-medium text-text-primary"
          >
            {t("common.name")}
          </label>
          <input
            id="extra-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            placeholder={t("extras.namePh")}
            className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="extra-price"
            className="text-sm font-medium text-text-primary"
          >
            {t("extras.priceLabel")}
          </label>
          <input
            id="extra-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0.00"
            className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
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
          {extra ? t("common.saveChanges") : t("extras.create")}
        </button>
      </div>
    </form>
  );
}
