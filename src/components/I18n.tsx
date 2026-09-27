"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { DICTS, LANG_COOKIE, type Dict, type Lang } from "@/lib/i18n";

type Ctx = { lang: Lang; t: Dict; setLang: (lang: Lang) => void };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((next: Lang) => {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    setLangState(next);
  }, []);
  return <I18nContext.Provider value={{ lang, t: DICTS[lang], setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nProvider is missing");
  return ctx;
}
