import { translateNow, type TKey } from "./i18n";
import { breadcrumb, newRequestId, redact, report } from "./log";
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
  const token = getSession()?.token;
  const method = init?.method ?? "GET";
  // mismo id en el log del back → el "ref" del toast lo encuentra
  const requestId = newRequestId();
  const ref = ` · ref ${requestId}`;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Request-Id": requestId,
        ...init?.headers,
      },
    });
  } catch (e) {
    // sin respuesta (back caído, sin red, CORS) — el back nunca lo vio:
    // el body del formulario solo queda en este reporte
    report("error", "api.network", `${method} ${path}`, {
      requestId,
      error: String(e),
      body: redact(init?.body),
    });
    throw new Error(translateNow("api.network") + ref);
  }
  breadcrumb("api", `${method} ${path} ${res.status}`);
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
    report(res.status >= 500 ? "error" : "warn", "api.error",
      `${method} ${path} -> ${res.status}: ${message}`,
      { requestId, status: res.status, ms: Date.now() - started });
    // 401 = token expirado/ausente → sesión local obsoleta. 403 = autenticado
    // pero sin permiso (rol/módulo) → la sesión sigue viva, no se cierra.
    if (res.status === 401 && getSession() && typeof window !== "undefined") {
      report("info", "session.expired", "401 from API");
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(res.status >= 500 ? message + ref : message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Cierra sesión local y le avisa al server para que expire cualquier
 *  cookie store_token que una versión previa haya podido dejar. */
export function logoutSession() {
  report("info", "session.logout", "user logout");
  clearSession();
  api("/api/auth/logout", { method: "POST" }).catch(() => {});
}
