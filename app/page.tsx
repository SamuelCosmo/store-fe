"use client";

import { Modal } from "@/components/molecules/Modal";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { useI18n } from "@/lib/i18n";
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
  const { t, lang } = useI18n();

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
      const message = String(body?.message ?? t("login.failed"));
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
        message === "Invalid credentials" ? t("login.badCredentials") : message,
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
      setError(t("login.offline"));
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
      setError(t("login.offline"));
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
              {t("login.welcome")}
            </h1>
            <p className="text-sm leading-[1.5]">{t("login.tagline")}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-white/15 bg-white/8 p-4">
            <p className="text-[10px] font-bold tracking-[0.2px]">
              {t("login.support")}
            </p>
            <p className="text-[13px] leading-[1.4]">{t("login.supportText")}</p>
          </div>

          <div className="mt-auto flex items-baseline justify-between">
            <p className="text-[10px] font-bold tracking-[0.2px]">
              {t("login.time")}
            </p>
            <p className="text-lg font-extrabold tabular-nums">
              {now
                ? now.toLocaleTimeString(lang === "en" ? "en-US" : "es-MX", {
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
              {t("login.access")}
            </h2>
            <p className="text-sm leading-[1.5] text-text-secondary">
              {t("login.instructions")}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-6"
          >
            {expired && (
              <p className="rounded-lg border border-primary/30 bg-primary-light px-3.5 py-2.5 text-sm text-primary">
                {t("login.expired")}
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
                {t("login.email")}
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
                {t("login.password")}
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
                {t("login.remember")}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-end gap-2 rounded-2xl bg-primary px-5 text-[15px] font-extrabold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            >
              {loading ? t("login.submitting") : t("login.submit")}
              <span aria-hidden>→</span>
            </button>

            <p className="text-center text-xs text-text-muted">
              {t("login.legal")}
            </p>
          </form>
        </main>
      </div>

      <Modal
        open={stores !== null}
        onClose={closeStorePicker}
        title={t("login.pickStore")}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            {t("login.pickStoreText")}
          </p>
          <label
            htmlFor="store"
            className="flex flex-col gap-2 text-[13px] font-semibold text-text-primary"
          >
            {t("login.store")}
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
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={confirmStore}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {t("login.accept")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
