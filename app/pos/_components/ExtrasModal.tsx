"use client";

import type { ExtraDto } from "@/app/(panel)/products/_components/ExtrasSection";
import type { ProductDto } from "@/app/(panel)/products/_components/ProductsView";
import type { SizeDto } from "@/app/(panel)/products/_components/SizesSection";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export type ItemSelection = {
  size: SizeDto | null;
  extras: { extra: ExtraDto; quantity: number }[];
  notes: string;
};

export function ExtrasModal({
  product,
  initial,
  onClose,
  onAdd,
}: {
  product: ProductDto;
  initial?: ItemSelection;
  onClose: () => void;
  onAdd: (product: ProductDto, selection: ItemSelection) => void;
}) {
  const sizes = product.sizes.filter((s) => s.active);
  const extras = product.extras.filter((e) => e.active);

  const [sizeId, setSizeId] = useState<number | null>(
    initial ? (initial.size?.id ?? null) : (sizes[0]?.id ?? null),
  );
  const [qty, setQty] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      (initial?.extras ?? []).map((p) => [p.extra.id, p.quantity]),
    ),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const size = sizes.find((s) => s.id === sizeId) ?? null;
  const picked = extras
    .map((extra) => ({ extra, quantity: qty[extra.id] ?? 0 }))
    .filter((p) => p.quantity > 0);

  const unitPrice =
    product.price +
    (size?.price ?? 0) +
    picked.reduce((sum, p) => sum + p.extra.price * p.quantity, 0);

  const bump = (id: number, delta: number) =>
    setQty((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + delta),
    }));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Extras para ${product.name}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid w-full max-w-[712px] grid-cols-2 gap-5 rounded-2xl bg-background p-6 shadow-xl"
      >
        <div className="flex min-h-0 flex-col gap-3">
          <h2 className="text-xl font-extrabold text-text-primary">Extras</h2>
          <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-1">
            {sizes.length > 0 && (
              <>
                <p className="text-xs font-bold tracking-wide text-text-muted uppercase">
                  Tamaño
                </p>
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSizeId(sizeId === s.id ? null : s.id)}
                    aria-pressed={sizeId === s.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-surface"
                  >
                    <span className="flex items-center gap-3 text-[15px] text-text-primary">
                      <span
                        aria-hidden
                        className={`size-[18px] rounded-full border-2 ${
                          sizeId === s.id
                            ? "border-primary bg-primary"
                            : "border-border bg-background"
                        }`}
                      />
                      {s.name}
                    </span>
                    {s.price > 0 && (
                      <span className="text-[13px] text-text-secondary">
                        +{MXN.format(s.price)}
                      </span>
                    )}
                  </button>
                ))}
                <p className="mt-2 text-xs font-bold tracking-wide text-text-muted uppercase">
                  Extras
                </p>
              </>
            )}
            {extras.length === 0 && sizes.length === 0 && (
              <p className="py-4 text-[15px] text-text-muted">
                Este producto no tiene extras.
              </p>
            )}
            {extras.map((extra) => (
              <div
                key={extra.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-[15px] text-text-primary">
                    {extra.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    +{MXN.format(extra.price)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 tabular-nums">
                  <button
                    type="button"
                    aria-label={`Quitar ${extra.name}`}
                    onClick={() => bump(extra.id, -1)}
                    disabled={(qty[extra.id] ?? 0) === 0}
                    className="rounded-md p-0.5 text-text-secondary transition-colors hover:bg-surface hover:text-primary disabled:opacity-30"
                  >
                    <Minus size={17} aria-hidden />
                  </button>
                  <span className="w-5 text-center text-[15px] font-semibold text-text-primary">
                    {qty[extra.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    aria-label={`Agregar ${extra.name}`}
                    onClick={() => bump(extra.id, 1)}
                    className="rounded-md p-0.5 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Plus size={17} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-extrabold text-text-primary">
                {product.name}
              </p>
              <p className="pt-0.5 text-[15px] font-semibold whitespace-nowrap text-text-primary">
                {MXN.format(unitPrice)}
              </p>
            </div>
            {!size && picked.length === 0 && !notes.trim() ? (
              <p className="text-[13px] text-text-secondary">Sin extras</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-[13px] text-text-secondary">
                {size && (
                  <li className="flex items-center justify-between gap-3">
                    <span>Tamaño: {size.name}</span>
                    {size.price > 0 && (
                      <span className="tabular-nums">
                        +{MXN.format(size.price)}
                      </span>
                    )}
                  </li>
                )}
                {picked.map((p) => (
                  <li
                    key={p.extra.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>
                      {p.quantity > 1 ? `${p.quantity}× ` : ""}
                      {p.extra.name}
                    </span>
                    <span className="tabular-nums">
                      +{MXN.format(p.extra.price * p.quantity)}
                    </span>
                  </li>
                ))}
                {notes.trim() && <li className="italic">“{notes.trim()}”</li>}
              </ul>
            )}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas…"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/25"
          />

          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-[15px] font-semibold text-text-primary transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                onAdd(product, { size, extras: picked, notes: notes.trim() })
              }
              className="flex-1 rounded-xl bg-primary py-3 text-[15px] font-extrabold text-white transition-colors hover:bg-primary-hover"
            >
              Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
