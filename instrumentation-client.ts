import { breadcrumb, report } from "@/lib/log";

breadcrumb("load", location.pathname + location.search);

window.addEventListener("error", (e) => {
  report("error", "js.error", e.message || String(e.error), {
    stack: e.error?.stack?.slice(0, 2000),
    source: `${e.filename}:${e.lineno}:${e.colno}`,
  });
});

window.addEventListener("unhandledrejection", (e) => {
  const reason = e.reason;
  report("error", "js.unhandledrejection", reason?.message ?? String(reason), {
    stack: reason?.stack?.slice(0, 2000),
  });
});

// qué tocó el usuario antes del error — solo el texto del botón/link
document.addEventListener(
  "click",
  (e) => {
    const el = (e.target as Element | null)?.closest?.("button,a,[role=button]");
    if (!el) return;
    const label = el.getAttribute("aria-label") || el.textContent || el.tagName;
    breadcrumb("click", label.trim().slice(0, 60));
  },
  true,
);

export function onRouterTransitionStart(url: string, navigationType: string) {
  breadcrumb("nav", `${navigationType} ${url}`);
}
