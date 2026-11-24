import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_CHANGED_EVENT,
  getSettings,
  isAutoPrint,
  saveSettings,
  setAutoPrint,
} from "./settings";

describe("getSettings", () => {
  beforeEach(() => localStorage.clear());

  it("localStorage vacío → defaults", () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("mezcla lo guardado sobre los defaults (por sección)", () => {
    localStorage.setItem(
      "store.settings",
      JSON.stringify({ currency: "USD", taxRate: 8 }),
    );
    const s = getSettings();
    expect(s.currency).toBe("USD");
    expect(s.taxRate).toBe(8);
    // lo demás conserva defaults
    expect(s.kitchen).toEqual(DEFAULT_SETTINGS.kitchen);
    expect(s.session.hours.EMPLOYEE).toBe(8);
  });

  it("JSON corrupto → defaults sin lanzar", () => {
    localStorage.setItem("store.settings", "{invalid");
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("saveSettings", () => {
  beforeEach(() => localStorage.clear());

  it("persiste y dispara el evento de cambio", () => {
    let fired = 0;
    window.addEventListener(SETTINGS_CHANGED_EVENT, () => fired++);
    const next = { ...DEFAULT_SETTINGS, currency: "USD" };
    saveSettings(next);
    expect(JSON.parse(localStorage.getItem("store.settings")!)).toEqual(next);
    expect(fired).toBe(1);
    // mismo contenido → no re-dispara
    saveSettings(next);
    expect(fired).toBe(1);
  });
});

describe("auto-print flag", () => {
  beforeEach(() => localStorage.clear());

  it("default apagado; setAutoPrint persiste", () => {
    expect(isAutoPrint()).toBe(false);
    setAutoPrint(true);
    expect(isAutoPrint()).toBe(true);
    setAutoPrint(false);
    expect(isAutoPrint()).toBe(false);
  });
});
