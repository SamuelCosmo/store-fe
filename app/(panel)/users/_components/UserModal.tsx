"use client";

import { Modal } from "@/components/molecules/Modal";
import { ROLE_LABEL, type Role } from "@/lib/session";
import { Check, ChevronDown, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { StoreDto } from "../../stores/_components/StoresView";
import type { UserDto } from "./UsersView";

const ROLES: Role[] = ["MANAGER", "EMPLOYEE", "CUSTOMER", "KITCHEN"];

const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { label: "Una mayúscula", test: (p) => /[A-Z]/.test(p) },
  { label: "Una minúscula", test: (p) => /[a-z]/.test(p) },
  { label: "Un número", test: (p) => /\d/.test(p) },
];

export type UserFormData = {
  name: string;
  email: string;
  password: string;
  role: Role;
  storeIds: number[];
};

export function UserModal({
  open,
  user,
  stores,
  onClose,
  onSubmit,
}: {
  open: boolean;
  user: UserDto | null;
  stores: StoreDto[];
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? "Editar usuario" : "Nuevo usuario"}
    >
      {open && (
        <UserForm
          key={user?.id ?? "new"}
          user={user}
          stores={stores}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}

function UserForm({
  user,
  stores,
  onSubmit,
}: {
  user: UserDto | null;
  stores: StoreDto[];
  onSubmit: (data: UserFormData) => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState<Role>(user?.role ?? "EMPLOYEE");
  const [storeIds, setStoreIds] = useState<number[]>(user?.storeIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const roleOptions =
    user?.role === "ADMIN" ? (["ADMIN", ...ROLES] as Role[]) : ROLES;

  function toggleStore(id: number) {
    setStoreIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user && storeIds.length === 0) {
      setError("Selecciona al menos un establecimiento");
      return;
    }
    if (password || password2 || !user) {
      if (password !== password2) {
        setError("Las contraseñas no coinciden");
        return;
      }
      if (!PASSWORD_RULES.every((r) => r.test(password))) {
        setError("La contraseña no cumple los requisitos");
        return;
      }
    }
    onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      storeIds,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="user-name"
          className="text-sm font-medium text-text-primary"
        >
          Nombre
        </label>
        <input
          id="user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="Ej. María López"
          className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="user-role"
          className="text-sm font-medium text-text-primary"
        >
          Rol
        </label>
        <div className="relative">
          <select
            id="user-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-11 w-full appearance-none rounded-lg border border-border bg-background px-3.5 pr-9 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="user-email"
          className="text-sm font-medium text-text-primary"
        >
          Correo
        </label>
        <input
          id="user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="maria@kofi.com"
          className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="user-password"
          className="text-sm font-medium text-text-primary"
        >
          Contraseña{user ? " (opcional)" : ""}
        </label>
        <input
          id="user-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!user}
          placeholder={user ? "Vacío = sin cambios" : "8+ caracteres"}
          className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>

      {(password || !user) && (
        <ul className="flex flex-col gap-1">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li
                key={rule.label}
                className={`flex items-center gap-1.5 text-xs ${ok ? "text-success" : "text-error"}`}
              >
                {ok ? (
                  <Check size={13} aria-hidden />
                ) : (
                  <X size={13} aria-hidden />
                )}
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}

      {(password || !user) && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="user-password2"
            className="text-sm font-medium text-text-primary"
          >
            Repetir contraseña
          </label>
          <input
            id="user-password2"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required={!user || !!password}
            placeholder="Escríbela de nuevo"
            className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          {password2 !== "" && (
            <p
              className={`flex items-center gap-1.5 text-xs ${
                password === password2 ? "text-success" : "text-error"
              }`}
            >
              {password === password2 ? (
                <Check size={13} aria-hidden />
              ) : (
                <X size={13} aria-hidden />
              )}
              {password === password2
                ? "Las contraseñas coinciden"
                : "Las contraseñas no coinciden"}
            </p>
          )}
        </div>
      )}

      {stores.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-text-primary">
            Establecimientos que opera
          </legend>
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto">
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
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-1 flex justify-end gap-2.5">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
        >
          {user ? "Guardar cambios" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
