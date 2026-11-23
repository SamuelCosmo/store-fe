"use client";

import { useI18n } from "@/lib/i18n";

// kiosco 90 s / caja 3 min sin tocar → pantalla de espera
export const IDLE_MS = { KIOSK: 90_000, POS: 180_000 } as const;

// olas del attract screen — cada SVG es 2× el ancho con el patrón
// periódico dos veces → translateX(-50%) da un loop infinito sin corte
const IDLE_WAVES = [
  {
    color: "#1e5fb8",
    height: "46%",
    duration: 30,
    reverse: false,
    d: "M0,60 Q300,20 600,60 T1200,60 T1800,60 T2400,60 L2400,120 L0,120 Z",
  },
  {
    color: "#2f74d6",
    height: "33%",
    duration: 19,
    reverse: true,
    d: "M0,70 Q300,15 600,70 T1200,70 T1800,70 T2400,70 L2400,120 L0,120 Z",
  },
  {
    color: "#5b9df0",
    height: "22%",
    duration: 12,
    reverse: false,
    d: "M0,65 Q200,20 400,65 T800,65 T1200,65 T1600,65 T2000,65 T2400,65 L2400,120 L0,120 Z",
  },
];

function SeaWaves() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#0b3d91]">
      <style>{`@keyframes wave-drift { to { transform: translateX(-50%); } }`}</style>
      {IDLE_WAVES.map((w, i) => (
        <div
          key={i}
          className="absolute inset-x-0 bottom-0"
          style={{ height: w.height }}
        >
          <svg
            viewBox="0 0 2400 120"
            preserveAspectRatio="none"
            className="h-full w-[200%]"
            style={{
              animation: `wave-drift ${w.duration}s linear infinite ${w.reverse ? "reverse" : ""}`,
            }}
          >
            <path fill={w.color} d={w.d} />
          </svg>
        </div>
      ))}
    </div>
  );
}

/** Pantalla de espera — kiosco: un toque continúa; caja: continuar o nueva venta. */
export function IdleOverlay({
  channel,
  brandName,
  onContinue,
  onNewSale,
}: {
  channel: "POS" | "KIOSK";
  brandName: string;
  onContinue: () => void;
  onNewSale: () => void;
}) {
  const { t } = useI18n();

  if (channel === "KIOSK") {
    return (
      <button
        onClick={onContinue}
        className="fixed inset-0 z-[60] text-white"
      >
        <SeaWaves />
        <span className="relative z-10 flex h-full flex-col items-center justify-center gap-3">
          <span className="text-4xl font-extrabold tracking-tight">
            {brandName.toUpperCase()}
          </span>
          <span className="text-base font-medium opacity-90">
            {t("pos.idleKiosk")}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] text-white">
      <SeaWaves />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5">
        <p className="text-4xl font-extrabold tracking-tight">
          {brandName.toUpperCase()}
        </p>
        <p className="text-base font-medium opacity-90">
          {t("pos.idlePos")}
        </p>
        <div className="mt-2 flex gap-3">
          <button
            onClick={onContinue}
            className="rounded-xl border border-white/50 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            {t("pos.continue")}
          </button>
          <button
            onClick={onNewSale}
            className="rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-primary transition-colors hover:opacity-90"
          >
            {t("pos.newSale")}
          </button>
        </div>
      </div>
    </div>
  );
}
