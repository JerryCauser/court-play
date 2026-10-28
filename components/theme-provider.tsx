"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { savePrefs } from "@/lib/save-prefs";
import type { Theme } from "@/lib/theme";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void };

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ initial, children }: { initial: Theme; children: ReactNode }) {
  const [theme, setThemeState] = useState(initial);

  const setTheme = useCallback((t: Theme) => {
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    setThemeState(t);
    void savePrefs({ theme: t });
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeProvider is missing");
  return ctx;
}
