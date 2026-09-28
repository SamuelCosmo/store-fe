export function Receipt() {
  return (
    <div className="w-full -rotate-5 rounded bg-background p-7 shadow-[0_4px_4px_rgba(255,255,255,0.25)]">
      <div className="flex flex-col items-center gap-2.5">
        <p className="text-center text-sm font-semibold tracking-[0.12em] text-black">
          COSMO COFFEE
        </p>
        <p className="text-center text-xs font-semibold tracking-wide text-text-muted">
          ORDEN #0231 · CAJA 1
        </p>
        <div className="w-full border-t border-dashed border-border" />
        <ul className="w-full space-y-1.5 text-xs font-light text-black tabular-nums">
          <li className="flex justify-between">
            <span>2 x Espresso</span>
            <span>7.00</span>
          </li>
          <li className="flex justify-between">
            <span>1 x Croissant</span>
            <span>3.25</span>
          </li>
        </ul>
        <div className="w-full border-t border-dashed border-border" />
        <p className="flex w-full justify-between text-xs font-medium text-black">
          <span>Total</span>
          <span>$10.25</span>
        </p>
      </div>
    </div>
  );
}
