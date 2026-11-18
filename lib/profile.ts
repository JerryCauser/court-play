import { isPlayPrefs, playPrefs, samePlayPrefs, type PlayPrefs } from "./play-prefs";
import { isUuid } from "./uuid";
import { isColor } from "./validate";

export type Profile = { id: string; name: string; color: string } & PlayPrefs;

export function isProfile(v: unknown): v is Profile {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return isUuid(p.id) && typeof p.name === "string" && p.name.trim().length > 0 && p.name.length <= 40 && isColor(p.color) && isPlayPrefs(p);
}

export function toProfile(v: unknown): Profile | null {
  return isProfile(v) ? { id: v.id.toLowerCase(), name: v.name, color: v.color, ...playPrefs(v) } : null;
}

export function sameProfile(a: Profile, b: Profile): boolean {
  return a.id === b.id && a.name === b.name && a.color === b.color && samePlayPrefs(a, b);
}
