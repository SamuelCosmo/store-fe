"use client";

import { Sidebar } from "@/components/organisms/Sidebar";
import { useSession } from "@/lib/session";
import {
  DEFAULT_SETTINGS,
  SETTINGS_CHANGED_EVENT,
  getSettings,
} from "@/lib/settings";
import {
  ChefHat,
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
const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/categories", label: "Categorías", icon: Tag },
  { href: "/products", label: "Productos", icon: Soup },
  { href: "/stores", label: "Establecimientos", icon: Store },
  { href: "/kitchen", label: "Cocina", icon: ChefHat },
  { href: "/orders", label: "Pedidos", icon: ReceiptText },
  { href: "/users", label: "Usuarios", icon: Users, adminOnly: true },
  { href: "/settings", label: "Configuración", icon: Settings, adminOnly: true },
];

export function AdminSidebar() {
  const [brand, setBrand] = useState(DEFAULT_SETTINGS.general.menuName);
  const session = useSession();

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
      brand={{ title: brand.toUpperCase(), subtitle: "Administración" }}
      items={items.filter((i) => !i.adminOnly || session?.role === "ADMIN")}
    />
  );
}
