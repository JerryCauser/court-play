/** How a player likes to be scheduled. Set per player in an event, or in a profile and copied on join. */
export type PlayPrefs = {
  /** Most games in a row before a rest; DEFAULT_MAX_STREAK when missing. */
  maxStreak?: number;
  /** Owed play for games missed while away or before arriving, so they are made up later. */
  catchUp?: boolean;
};

export const DEFAULT_MAX_STREAK = 4;
export const STREAK_CHOICES = [1, 2, 3, 4, 5, 6] as const;
const MAX_STREAK_LIMIT = STREAK_CHOICES[STREAK_CHOICES.length - 1];

export function maxStreak(prefs: PlayPrefs): number {
  return prefs.maxStreak ?? DEFAULT_MAX_STREAK;
}

export function isMaxStreak(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_STREAK_LIMIT;
}

export function isPlayPrefs(v: Record<string, unknown>): boolean {
  return (v.maxStreak === undefined || isMaxStreak(v.maxStreak)) && (v.catchUp === undefined || typeof v.catchUp === "boolean");
}

/** Only the set fields, so objects stay small and compare cleanly. */
export function playPrefs(src: PlayPrefs): PlayPrefs {
  const out: PlayPrefs = {};
  if (src.maxStreak !== undefined && src.maxStreak !== DEFAULT_MAX_STREAK) out.maxStreak = src.maxStreak;
  if (src.catchUp) out.catchUp = true;
  return out;
}

export function samePlayPrefs(a: PlayPrefs, b: PlayPrefs): boolean {
  return maxStreak(a) === maxStreak(b) && Boolean(a.catchUp) === Boolean(b.catchUp);
}

/** Replaces the play preferences of `target` with `prefs`, dropping fields `prefs` leaves unset. */
export function withPlayPrefs<T extends PlayPrefs>(target: T, prefs: PlayPrefs): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping the old values
  const { maxStreak, catchUp, ...rest } = target;
  return { ...rest, ...playPrefs(prefs) } as T;
}
