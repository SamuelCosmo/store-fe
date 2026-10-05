"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export const PAGE_SIZES = [5, 10, 15, 20, 25];

/** Envelope de Spring Data Page. */
export type PageDto<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
};

/** Estado de página/tamaño para tablas paginadas por el backend. */
export function usePagination() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  return {
    page,
    size,
    setPage,
    setSize: (n: number) => {
      setSize(n);
      setPage(0);
    },
  };
}

export function PaginationBar({
  page,
  pages,
  size,
  total,
  onPage,
  onSize,
}: {
  page: number;
  pages: number;
  size: number;
  total: number;
  onPage: (p: number) => void;
  onSize: (n: number) => void;
}) {
  if (total === 0) return null;
  const from = page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-text-secondary">
      <p className="tabular-nums">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-3">
        <label className="relative flex items-center gap-1.5 font-semibold">
          Filas
          <select
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="h-8 appearance-none rounded-lg border border-border bg-background py-0 pr-8 pl-3 text-xs font-semibold text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            aria-hidden
            className="pointer-events-none absolute right-2.5 text-text-muted"
          />
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page === 0}
            aria-label="Página anterior"
            className="flex size-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
          >
            <ChevronLeft size={15} aria-hidden />
          </button>
          <p className="min-w-10 text-center font-semibold tabular-nums">
            {page + 1} / {pages}
          </p>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pages - 1}
            aria-label="Página siguiente"
            className="flex size-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
          >
            <ChevronRight size={15} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
