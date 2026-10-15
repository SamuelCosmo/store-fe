"use client";

import { Sidebar } from "@/components/organisms/Sidebar";
import { useI18n, type TKey } from "@/lib/i18n";
import { useSession, type Role } from "@/lib/session";
import {
  DEFAULT_SETTINGS,
  SETTINGS_CHANGED_EVENT,
  getSettings,
} from "@/lib/settings";
import {
  type LucideIcon,
  ChefHat,
  CreditCard,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Soup,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

// Módulos del admin según el backend (store-be docs: catálogo, inventario,
// stores, usuarios + extras del cliente: reportes, reservaciones)
const items: {
  href: string;
  key: TKey;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
  /** si está, solo esos roles ven el ítem */
  roles?: Role[];
}[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/categories", key: "nav.categories", icon: Tag },
  { href: "/products", key: "nav.products", icon: Soup },
  { href: "/stores", key: "nav.stores", icon: Store },
  {
    href: "/pos",
    key: "nav.pos",
    icon: CreditCard,
    roles: ["ADMIN", "MANAGER"],
  },
  { href: "/kitchen", key: "nav.kitchen", icon: ChefHat },
  { href: "/orders", key: "nav.orders", icon: ReceiptText },
  { href: "/users", key: "nav.users", icon: Users, adminOnly: true },
  { href: "/settings", key: "nav.settings", icon: Settings, adminOnly: true },
];

export function AdminSidebar() {
  const [brand, setBrand] = useState(DEFAULT_SETTINGS.general.menuName);
  const session = useSession();
  const { t } = useI18n();

  useEffect(() => {
    const read = () => setBrand(getSettings().general.menuName);
    const id = setTimeout(read, 0);
    window.addEventListener(SETTINGS_CHANGED_EVENT, read);
    return () => {
      clearTimeout(id);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, read);
    };
  }, []);

  return (
    <Sidebar
      brand={{
        // el nombre del negocio (Marca) gana; el menuName queda de fallback
        title: (session?.clientName || brand).toUpperCase(),
        subtitle: t("sidebar.subtitle"),
      }}
      items={items
        .filter(
          (i) =>
            (!i.adminOnly || session?.role === "ADMIN") &&
            (!i.roles || i.roles.includes(session?.role ?? "EMPLOYEE")),
        )
        .map(({ key, ...i }) => ({ ...i, label: t(key) }))}
    />
  );
}
