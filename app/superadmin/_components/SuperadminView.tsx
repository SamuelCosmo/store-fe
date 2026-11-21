"use client";

import { Modal } from "@/components/molecules/Modal";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { ApiError, api, apiErrorMessage, logoutSession } from "@/lib/api";
import { useI18n, type TKey } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import {
  clearSession,
  saveSession,
  useSession,
  type AuthResponse,
} from "@/lib/session";
import { PASSWORD_RULES } from "@/lib/password";
import { AuditPanel } from "./AuditPanel";
import { LogsPanel } from "./LogsPanel";
import {
  Building2,
  Check,
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  Power,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const MODULES = [
  "CATALOG", "INVENTORY", "POS", "KIOSK", "KDS", "BAR",
  "TOKENS", "REPORTS", "TICKETS", "RESERVATIONS",
] as const;

type ClientDto = {
  id: number;
  name: string;
  maxStores: number;
  maxPosPerStore: number;
  maxKiosksPerStore: number;
  active: boolean;
  suspendedAt: string | null;
  createdAt: string;
  modules: string[];
};

type ClientForm = {
  name: string;
  maxStores: string;
  maxPosPerStore: string;
  maxKiosksPerStore: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  modules: string[];
};

const EMPTY_FORM: ClientForm = {
  name: "",
  maxStores: "1",
  maxPosPerStore: "1",
  maxKiosksPerStore: "1",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  modules: [...MODULES],
};

type AdminForm = {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPassword2: string;
  superadminPassword: string;
};

const EMPTY_ADMIN: AdminForm = {
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  adminPassword2: "",
  superadminPassword: "",
};

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

function SuperadminLogin() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${API_URL}/api/auth/superadmin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? "")
            .trim()
            .toLowerCase(),
          password: data.get("password"),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          body?.code === "INVALID_CREDENTIALS"
            ? t("sa.badCredentials")
            : apiErrorMessage(res.status, body),
        );
        return;
      }
      const session = body as AuthResponse;
      if (session.role !== "SUPERADMIN") {
        setError(t("sa.notPlatform"));
        return;
      }
      saveSession(session);
    } catch {
      setError(t("login.offline"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-canvas p-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-background p-7 shadow-[0_10px_28px_rgba(68,38,25,0.08)]"
      >
        <div className="flex flex-col gap-1.5">
          <Image
            src="/sac-logo.png"
            alt="SAC+"
            width={128}
            height={48}
            unoptimized
            className="h-12 w-auto self-center"
          />
          <h1 className="pt-2 text-2xl font-extrabold text-text-primary">
            {t("sa.title")}
          </h1>
          <p className="text-sm text-text-secondary">{t("sa.loginSub")}</p>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2.5 text-sm text-error"
          >
            {error}
          </p>
        )}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder={t("login.email")}
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder={t("login.password")}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? t("sa.submitting") : t("sa.submit")}
        </button>
      </form>
    </div>
  );
}

