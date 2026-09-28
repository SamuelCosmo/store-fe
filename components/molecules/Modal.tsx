"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl backdrop:bg-black/40"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-text-primary">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
      {children}
    </dialog>
  );
}
