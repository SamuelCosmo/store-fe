"use client";

import { useSession } from "@/lib/session";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardHeader() {
  const session = useSession();
  const name = session?.name.split(" ")[0];
  const date = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="flex flex-col gap-1.5">
      <h1
        className="text-[28px] font-extrabold text-text-primary"
        suppressHydrationWarning
      >
        {greeting()}
        {name ? `, ${name}` : ""}
      </h1>
      <p className="text-[13px] text-text-secondary capitalize" suppressHydrationWarning>
        {date}
      </p>
    </header>
  );
}
