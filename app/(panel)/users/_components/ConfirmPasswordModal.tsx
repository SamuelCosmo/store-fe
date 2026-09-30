"use client";

import { Modal } from "@/components/molecules/Modal";
import { useState, type FormEvent } from "react";

export function ConfirmPasswordModal({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  onError,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (currentPassword: string) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open && (
        <ConfirmForm
          description={description}
          confirmLabel={confirmLabel}
          onClose={onClose}
          onConfirm={onConfirm}
          onError={onError}
        />
      )}
    </Modal>
  );
}

function ConfirmForm({
  description,
  confirmLabel,
  onClose,
  onConfirm,
  onError,
}: {
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (currentPassword: string) => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm(password);
    } catch (err) {
      if (err instanceof Error && err.message === "Invalid credentials") {
        // wrong admin password — stay open and let them retry
        setError("Contraseña incorrecta, vuelve a intentarlo");
      } else {
        onClose();
        onError(
          err instanceof Error ? err.message : "No se pudo completar la acción",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirm-password"
          className="text-sm font-medium text-text-primary"
        >
          Tu contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="mt-1 flex justify-end gap-2.5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </form>
  );
}
