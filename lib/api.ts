import {
  SESSION_EXPIRED_EVENT,
  clearSession,
  getSession,
  isSessionExpired,
} from "./session";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSession()?.token;
  // FormData (uploads) lleva su propio Content-Type con boundary
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    const session = getSession();
    if (
      (res.status === 401 || res.status === 403) &&
      session &&
      isSessionExpired(session) &&
      typeof window !== "undefined"
    ) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
