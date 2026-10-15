"use client";

import { PageHeader } from "@/components/molecules/PageHeader";
import { api } from "@/lib/api";
import { useI18n, type Lang, type TKey } from "@/lib/i18n";
import { saveSession, useSession, type Role } from "@/lib/session";
import {
  DEFAULT_SETTINGS,
  isAutoPrint,
  refreshSettings,
  setAutoPrint,
  type ClientSettingsDto,
  type StoreSettings,
  type StoreSettingsDto,
} from "@/lib/settings";
import {
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  Coins,
  Languages,
  MonitorSmartphone,
  Palette,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-[13px] text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

const SESSION_ROLES: Role[] = [
  "ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "KITCHEN",
  "CUSTOMER",
];

const CURRENCIES = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN", "GTQ"];

type StoreOption = { id: number; name: string };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[7px]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      {children}
    </div>
  );
}

function Switch({
  on,
  onToggle,
  label,
  hint,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-text-primary">{label}</p>
        {hint && <p className="text-[10px] text-text-secondary">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
          on ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute left-[3px] top-[3px] size-4 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-[16px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2.5">
        <Icon className="size-[18px] text-text-primary" />
        <h2 className="text-base font-extrabold text-text-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function SettingsView() {
  const session = useSession();
  const { lang, setLang, t } = useI18n();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [brand, setBrand] = useState<{
    name: string;
    logoUrl: string | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // flag por equipo — no viaja al backend ni al botón Guardar
  const [printAuto, setPrintAuto] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPrintAuto(isAutoPrint()), 0);
    return () => clearTimeout(t);
  }, []);

  // Deps primitivos: saveSession crea un objeto session nuevo al guardar
  // marca — depender del objeto re-dispararía este fetch y resetearía el
  // form a defaults antes de que el de tienda pueda reponerlo.
  const clientId = session?.clientId;
  const sessionStoreId = session?.storeId;

  useEffect(() => {
    if (clientId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const [client, storeList] = await Promise.all([
          api<ClientSettingsDto>(`/api/clients/${clientId}/settings`),
          api<StoreOption[]>(`/api/clients/${clientId}/stores`),
        ]);
        if (cancelled) return;
        setStores(storeList);
        setStoreId(sessionStoreId ?? storeList[0]?.id ?? null);
        setBrand({ name: client.name, logoUrl: client.logoUrl });
        setForm({
          general: { ...DEFAULT_SETTINGS.general },
          kitchen: { ...DEFAULT_SETTINGS.kitchen },
          currency: client.currency,
          taxRate: Number(client.taxRate),
          tokenPrice: Number(client.tokenPrice ?? 0),
          kiosk: { receiptSeconds: client.kioskReceiptSeconds },
          session: {
            hours: {
              ...DEFAULT_SETTINGS.session.hours,
              ...client.sessionHours,
            },
          },
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("common.loadError"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t es estable
  }, [clientId, sessionStoreId]);

  // Los campos por establecimiento se recargan al cambiar la selección
  useEffect(() => {
    if (storeId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await api<StoreSettingsDto>(
          `/api/stores/${storeId}/settings`,
        );
        if (cancelled) return;
        setForm(
          (f) =>
            f && {
              ...f,
              general: { menuName: s.menuName },
              kitchen: {
                okMin: s.kitchenOkMin,
                warnMin: s.kitchenWarnMin,
                sound: s.kitchenSound,
              },
            },
        );
      } catch {
        /* conserva lo que haya en el form */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  async function uploadLogo(file: File) {
    if (!brand) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api<{ url: string }>("/api/uploads/brand", {
        method: "POST",
        body: fd,
      });
      setBrand({ ...brand, logoUrl: res.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.logoError"));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form || !session) return;
    setSaving(true);
    setError(null);
    // warnMin debe ser mayor que okMin
    const kitchen = {
      ...form.kitchen,
      warnMin: Math.max(form.kitchen.warnMin, form.kitchen.okMin + 1),
    };
    try {
      await api(`/api/clients/${session.clientId}/settings`, {
        method: "PUT",
        body: JSON.stringify({
          // logoUrl "" le dice al server que quite el logo
          ...(brand
            ? { name: brand.name.trim(), logoUrl: brand.logoUrl ?? "" }
            : {}),
          currency: form.currency,
          taxRate: form.taxRate,
          tokenPrice: form.tokenPrice,
          kioskReceiptSeconds: form.kiosk.receiptSeconds,
          sessionHours: form.session.hours,
        }),
      });
      if (storeId != null) {
        await api(`/api/stores/${storeId}/settings`, {
          method: "PUT",
          body: JSON.stringify({
            menuName: form.general.menuName,
            kitchenOkMin: kitchen.okMin,
            kitchenWarnMin: kitchen.warnMin,
            kitchenSound: kitchen.sound,
          }),
        });
      }
      setForm({ ...form, kitchen });
      // marca al instante en sidebar/terminales sin re-login
      if (brand) {
        saveSession({
          ...session,
          clientName: brand.name.trim(),
          clientLogoUrl: brand.logoUrl,
        });
      }
      // refresca el cache local del establecimiento de esta sesión
      if (session.clientId != null) {
        await refreshSettings(session.clientId, session.storeId).catch(() => {});
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {!form ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {t("common.loading")}
        </p>
      ) : (
        <div className="flex flex-col items-start gap-5 lg:flex-row">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
            {brand && (
              <Card icon={Palette} title={t("settings.brand")}>
                <Field label={t("settings.brandName")}>
                  <input
                    type="text"
                    value={brand.name}
                    onChange={(e) =>
                      setBrand({ ...brand, name: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label={t("settings.logo")}>
                  <input
                    id="brand-logo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLogo(f);
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor="brand-logo-upload"
                    className="flex h-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-surface text-[12px] text-text-secondary transition-colors hover:border-primary"
                  >
                    {uploading ? (
                      <span>{t("common.uploading")}</span>
                    ) : brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logoUrl}
                        alt="Logo"
                        className="max-h-20 w-auto object-contain p-2"
                      />
                    ) : (
                      <span>{t("settings.logoUpload")}</span>
                    )}
                  </label>
                  {brand.logoUrl && !uploading && (
                    <button
                      type="button"
                      onClick={() => setBrand({ ...brand, logoUrl: null })}
                      className="self-start text-[11px] text-error hover:underline"
                    >
                      {t("settings.logoRemove")}
                    </button>
                  )}
                </Field>
                <p className="text-[11px] text-text-secondary">
                  {t("settings.brandHint")}
                </p>
              </Card>
            )}

            <Card icon={ChefHat} title={t("settings.kitchen")}>
              <Field label={t("login.store")}>
                <div className="relative">
                  <select
                    value={storeId ?? ""}
                    onChange={(e) => setStoreId(Number(e.target.value))}
                    className={`${inputClass} appearance-none pr-9`}
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                  />
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("settings.okMin")}>
                  <input
                    type="number"
                    min={1}
                    value={form.kitchen.okMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        kitchen: {
                          ...form.kitchen,
                          okMin: Math.max(1, Number(e.target.value)),
                        },
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label={t("settings.warnMin")}>
                  <input
                    type="number"
                    min={1}
                    value={form.kitchen.warnMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        kitchen: {
                          ...form.kitchen,
                          warnMin: Math.max(1, Number(e.target.value)),
                        },
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
              <p className="text-[11px] text-text-secondary">
                {t("settings.kitchenHint", {
                  ok: form.kitchen.okMin,
                  warn: form.kitchen.warnMin,
                })}
              </p>
              <Switch
                on={form.kitchen.sound}
                onToggle={() =>
                  setForm({
                    ...form,
                    kitchen: { ...form.kitchen, sound: !form.kitchen.sound },
                  })
                }
                label={t("settings.soundLabel")}
                hint={t("settings.soundHint")}
              />
            </Card>

            <Card icon={Coins} title={t("settings.money")}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("settings.currency")}>
                  <div className="relative">
                    <select
                      value={form.currency}
                      onChange={(e) =>
                        setForm({ ...form, currency: e.target.value })
                      }
                      className={`${inputClass} appearance-none pr-9`}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
                    />
                  </div>
                </Field>
                <Field label={t("settings.tax")}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.taxRate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        taxRate: Math.min(
                          100,
                          Math.max(0, Number(e.target.value)),
                        ),
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label={t("settings.tokenPrice")}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.tokenPrice}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tokenPrice: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 text-[11px] text-text-secondary">
                    {t("settings.tokenPrice.hint")}
                  </p>
                </Field>
              </div>
            </Card>

            <Card icon={MonitorSmartphone} title={t("settings.terminals")}>
              <Field label={t("settings.kioskSeconds")}>
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={form.kiosk.receiptSeconds}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      kiosk: {
                        receiptSeconds: Math.min(
                          60,
                          Math.max(3, Number(e.target.value)),
                        ),
                      },
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <p className="text-[11px] text-text-secondary">
                {t("settings.kioskSeconds.hint")}
              </p>
            </Card>

            <Card icon={Printer} title={t("settings.print")}>
              <Switch
                on={printAuto}
                onToggle={() => {
                  const next = !printAuto;
                  setAutoPrint(next);
                  setPrintAuto(next);
                }}
                label={t("settings.printAuto")}
                hint={t("settings.printAuto.hint")}
              />
              <p className="text-[11px] text-text-secondary">
                {t("settings.printHint")}
              </p>
            </Card>

            <Card icon={Languages} title={t("settings.language")}>
              <div className="flex gap-2">
                {(["es", "en"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`h-10 flex-1 rounded-lg border text-sm font-semibold transition-colors ${
                      lang === l
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface text-text-secondary hover:bg-surface-warm"
                    }`}
                  >
                    {l === "es" ? "Español" : "English"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-secondary">
                {t("settings.language.hint")}
              </p>
            </Card>

            <Card icon={Clock} title={t("settings.sessions")}>
              {SESSION_ROLES.map((role) => (
                <div
                  key={role}
                  className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0 last:pb-0"
                >
                  <p className="text-xs text-text-primary">
                    {t(`role.${role}` as TKey)}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={form.session.hours[role]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          session: {
                            hours: {
                              ...form.session.hours,
                              [role]: Math.min(
                                720,
                                Math.max(0, Number(e.target.value)),
                              ),
                            },
                          },
                        })
                      }
                      className="h-9 w-20 rounded-lg border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                    />
                    <span className="text-[11px] text-text-secondary">h</span>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-text-secondary">
                {t("settings.sessions.hint")}
              </p>
            </Card>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[340px]">
            <section className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
              <h2 className="text-[15px] font-extrabold text-text-primary">
                {t("settings.status")}
              </h2>
              <div className="flex items-center gap-3 rounded-xl bg-success/10 p-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success">
                  <Check className="size-4 text-white" />
                </div>
                <div className="flex flex-col gap-[3px] text-success">
                  <p className="text-xs font-extrabold">
                    {t("settings.statusSaved")}
                  </p>
                  <p className="text-[10px]">{t("settings.statusHint")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-primary bg-primary px-4 py-3 text-[13px] text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  {saving
                    ? t("settings.saving")
                    : saved
                      ? `${t("settings.saved")} ✓`
                      : t("common.save")}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
