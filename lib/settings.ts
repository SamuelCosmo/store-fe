"use client";

import { api } from "./api";
import type { Role } from "./session";
import { getStore, setSession } from "./store";

// Settings sincronizados con el backend y cacheados en localStorage (el
// cache da lectura sync a isSessionExpired y a las terminales).
// Por establecimiento: general + kitchen. Por cliente: lo demás.
export type StoreSettings = {
  general: { menuName: string };
  kitchen: { okMin: number; warnMin: number; sound: boolean };
  currency: string;
  taxRate: number;
  // precio de venta de una ficha — 0 = el tenant no vende fichas
  tokenPrice: number;
  kiosk: { receiptSeconds: number };
  session: { hours: Record<Role, number> };
};

export type ClientSettingsDto = {
  name: string;
  logoUrl: string | null;
  currency: string;
  taxRate: number;
  tokenPrice: number;
  kioskReceiptSeconds: number;
  sessionHours: Partial<Record<Role, number>>;
};

export type StoreSettingsDto = {
  menuName: string;
  kitchenOkMin: number;
  kitchenWarnMin: number;
  kitchenSound: boolean;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  general: { menuName: "KOFI RAMEN" },
  kitchen: { okMin: 8, warnMin: 15, sound: true },
  currency: "MXN",
  taxRate: 0,
  tokenPrice: 0,
  kiosk: { receiptSeconds: 10 },
  session: {
    hours: {
      ADMIN: 12,
      MANAGER: 12,
      EMPLOYEE: 8,
      KITCHEN: 12,
      CUSTOMER: 24,
      SUPERADMIN: 12,
    },
  },
};

export const SETTINGS_CHANGED_EVENT = "store:settings-changed";

const KEY = "store.settings";

export function getSettings(): StoreSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as
      | Partial<StoreSettings>
      | null;
    return {
      general: { ...DEFAULT_SETTINGS.general, ...stored?.general },
      kitchen: { ...DEFAULT_SETTINGS.kitchen, ...stored?.kitchen },
      currency: stored?.currency ?? DEFAULT_SETTINGS.currency,
      taxRate: stored?.taxRate ?? DEFAULT_SETTINGS.taxRate,
      tokenPrice: stored?.tokenPrice ?? DEFAULT_SETTINGS.tokenPrice,
      kiosk: { ...DEFAULT_SETTINGS.kiosk, ...stored?.kiosk },
      session: {
        hours: {
          ...DEFAULT_SETTINGS.session.hours,
          ...stored?.session?.hours,
        },
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: StoreSettings) {
  const next = JSON.stringify(settings);
  if (localStorage.getItem(KEY) === next) return;
  localStorage.setItem(KEY, next);
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

/** Trae settings del backend (cliente + establecimiento) y actualiza el cache. */
export async function refreshSettings(
  clientId: number,
  storeId: number | null,
): Promise<StoreSettings> {
  const client = await api<ClientSettingsDto>(
    `/api/clients/${clientId}/settings`,
  );
  // Marca del tenant → parchea la sesión para que terminales y sidebar la
  // vean sin re-login (setSession escribe localStorage → evento `storage`
  // la propaga al instante a otras pestañas del mismo navegador).
  const session = getStore().getState().session.value;
  if (
    session &&
    (session.clientName !== client.name ||
      session.clientLogoUrl !== client.logoUrl)
  ) {
    getStore().dispatch(
      setSession({
        ...session,
        clientName: client.name,
        clientLogoUrl: client.logoUrl,
      }),
    );
  }
  const settings: StoreSettings = {
    general: { ...DEFAULT_SETTINGS.general },
    kitchen: { ...DEFAULT_SETTINGS.kitchen },
    currency: client.currency,
    taxRate: Number(client.taxRate),
    tokenPrice: Number(client.tokenPrice ?? 0),
    kiosk: { receiptSeconds: client.kioskReceiptSeconds },
    session: {
      hours: { ...DEFAULT_SETTINGS.session.hours, ...client.sessionHours },
    },
  };
  if (storeId != null) {
    const store = await api<StoreSettingsDto>(
      `/api/stores/${storeId}/settings`,
    );
    settings.general = { menuName: store.menuName };
    settings.kitchen = {
      okMin: store.kitchenOkMin,
      warnMin: store.kitchenWarnMin,
      sound: store.kitchenSound,
    };
  }
  saveSettings(settings);
  return settings;
}

// Auto-impresión del ticket al cobrar — flag por EQUIPO, separado de
// `store.settings`: la impresora es hardware de la terminal, no config del
// tenant, y refreshSettings reemplaza ese objeto completo.
const AUTO_PRINT_KEY = "store.print.auto";

export function isAutoPrint(): boolean {
  return (
    typeof window !== "undefined" &&
    localStorage.getItem(AUTO_PRINT_KEY) === "1"
  );
}

export function setAutoPrint(on: boolean) {
  localStorage.setItem(AUTO_PRINT_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}
