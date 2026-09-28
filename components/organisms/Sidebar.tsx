"use client";

import { BrandMark } from "@/components/molecules/BrandMark";
import { NavItem, type NavItemDef } from "@/components/molecules/NavItem";
import { UserCard } from "@/components/molecules/UserCard";
import { ROLE_LABEL, useSession } from "@/lib/session";

export function Sidebar({
  brand,
  items,
}: {
  brand: { title: string; subtitle: string };
  items: NavItemDef[];
}) {
  const session = useSession();

  return (
    <aside className="flex w-[248px] shrink-0 flex-col gap-7 self-stretch overflow-clip border-r border-border bg-background px-5 pb-6 pt-7">
      <BrandMark title={brand.title} subtitle={brand.subtitle} />
      <nav className="flex w-full flex-col gap-1.5">
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
      <div className="flex-1" />
      <UserCard
        name={session?.name ?? "…"}
        roleLabel={session ? ROLE_LABEL[session.role] : ""}
      />
    </aside>
  );
}
