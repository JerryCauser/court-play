import type { Snapshot } from "./types";

const KEY = "court-play:events";
const EMPTY: LocalEvent[] = [];

export type LocalEvent = { id: string; name: string; seenAt: number; createdAt?: number };

const listeners = new Set<() => void>();
const backfillTried = new Set<string>();
let cachedRaw: string | null = null;
let cachedList: LocalEvent[] = EMPTY;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function listTime(e: LocalEvent): number {
  return e.createdAt ?? e.seenAt;
}

function parse(raw: string | null): LocalEvent[] {
  if (!raw) return EMPTY;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as LocalEvent[]).slice().sort((a, b) => listTime(b) - listTime(a)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getLocalEvents(): LocalEvent[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedList = parse(raw);
  }
  return cachedList;
}

export function getServerLocalEvents(): LocalEvent[] {
  return EMPTY;
}

export function subscribeLocalEvents(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function save(list: LocalEvent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    return;
  }
  listeners.forEach((l) => l());
}

export function rememberEvent(id: string, name: string, createdAt?: number) {
  const list = getLocalEvents();
  const known = createdAt ?? list.find((e) => e.id === id)?.createdAt;
  save([{ id, name, seenAt: Date.now(), createdAt: known }, ...list.filter((e) => e.id !== id)]);
}

export function forgetEvent(id: string) {
  save(getLocalEvents().filter((e) => e.id !== id));
}

export function importEvents(incoming: LocalEvent[]) {
  const byId = new Map(getLocalEvents().map((e) => [e.id, e]));
  for (const e of incoming) {
    const cur = byId.get(e.id);
    const newest = !cur || e.seenAt > cur.seenAt ? e : cur;
    byId.set(e.id, { ...newest, createdAt: e.createdAt ?? cur?.createdAt });
  }
  save([...byId.values()]);
}

export function replaceEvents(list: LocalEvent[]) {
  save(list);
}

async function fetchCreatedAt(id: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/events/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const { createdAt } = (await res.json()) as Snapshot;
    const at = createdAt ? Date.parse(createdAt) : NaN;
    return Number.isNaN(at) ? null : at;
  } catch {
    return null;
  }
}

export async function backfillCreatedAt() {
  const ids = getLocalEvents()
    .filter((e) => e.createdAt === undefined && !backfillTried.has(e.id))
    .map((e) => e.id);
  if (ids.length === 0) return;
  ids.forEach((id) => backfillTried.add(id));

  const dates = new Map<string, number>();
  await Promise.all(
    ids.map(async (id) => {
      const at = await fetchCreatedAt(id);
      if (at !== null) dates.set(id, at);
    }),
  );
  if (dates.size === 0) return;
  save(getLocalEvents().map((e) => (dates.has(e.id) ? { ...e, createdAt: dates.get(e.id) } : e)));
}
