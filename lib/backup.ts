import { getLocalEvents, type LocalEvent } from "./local-events";
import { isProfile, type Profile } from "./profile";
import { isUuid } from "./uuid";

const APP = "court-play";

export type Backup = {
  app: typeof APP;
  v: 1;
  exportedAt: string;
  profile: Profile | null;
  events: LocalEvent[];
};

export function buildBackup(profile: Profile | null): Backup {
  return { app: APP, v: 1, exportedAt: new Date().toISOString(), profile, events: getLocalEvents() };
}

function isLocalEvent(v: unknown): v is LocalEvent {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return isUuid(e.id) && typeof e.name === "string" && e.name.length <= 80 && Number.isFinite(e.seenAt);
}

export function parseBackup(text: string): Backup | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const b = data as Record<string, unknown>;
  if (b.app !== APP || b.v !== 1) return null;
  if (!(b.profile === null || isProfile(b.profile))) return null;
  if (!Array.isArray(b.events) || !b.events.every(isLocalEvent)) return null;
  return {
    app: APP,
    v: 1,
    exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : "",
    profile: b.profile && { ...b.profile, id: b.profile.id.toLowerCase() },
    events: b.events.map((e) => ({ id: e.id.toLowerCase(), name: e.name, seenAt: e.seenAt })),
  };
}
