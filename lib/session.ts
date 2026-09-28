"use client";

import { useSyncExternalStore } from "react";

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE" | "CUSTOMER";

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
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  EMPLOYEE: "Empleado",
  CUSTOMER: "Cliente",
};

const KEY = "store.session";

export function saveSession(session: AuthResponse) {
  localStorage.setItem(KEY, JSON.stringify(session));
  sessionCache = session;
}

export function clearSession() {
  localStorage.removeItem(KEY);
  sessionCache = null;
}

function readSession(): AuthResponse | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

let sessionCache: AuthResponse | null | undefined;
function getSession(): AuthResponse | null {
  if (sessionCache === undefined) sessionCache = readSession();
  return sessionCache;
}

export function useSession() {
  return useSyncExternalStore(
    () => () => {},
    getSession,
    () => null,
  );
}
