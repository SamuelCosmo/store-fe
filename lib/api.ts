import { hasKey, translateNow, type TKey, type TParams } from "./i18n";
import { breadcrumb, newRequestId, redact, report } from "./log";
import {
  SESSION_EXPIRED_EVENT,
  clearSession,
  getSession,
} from "./session";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Mensaje genérico por status cuando el error no trae un `code` conocido
const STATUS_KEYS: Record<number, TKey> = {
  400: "api.badRequest",
  401: "api.expired",
  403: "api.forbidden",
  404: "api.notFound",
  409: "api.badRequest",
  500: "api.server",
};

/** Error de la API — `message` ya viene traducido para el usuario; `code`
 *  es el del backend (ErrorResponse.code) para decidir en el código. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
  }
}

/** Texto para el usuario a partir del body de error del backend: el
 *  `code` se traduce con `err.<CODE>` (params como variables); sin
 *  traducción → genérico del status. Nunca muestra el `message` técnico. */
export function apiErrorMessage(
  status: number,
  body: { code?: string | null; params?: TParams | null } | null,
): string {
  const key = body?.code ? `err.${body.code}` : "";
  if (hasKey(key)) return translateNow(key, body?.params ?? undefined);
  return translateNow(STATUS_KEYS[status] ?? (status >= 500 ? "api.server" : "api.badRequest"));
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData (uploads) lleva su propio Content-Type con boundary
  const isForm = init?.body instanceof FormData;
  const token = getSession()?.token;
  const method = init?.method ?? "GET";
  // mismo id en el log del back → el "código para soporte" del toast lo encuentra
  const requestId = newRequestId();
  const ref = ` (${translateNow("api.supportCode", { code: requestId })})`;
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
    throw new ApiError(translateNow("api.network") + ref, 0, null);
  }
  breadcrumb("api", `${method} ${path} ${res.status}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const code: string | null = body?.code ?? null;
    const message = apiErrorMessage(res.status, body);
    // el log guarda el mensaje técnico del back (en inglés) para soporte
    report(res.status >= 500 ? "error" : "warn", "api.error",
      `${method} ${path} -> ${res.status} ${code ?? ""}: ${body?.message ?? ""}`,
      { requestId, status: res.status, code, ms: Date.now() - started });
    // 401 = token expirado/revocado → sesión local obsoleta. Excepción:
    // INVALID_CREDENTIALS es una contraseña mal tecleada al re-confirmar —
    // la sesión sigue viva. 403 = sin permiso, tampoco cierra sesión.
    if (res.status === 401 && code !== "INVALID_CREDENTIALS"
        && getSession() && typeof window !== "undefined") {
      report("info", "session.expired", "401 from API");
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(res.status >= 500 ? message + ref : message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Cierra sesión local — auth es Bearer: sin token no hay sesión. */
export function logoutSession() {
  report("info", "session.logout", "user logout");
  clearSession();
}
