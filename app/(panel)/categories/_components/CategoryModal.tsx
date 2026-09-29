"use client";

import { Modal } from "@/components/molecules/Modal";
import { useState, type FormEvent } from "react";
import {
  CATEGORY_ICONS,
  type Category,
  type IconKey,
  type StoreDto,
} from "./CategoriesView";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

type FormData = {
  name: string;
  description: string;
  icon: IconKey;
  active: boolean;
  storeIds: number[];
};

export function CategoryModal({
  open,
  category,
  stores,
  onClose,
  onSave,
}: {
  open: boolean;
  category: Category | null;
  stores: StoreDto[];
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? "Editar categoría" : "Nueva categoría"}
    >
      {open && (
        <CategoryForm
          key={category?.id ?? "new"}
          category={category}
          stores={stores}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Modal>
  );
}

function CategoryForm({
  category,
  stores,
  onClose,
  onSave,
}: {
  category: Category | null;
  stores: StoreDto[];
  onClose: () => void;
  onSave: (data: FormData) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState<IconKey>(category?.icon ?? "tag");
  const [active, setActive] = useState(category?.active ?? true);
  const [storeIds, setStoreIds] = useState<number[]>(
    category?.storeIds ?? stores.map((s) => s.id),
  );
  const [storeError, setStoreError] = useState(false);

  function toggleStore(id: number) {
    setStoreError(false);
    setStoreIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (storeIds.length === 0) {
      setStoreError(true);
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      icon,
      active,
      storeIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cat-name"
          className="text-sm font-medium text-text-primary"
        >
          Nombre
        </label>
        <input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="Ej. Ramen"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cat-description"
          className="text-sm font-medium text-text-primary"
        >
          Descripción
        </label>
        <input
          id="cat-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej. Platos principales y especialidades"
          className={inputClass}
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-text-primary">Icono</legend>
        <div className="grid grid-cols-9 gap-1.5">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key as IconKey)}
              aria-label={`Icono ${key}`}
              aria-pressed={icon === key}
              className={`flex aspect-square items-center justify-center rounded-lg border transition-colors ${
                icon === key
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border text-text-secondary hover:border-primary/40 hover:bg-surface"
              }`}
            >
              <Icon size={17} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-text-primary">
          Establecimientos
        </legend>
        <div className="flex flex-col gap-1">
          {stores.map((store) => (
            <label
              key={store.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface has-checked:border-primary has-checked:bg-primary-light"
            >
              <input
                type="checkbox"
                checked={storeIds.includes(store.id)}
                onChange={() => toggleStore(store.id)}
                className="size-4 accent-primary"
              />
              {store.name}
            </label>
          ))}
        </div>
        {storeError && (
          <p role="alert" className="text-xs text-error">
            Selecciona al menos un establecimiento.
          </p>
        )}
      </fieldset>

      <label className="flex items-center gap-2.5 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-primary"
        />
        Visible en el menú
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
          {category ? "Guardar cambios" : "Crear categoría"}
        </button>
      </div>
    </form>
  );
}
