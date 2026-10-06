"use client";

import { Modal } from "@/components/molecules/Modal";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { api } from "@/lib/api";
import {
  clearSession,
  saveSession,
  useSession,
  type AuthResponse,
} from "@/lib/session";
import { Building2, LogOut, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type ClientDto = {
  id: number;
  name: string;
  maxStores: number;
  maxPosPerStore: number;
  maxKiosksPerStore: number;
  createdAt: string;
};

type ClientForm = {
  name: string;
  maxStores: string;
  maxPosPerStore: string;
  maxKiosksPerStore: string;
};

const EMPTY_FORM: ClientForm = {
  name: "",
  maxStores: "1",
  maxPosPerStore: "1",
  maxKiosksPerStore: "1",
};

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

function SuperadminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? "")
            .trim()
            .toLowerCase(),
          password: data.get("password"),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          body?.message === "Invalid credentials"
            ? "Correo o contraseña incorrectos."
            : (body?.message ?? "No se pudo iniciar sesión"),
        );
        return;
      }
      const session = body as AuthResponse;
      if (session.role !== "SUPERADMIN") {
        setError("Esta cuenta no pertenece a la plataforma.");
        return;
      }
      saveSession(session);
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-canvas p-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-background p-7 shadow-[0_10px_28px_rgba(68,38,25,0.08)]"
      >
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold text-text-primary">
            Plataforma
          </h1>
          <p className="text-sm text-text-secondary">
            Acceso de administración de clientes.
          </p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2.5 text-sm text-error"
          >
            {error}
          </p>
        )}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="Correo"
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Contraseña"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? "ENTRANDO…" : "ACCEDER"}
        </button>
      </form>
    </div>
  );
}

export function SuperadminView() {
  const router = useRouter();
  const session = useSession();
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ClientDto | "new" | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isSuper = session?.role === "SUPERADMIN";

  // una sesión de otro rol no sirve aquí — se descarta y pide login de plataforma
  useEffect(() => {
    if (session !== null && session.role !== "SUPERADMIN") clearSession();
  }, [session]);

  useEffect(() => {
    if (!isSuper) return;
    api<ClientDto[]>("/api/clients")
      .then(setClients)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "No se pudieron cargar"),
      )
      .finally(() => setLoading(false));
  }, [isSuper]);

  if (!isSuper) return <SuperadminLogin />;

  function openModal(client: ClientDto | "new") {
    setForm(
      client === "new"
        ? EMPTY_FORM
        : {
            name: client.name,
            maxStores: String(client.maxStores),
            maxPosPerStore: String(client.maxPosPerStore),
            maxKiosksPerStore: String(client.maxKiosksPerStore),
          },
    );
    setModal(client);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const body = JSON.stringify({
      name: form.name.trim(),
      maxStores: Number(form.maxStores),
      maxPosPerStore: Number(form.maxPosPerStore),
      maxKiosksPerStore: Number(form.maxKiosksPerStore),
    });
    try {
      const saved =
        modal === "new"
          ? await api<ClientDto>("/api/clients", { method: "POST", body })
          : await api<ClientDto>(`/api/clients/${(modal as ClientDto).id}`, {
              method: "PUT",
              body,
            });
      setClients((prev) =>
        modal === "new"
          ? [...prev, saved]
          : prev.map((c) => (c.id === saved.id ? saved : c)),
      );
      setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-canvas">
      <header className="flex h-[72px] items-center justify-between border-b border-border bg-background px-8">
        <div className="flex items-center gap-3">
          <Building2 size={20} aria-hidden className="text-primary" />
          <div>
            <p className="text-sm font-extrabold text-text-primary">
              Plataforma
            </p>
            <p className="text-[11px] text-text-muted">
              Clientes del SaaS · {session.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.refresh();
            }}
            aria-label="Cerrar sesión"
            className="flex size-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-error/50 hover:text-error"
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold text-text-primary">
            Clientes
          </h1>
          <button
            type="button"
            onClick={() => openModal("new")}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Nuevo cliente
            <Plus size={15} aria-hidden />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
          >
            {error}
          </p>
        )}

        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="grid grid-cols-[60px_1fr_100px_100px_100px_120px_50px] items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase">
            <span>ID</span>
            <span>Cliente</span>
            <span>Tiendas</span>
            <span>Cajas</span>
            <span>Kioscos</span>
            <span>Alta</span>
            <span />
          </div>

          {loading ? (
            <p className="px-3.5 py-10 text-center text-sm text-text-muted">
              Cargando…
            </p>
          ) : clients.length === 0 ? (
            <p className="px-3.5 py-10 text-center text-sm text-text-muted">
              Aún no hay clientes.
            </p>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                className="grid min-h-[56px] grid-cols-[60px_1fr_100px_100px_100px_120px_50px] items-center gap-4 border-b border-border px-3.5 py-2.5 text-sm last:border-b-0"
              >
                <span className="font-bold text-text-secondary tabular-nums">
                  #{c.id}
                </span>
                <span className="font-semibold text-text-primary">
                  {c.name}
                </span>
                <span className="text-text-secondary tabular-nums">
                  máx {c.maxStores}
                </span>
                <span className="text-text-secondary tabular-nums">
                  máx {c.maxPosPerStore}
                </span>
                <span className="text-text-secondary tabular-nums">
                  máx {c.maxKiosksPerStore}
                </span>
                <span className="text-text-secondary tabular-nums">
                  {new Date(c.createdAt).toLocaleDateString("es-MX")}
                </span>
                <button
                  type="button"
                  onClick={() => openModal(c)}
                  aria-label={`Editar ${c.name}`}
                  className="flex size-9 items-center justify-center justify-self-end rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil size={15} aria-hidden />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "new" ? "Nuevo cliente" : "Editar cliente"}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary">
            Nombre
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="Taquería El Ejemplo"
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["maxStores", "Tiendas"],
                ["maxPosPerStore", "Cajas/tienda"],
                ["maxKiosksPerStore", "Kioscos/tienda"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary"
              >
                {label}
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              Guardar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
