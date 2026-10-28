import type { Prefs } from "./prefs";

let queue: Promise<boolean> = Promise.resolve(true);

async function send(patch: Prefs): Promise<boolean> {
  try {
    const res = await fetch("/api/prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Writes go one at a time so each request merges into the cookie set by the previous one.
export function savePrefs(patch: Prefs): Promise<boolean> {
  queue = queue.then(() => send(patch));
  return queue;
}
