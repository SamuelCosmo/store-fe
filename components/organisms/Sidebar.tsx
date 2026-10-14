"use client";

import { BrandMark } from "@/components/molecules/BrandMark";
import { NavItem, type NavItemDef } from "@/components/molecules/NavItem";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";
import { UserCard } from "@/components/molecules/UserCard";
import { useI18n, type TKey } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useState } from "react";

export function Sidebar({
  brand,
  items,
}: {
  brand: { title: string; subtitle: string };
  items: NavItemDef[];
}) {
  const session = useSession();
  const { t } = useI18n();
  // rail de iconos que se expande al hover — sin botón ni preferencia
  const [hover, setHover] = useState(false);
  const collapsed = !hover;

  return (
    <aside
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`sticky top-0 flex h-screen shrink-0 flex-col gap-7 overflow-clip border-r border-border bg-background pb-6 pt-7 transition-[width] ${
        collapsed ? "w-[76px] px-3" : "w-[248px] px-5"
      }`}
    >
      <BrandMark
        title={brand.title}
        subtitle={brand.subtitle}
        logoUrl={session?.clientLogoUrl}
        collapsed={collapsed}
      />
      <nav className="flex w-full flex-col gap-1.5">
        {items.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>
      <div className="flex-1" />
      <div
        className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}
      >
        <div className={collapsed ? "" : "min-w-0 flex-1"}>
          <UserCard
            name={session?.name ?? "…"}
            roleLabel={session ? t(`role.${session.role}` as TKey) : ""}
            collapsed={collapsed}
          />
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
