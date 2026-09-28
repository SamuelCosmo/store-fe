"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ROLE_HOME,
  saveSession,
  useSession,
  type AuthResponse,
} from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const session = useSession();

  useEffect(() => {
    if (session?.role) router.replace(ROLE_HOME[session.role] ?? "/");
  }, [session, router]);

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
        setError(body?.message ?? "No se pudo iniciar sesión");
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
    return <div className="min-h-screen flex-1 bg-surface" />;
  }

  return (
    <div className="flex min-h-screen flex-1 bg-surface">
      <aside className="hidden w-[44%] flex-col justify-between bg-primary p-12 text-white lg:flex xl:p-16">
        <p className="text-sm font-semibold tracking-wide text-secondary-light">
          Store Platform
        </p>
        <div className="space-y-10">
          <div className="block w-72 -rotate-2 rounded-sm bg-white p-6 text-text-primary shadow-2xl">
            <p className="text-center text-xs font-semibold tracking-widest text-text-primary">
              COSMO COFFEE
            </p>
            <p className="mt-1 text-center text-[11px] text-text-muted">
              ORDEN #0231 · CAJA 1
            </p>
            <div className="my-4 border-t border-dashed border-border" />
            <ul className="space-y-2 text-sm tabular-nums">
              <li className="flex justify-between">
                <span>2 × Espresso</span>
                <span>7.00</span>
              </li>
              <li className="flex justify-between">
                <span>1 × Croissant</span>
                <span>3.25</span>
              </li>
            </ul>
            <div className="my-4 border-t border-dashed border-border" />
            <p className="flex justify-between text-sm font-semibold tabular-nums">
              <span>Total</span>
              <span>$10.25</span>
            </p>
          </div>
          <p className="max-w-sm text-2xl font-medium leading-snug tracking-tight">
            Caja, cocina, kiosko y catálogo — todo desde el mismo sistema.
          </p>
        </div>
        <p className="text-xs text-white/50">Multi-tienda · Multi-tenant</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="mb-8 text-sm font-semibold text-primary lg:hidden">
            Store Platform
          </p>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="h-1 bg-secondary" />
            <form onSubmit={handleSubmit} className="space-y-5 p-8">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
                  Inicia sesión
                </h1>
                <p className="mt-1.5 text-sm text-text-secondary">
                  Acceso para el equipo y administración.
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

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-text-primary"
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

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-text-primary"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-text-muted">
            ¿No puedes entrar? Pide tus credenciales a tu administrador.
          </p>
        </div>
      </main>
    </div>
  );
}
