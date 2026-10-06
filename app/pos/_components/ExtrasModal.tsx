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

/** Etiqueta de sección — barra azul + texto (patrón del diseño). */
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 pb-3.5">
      <span aria-hidden className="h-3.5 w-[3px] rounded-[2px] bg-primary" />
      <p className="text-[11px] font-bold tracking-wide text-text-muted uppercase">
        {children}
      </p>
    </div>
  );
}

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl bg-background shadow-[0_24px_48px_rgba(0,0,0,0.15)]"
      >
        {/* header: producto + precio base */}
        <div className="flex shrink-0 items-center justify-between gap-6 border-b border-border px-8 py-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate text-[22px] font-extrabold text-text-primary">
              {product.name}
            </h2>
            {product.description && (
              <p className="truncate text-[13px] font-medium text-text-secondary">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <p className="text-[11px] font-semibold text-text-muted">Desde</p>
            <p className="text-[22px] font-extrabold text-primary">
              {MXN.format(product.price)}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* panel de personalización */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-5 pb-6">
            {sizes.length === 0 && extras.length === 0 && (
              <p className="py-4 text-sm text-text-muted">
                Este producto no tiene opciones.
              </p>
            )}

            {sizes.length > 0 && (
              <section>
                <SectionLabel>Tamaños</SectionLabel>
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSizeId(sizeId === s.id ? null : s.id)}
                    aria-pressed={sizeId === s.id}
                    className="flex w-full items-center justify-between border-b border-border py-2.5 text-left transition-colors hover:bg-surface/50"
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold text-text-primary">
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
                      <span className="text-xs text-text-secondary tabular-nums">
                        +{MXN.format(s.price)}
                      </span>
                    )}
                  </button>
                ))}
              </section>
            )}

            {extras.length > 0 && (
              <section className={sizes.length > 0 ? "pt-5" : ""}>
                <SectionLabel>Extras</SectionLabel>
                {extras.map((extra) => (
                  <div
                    key={extra.id}
                    className="flex items-center justify-between border-b border-border py-2.5"
                  >
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {extra.name}
                      </p>
                      <p className="text-xs text-text-secondary tabular-nums">
                        +{MXN.format(extra.price)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center overflow-hidden rounded-[10px] border border-border bg-surface">
                      <button
                        type="button"
                        aria-label={`Quitar ${extra.name}`}
                        onClick={() => bump(extra.id, -1)}
                        disabled={(qty[extra.id] ?? 0) === 0}
                        className="flex size-9 items-center justify-center text-text-secondary transition-colors hover:text-primary disabled:opacity-30"
                      >
                        <Minus size={16} aria-hidden />
                      </button>
                      <span className="flex h-9 w-8 items-center justify-center bg-background text-sm font-bold text-text-primary tabular-nums">
                        {qty[extra.id] ?? 0}
                      </span>
                      <button
                        type="button"
                        aria-label={`Agregar ${extra.name}`}
                        onClick={() => bump(extra.id, 1)}
                        className="flex size-9 items-center justify-center text-primary transition-colors hover:bg-primary/5"
                      >
                        <Plus size={16} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>

          <div aria-hidden className="w-px shrink-0 bg-border" />

          {/* panel de resumen */}
          <div className="flex w-[340px] shrink-0 flex-col bg-surface">
            <div className="flex flex-col gap-4 border-b border-border px-7 pt-6 pb-5">
              <SectionLabel>Resumen</SectionLabel>
              <div className="flex flex-col gap-1.5 rounded-[10px] border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3 text-sm font-bold text-text-primary">
                  <p className="min-w-0 flex-1">{product.name}</p>
                  <p className="shrink-0 tabular-nums">
                    {MXN.format(unitPrice)}
                  </p>
                </div>
                {(size || picked.length > 0 || notes.trim()) && (
                  <ul className="flex flex-col gap-1 border-t border-border/60 pt-2 text-xs text-text-secondary">
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
            </div>

            <div className="flex flex-col gap-2 border-b border-border px-7 py-5">
              <SectionLabel>Notas</SectionLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones especiales..."
                rows={3}
                maxLength={500}
                className="h-20 w-full resize-none rounded-[10px] border border-border bg-background px-3.5 py-3 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>

            <div className="flex-1" />

            <div className="flex flex-col gap-3 border-t border-border bg-background px-7 pt-4 pb-6">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-text-secondary">
                  Total estimado
                </p>
                <p className="text-xl font-extrabold text-text-primary tabular-nums">
                  {MXN.format(unitPrice)}
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-[104px] shrink-0 rounded-xl border border-border py-3.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAdd(product, { size, extras: picked, notes: notes.trim() })
                  }
                  className="flex-1 rounded-xl bg-primary py-3.5 text-[13px] font-extrabold text-white transition-colors hover:bg-primary-hover"
                >
                  Añadir al pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
