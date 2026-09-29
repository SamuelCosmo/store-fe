import type { ReactNode } from "react";
import { AdminSidebar } from "./_components/AdminSidebar";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 bg-canvas">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
