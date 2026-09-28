import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-extrabold leading-none text-text-primary">
          {title}
        </h1>
        <p className="text-[13px] text-text-secondary">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
