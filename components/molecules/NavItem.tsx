"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItemDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function NavItem({ href, label, icon: Icon, exact }: NavItemDef) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-[46px] w-full items-center gap-3 rounded-xl px-3.5 text-sm transition-colors ${
        active
          ? "bg-primary font-normal text-white"
          : "font-semibold text-text-secondary hover:bg-surface"
      }`}
    >
      <Icon size={18} aria-hidden />
      {label}
    </Link>
  );
}
