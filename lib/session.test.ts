import { beforeEach, describe, expect, it } from "vitest";
import { hasModule, homePath, isSessionExpired, type AuthResponse } from "./session";

const session = (
  role: AuthResponse["role"],
  over: Partial<AuthResponse> = {},
): AuthResponse => ({
  token: "t",
  loginAt: Date.now(),
  userId: 1,
  name: "Ana",
  email: "ana@test.com",
  role,
  clientId: 1,
  storeId: 1,
  modules: ["POS", "KDS", "CATALOG"],
  ...over,
});

describe("hasModule", () => {
  it("false sin sesión", () => {
    expect(hasModule(null, "POS")).toBe(false);
    expect(hasModule(undefined, "POS")).toBe(false);
  });

  it("true solo si el módulo está en la lista efectiva", () => {
    const s = session("EMPLOYEE");
    expect(hasModule(s, "POS")).toBe(true);
    expect(hasModule(s, "TOKENS")).toBe(false);
  });

  it("modules undefined = sesión previa al feature → no restringe", () => {
    const s = session("EMPLOYEE", { modules: undefined });
    expect(hasModule(s, "ANYTHING")).toBe(true);
  });

  it("modules vacío restringe todo", () => {
    const s = session("EMPLOYEE", { modules: [] });
    expect(hasModule(s, "POS")).toBe(false);
  });
});

describe("homePath", () => {
  it("SUPERADMIN siempre a /superadmin", () => {
    expect(homePath(session("SUPERADMIN", { modules: [] }))).toBe("/superadmin");
  });

  it("KITCHEN con KDS → /kitchen; sin KDS → /", () => {
    expect(homePath(session("KITCHEN"))).toBe("/kitchen");
    expect(homePath(session("KITCHEN", { modules: ["POS"] }))).toBe("/");
  });

  it("CUSTOMER con KIOSK → /kiosk; sin KIOSK → /", () => {
    expect(homePath(session("CUSTOMER", { modules: ["KIOSK"] }))).toBe("/kiosk");
    expect(homePath(session("CUSTOMER", { modules: ["POS"] }))).toBe("/");
  });

  it("EMPLOYEE cae por prioridad POS → KDS → CATALOG → /stores", () => {
    expect(homePath(session("EMPLOYEE"))).toBe("/pos");
    expect(homePath(session("EMPLOYEE", { modules: ["KDS"] }))).toBe("/kitchen");
    expect(homePath(session("EMPLOYEE", { modules: ["CATALOG"] }))).toBe("/products");
    expect(homePath(session("EMPLOYEE", { modules: [] }))).toBe("/stores");
  });

  it("ADMIN con REPORTS → /dashboard; sin REPORTS sigue la cadena", () => {
    expect(homePath(session("ADMIN", { modules: ["REPORTS"] }))).toBe("/dashboard");
    expect(homePath(session("ADMIN", { modules: ["POS"] }))).toBe("/pos");
    expect(homePath(session("MANAGER", { modules: [] }))).toBe("/stores");
  });
});

describe("isSessionExpired", () => {
  beforeEach(() => localStorage.clear());

  it("sesión sin token o sin loginAt se considera expirada", () => {
    expect(isSessionExpired(session("ADMIN", { token: "" }))).toBe(true);
    expect(
      isSessionExpired(
        session("ADMIN", { loginAt: undefined as unknown as number }),
      ),
    ).toBe(true);
  });

  it("expira cuando pasan las horas del rol (EMPLOYEE default 8h)", () => {
    const fresh = session("EMPLOYEE");
    expect(isSessionExpired(fresh)).toBe(false);
    const old = session("EMPLOYEE", { loginAt: Date.now() - 9 * 3_600_000 });
    expect(isSessionExpired(old)).toBe(true);
  });

  it("horas=0 en settings → sin límite local", () => {
    localStorage.setItem(
      "store.settings",
      JSON.stringify({ session: { hours: { EMPLOYEE: 0 } } }),
    );
    const old = session("EMPLOYEE", { loginAt: Date.now() - 999 * 3_600_000 });
    expect(isSessionExpired(old)).toBe(false);
  });
});
