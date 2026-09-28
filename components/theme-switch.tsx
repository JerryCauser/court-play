"use client";

import type { Dict } from "@/lib/i18n";
import { nextTheme, type Theme } from "@/lib/theme";
import { useI18n } from "./i18n-provider";
import { useTheme } from "./theme-provider";

const ICON: Record<Theme, string> = { system: "◐", light: "☀", dark: "☾" };
const LABEL: Record<Theme, keyof Dict> = { system: "themeSystem", light: "themeLight", dark: "themeDark" };

export function ThemeSwitch() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const label = `${t("theme")}: ${t(LABEL[theme])}`;
  return (
    <button
      className="btn ghost icon small-icon"
      type="button"
      onClick={() => setTheme(nextTheme(theme))}
      aria-label={label}
      title={label}
    >
      {ICON[theme]}
    </button>
  );
}
