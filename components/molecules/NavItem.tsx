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

export function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  collapsed,
}: NavItemDef & { collapsed?: boolean }) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={`flex h-[46px] w-full items-center rounded-xl text-sm transition-colors ${
        collapsed ? "justify-center" : "gap-3 px-3.5"
      } ${
        active
          ? "bg-primary font-normal text-white"
          : "font-semibold text-text-secondary hover:bg-surface"
      }`}
    >
      <Icon size={18} aria-hidden />
      {!collapsed && label}
    </Link>
  );
}
