import type { EventState, Snapshot } from "./types";

export type EventSnapshot = { id: string; state: EventState; at: number };

/** Fetches the given events from the server, oldest first; missing ones are skipped. */
export async function loadSnapshots(events: { id: string; seenAt: number }[]): Promise<EventSnapshot[]> {
  const results = await Promise.all(
    events.map(async (e): Promise<EventSnapshot | null> => {
      try {
        const res = await fetch(`/api/events/${e.id}`, { cache: "no-store" });
        if (!res.ok) return null;
        const snapshot = (await res.json()) as Snapshot;
        const created = snapshot.createdAt ? Date.parse(snapshot.createdAt) : NaN;
        return { id: e.id, state: snapshot.state, at: Number.isNaN(created) ? e.seenAt : created };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r) => r !== null).sort((a, b) => a.at - b.at);
}
