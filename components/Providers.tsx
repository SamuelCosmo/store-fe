"use client";

import {
  SESSION_KEY,
  clearSession,
  getStore,
  hydrateSession,
  readStoredSession,
} from "@/lib/store";
import { LangProvider } from "@/lib/i18n";
import { report } from "@/lib/log";
import { ToastProvider } from "@/lib/toast";
import { SESSION_EXPIRED_EVENT, isSessionExpired } from "@/lib/session";
import { refreshSettings } from "@/lib/settings";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";

export function Providers({ children }: { children: ReactNode }) {
  const store = getStore();
  const hydrated = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStoredSession();
    if (stored && !isSessionExpired(stored)) {
      store.dispatch(hydrateSession(stored));
      // Cache de settings del backend; si falla se queda el cache anterior.
      // SUPERADMIN no tiene tenant → nada que refrescar.
      if (stored.clientId != null) {
        refreshSettings(stored.clientId, stored.storeId).catch(() => {});
      }
    } else if (stored) {
      report("info", "session.expired", "expired on page load");
      store.dispatch(clearSession());
      if (pathname !== "/") router.replace("/?expired=1");
    }
  }, [store, router, pathname]);

  // Cada minuto y al recuperar foco: cierra sesión si pasó el límite por
  // rol (o el `exp` del JWT) y refresca el cache de settings del backend,
  // así las terminales reciben cambios de configuración sin reload.
  useEffect(() => {
    const sync = () => {
      const session = store.getState().session.value;
      if (!session) return;
      if (isSessionExpired(session)) {
        report("info", "session.expired", "role TTL reached");
        store.dispatch(clearSession());
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        return;
      }
      if (session.clientId != null) {
        refreshSettings(session.clientId, session.storeId).catch(() => {});
      }
    };
    const id = setInterval(sync, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [store]);

  useEffect(() => {
    const onExpired = () => router.replace("/?expired=1");
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [router]);

  // Otra pestaña escribió la sesión (login, logout o cambio de marca desde
  // /settings) → rehidrata para reflejar logo/nombre al instante.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESSION_KEY) return;
      const s = readStoredSession();
      if (s) store.dispatch(hydrateSession(s));
      else store.dispatch(clearSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

  return (
    <Provider store={store}>
      <LangProvider>
        <ToastProvider>{children}</ToastProvider>
      </LangProvider>
    </Provider>
  );
}
