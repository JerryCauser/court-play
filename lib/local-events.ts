const KEY = "court-play:events";
const EMPTY: LocalEvent[] = [];

export type LocalEvent = { id: string; name: string; seenAt: number };

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedList: LocalEvent[] = EMPTY;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): LocalEvent[] {
  if (!raw) return EMPTY;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as LocalEvent[]).slice().sort((a, b) => b.seenAt - a.seenAt) : EMPTY;
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

export function rememberEvent(id: string, name: string) {
  const list = getLocalEvents().filter((e) => e.id !== id);
  save([{ id, name, seenAt: Date.now() }, ...list]);
}

export function forgetEvent(id: string) {
  save(getLocalEvents().filter((e) => e.id !== id));
}
