import { getSession } from "./session";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getSession()?.token;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
