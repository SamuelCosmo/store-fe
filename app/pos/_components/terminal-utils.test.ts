import { describe, expect, it } from "vitest";
import type { ProductDto } from "@/app/(panel)/products/_components/ProductsView";
import type { ExtraDto } from "@/app/(panel)/products/_components/ExtrasSection";
import type { SizeDto } from "@/app/(panel)/products/_components/SizesSection";
import type { ItemSelection } from "./ExtrasModal";
import {
  lineCents,
  lineNote,
  lineUnit,
  taxCents,
  toCents,
  type CartItem,
} from "./terminal-utils";

const product = (price: number, over: Partial<ProductDto> = {}): ProductDto => ({
  id: 1,
  categoryId: 1,
  name: "Ramen",
  description: null,
  sku: null,
  image: null,
  price,
  active: true,
  soldOut: false,
  tokenCost: 0,
  extras: [],
  sizes: [],
  ...over,
});

const size = (price: number): SizeDto => ({
  id: 1,
  name: "Grande",
  price,
  active: true,
  productIds: [],
});

const extra = (price: number, name = "Extra"): ExtraDto => ({
  id: 1,
  name,
  price,
  active: true,
  productIds: [],
});

const item = (
  price: number,
  selection: Partial<ItemSelection> = {},
): CartItem => ({
  id: 1,
  product: product(price),
  selection: { size: null, extras: [], notes: "", ...selection },
});

describe("toCents", () => {
  it("convierte a centavos enteros evitando floats", () => {
    expect(toCents(10.5)).toBe(1050);
    expect(toCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004 → 30
    expect(toCents(19.995)).toBe(2000); // float 1999.4999… → HALF_UP visual
  });
});

describe("lineCents / lineUnit", () => {
  it("suma base + tamaño + extras con cantidad", () => {
    const i = item(100, {
      size: size(20),
      extras: [
        { extra: extra(15), quantity: 2 },
        { extra: extra(5), quantity: 1 },
      ],
    });
    expect(lineCents(i)).toBe(10000 + 2000 + 3000 + 500);
    expect(lineUnit(i)).toBe(155);
  });

  it("línea simple = solo el precio del producto", () => {
    expect(lineCents(item(42.5))).toBe(4250);
  });
});

describe("taxCents", () => {
  it("aplica la tasa sobre el subtotal con HALF_UP a centavos", () => {
    expect(taxCents(10000, 16)).toBe(1600);
    // 33.33 × 16% = 5.3328 → $5.33
    expect(taxCents(3333, 16)).toBe(533);
  });

  it("redondea medio centavo hacia arriba (HALF_UP como BigDecimal)", () => {
    // 100.01 × 8% = 8.0008 → $8.00 exacto; caso al límite:
    // 10.03 × 16% = 1.6048 → $1.60
    expect(taxCents(1003, 16)).toBe(160);
    // 10.31 × 16% = 1.6496 → $1.65
    expect(taxCents(1031, 16)).toBe(165);
  });

  it("tasa 0 devuelve 0", () => {
    expect(taxCents(12345, 0)).toBe(0);
  });
});

describe("lineNote", () => {
  it("junta tamaño, extras con cantidad y notas", () => {
    const i = item(100, {
      size: size(0),
      extras: [
        { extra: extra(5, "Naruto"), quantity: 2 },
        { extra: extra(3, "Ajitama"), quantity: 1 },
      ],
      notes: "sin cebolla",
    });
    expect(lineNote(i)).toBe("Grande · 2× Naruto · Ajitama · sin cebolla");
  });

  it("sin selección devuelve cadena vacía", () => {
    expect(lineNote(item(100))).toBe("");
  });
});
