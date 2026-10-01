"use client";

import {
  clearSession,
  getStore,
  hydrateSession,
  readStoredSession,
} from "@/lib/store";
import { SESSION_EXPIRED_EVENT, isSessionExpired } from "@/lib/session";
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
    } else if (stored) {
      store.dispatch(clearSession());
      if (pathname !== "/") router.replace("/?expired=1");
    }
  }, [store, router, pathname]);

  useEffect(() => {
    const onExpired = () => router.replace("/?expired=1");
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [router]);

  return <Provider store={store}>{children}</Provider>;
}
