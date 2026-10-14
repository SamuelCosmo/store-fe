"use client";

import { logoutSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ChevronUp, LogOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserCard({
  name,
  roleLabel,
  collapsed,
}: {
  name: string;
  roleLabel: string;
  /** Sidebar colapsado — solo el avatar. */
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  function logout() {
    logoutSession();
    router.push("/");
  }

  return (
    <div className={`relative ${collapsed ? "" : "w-full"}`}>
      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            className={`absolute bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-border bg-background shadow-lg ${
              collapsed ? "left-1/2 w-44 -translate-x-1/2" : "left-0 w-full"
            }`}
          >
            {/* "Configuración" va a ser una página de CUENTA (settings del
                usuario logueado, no del establecimiento) — pendiente. */}
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-surface"
            >
              <LogOut size={16} aria-hidden />
              {t("user.logout")}
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={collapsed ? `${name} — ${roleLabel}` : undefined}
        title={collapsed ? `${name} — ${roleLabel}` : undefined}
        className={`flex items-center rounded-xl bg-surface transition-colors hover:bg-surface-warm ${
          collapsed ? "p-1.5" : "w-full gap-2.5 p-3 text-left"
        }`}
      >
        <Image
          src="/avatar.svg"
          alt=""
          width={34}
          height={34}
          unoptimized
          className="size-[34px]"
        />
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-xs text-text-primary">{name}</p>
              <p className="text-[10px] text-text-secondary">{roleLabel}</p>
            </div>
            <ChevronUp
              size={14}
              aria-hidden
              className={`ml-auto shrink-0 text-text-muted transition-transform ${open ? "" : "rotate-180"}`}
            />
          </>
        )}
      </button>
    </div>
  );
}
