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
  History,
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
  /** módulo del tenant requerido para ver el ítem */
  module?: string;
  /** si está, solo esos roles ven el ítem */
  roles?: Role[];
}[] = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard, exact: true, module: "REPORTS" },
  { href: "/categories", key: "nav.categories", icon: Tag, module: "CATALOG" },
  { href: "/products", key: "nav.products", icon: Soup, module: "CATALOG" },
  { href: "/stores", key: "nav.stores", icon: Store },
  {
    href: "/pos",
    key: "nav.pos",
    icon: CreditCard,
    module: "POS",
    roles: ["ADMIN", "MANAGER"],
  },
  { href: "/kitchen", key: "nav.kitchen", icon: ChefHat, module: "KDS" },
  { href: "/orders", key: "nav.orders", icon: ReceiptText, module: "POS" },
  { href: "/users", key: "nav.users", icon: Users, adminOnly: true },
  { href: "/settings", key: "nav.settings", icon: Settings, adminOnly: true },
  { href: "/audit", key: "nav.audit", icon: History, adminOnly: true },
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
            (!i.roles || i.roles.includes(session?.role ?? "EMPLOYEE")) &&
            (!i.module ||
              session?.modules === undefined ||
              session.modules.includes(i.module)),
        )
        .map(({ key, ...i }) => ({ ...i, label: t(key) }))}
    />
  );
}
