"use client";

import { Modal } from "@/components/molecules/Modal";
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
};

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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={store ? "Editar establecimiento" : "Nuevo establecimiento"}
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      businessType,
      active,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="store-name"
          className="text-sm font-medium text-text-primary"
        >
          Nombre
        </label>
        <input
          id="store-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="Ej. Cosmo Centro"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="store-address"
          className="text-sm font-medium text-text-primary"
        >
          Dirección
        </label>
        <input
          id="store-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ej. Av. Reforma 123, CDMX"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="store-description"
          className="text-sm font-medium text-text-primary"
        >
          Descripción
        </label>
        <input
          id="store-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          className={inputClass}
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-text-primary">
          Tipo de negocio
        </legend>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.entries(BUSINESS_TYPES) as [BusinessType, { label: string; icon: React.ElementType }][]).map(
            ([key, { label, icon: Icon }]) => (
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
                {label}
              </button>
            ),
          )}
        </div>
      </fieldset>

      <label className="flex items-center gap-2.5 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-primary"
        />
        Establecimiento activo
      </label>

      <div className="mt-1 flex justify-end gap-2.5">
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
          {store ? "Guardar cambios" : "Crear establecimiento"}
        </button>
      </div>
    </form>
  );
}
