import Image from "next/image";

export function UserCard({
  name,
  roleLabel,
}: {
  name: string;
  roleLabel: string;
}) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-xl bg-surface p-3">
      <Image
        src="/avatar.svg"
        alt=""
        width={34}
        height={34}
        unoptimized
        className="size-[34px]"
      />
      <div className="flex flex-col gap-0.5 whitespace-nowrap">
        <p className="text-xs text-text-primary">{name}</p>
        <p className="text-[10px] text-text-secondary">{roleLabel}</p>
      </div>
    </div>
  );
}
