// Marca por establecimiento: 3 colores opcionales (#rrggbb) y la variante
// nocturna se deriva sola — el admin solo configura el tema de día.
// brandCss() genera las reglas que sobreescriben los tokens de globals.css
// dentro de .store-brand (solo las terminales la usan, nunca el panel).
export type BrandColors = {
  primaryColor?: string | null;
  accentColor?: string | null;
  canvasColor?: string | null;
};

export type StoreBrand = BrandColors & {
  name?: string | null;
  logoUrl?: string | null;
};

function toHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function toHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const p = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

// Mismo matiz, otra luminosidad — así un color define toda su familia
// (hover/light) y su equivalente de noche sin que el admin pique nada más.
const shade = (hex: string, l: number, s?: number) => {
  const [h, sat] = toHsl(hex);
  return toHex(h, s ?? sat, Math.min(0.97, Math.max(0.03, l)));
};

/** CSS para un bloque .store-brand: paleta de día y la derivada de noche. */
export function brandCss(brand: BrandColors | null | undefined): string | null {
  if (!brand) return null;
  const light: string[] = [];
  const dark: string[] = [];
  if (brand.primaryColor) {
    const pl = toHsl(brand.primaryColor)[2];
    light.push(
      `--color-primary:${brand.primaryColor}`,
      `--color-primary-hover:${shade(brand.primaryColor, pl - 0.1)}`,
      `--color-primary-light:${shade(brand.primaryColor, 0.94, 0.4)}`,
    );
    // de noche el primario se aclara para conservar el contraste
    dark.push(
      `--color-primary:${shade(brand.primaryColor, Math.max(pl + 0.18, 0.55))}`,
      `--color-primary-hover:${shade(brand.primaryColor, Math.max(pl + 0.28, 0.65))}`,
      `--color-primary-light:${shade(brand.primaryColor, 0.2, 0.45)}`,
    );
  }
  if (brand.accentColor) {
    const al = toHsl(brand.accentColor)[2];
    light.push(
      `--color-secondary:${brand.accentColor}`,
      `--color-secondary-dark:${shade(brand.accentColor, al - 0.12)}`,
      `--color-secondary-light:${shade(brand.accentColor, 0.9, 0.5)}`,
    );
    dark.push(
      `--color-secondary:${shade(brand.accentColor, Math.max(al + 0.15, 0.6))}`,
      `--color-secondary-dark:${shade(brand.accentColor, Math.max(al + 0.25, 0.7))}`,
      `--color-secondary-light:${shade(brand.accentColor, 0.22, 0.4)}`,
    );
  }
  if (brand.canvasColor) {
    const [h, s, l] = toHsl(brand.canvasColor);
    // fondo oscuro en modo día → texto claro; fondo claro → texto oscuro
    const darkCanvas = l < 0.55;
    const ink = (lt: number, sf: number) =>
      toHex(h, Math.min(s, sf), darkCanvas ? lt : 1 - lt);
    light.push(
      `color:${ink(0.93, 0.15)}`,
      `--color-canvas:${brand.canvasColor}`,
      `--color-background:${toHex(h, s * 0.5, Math.min(0.99, l + 0.04))}`,
      `--color-surface:${toHex(h, s * 0.6, Math.max(0.02, l - 0.015))}`,
      `--color-surface-warm:${toHex(h, s * 0.7, Math.max(0.02, l - 0.04))}`,
      `--color-text-primary:${ink(0.93, 0.15)}`,
      `--color-text-secondary:${ink(0.66, 0.12)}`,
      `--color-text-muted:${ink(0.5, 0.1)}`,
      `--color-border:${toHex(h, Math.min(s, 0.35), darkCanvas ? Math.min(0.4, l + 0.14) : Math.max(0.6, l - 0.12))}`,
    );
    // la noche siempre es oscura aunque el fondo elegido sea claro
    dark.push(
      `color:${toHex(h, Math.min(s, 0.15), 0.93)}`,
      `--color-canvas:${toHex(h, Math.min(s, 0.25), 0.09)}`,
      `--color-background:${toHex(h, Math.min(s, 0.25), 0.12)}`,
      `--color-surface:${toHex(h, Math.min(s, 0.28), 0.16)}`,
      `--color-surface-warm:${toHex(h, Math.min(s, 0.3), 0.2)}`,
      `--color-text-primary:${toHex(h, Math.min(s, 0.15), 0.93)}`,
      `--color-text-secondary:${toHex(h, Math.min(s, 0.12), 0.68)}`,
      `--color-text-muted:${toHex(h, Math.min(s, 0.1), 0.5)}`,
      `--color-border:${toHex(h, Math.min(s, 0.22), 0.25)}`,
    );
  }
  if (light.length === 0) return null;
  return `.store-brand{${light.join(";")}}.dark .store-brand{${dark.join(";")}}`;
}
