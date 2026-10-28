import { isLocale, type Locale } from "./i18n";
import { toProfile, type Profile } from "./profile";
import { isTheme, type Theme } from "./theme";

export const PREFS_COOKIE = "prefs";

// Browsers cap cookie lifetime at 400 days; the client re-issues it once it is older than RENEW_AFTER.
const MAX_AGE = 400 * 24 * 60 * 60;
export const RENEW_AFTER = 30 * 24 * 60 * 60 * 1000;

export type Prefs = { profile?: Profile; lang?: Locale; theme?: Theme };

export type StoredPrefs = { prefs: Prefs; at: number };

function pick(v: Record<string, unknown>): { prefs: Prefs; valid: boolean } {
  const prefs: Prefs = {};
  let valid = true;
  if (v.profile !== undefined) {
    const profile = toProfile(v.profile);
    if (profile) prefs.profile = profile;
    else valid = false;
  }
  if (v.lang !== undefined) {
    if (isLocale(v.lang)) prefs.lang = v.lang;
    else valid = false;
  }
  if (v.theme !== undefined) {
    if (isTheme(v.theme)) prefs.theme = v.theme;
    else valid = false;
  }
  return { prefs, valid };
}

function parseObject(raw: string | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export function parsePrefsCookie(raw: string | undefined): StoredPrefs | null {
  const v = parseObject(raw);
  if (!v) return null;
  return { prefs: pick(v).prefs, at: typeof v.at === "number" && Number.isFinite(v.at) ? v.at : 0 };
}

export function parsePrefsPatch(raw: string): Prefs | null {
  const v = parseObject(raw);
  if (!v) return null;
  const { prefs, valid } = pick(v);
  return valid ? prefs : null;
}

export function prefsCookie(prefs: Prefs) {
  return {
    name: PREFS_COOKIE,
    value: JSON.stringify({ ...prefs, at: Date.now() }),
    maxAge: MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
