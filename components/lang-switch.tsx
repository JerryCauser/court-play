"use client";

import { LOCALES } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";

export function LangSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="segmented small" role="group" aria-label="Language">
      {LOCALES.map((l) => (
        <button key={l} type="button" aria-pressed={l === locale} onClick={() => setLocale(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
