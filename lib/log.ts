import { getStore } from "./store";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const MAX_CRUMBS = 40;

type Crumb = { at: string; type: string; msg: string };
const crumbs: Crumb[] = [];
const lastSent = new Map<string, number>();

/** Id por request — viaja como X-Request-Id y aparece en el log del back.
 *  Sin crypto.randomUUID: no existe en http:// por IP (terminales en LAN). */
export function newRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Enmascara valores de *password*, *token*, *secret* (mismo criterio que el back). */
export function redact(body: unknown): string | undefined {
  if (typeof body !== "string") return body == null ? undefined : `[${typeof body}]`;
  return body
    .replace(/("[^"]*(?:password|token|secret)[^"]*"\s*:\s*)"(?:[^"\\]|\\.)*"/gi, '$1"***"')
    .slice(0, 4000);
}

/** Rastro de lo que hizo el usuario — viaja adjunto en cada warn/error. */
export function breadcrumb(type: string, msg: string) {
  const short = msg.slice(0, 200);
  const last = crumbs.at(-1);
  if (last?.type === type && last.msg === short) return; // polling repetido
  crumbs.push({ at: new Date().toISOString(), type, msg: short });
  if (crumbs.length > MAX_CRUMBS) crumbs.shift();
}

/** Manda un evento a POST /api/logs. Nunca lanza. */
export function report(
  level: "info" | "warn" | "error",
  type: string,
  message: string,
  data?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  const key = `${type}|${message}`;
  const now = Date.now();
  if (level !== "info" && now - (lastSent.get(key) ?? 0) < 10_000) return;
  lastSent.set(key, now);
  const s = getStore().getState().session.value;
  const payload = {
    level,
    type,
    message: message.slice(0, 1000),
    url: location.pathname + location.search,
    at: new Date().toISOString(),
    user: s && {
      id: s.userId,
      email: s.email,
      role: s.role,
      clientId: s.clientId,
      storeId: s.storeId,
    },
    device: {
      ua: navigator.userAgent,
      viewport: `${innerWidth}x${innerHeight}`,
      online: navigator.onLine,
      lang: navigator.language,
    },
    data,
    breadcrumbs: level === "info" ? undefined : [...crumbs],
  };
  breadcrumb(type, message);
  fetch(`${BASE}/api/logs`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
