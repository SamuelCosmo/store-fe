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
  token: string;
  userId: number;
  name: string;
  email: string;
  role: Role;
  // null solo para SUPERADMIN (cuenta de plataforma, sin tenant)
  clientId: number | null;
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

export function saveSession(session: AuthResponse) {
  getStore().dispatch(setSession(session));
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
  try {
    const payload = JSON.parse(atob(session.token.split(".")[1]));
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
      return true;
    }
    // Cierre por rol según settings: horas desde el `iat` del JWT (0 = sin límite).
    // ponytail: solo client-side — el JWT sigue válido hasta `exp`; TTL real por rol pendiente en backend
    const hours = getSettings().session.hours[session.role] ?? 0;
    return (
      hours > 0 &&
      typeof payload.iat === "number" &&
      Date.now() - payload.iat * 1000 > hours * 3_600_000
    );
  } catch {
    return true;
  }
}
