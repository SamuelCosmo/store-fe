"use client";

import { useSelector } from "react-redux";
import { clearSession as clearSessionAction, getStore, setSession } from "./store";

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE" | "CUSTOMER" | "KITCHEN";

export type AuthResponse = {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: Role;
  clientId: number;
  storeId: number | null;
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  EMPLOYEE: "/pos",
  CUSTOMER: "/kiosk",
  KITCHEN: "/kitchen",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
  CUSTOMER: "Cliente",
  KITCHEN: "Cocina",
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
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
