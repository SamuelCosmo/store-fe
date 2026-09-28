"use client";

import {
  getStore,
  hydrateSession,
  readStoredSession,
} from "@/lib/store";
import { useEffect, useRef, type ReactNode } from "react";
import { Provider } from "react-redux";

export function Providers({ children }: { children: ReactNode }) {
  const store = getStore();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStoredSession();
    if (stored) store.dispatch(hydrateSession(stored));
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
