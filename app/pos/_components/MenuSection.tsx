"use client";

import type { CategoryDto } from "@/app/(panel)/categories/_components/CategoriesView";
import type { ProductDto } from "@/app/(panel)/products/_components/ProductsView";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { CircleSlash, Soup } from "lucide-react";

/** Columna del menú: toggle normal/fichas, pills de categoría, grid de
 *  productos y el toggle de agotado por tarjeta (solo caja). */
export function MenuSection({
  channel,
  hasTokenable,
  tokenMenu,
  onTokenMenu,
  categories,
  categoryId,
  onCategory,
  error,
  loading,
  products,
  tokenMode,
  fmt,
  onPick,
  onToggleSoldOut,
}: {
  channel: "POS" | "KIOSK";
  hasTokenable: boolean;
  tokenMenu: boolean;
  onTokenMenu: (value: boolean) => void;
  categories: CategoryDto[];
  categoryId: number;
  onCategory: (id: number) => void;
  error: string | null;
  loading: boolean;
  products: ProductDto[];
  tokenMode: boolean;
  fmt: Intl.NumberFormat;
  onPick: (product: ProductDto) => void;
  onToggleSoldOut: (product: ProductDto) => void;
}) {
  const session = useSession();
  const { t } = useI18n();

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5">
      {channel === "POS" && hasTokenable && (
        <div className="relative flex w-64 rounded-full bg-border p-1">
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary transition-transform duration-200 ease-out ${
              tokenMenu ? "translate-x-full" : "translate-x-0"
            }`}
          />
          {(
            [
              [false, t("pos.menuMain")],
              [true, t("pos.menuTokens")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              onClick={() => onTokenMenu(value)}
              aria-pressed={tokenMenu === value}
              className={`relative z-10 flex-1 rounded-full py-2 text-xs font-bold transition-colors duration-200 ${
                tokenMenu === value
                  ? "text-white"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {[{ id: 0, name: t("common.all") }, ...categories].map((c) => (
          <button
            key={c.id}
            onClick={() => onCategory(c.id)}
            className={`shrink-0 rounded-full border px-[18px] py-[11px] text-[13px] font-bold whitespace-nowrap transition-colors ${
              categoryId === c.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-background text-text-secondary hover:text-text-primary"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-error/40 bg-error/5 px-4 py-3 text-sm text-error"
        >
          {error}
        </p>
      )}

      {!session ? (
        <p className="py-16 text-center text-sm text-text-muted">
          {t("pos.loginRequired")}
        </p>
      ) : loading ? (
        <p className="py-16 text-center text-sm text-text-muted">
          {t("pos.loadingMenu")}
        </p>
      ) : products.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-muted">
          {t("pos.emptyCategory")}
        </p>
      ) : (
        <div className="scrollbar-none grid min-h-0 flex-1 auto-rows-[268px] grid-cols-2 gap-4 overflow-y-auto pb-1 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="relative">
              <button
                type="button"
                onClick={() => onPick(p)}
                disabled={p.soldOut}
                aria-label={t("pos.addToOrder", { name: p.name })}
                className={`flex size-full flex-col overflow-hidden rounded-2xl bg-background text-left shadow-[0_10px_28px_rgba(68,38,25,0.08)] transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  p.soldOut
                    ? "opacity-60"
                    : "hover:shadow-[0_14px_34px_rgba(68,38,25,0.14)]"
                }`}
              >
                <div className="relative h-[160px] w-full shrink-0 overflow-hidden bg-surface-warm">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria
                    <img
                      src={p.image}
                      alt=""
                      className={`size-full object-cover ${p.soldOut ? "grayscale" : ""}`}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-text-muted">
                      <Soup size={36} aria-hidden />
                    </div>
                  )}
                  {p.soldOut && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-extrabold tracking-widest text-white uppercase">
                      {t("products.soldOut")}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2.5 font-extrabold text-text-primary">
                    <p className="min-w-0 flex-1 truncate text-[17px]">
                      {p.name}
                    </p>
                    <p className="pt-0.5 text-xs whitespace-nowrap">
                      {tokenMode
                        ? t("pos.tokenCount", { n: p.tokenCost })
                        : fmt.format(p.price)}
                    </p>
                  </div>
                  <p className="line-clamp-2 text-xs leading-[1.35] font-semibold text-text-secondary">
                    {p.description}
                  </p>
                </div>
              </button>
              {channel === "POS" && (
                <button
                  type="button"
                  onClick={() => onToggleSoldOut(p)}
                  aria-pressed={p.soldOut}
                  aria-label={
                    p.soldOut
                      ? t("pos.markAvailableAria", { name: p.name })
                      : t("pos.markSoldOutAria", { name: p.name })
                  }
                  title={
                    p.soldOut
                      ? t("pos.markAvailable")
                      : t("pos.markSoldOut")
                  }
                  className={`absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    p.soldOut
                      ? "bg-error text-white"
                      : "bg-white/90 text-text-secondary hover:text-error"
                  }`}
                >
                  <CircleSlash size={15} aria-hidden />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
