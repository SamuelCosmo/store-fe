"use client";

import { Sidebar } from "@/components/organisms/Sidebar";
import {
  LayoutDashboard,
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
  { href: "/categories", label: "Categorías", icon: Tag },
  { href: "/products", label: "Productos", icon: Soup },
  { href: "/stores", label: "Establecimientos", icon: Store },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function AdminSidebar() {
  return (
    <Sidebar
      brand={{ title: "KOFI RAMEN", subtitle: "Administración" }}
      items={items}
    />
  );
}
