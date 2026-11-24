import { describe, expect, it } from "vitest";
import { PASSWORD_RULES } from "./password";

const pass = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

describe("PASSWORD_RULES", () => {
  it("exige 8+ con mayúscula, minúscula y dígito (mismo criterio del back)", () => {
    expect(pass("Super123")).toBe(true);
    expect(pass("super123")).toBe(false); // sin mayúscula
    expect(pass("SUPER123")).toBe(false); // sin minúscula
    expect(pass("SuperPass")).toBe(false); // sin dígito
    expect(pass("Sup12")).toBe(false); // < 8
    expect(pass("")).toBe(false);
  });
});
