export function StatCard({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-background p-5">
      <p className="text-xs text-text-secondary">{label}</p>
      <p
        className={`text-[28px] font-extrabold leading-none ${
          danger ? "text-error" : "text-text-primary"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}
