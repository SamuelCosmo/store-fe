"use client";

import { useSelector } from "react-redux";
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
  /** Marca local del login para el TTL por rol — el JWT real viaja en la
   *  cookie httpOnly y nunca es legible desde JS. */
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
  getStore().dispatch(setSession({ ...session, loginAt: session.loginAt ?? Date.now() }));
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
  // Sesiones pre-cookie (sin loginAt) cuentan como expiradas → migración.
  if (typeof session.loginAt !== "number") return true;
  // Cierre por rol según settings: horas desde el login (0 = sin límite).
  // ponytail: solo client-side — el JWT de la cookie sigue válido hasta `exp`;
  // TTL real por rol pendiente en backend
  const hours = getSettings().session.hours[session.role] ?? 0;
  return hours > 0 && Date.now() - session.loginAt > hours * 3_600_000;
}
