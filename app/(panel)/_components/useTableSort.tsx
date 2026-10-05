"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, type ReactNode } from "react";

/** Client-side column sorting for the admin grid tables.
 *  `th(key, label)` renders a clickable header cell; `sorted` is the
 *  sorted (or original) row array. */
export function useTableSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => string | number>,
) {
  const [sort, setSort] = useState<{ key: K; dir: 1 | -1 } | null>(null);

  const sorted = !sort
    ? rows
    : [...rows].sort((a, b) => {
        const av = accessors[sort.key](a);
        const bv = accessors[sort.key](b);
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), "es");
        return cmp * sort.dir;
      });

  function toggle(key: K) {
    setSort((s) =>
      s?.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 },
    );
  }

  function th(key: K, label: ReactNode) {
    const active = sort?.key === key;
    return (
      <button
        type="button"
        onClick={() => toggle(key)}
        className={`flex items-center gap-1 text-left tracking-wide uppercase transition-colors hover:text-text-primary ${
          active ? "text-text-primary" : ""
        }`}
      >
        {label}
        {active &&
          (sort.dir === 1 ? (
            <ArrowUp size={11} aria-hidden />
          ) : (
            <ArrowDown size={11} aria-hidden />
          ))}
      </button>
    );
  }

  return { sorted, th };
}
