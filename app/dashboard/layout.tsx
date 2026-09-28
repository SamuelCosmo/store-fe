import { AdminSidebar } from "./_components/AdminSidebar";

export default function AdminLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-screen flex-1 bg-canvas">
      <AdminSidebar />
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
