import { describe, expect, it } from "vitest";
import { brandCss } from "./branding";

describe("brandCss", () => {
  it("null o marca sin colores → null", () => {
    expect(brandCss(null)).toBeNull();
    expect(brandCss({})).toBeNull();
    expect(brandCss({ primaryColor: null })).toBeNull();
  });

  it("color primario genera familia + variante nocturna", () => {
    const css = brandCss({ primaryColor: "#c8431f" })!;
    expect(css).toContain("--color-primary:#c8431f");
    expect(css).toContain("--color-primary-hover:#");
    expect(css).toContain("--color-primary-light:#");
    expect(css).toContain(".store-brand{");
    expect(css).toContain(".dark .store-brand{");
  });

  it("canvas genera superficie y textos; acento genera secundarios", () => {
    const css = brandCss({
      canvasColor: "#f5ede3",
      accentColor: "#2f74d6",
    })!;
    expect(css).toContain("--color-canvas:#f5ede3");
    expect(css).toContain("--color-secondary:#2f74d6");
    expect(css).toContain("--color-text-primary:#");
    expect(css).toContain("--color-border:#");
  });
});
