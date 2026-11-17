import { FORMATS, isFormatId, isSport, type FormatId, type Sport } from "./scoring";
import type { EventState, TeamSize } from "./types";
import { MAX_COURTS } from "./validate";

// Last event settings this person picked; new events start from them.
const KEY = "court-play:event-defaults";

export type EventDefaults = { sport?: Sport; teamSize?: TeamSize; format?: FormatId; balance?: boolean; courts?: number };

export function loadEventDefaults(): EventDefaults {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, unknown> | null;
    if (!v || typeof v !== "object") return {};
    const out: EventDefaults = {};
    if (isSport(v.sport)) out.sport = v.sport;
    if (v.teamSize === 1 || v.teamSize === 2) out.teamSize = v.teamSize;
    if (isFormatId(v.format) && (!out.sport || FORMATS[v.format].sports.includes(out.sport))) out.format = v.format;
    if (typeof v.balance === "boolean") out.balance = v.balance;
    if (Number.isInteger(v.courts) && (v.courts as number) >= 1 && (v.courts as number) <= MAX_COURTS) out.courts = v.courts as number;
    return out;
  } catch {
    return {};
  }
}

export function saveEventDefaults(state: EventState) {
  const defaults: EventDefaults = {
    sport: state.sport,
    teamSize: state.teamSize,
    format: state.format,
    balance: state.balance ?? false,
    courts: state.courts ?? 1,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(defaults));
  } catch {
    return;
  }
}

// Events created in this tab that should open their settings once.
const fresh = new Set<string>();

export function markFresh(id: string) {
  fresh.add(id);
}

export function isFresh(id: string): boolean {
  return fresh.has(id);
}

export function clearFresh(id: string) {
  fresh.delete(id);
}
