"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "es" | "en";

const LANG_KEY = "store.lang";

/** Superficie compartida migrada — pantallas enteras migran conforme toquen.
 *  Agregar la key a `es` primero; `en` debe llevar las mismas keys. */
const dict = {
  es: {
    "nav.dashboard": "Dashboard",
    "nav.categories": "Categorías",
    "nav.products": "Productos",
    "nav.stores": "Establecimientos",
    "nav.kitchen": "Cocina",
    "nav.orders": "Pedidos",
    "nav.users": "Usuarios",
    "nav.settings": "Configuración",
    "sidebar.subtitle": "Administración",
    "user.logout": "Cerrar sesión",
    "settings.language": "Idioma",
    "settings.language.hint": "Aplica solo a este equipo.",
    "role.ADMIN": "Administrador",
    "role.MANAGER": "Gerente",
    "role.EMPLOYEE": "Empleado",
    "role.CUSTOMER": "Cliente",
    "role.KITCHEN": "Cocina",
    "role.SUPERADMIN": "Plataforma",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.categories": "Categories",
    "nav.products": "Products",
    "nav.stores": "Stores",
    "nav.kitchen": "Kitchen",
    "nav.orders": "Orders",
    "nav.users": "Users",
    "nav.settings": "Settings",
    "sidebar.subtitle": "Administration",
    "user.logout": "Sign out",
    "settings.language": "Language",
    "settings.language.hint": "Applies to this device only.",
    "role.ADMIN": "Administrator",
    "role.MANAGER": "Manager",
    "role.EMPLOYEE": "Employee",
    "role.CUSTOMER": "Customer",
    "role.KITCHEN": "Kitchen",
    "role.SUPERADMIN": "Platform",
  },
} as const;

export type TKey = keyof (typeof dict)["es"];

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
}>({ lang: "es", setLang: () => {}, t: (key) => dict.es[key] });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const id = setTimeout(() => {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === "en" || stored === "es") setLangState(stored);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function setLang(lang: Lang) {
    localStorage.setItem(LANG_KEY, lang);
    setLangState(lang);
  }

  return (
    <LangContext.Provider
      value={{ lang, setLang, t: (key) => dict[lang][key] }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useI18n() {
  return useContext(LangContext);
}
