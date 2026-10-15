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
          className={
            collapsed
              ? "h-7 w-auto max-w-[48px] object-contain"
              : "h-9 w-auto max-w-[110px] shrink-0 object-contain"
          }
        />
      ) : collapsed ? (
        /* rail angosto: icono "A+" de la marca */
        <>
          <Image
            src="/sac-icon-light.png"
            alt=""
            width={405}
            height={167}
            unoptimized
            className="h-7 w-auto object-contain dark:hidden"
          />
          <Image
            src="/sac-icon.png"
            alt=""
            width={405}
            height={167}
            unoptimized
            className="hidden h-7 w-auto object-contain dark:block"
          />
        </>
      ) : (
        <>
          {/* Logo de plataforma SAC+ — variante por tema */}
          <Image
            src="/sac-logo-light.png"
            alt=""
            width={120}
            height={45}
            unoptimized
            className="h-9 w-auto shrink-0 object-contain dark:hidden"
          />
          <Image
            src="/sac-logo.png"
            alt=""
            width={120}
            height={45}
            unoptimized
            className="hidden h-9 w-auto shrink-0 object-contain dark:block"
          />
        </>
      )}
      {!collapsed && (
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-[15px] font-extrabold text-text-primary">
            {title}
          </p>
          <p className="truncate text-[11px] font-semibold text-text-secondary">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
