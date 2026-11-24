import { describe, expect, it } from "vitest";
import { newRequestId, redact } from "./log";

describe("newRequestId", () => {
  it("genera ids únicos y base36", () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-z]+$/);
  });
});

describe("redact", () => {
  it("enmascara password/token/secret en JSON", () => {
    const body = JSON.stringify({
      email: "a@b.com",
      password: "SuperSecret1",
      superadminPassword: "x",
      token: "jwt-token",
    });
    const out = redact(body)!;
    expect(out).toContain('"password":"***"');
    expect(out).toContain('"superadminPassword":"***"');
    expect(out).toContain('"token":"***"');
    expect(out).toContain("a@b.com");
    expect(out).not.toContain("SuperSecret1");
    expect(out).not.toContain("jwt-token");
  });

  it("trunca bodies largos a 4000 chars", () => {
    const out = redact(`{"data":"${"x".repeat(5000)}"}`)!;
    expect(out.length).toBe(4000);
  });

  it("no-string pasa como tipo, null como undefined", () => {
    expect(redact(null)).toBeUndefined();
    expect(redact(42)).toBe("[number]");
    expect(redact({ a: 1 })).toBe("[object]");
  });
});
