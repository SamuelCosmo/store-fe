"use client";

import { BrandMark } from "@/components/molecules/BrandMark";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { useI18n } from "@/lib/i18n";
import { hasModule, homePath, useSession } from "@/lib/session";
import {
  ArrowLeft,
  ChefHat,
  Coins,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import type { StoreOpt } from "./terminal-utils";

/** Header de la terminal: marca, reloj, venta de fichas, navegación y
 *  selector de establecimiento (gerente/admin con varias tiendas). */
export function TerminalHeader({
  channel,
  brandName,
  logoUrl,
  now,
  canSellTokens,
  onSellTokens,
  onLogout,
  canPickStore,
  viewStore,
  storeOptions,
  onSwitchStore,
}: {
  channel: "POS" | "KIOSK";
  brandName: string;
  logoUrl: string | null;
  now: Date | null;
  canSellTokens: boolean;
  onSellTokens: () => void;
  onLogout: () => void;
  canPickStore: boolean;
  viewStore: number | null;
  storeOptions: StoreOpt[];
  onSwitchStore: (id: number) => void;
}) {
  const session = useSession();
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-US" : "es-MX";

  return (
    <>
      <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-border bg-background px-8">
        <BrandMark
          title={brandName.toUpperCase()}
          subtitle={channel === "POS" ? t("pos.subtitle") : t("ticket.kiosk")}
          logoUrl={logoUrl}
        />
        <div className="flex items-center gap-4">
          <p className="text-lg font-bold text-text-secondary tabular-nums">
            {now
              ? now.toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </p>
          <ThemeToggle />
          {/* venta de fichas — solo caja, módulo TOKENS y precio configurado */}
          {channel === "POS" && canSellTokens && (
            <button
              onClick={onSellTokens}
              aria-label={t("pos.sellTokens")}
              title={t("pos.sellTokens")}
              className="flex h-10 items-center gap-2 rounded-full border border-border px-3.5 text-xs font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Coins size={15} aria-hidden />
              {t("pos.sellTokens")}
            </button>
          )}
          {/* admin/gerente: la caja es una visita desde el panel — solo
              "Volver". El cajero (EMPLOYEE) conserva cocina + cerrar sesión */}
          {channel === "POS" &&
          (session?.role === "ADMIN" || session?.role === "MANAGER") ? (
            <Link
              href={homePath(session)}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowLeft size={14} aria-hidden />
              {t("common.back")}
            </Link>
          ) : channel === "POS" && hasModule(session, "KDS") ? (
            <Link
              href="/kitchen"
              aria-label={t("pos.kitchenBoard")}
              title={t("pos.kitchenBoard")}
              className="flex size-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ChefHat size={17} aria-hidden />
            </Link>
          ) : null}
          {/* El kiosco (CUSTOMER) no tiene logout: es una cuenta compartida */}
          {channel === "POS" &&
          session?.role !== "ADMIN" &&
          session?.role !== "MANAGER" && (
            <button
              onClick={onLogout}
              aria-label={t("user.logout")}
              className="flex size-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-error/50 hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <LogOut size={17} aria-hidden />
            </button>
          )}
        </div>
      </header>

      {/* selector de establecimiento — gerente/admin con varias tiendas (caja) */}
      {canPickStore && (
        <div className="flex shrink-0 items-center px-6 pt-4 pb-1">
          <select
            id="pos-store"
            aria-label={t("nav.stores")}
            value={viewStore ?? ""}
            onChange={(e) => onSwitchStore(Number(e.target.value))}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-text-primary outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            {storeOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
