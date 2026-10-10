"use client";

import { Modal } from "@/components/molecules/Modal";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import Image from "next/image";
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
  "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  // cuando la cuenta opera varias tiendas el login pide elegir una (modal)
  const [stores, setStores] = useState<{ id: number; name: string }[] | null>(
    null,
  );
  const [storeId, setStoreId] = useState<number | null>(null);
  const [pending, setPending] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const session = useSession();

  useEffect(() => {
    if (session?.role) router.replace(ROLE_HOME[session.role] ?? "/");
  }, [session, router]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(() => {
      tick();
      if (new URLSearchParams(window.location.search).has("expired")) {
        setExpired(true);
      }
    }, 0);
    const id = setInterval(tick, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  async function login(email: string, password: string, store: number | null) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(store != null ? { storeId: store } : {}),
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = String(body?.message ?? "No se pudo iniciar sesión");
      // la cuenta opera varias tiendas → traer las elegibles y elegir
      if (message.startsWith("storeId required")) {
        const storesRes = await fetch(`${API_URL}/api/auth/stores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const list = (await storesRes.json().catch(() => null)) as
          | { id: number; name: string }[]
          | null;
        if (storesRes.ok && list?.length) {
          setStores(list);
          setStoreId(list[0].id);
          setPending({ email, password });
          return;
        }
      }
      setError(
        message === "Invalid credentials"
          ? "Correo o contraseña incorrectos."
          : message,
      );
      return;
    }
    const session = body as AuthResponse;
    saveSession(session);
    router.push(ROLE_HOME[session.role] ?? "/");
  }

  function closeStorePicker() {
    setStores(null);
    setPending(null);
    setStoreId(null);
  }

  async function confirmStore() {
    if (!pending || storeId == null) return;
    setLoading(true);
    try {
      await login(pending.email, pending.password, storeId);
    } catch {
      setError(
        "Sin conexión con el servidor — verifica que el backend esté corriendo",
      );
    } finally {
      setLoading(false);
      closeStorePicker();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      await login(
        String(data.get("email") ?? "")
          .trim()
          .toLowerCase(),
        String(data.get("password") ?? ""),
        null,
      );
    } catch {
      setError(
        "Sin conexión con el servidor — verifica que el backend esté corriendo",
      );
    } finally {
      setLoading(false);
    }
  }

  if (session?.role) {
    return <div className="min-h-screen flex-1 bg-canvas" />;
  }

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-canvas p-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="flex h-[640px] w-full max-w-[1120px] overflow-hidden rounded-2xl border border-border bg-background shadow-[0_10px_28px_rgba(68,38,25,0.08)]">
        <aside className="hidden w-[360px] shrink-0 flex-col gap-4 overflow-hidden bg-primary p-10 text-white sm:flex">
          <Image
            src="/sac-logo.png"
            alt="SAC+"
            width={150}
            height={56}
            unoptimized
            priority
            className="h-14 w-auto self-start"
          />
          <div className="flex flex-col gap-3">
            <h1 className="text-[32px] leading-[1.1] font-extrabold">
              Bienvenido
            </h1>
            <p className="text-sm leading-[1.5]">
              Inicia sesión para acceder al punto de venta, administración y
              seguimiento de tu negocio.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-white/15 bg-white/8 p-4">
            <p className="text-[10px] font-bold tracking-[0.2px]">SOPORTE</p>
            <p className="text-[13px] leading-[1.4]">
              Si no puedes iniciar sesión, pide tus credenciales al
              administrador de tu negocio.
            </p>
          </div>

          <div className="mt-auto flex items-baseline justify-between">
            <p className="text-[10px] font-bold tracking-[0.2px]">
              HORA ACTUAL
            </p>
            <p className="text-lg font-extrabold tabular-nums">
              {now
                ? now.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--:--"}
            </p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-6 bg-surface p-8 sm:p-12">
          {/* logo solo en móvil — en desktop vive en el aside */}
          <Image
            src="/sac-logo.png"
            alt="SAC+"
            width={140}
            height={52}
            unoptimized
            priority
            className="h-[52px] w-auto self-start sm:hidden"
          />
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[32px] leading-none font-extrabold text-text-primary">
              Acceder
            </h2>
            <p className="text-sm leading-[1.5] text-text-secondary">
              Ingresa tu correo y contraseña para continuar.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6"
          >
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

            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-[13px] font-semibold text-text-primary"
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
                placeholder="tu.correo@empresa.com"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-[13px] font-semibold text-text-primary"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="size-4 rounded accent-primary"
                />
                Recordar sesión
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-end gap-2 rounded-2xl bg-primary px-5 text-[15px] font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              {loading ? "ENTRANDO…" : "ACCEDER"}
              <span aria-hidden>→</span>
            </button>

            <p className="text-center text-xs text-text-muted">
              Al iniciar sesión aceptas las políticas de acceso y uso del
              sistema.
            </p>
          </form>
        </main>
      </div>

      <Modal
        open={stores !== null}
        onClose={closeStorePicker}
        title="Elige el establecimiento"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Tu cuenta opera en varias tiendas — elige dónde trabajas hoy.
          </p>
          <label
            htmlFor="store"
            className="flex flex-col gap-2 text-[13px] font-semibold text-text-primary"
          >
            Establecimiento
            <select
              id="store"
              value={storeId ?? ""}
              onChange={(e) => setStoreId(Number(e.target.value))}
              className={inputClass}
            >
              {stores?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={closeStorePicker}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmStore}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              Aceptar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
