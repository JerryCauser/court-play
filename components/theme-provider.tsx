"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { savePrefs } from "@/lib/save-prefs";
import { manifestHref, themeColorMeta, type Theme } from "@/lib/theme";

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
  return (
    <ThemeContext.Provider value={value}>
      <ThemeChrome theme={theme} />
      {children}
    </ThemeContext.Provider>
  );
}

let darkQuery: MediaQueryList | undefined;
const getDarkQuery = () => (darkQuery ??= matchMedia("(prefers-color-scheme: dark)"));

function subscribeColorScheme(onChange: () => void) {
  const mq = getDarkQuery();
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getColorScheme = () => (getDarkQuery().matches ? "dark" : "light");

// Browser chrome that follows the active theme. React hoists these into <head> and keeps them in sync with state.
function ThemeChrome({ theme }: { theme: Theme }) {
  const systemScheme = useSyncExternalStore(subscribeColorScheme, getColorScheme, () => null);
  return (
    <>
      {themeColorMeta(theme).map(({ media, color }) => (
        <meta key={media} name="theme-color" media={media} content={color} />
      ))}
      <link rel="manifest" href={manifestHref(theme === "system" ? systemScheme : theme)} />
    </>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeProvider is missing");
  return ctx;
}
