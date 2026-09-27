export type SavedEvent = { id: string; name: string; openedAt: number };

const KEY = "court-play:events";

export function listEvents(): SavedEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as SavedEvent[]).sort((a, b) => b.openedAt - a.openedAt) : [];
  } catch {
    return [];
  }
}

function persist(list: SavedEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
}

export function rememberEvent(id: string, name: string): void {
  persist([{ id, name, openedAt: Date.now() }, ...listEvents().filter((e) => e.id !== id)]);
}

export function renameSaved(id: string, name: string): void {
  const list = listEvents();
  const item = list.find((e) => e.id === id);
  if (!item || item.name === name) return;
  item.name = name;
  persist(list);
}

export function forgetEvent(id: string): void {
  persist(listEvents().filter((e) => e.id !== id));
}
