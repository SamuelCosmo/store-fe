"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "store.theme";

// Lee/escribe la clase .dark en <html>; el script inline de layout.tsx
// aplica el tema guardado antes del primer paint para evitar el flash.
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  // setTimeout: leer el DOM tras hidratar sin bloquear el render inicial
  useEffect(() => {
    const t = setTimeout(
      () => setDark(document.documentElement.classList.contains("dark")),
      0,
    );
    return () => clearTimeout(t);
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(KEY, next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={dark ? "Tema claro" : "Tema oscuro"}
      className="flex size-10 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {/* null hasta hidratar — el icono correcto aparece en el primer effect */}
      {dark ? (
        <Sun size={17} aria-hidden strokeWidth={2.5} />
      ) : (
        <Moon size={17} aria-hidden strokeWidth={2.5} />
      )}
    </button>
  );
}
