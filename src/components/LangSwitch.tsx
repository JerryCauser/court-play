"use client";

import { LANGS } from "@/lib/i18n";
import { useI18n } from "./I18n";

export function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="segmented small" role="group" aria-label={t.language}>
      {LANGS.map((l) => (
        <button key={l} type="button" aria-pressed={l === lang} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
