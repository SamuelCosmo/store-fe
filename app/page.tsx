"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ROLE_HOME,
  saveSession,
  useSession,
  type AuthResponse,
} from "@/lib/session";
import { Receipt } from "./_components/Receipt";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const session = useSession();

  useEffect(() => {
    if (session?.role) router.replace(ROLE_HOME[session.role] ?? "/");
  }, [session, router]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (new URLSearchParams(window.location.search).has("expired")) {
        setExpired(true);
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

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
          email: data.get("email"),
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
      saveSession(session);
      router.push(ROLE_HOME[session.role] ?? "/");
    } catch {
      setError("Sin conexión con el servidor — verifica que el backend esté corriendo");
    } finally {
      setLoading(false);
    }
  }

  if (session?.role) {
    return <div className="min-h-screen flex-1 bg-canvas" />;
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-canvas p-6">
      <div className="flex h-[600px] w-full max-w-[960px] overflow-hidden rounded-xl bg-surface shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <aside className="hidden w-1/2 flex-col bg-primary px-14 py-10 text-white sm:flex">
          <p className="text-sm font-semibold tracking-wide">Store Platform</p>
          <div className="flex flex-1 items-center">
            <Receipt />
          </div>
          <p className="max-w-[220px] text-sm font-semibold leading-normal tracking-wide">
            Caja, cocina, kiosko y catálogo — todo desde el mismo sistema.
          </p>
        </aside>

        <main className="flex w-full flex-col items-center justify-center bg-background px-8 sm:w-1/2 sm:px-14">
          <form
            onSubmit={handleSubmit}
            className="flex w-full flex-col gap-3 rounded-xl bg-background p-6 shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
          >
            <h1 className="text-xl font-semibold tracking-wide text-text-primary">
              Inicia sesión
            </h1>
            <p className="text-sm text-text-muted">
              Acceso para el equipo y administración.
            </p>

            {expired && (
              <p className="rounded-lg border border-primary/30 bg-primary-light px-3.5 py-2.5 text-sm text-primary">
                Tu sesión expiró. Inicia sesión de nuevo.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2.5 text-sm text-error"
              >
                {error}
              </p>
            )}

            <div className="mt-2 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-text-primary"
                >
                  Correo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="admin@cosmo.com"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-text-primary"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-primary py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
            <p className="mt-1 text-xs text-text-muted">
              ¿No puedes entrar? Pide tus credenciales a tu administrador.
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
