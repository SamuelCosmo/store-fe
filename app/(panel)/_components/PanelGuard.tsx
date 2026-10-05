"use client";

import { ROLE_HOME, isSessionExpired } from "@/lib/session";
import { readStoredSession } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// Rutas del panel restringidas a ADMIN (el backend refuerza las mutaciones).
const ADMIN_ONLY = ["/users", "/settings"];

export function PanelGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  // Diferido tras montar: localStorage no existe en SSR
  useEffect(() => {
    const id = setTimeout(() => {
      const session = readStoredSession();
      if (!session || isSessionExpired(session)) {
        router.replace("/");
        return;
      }
      if (
        session.role !== "ADMIN" &&
        ADMIN_ONLY.some((p) => pathname.startsWith(p))
      ) {
        router.replace(ROLE_HOME[session.role]);
        return;
      }
      setAllowed(true);
    }, 0);
    return () => clearTimeout(id);
  }, [pathname, router]);

  return allowed ? children : null;
}
