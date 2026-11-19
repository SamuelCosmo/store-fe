"use client";

import { useSelector } from "react-redux";
import { report } from "./log";
import { getSettings } from "./settings";
import { clearSession as clearSessionAction, getStore, setSession } from "./store";

export type Role =
  | "ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "CUSTOMER"
  | "KITCHEN"
  | "SUPERADMIN";

export type AuthResponse = {
  token: string;
  /** Marca local del login para el TTL por rol. */
  loginAt: number;
  userId: number;
  name: string;
  email: string;
  role: Role;
  // null solo para SUPERADMIN (cuenta de plataforma, sin tenant)
  clientId: number | null;
  // branding del tenant — null para SUPERADMIN
  clientName?: string | null;
  clientLogoUrl?: string | null;
  storeId: number | null;
  /** Módulos efectivos del usuario (backend) — el front oculta pantallas. */
  modules?: string[];
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  EMPLOYEE: "/pos",
  CUSTOMER: "/kiosk",
  KITCHEN: "/kitchen",
  SUPERADMIN: "/superadmin",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
  CUSTOMER: "Cliente",
  KITCHEN: "Cocina",
  SUPERADMIN: "Plataforma",
};

export function saveSession(
  session: Omit<AuthResponse, "loginAt"> & { loginAt?: number },
) {
  const isLogin = !getSession();
  getStore().dispatch(setSession({ ...session, loginAt: session.loginAt ?? Date.now() }));
  if (isLogin) report("info", "session.login", `${session.role} login`);
}

export function clearSession() {
  getStore().dispatch(clearSessionAction());
}

export function getSession(): AuthResponse | null {
  return getStore().getState().session.value;
}

export function useSession() {
  return useSelector((s: { session: { value: AuthResponse | null } }) => s.session.value);
}

export const SESSION_EXPIRED_EVENT = "store:session-expired";

export function isSessionExpired(session: AuthResponse): boolean {
  // Sesiones de la era-cookie (sin token) o viejas (sin loginAt) → migración.
  if (!session.token || typeof session.loginAt !== "number") return true;
  // Cierre por rol según settings: horas desde el login (0 = sin límite).
  // El backend aplica el mismo TTL sobre el `iat` del JWT (401 al vencer);
  // esto solo evita mostrar pantallas con una sesión ya muerta.
  const hours = getSettings().session.hours[session.role] ?? 0;
  return hours > 0 && Date.now() - session.loginAt > hours * 3_600_000;
}

export function hasModule(
  session: AuthResponse | null | undefined,
  mod: string,
): boolean {
  if (!session) return false;
  // modules undefined = sesión previa al feature → no restringir (backend manda)
  return session.modules === undefined || session.modules.includes(mod);
}

/** Actualiza `session.modules` solo si cambió (evita re-renders en cascada). */
export function syncSessionModules(modules: string[]) {
  const session = getSession();
  if (!session || session.role === "SUPERADMIN") return;
  const prev = session.modules;
  if (
    prev &&
    prev.length === modules.length &&
    prev.every((m, i) => m === modules[i])
  ) {
    return;
  }
  getStore().dispatch(setSession({ ...session, modules }));
}

/** Home del usuario según rol + módulos efectivos — evita mandar a una
 *  pantalla cuyo módulo el tenant no compró. */
export function homePath(session: AuthResponse): string {
  const has = (m: string) => hasModule(session, m);
  switch (session.role) {
    case "SUPERADMIN":
      return "/superadmin";
    case "KITCHEN":
      return has("KDS") ? "/kitchen" : "/";
    case "CUSTOMER":
      return has("KIOSK") ? "/kiosk" : "/";
    case "EMPLOYEE":
      if (has("POS")) return "/pos";
      if (has("KDS")) return "/kitchen";
      if (has("CATALOG")) return "/products";
      return "/stores";
    default: {
      // ADMIN / MANAGER — dashboard si hay REPORTS, si no la primera útil
      if (has("REPORTS")) return "/dashboard";
      if (has("POS")) return "/pos";
      if (has("CATALOG")) return "/products";
      if (has("KDS")) return "/kitchen";
      return "/stores";
    }
  }
}
