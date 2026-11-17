export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}

export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}

// Page background, also used for the browser/OS chrome (theme-color, manifest) so the status bar blends in.
// Single source of truth for the values: themeBgCss() exposes them to globals.css, which owns the theme selectors.
export const THEME_COLORS = { light: "#f6f7f9", dark: "#0f1115" } as const;

type ColorScheme = keyof typeof THEME_COLORS;

const SCHEMES = ["light", "dark"] as const satisfies readonly ColorScheme[];

export function themeBgCss(): string {
  return `:root{--bg-light:${THEME_COLORS.light};--bg-dark:${THEME_COLORS.dark}}`;
}

export function themeColorMeta(theme: Theme) {
  return SCHEMES.map((scheme) => ({
    media: `(prefers-color-scheme: ${scheme})`,
    color: THEME_COLORS[theme === "system" ? scheme : theme],
  }));
}

// The server can't see the OS scheme, so "system" starts without ?scheme (light) until the client knows it.
export function manifestHref(scheme: ColorScheme | null): string {
  return scheme ? `/manifest.webmanifest?scheme=${scheme}` : "/manifest.webmanifest";
}
