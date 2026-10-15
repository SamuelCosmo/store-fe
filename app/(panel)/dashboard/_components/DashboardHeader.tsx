"use client";

import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export function DashboardHeader() {
  const session = useSession();
  const { t, lang } = useI18n();
  const name = session?.name.split(" ")[0];
  const h = new Date().getHours();
  const greeting =
    h < 12 ? t("dash.morning") : h < 19 ? t("dash.afternoon") : t("dash.evening");
  const date = new Date().toLocaleDateString(
    lang === "en" ? "en-US" : "es-MX",
    { weekday: "long", day: "numeric", month: "long" },
  );

  return (
    <header className="flex flex-col gap-1.5">
      <h1
        className="text-[28px] font-extrabold text-text-primary"
        suppressHydrationWarning
      >
        {greeting}
        {name ? `, ${name}` : ""}
      </h1>
      <p className="text-[13px] text-text-secondary capitalize" suppressHydrationWarning>
        {date}
      </p>
    </header>
  );
}
