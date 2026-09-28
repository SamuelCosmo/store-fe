"use client";

import { Sidebar } from "@/components/organisms/Sidebar";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Package,
  Settings,
  Soup,
  Store,
  Tag,
  Users,
} from "lucide-react";

// Módulos del admin según el backend (store-be docs: catálogo, inventario,
// stores, usuarios + extras del cliente: reportes, reservaciones)
const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/categories", label: "Categorías", icon: Tag },
  { href: "/dashboard/products", label: "Productos", icon: Soup },
  { href: "/dashboard/inventory", label: "Inventario", icon: Package },
  { href: "/dashboard/stores", label: "Establecimientos", icon: Store },
  { href: "/dashboard/users", label: "Usuarios", icon: Users },
  { href: "/dashboard/reports", label: "Reportes", icon: BarChart3 },
  {
    href: "/dashboard/reservations",
    label: "Reservaciones",
    icon: CalendarDays,
  },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
  return (
    <Sidebar
      brand={{ title: "KOFI RAMEN", subtitle: "Administración" }}
      items={items}
    />
  );
}
