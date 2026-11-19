"use client";

import { hasModule, homePath, isSessionExpired, useSession } from "@/lib/session";
import { readStoredSession } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

// Rutas del panel restringidas a ADMIN (el backend refuerza las mutaciones).
const ADMIN_ONLY = ["/users", "/settings", "/audit"];

// Ruta → módulo que el tenant debe tener comprado (backend: MODULE_*).
// Las rutas admin-core (stores/users/settings/audit) no llevan módulo.
const MODULE_REQUIRED: [prefix: string, module: string][] = [
  ["/dashboard", "REPORTS"],
  ["/categories", "CATALOG"],
  ["/products", "CATALOG"],
  ["/pos", "POS"],
  ["/kitchen", "KDS"],
  ["/orders", "POS"],
];

export function PanelGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const liveSession = useSession();
  const [allowed, setAllowed] = useState(false);

  // Diferido tras montar (localStorage no existe en SSR) y reactivo a cambios
  // en caliente de `session.modules` para expulsar de la ruta al instante.
  useEffect(() => {
    const id = setTimeout(() => {
      const session = liveSession ?? readStoredSession();
      if (!session || isSessionExpired(session)) {
        setAllowed(false);
        router.replace("/");
        return;
      }
      if (
        session.role !== "ADMIN" &&
        ADMIN_ONLY.some((p) => pathname.startsWith(p))
      ) {
        setAllowed(false);
        router.replace(homePath(session));
        return;
      }
      const required = MODULE_REQUIRED.find(([p]) =>
        pathname.startsWith(p),
      )?.[1];
      if (required && !hasModule(session, required)) {
        setAllowed(false);
        router.replace(homePath(session));
        return;
      }
      setAllowed(true);
    }, 0);
    return () => clearTimeout(id);
  }, [pathname, router, liveSession]);

  return allowed ? children : null;
}
