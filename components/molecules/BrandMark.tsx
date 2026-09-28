import Image from "next/image";

export function BrandMark({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* El SVG fuente queda boca abajo; el flip replica el diseño de Figma */}
      <Image
        src="/kofi-logo.svg"
        alt=""
        width={52}
        height={45}
        unoptimized
        className="h-[45px] w-[52px] -rotate-180 -scale-x-100"
      />
      <div className="flex flex-col gap-0.5 whitespace-nowrap">
        <p className="text-[15px] font-extrabold text-text-primary">{title}</p>
        <p className="text-[11px] font-semibold text-text-secondary">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
