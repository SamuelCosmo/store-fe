"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import es from "./i18n/es.json";
import en from "./i18n/en.json";

export type Lang = "es" | "en";

const LANG_KEY = "store.lang";

const dict = { es, en } as const;

export type TKey = keyof typeof es;
export type TParams = Record<string, string | number>;

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, params?: TParams) => string;
}>({ lang: "es", setLang: () => {}, t: (key) => es[key] });

function translate(lang: Lang, key: TKey, params?: TParams): string {
  const raw = dict[lang][key] ?? dict.es[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] != null ? String(params[name]) : `{${name}}`,
  );
}

// Para código fuera de React (lib/api): lee el idioma guardado directo
export function translateNow(key: TKey, params?: TParams): string {
  const stored =
    typeof window !== "undefined" ? localStorage.getItem(LANG_KEY) : null;
  return translate(stored === "en" ? "en" : "es", key, params);
}

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
    document.documentElement.lang = lang;
  }

  return (
    <LangContext.Provider
      value={{ lang, setLang, t: (key, params) => translate(lang, key, params) }}
    >
      {children}
    </LangContext.Provider>
  );
}

export function useI18n() {
  return useContext(LangContext);
}
