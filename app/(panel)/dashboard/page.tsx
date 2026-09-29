import { StatCard } from "@/components/molecules/StatCard";
import { DashboardHeader } from "./_components/DashboardHeader";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader />
      <section className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <StatCard label="Ventas de hoy" value="$ 18,420" />
          </div>
          <div className="flex-1">
            <StatCard label="Ventas de la semana" value="$ 18,420" />
          </div>
          <div className="flex-1">
            <StatCard label="Ventas del mes" value="$ 18,420" />
          </div>
        </div>
        <StatCard label="Productos activos" value="42" hint="de 46" />
        <StatCard label="Categorías" value="6" hint="todas visibles" />
        <StatCard
          label="Stock bajo"
          value="4"
          hint="requiere atención"
          danger
        />
      </section>
    </div>
  );
}
