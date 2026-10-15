"use client";

import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

type DeletedItem = { id: number; name: string };

/** Lista perezosa de registros eliminados (GET {endpoint}?deleted=true) con
 *  botón Restaurar (POST {endpoint}/{id}/restore). */
export function DeletedList({
  endpoint,
  title,
  onRestored,
}: {
  endpoint: string;
  title: string;
  onRestored?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DeletedItem[] | null>(null);
  const { t } = useI18n();
  const toast = useToast();

  async function toggle() {
    if (!open && items === null) {
      try {
        setItems(await api<DeletedItem[]>(`${endpoint}?deleted=true`));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("common.error"));
      }
    }
    setOpen((v) => !v);
  }

  async function restore(item: DeletedItem) {
    try {
      await api(`${endpoint}/${item.id}/restore`, { method: "POST" });
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
      toast.success(t("common.restored"));
      onRestored?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.restoreError"));
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-background">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-5 py-3.5 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
      >
        <Trash2 size={15} aria-hidden />
        {title}
        {open && items !== null && (
          <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-text-muted">
            {items.length}
          </span>
        )}
        <ChevronDown
          size={15}
          aria-hidden
          className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-3">
          {items === null ? (
            <p className="py-4 text-center text-sm text-text-muted">
              {t("common.loading")}
            </p>
          ) : items.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">
              {t("common.none")}
            </p>
          ) : (
            <ul className="flex flex-col">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <p className="min-w-0 flex-1 truncate text-sm text-text-secondary">
                    {item.name}
                  </p>
                  <button
                    onClick={() => restore(item)}
                    aria-label={`${t("common.restore")} ${item.name}`}
                    title={t("common.restore")}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <RotateCcw size={14} aria-hidden />
                    {t("common.restore")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