export function SuperadminView() {
  const router = useRouter();
  const session = useSession();
  const { t, lang } = useI18n();
  const toast = useToast();
  const locale = lang === "en" ? "en-US" : "es-MX";
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ClientDto | "new" | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  // modal del admin del tenant (cliente cuyo admin se edita)
  const [adminModal, setAdminModal] = useState<ClientDto | null>(null);
  const [adminForm, setAdminForm] = useState<AdminForm>(EMPTY_ADMIN);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<ClientDto | null>(null);
  const [statusPwd, setStatusPwd] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [tab, setTab] = useState<"clients" | "logs" | "audit">("clients");

  const isSuper = session?.role === "SUPERADMIN";

  // una sesión de otro rol no sirve aquí — se descarta y pide login de plataforma
  useEffect(() => {
    if (session !== null && session.role !== "SUPERADMIN") clearSession();
  }, [session]);

  useEffect(() => {
    if (!isSuper) return;
    api<ClientDto[]>("/api/clients")
      .then(setClients)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t("common.loadError")),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t es estable
  }, [isSuper]);

  if (!isSuper) return <SuperadminLogin />;

  function openModal(client: ClientDto | "new") {
    setForm(
      client === "new"
        ? EMPTY_FORM
        : {
            ...EMPTY_FORM,
            name: client.name,
            maxStores: String(client.maxStores),
            maxPosPerStore: String(client.maxPosPerStore),
            maxKiosksPerStore: String(client.maxKiosksPerStore),
            modules: [...(client.modules ?? [...MODULES])],
          },
    );
    setModal(client);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const body = JSON.stringify({
      name: form.name.trim(),
      maxStores: Number(form.maxStores),
      maxPosPerStore: Number(form.maxPosPerStore),
      maxKiosksPerStore: Number(form.maxKiosksPerStore),
      // solo en el alta: el PUT ignora estos campos
      ...(modal === "new"
        ? {
            adminName: form.adminName.trim(),
            adminEmail: form.adminEmail.trim().toLowerCase(),
            adminPassword: form.adminPassword,
          }
        : {}),
    });
    try {
      const saved =
        modal === "new"
          ? await api<ClientDto>("/api/clients", { method: "POST", body })
          : await api<ClientDto>(`/api/clients/${(modal as ClientDto).id}`, {
              method: "PUT",
              body,
            });
      const modulesChanged =
        [...form.modules].sort().join() !==
        [...(saved.modules ?? [])].sort().join();
      if (modulesChanged) {
        await api(`/api/clients/${saved.id}/modules`, {
          method: "PUT",
          body: JSON.stringify({ modules: form.modules }),
        });
      }
      const savedWithModules = { ...saved, modules: form.modules };
      setClients((prev) =>
        modal === "new"
          ? [...prev, savedWithModules]
          : prev.map((c) => (c.id === saved.id ? savedWithModules : c)),
      );
      setModal(null);
      toast.success(modal === "new" ? t("common.saved") : t("common.updated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.saveError"));
    } finally {
      setSaving(false);
    }
  }

  function openAdminModal(client: ClientDto) {
    setAdminModal(client);
    setAdminForm(EMPTY_ADMIN);
    setAdminError(null);
    setAdminLoading(true);
    api<{ name: string; email: string }>(`/api/clients/${client.id}/admin`)
      .then((a) =>
        setAdminForm((f) => ({ ...f, adminName: a.name, adminEmail: a.email })),
      )
      .catch((e: unknown) =>
        setAdminError(
          e instanceof Error ? e.message : t("sa.adminLoadError"),
        ),
      )
      .finally(() => setAdminLoading(false));
  }

  async function saveAdmin() {
    if (!adminModal) return;
    setAdminError(null);
    if (adminForm.adminPassword || adminForm.adminPassword2) {
      if (adminForm.adminPassword !== adminForm.adminPassword2) {
        setAdminError(t("users.pwdMismatch"));
        return;
      }
      if (!PASSWORD_RULES.every((r) => r.test(adminForm.adminPassword))) {
        setAdminError(t("users.pwdWeak"));
        return;
      }
    }
    setAdminSaving(true);
    try {
      await api(`/api/clients/${adminModal.id}/admin`, {
        method: "PUT",
        body: JSON.stringify({
          adminName: adminForm.adminName.trim(),
          adminEmail: adminForm.adminEmail.trim().toLowerCase(),
          ...(adminForm.adminPassword
            ? { adminPassword: adminForm.adminPassword }
            : {}),
          superadminPassword: adminForm.superadminPassword,
        }),
      });
      setAdminModal(null);
      toast.success(t("common.updated"));
    } catch (e) {
      setAdminError(
        e instanceof ApiError && e.code === "INVALID_CREDENTIALS"
          ? t("sa.superPwdWrong")
          : e instanceof Error
            ? e.message
            : t("common.saveError"),
      );
    } finally {
      setAdminSaving(false);
    }
  }

  function openStatusModal(client: ClientDto) {
    setStatusModal(client);
    setStatusPwd("");
    setStatusError(null);
  }

  async function saveStatus() {
    if (!statusModal) return;
    setStatusError(null);
    setStatusSaving(true);
    try {
      const updated = await api<ClientDto>(
        `/api/clients/${statusModal.id}/active`,
        {
          method: "PATCH",
          body: JSON.stringify({
            active: !statusModal.active,
            superadminPassword: statusPwd,
          }),
        },
      );
      setClients((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setStatusModal(null);
      toast.success(t("common.updated"));
    } catch (e) {
      setStatusError(
        e instanceof ApiError && e.code === "INVALID_CREDENTIALS"
          ? t("sa.superPwdWrong")
          : e instanceof Error
            ? e.message
            : t("common.saveError"),
      );
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-canvas">
      <header className="flex h-[72px] items-center justify-between border-b border-border bg-background px-8">
        <div className="flex items-center gap-3">
          <Building2 size={20} aria-hidden className="text-primary" />
          <div>
            <p className="text-sm font-extrabold text-text-primary">
              {t("sa.title")}
            </p>
            <p className="text-[11px] text-text-muted">
              {t("sa.headerSub")} · {session.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => {
              logoutSession();
              router.refresh();
            }}
            aria-label={t("user.logout")}
            className="flex size-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-error/50 hover:text-error"
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </header>

      <div
        className={`mx-auto flex w-full flex-1 flex-col gap-6 p-8 ${tab === "logs" || tab === "audit" ? "max-w-7xl" : "max-w-4xl"}`}
      >
        <div className="flex items-center justify-between">
          <div role="tablist" className="flex gap-1 rounded-xl border border-border bg-background p-1">
            {(["clients", "logs", "audit"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-lg px-4 py-2 text-[15px] font-extrabold transition-colors ${
                  tab === key
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {({ clients: t("sa.clients"), logs: t("sa.logs"), audit: t("sa.audit") })[key]}
              </button>
            ))}
          </div>
          {tab === "clients" && (
            <button
              type="button"
              onClick={() => openModal("new")}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
            >
              {t("sa.new")}
              <Plus size={15} aria-hidden />
            </button>
          )}
        </div>

        {tab === "logs" ? (
          <LogsPanel clients={clients} />
        ) : tab === "audit" ? (
          <AuditPanel clients={clients} />
        ) : (
          <>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
          >
            {error}
          </p>
        )}

        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="grid grid-cols-[60px_1fr_100px_100px_100px_120px_120px] items-center gap-4 rounded-lg bg-surface px-3.5 py-2.5 text-[10px] tracking-wide text-text-muted uppercase">
            <span>ID</span>
            <span>{t("sa.colClient")}</span>
            <span>{t("sa.colStores")}</span>
            <span>{t("sa.colPos")}</span>
            <span>{t("sa.colKiosks")}</span>
            <span>{t("sa.colSince")}</span>
            <span />
          </div>

          {loading ? (
            <p className="px-3.5 py-10 text-center text-sm text-text-muted">
              {t("common.loading")}
            </p>
          ) : clients.length === 0 ? (
            <p className="px-3.5 py-10 text-center text-sm text-text-muted">
              {t("sa.empty")}
            </p>
          ) : (
            clients.map((c) => (
              <div
                key={c.id}
                className={`grid min-h-[56px] grid-cols-[60px_1fr_100px_100px_100px_120px_120px] items-center gap-4 border-b border-border px-3.5 py-2.5 text-sm last:border-b-0 ${
                  c.active === false ? "opacity-75" : ""
                }`}
              >
                <span className="font-bold text-text-secondary tabular-nums">
                  #{c.id}
                </span>
                <span className="flex min-w-0 items-center gap-2 font-semibold text-text-primary">
                  <span className="truncate">{c.name}</span>
                  {c.active === false && (
                    <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-bold text-error uppercase">
                      {t("sa.suspended")}
                    </span>
                  )}
                </span>
                <span className="text-text-secondary tabular-nums">
                  {t("sa.max", { n: c.maxStores })}
                </span>
                <span className="text-text-secondary tabular-nums">
                  {t("sa.max", { n: c.maxPosPerStore })}
                </span>
                <span className="text-text-secondary tabular-nums">
                  {t("sa.max", { n: c.maxKiosksPerStore })}
                </span>
                <span className="text-text-secondary tabular-nums">
                  {new Date(c.createdAt).toLocaleDateString(locale)}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openStatusModal(c)}
                    aria-label={t(
                      c.active === false ? "sa.activateTitle" : "sa.suspendTitle",
                      { name: c.name },
                    )}
                    title={t(
                      c.active === false ? "sa.activateBtn" : "sa.suspendBtn",
                    )}
                    className={`flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-surface ${
                      c.active === false
                        ? "text-success hover:text-success"
                        : "text-text-secondary hover:text-error"
                    }`}
                  >
                    <Power size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => openAdminModal(c)}
                    aria-label={t("sa.editAdminAria", { name: c.name })}
                    title={t("sa.adminTitle")}
                    className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <KeyRound size={15} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(c)}
                    aria-label={t("common.editAria", { name: c.name })}
                    className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                  >
                    <Pencil size={15} aria-hidden />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
          </>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "new" ? t("sa.newTitle") : t("sa.editTitle")}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary">
            {t("common.name")}
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder={t("sa.namePh")}
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["maxStores", t("sa.maxStores")],
                ["maxPosPerStore", t("sa.maxPos")],
                ["maxKiosksPerStore", t("sa.maxKiosks")],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary"
              >
                {label}
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          {modal === "new" && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3.5">
              <p className="text-[10px] font-bold tracking-wide text-text-muted uppercase">
                {t("sa.adminSection")}
              </p>
              <input
                value={form.adminName}
                onChange={(e) =>
                  setForm({ ...form, adminName: e.target.value })
                }
                className={inputClass}
                placeholder={t("sa.adminNamePh")}
              />
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) =>
                  setForm({ ...form, adminEmail: e.target.value })
                }
                className={inputClass}
                placeholder={t("sa.adminEmailPh")}
              />
              <input
                type="password"
                value={form.adminPassword}
                onChange={(e) =>
                  setForm({ ...form, adminPassword: e.target.value })
                }
                className={inputClass}
                placeholder={t("sa.adminPwdPh")}
                autoComplete="new-password"
              />
            </div>
          )}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 flex w-full items-center justify-between text-[13px] font-semibold text-text-primary">
              <span>{t("sa.modules")}</span>
              <span className="text-xs font-normal text-text-muted">
                {form.modules.length}/{MODULES.length}
              </span>
            </legend>
            <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1">
              {MODULES.map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-surface has-checked:border-primary has-checked:bg-primary-light"
                >
                  <input
                    type="checkbox"
                    checked={form.modules.includes(m)}
                    onChange={() =>
                      setForm({
                        ...form,
                        modules: form.modules.includes(m)
                          ? form.modules.filter((x) => x !== m)
                          : [...form.modules, m],
                      })
                    }
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13px] font-semibold leading-tight text-text-primary">
                      {t(`module.${m}` as TKey)}
                    </span>
                    <span className="text-xs leading-snug text-text-secondary">
                      {t(`moduleDesc.${m}` as TKey)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={
                saving ||
                !form.name.trim() ||
                (modal === "new" &&
                  (!form.adminEmail.trim() || !form.adminPassword)) ||
                form.modules.length === 0
              }
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {t("common.save")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={adminModal !== null}
        onClose={() => setAdminModal(null)}
        title={t("sa.adminOf", { name: adminModal?.name ?? "" })}
      >
        <div className="flex flex-col gap-4">
          {adminError && (
            <p
              role="alert"
              className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2.5 text-sm text-error"
            >
              {adminError}
            </p>
          )}
          {adminLoading ? (
            <p className="py-6 text-center text-sm text-text-muted">
              {t("common.loading")}
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary">
                {t("common.name")}
                <input
                  value={adminForm.adminName}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, adminName: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary">
                {t("login.email")}
                <input
                  type="email"
                  value={adminForm.adminEmail}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, adminEmail: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary">
                {t("sa.newPassword")}{" "}
                <span className="font-normal text-text-muted">
                  {t("sa.pwdKeepHint")}
                </span>
                <input
                  type="password"
                  value={adminForm.adminPassword}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, adminPassword: e.target.value })
                  }
                  className={inputClass}
                  autoComplete="new-password"
                />
              </label>
              {adminForm.adminPassword && (
                <>
                  <ul className="flex flex-col gap-1">
                    {PASSWORD_RULES.map((rule) => {
                      const ok = rule.test(adminForm.adminPassword);
                      return (
                        <li
                          key={rule.key}
                          className={`flex items-center gap-1.5 text-xs ${ok ? "text-success" : "text-error"}`}
                        >
                          {ok ? (
                            <Check size={13} aria-hidden />
                          ) : (
                            <X size={13} aria-hidden />
                          )}
                          {t(rule.key)}
                        </li>
                      );
                    })}
                  </ul>
                  <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-text-primary">
                    {t("users.pwdRepeat")}
                    <input
                      type="password"
                      value={adminForm.adminPassword2}
                      onChange={(e) =>
                        setAdminForm({
                          ...adminForm,
                          adminPassword2: e.target.value,
                        })
                      }
                      className={inputClass}
                      autoComplete="new-password"
                    />
                  </label>
                </>
              )}
              <label className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3.5 text-[13px] font-semibold text-text-primary">
                {t("sa.superPwdLabel")}
                <input
                  type="password"
                  value={adminForm.superadminPassword}
                  onChange={(e) =>
                    setAdminForm({
                      ...adminForm,
                      superadminPassword: e.target.value,
                    })
                  }
                  className={inputClass}
                  autoComplete="current-password"
                />
              </label>
              <div className="mt-1 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdminModal(null)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={saveAdmin}
                  disabled={
                    adminSaving ||
                    !adminForm.adminName.trim() ||
                    !adminForm.adminEmail.trim() ||
                    !adminForm.superadminPassword
                  }
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {t("common.save")}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={statusModal !== null}
        onClose={() => setStatusModal(null)}
        title={t(
          statusModal?.active === false
            ? "sa.activateTitle"
            : "sa.suspendTitle",
          { name: statusModal?.name ?? "" },
        )}
      >
        <div className="flex flex-col gap-4">
          {statusError && (
            <p
              role="alert"
              className="rounded-lg border border-error/40 bg-error/5 px-3.5 py-2.5 text-sm text-error"
            >
              {statusError}
            </p>
          )}
          <p className="text-sm text-text-secondary">
            {t(
              statusModal?.active === false
                ? "sa.activateHint"
                : "sa.suspendHint",
              { name: statusModal?.name ?? "" },
            )}
          </p>
          <label className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3.5 text-[13px] font-semibold text-text-primary">
            {t("sa.superPwdLabel")}
            <input
              type="password"
              value={statusPwd}
              onChange={(e) => setStatusPwd(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </label>
          <div className="mt-1 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setStatusModal(null)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={saveStatus}
              disabled={statusSaving || !statusPwd}
              className={`rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60 ${
                statusModal?.active === false
                  ? "bg-success hover:bg-success/90"
                  : "bg-error hover:bg-error/90"
              }`}
            >
              {t(
                statusModal?.active === false
                  ? "sa.activateBtn"
                  : "sa.suspendBtn",
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
