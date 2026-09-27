import type { EventState } from "./state.ts";

export type Remote = { state: EventState; ikey: string };
export type WriteResult = { ok: true; ikey: string } | { ok: false; conflict: Remote };

function url(id: string): string {
  return `/api/events/${id}`;
}

async function write(id: string, method: "POST" | "PUT", body: unknown): Promise<WriteResult> {
  const res = await fetch(url(id), {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 409) return { ok: false, conflict: (await res.json()) as Remote };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { ikey: string };
  return { ok: true, ikey: data.ikey };
}

export async function loadEvent(id: string): Promise<Remote | null> {
  const res = await fetch(url(id), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Remote;
}

export function createEvent(id: string, state: EventState, ikey: string): Promise<WriteResult> {
  return write(id, "POST", { state, ikey });
}

export function saveEvent(id: string, state: EventState, expected: string, next: string): Promise<WriteResult> {
  return write(id, "PUT", { state, expected, next });
}
