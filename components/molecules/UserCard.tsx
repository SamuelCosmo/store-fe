"use client";

import { clearSession } from "@/lib/session";
import { ChevronUp, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserCard({
  name,
  roleLabel,
}: {
  name: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function logout() {
    clearSession();
    router.push("/");
  }

  return (
    <div className="relative w-full">
      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-xl border border-border bg-background shadow-lg">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-surface"
            >
              <Settings size={16} aria-hidden />
              Configuración
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-error transition-colors hover:bg-surface"
            >
              <LogOut size={16} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-xl bg-surface p-3 text-left transition-colors hover:bg-surface-warm"
      >
        <Image
          src="/avatar.svg"
          alt=""
          width={34}
          height={34}
          unoptimized
          className="size-[34px]"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-xs text-text-primary">{name}</p>
          <p className="text-[10px] text-text-secondary">{roleLabel}</p>
        </div>
        <ChevronUp
          size={14}
          aria-hidden
          className={`ml-auto shrink-0 text-text-muted transition-transform ${open ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
