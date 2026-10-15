import { translateNow, type TKey } from "./i18n";
import {
  SESSION_EXPIRED_EVENT,
  clearSession,
  getSession,
} from "./session";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Fallback cuando el server no manda `message` — nadie entiende "Error 403"
const STATUS_KEYS: Record<number, TKey> = {
  400: "api.badRequest",
  401: "api.expired",
  403: "api.forbidden",
  404: "api.notFound",
  500: "api.server",
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData (uploads) lleva su propio Content-Type con boundary
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include", // el JWT viaja en cookie httpOnly
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = STATUS_KEYS[res.status]
      ? translateNow(STATUS_KEYS[res.status])
      : `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    // 401 = cookie expirada/ausente → sesión local obsoleta. 403 = autenticado
    // pero sin permiso (rol/módulo) → la sesión sigue viva, no se cierra.
    if (res.status === 401 && getSession() && typeof window !== "undefined") {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Cierra sesión: metadata local + cookie httpOnly (solo el server la expira). */
export function logoutSession() {
  clearSession();
  api("/api/auth/logout", { method: "POST" }).catch(() => {
    /* la cookie expira sola si el server no contesta */
  });
}
