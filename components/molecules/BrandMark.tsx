import Image from "next/image";

export function BrandMark({
  title,
  subtitle,
  logoUrl,
  collapsed,
}: {
  title: string;
  subtitle: string;
  /** Logo del tenant — cae al logo de plataforma si no hay. */
  logoUrl?: string | null;
  /** Sidebar colapsado — solo el logo, sin texto. */
  collapsed?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={title}
          className="h-[45px] w-auto max-w-[120px] object-contain"
        />
      ) : (
        /* El SVG fuente queda boca abajo; el flip replica el diseño de Figma */
        <Image
          src="/kofi-logo.svg"
          alt=""
          width={52}
          height={45}
          unoptimized
          className="h-[45px] w-[52px] -rotate-180 -scale-x-100"
        />
      )}
      {!collapsed && (
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          <p className="text-[15px] font-extrabold text-text-primary">{title}</p>
          <p className="text-[11px] font-semibold text-text-secondary">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
