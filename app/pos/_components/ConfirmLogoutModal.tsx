"use client";

import { Modal } from "@/components/molecules/Modal";
import { logoutSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";

/** Confirmación de cierre de sesión — advierte si hay pedido sin cobrar. */
export function ConfirmLogoutModal({
  open,
  cartHasItems,
  onClose,
}: {
  open: boolean;
  cartHasItems: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Modal open={open} onClose={onClose} title={t("user.logout")}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <TriangleAlert
            size={22}
            className="mt-0.5 shrink-0 text-error"
            aria-hidden
          />
          <p className="text-sm leading-relaxed text-text-secondary">
            {t("common.confirmLogout")}
            {cartHasItems && t("common.confirmLogoutCart")}
          </p>
        </div>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface"
          >
            {t("common.back")}
          </button>
          <button
            type="button"
            onClick={() => {
              logoutSession();
              router.push("/");
            }}
            className="rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
          >
            {t("user.logout")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
