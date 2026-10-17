"use client";

import { Modal } from "@/components/molecules/Modal";
import { api } from "@/lib/api";
import { useI18n, type TKey } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { useState, type FormEvent } from "react";
import {
  BUSINESS_TYPES,
  type BusinessType,
  type StoreDto,
} from "./StoresView";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

type FormData = {
  name: string;
  description: string;
  address: string;
  businessType: BusinessType;
  active: boolean;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  canvasColor: string | null;
};

const COLOR_FIELDS: { field: "primaryColor" | "accentColor" | "canvasColor"; key: TKey; fallback: string }[] = [
  { field: "primaryColor", key: "stores.colorPrimary", fallback: "#00548c" },
  { field: "accentColor", key: "stores.colorAccent", fallback: "#b8956a" },
  { field: "canvasColor", key: "stores.colorCanvas", fallback: "#f5f0e9" },
];

export function StoreModal({
  open,
  store,
  onClose,
  onSave,
}: {
  open: boolean;
  store: StoreDto | null;
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(store ? "stores.modalEdit" : "stores.modalNew")}
    >
      {open && (
        <StoreForm
          key={store?.id ?? "new"}
          store={store}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
}

function StoreForm({
  store,
  onClose,
  onSave,
}: {
  store: StoreDto | null;
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  const [name, setName] = useState(store?.name ?? "");
  const [description, setDescription] = useState(store?.description ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>(
    store?.businessType ?? "RESTAURANT",
  );
  const [active, setActive] = useState(store?.active ?? true);
  const [logoUrl, setLogoUrl] = useState<string | null>(store?.logoUrl ?? null);
  const [colors, setColors] = useState({
    primaryColor: store?.primaryColor ?? null,
    accentColor: store?.accentColor ?? null,
    canvasColor: store?.canvasColor ?? null,
  });
  const [uploading, setUploading] = useState(false);
  const { t } = useI18n();
  const toast = useToast();

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ url: string }>("/api/uploads/brand", {
        method: "POST",
        body: fd,
      });
      setLogoUrl(res.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("settings.logoError"));
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      businessType,
      active,
      logoUrl,
      ...colors,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="store-name"
          className="text-sm font-medium text-text-primary"
        >
          {t("common.name")}
        </label>
        <input
          id="store-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder={t("stores.namePh")}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="store-address"
          className="text-sm font-medium text-text-primary"
        >
          {t("stores.colAddress")}
        </label>
        <input
          id="store-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("stores.addressPh")}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="store-description"
          className="text-sm font-medium text-text-primary"
        >
          {t("common.description")}
        </label>
        <input
          id="store-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("common.optional")}
          className={inputClass}
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-text-primary">
          {t("stores.businessType")}
        </legend>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.entries(BUSINESS_TYPES) as [BusinessType, { key: TKey; icon: React.ElementType }][]).map(
            ([key, { key: labelKey, icon: Icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBusinessType(key)}
                aria-pressed={businessType === key}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
                  businessType === key
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border text-text-secondary hover:border-primary/40 hover:bg-surface"
                }`}
              >
                <Icon size={16} aria-hidden />
                {t(labelKey)}
              </button>
            ),
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3.5">
        <legend className="px-1.5 text-sm font-medium text-text-primary">
          {t("stores.brand")}
        </legend>
        <div className="flex items-center gap-3">
          <input
            id="store-logo-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadLogo(f);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="store-logo-upload"
            className="flex h-16 w-28 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-surface text-[11px] text-text-secondary transition-colors hover:border-primary"
          >
            {uploading ? (
              t("common.uploading")
            ) : logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={t("settings.logo")}
                className="max-h-14 w-auto object-contain p-1"
              />
            ) : (
              t("settings.logo")
            )}
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="text-[11px] text-error hover:underline"
            >
              {t("settings.logoRemove")}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {COLOR_FIELDS.map(({ field, key, fallback }) => (
            <label
              key={field}
              className="flex flex-1 flex-col gap-1.5 text-[11px] font-medium text-text-secondary"
            >
              {t(key)}
              <span className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={colors[field] ?? fallback}
                  onChange={(e) =>
                    setColors({ ...colors, [field]: e.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-surface p-1"
                />
                {colors[field] != null && (
                  <button
                    type="button"
                    aria-label={t("stores.colorClear")}
                    title={t("stores.colorClear")}
                    onClick={() => setColors({ ...colors, [field]: null })}
                    className="text-text-muted transition-colors hover:text-error"
                  >
                    ×
                  </button>
                )}
              </span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-text-secondary">
          {t("stores.brandHint")}
        </p>
      </fieldset>

      <label className="flex items-center gap-2.5 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-primary"
        />
        {t("stores.activeFlag")}
      </label>

      <div className="mt-1 flex justify-end gap-2.5">
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
          {store ? t("common.saveChanges") : t("stores.create")}
        </button>
      </div>
    </form>
  );
}
