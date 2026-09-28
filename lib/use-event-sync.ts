"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EventState, Snapshot } from "./types";
import { uuid } from "./uuid";

export type SyncStatus = "saved" | "saving" | "offline" | "conflict" | "error";

const POLL_MS = 30_000;
const DEBOUNCE_MS = 400;
const RETRY_MS = 5_000;
const CONFLICT_MS = 3_000;

type Pending = { state: EventState; base: string; next: string };

type SyncRef = {
  ikey: string;
  local: EventState;
  dirty: boolean;
  busy: boolean;
  inflight: Pending | null;
  timer: ReturnType<typeof setTimeout> | undefined;
  statusTimer: ReturnType<typeof setTimeout> | undefined;
};

export function useEventSync(id: string, initial: Snapshot) {
  const [state, setState] = useState(initial.state);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const ref = useRef<SyncRef>({
    ikey: initial.ikey,
    local: initial.state,
    dirty: false,
    busy: false,
    inflight: null,
    timer: undefined,
    statusTimer: undefined,
  });
  const url = `/api/events/${id}`;

  const adopt = useCallback((snapshot: Snapshot) => {
    const r = ref.current;
    r.ikey = snapshot.ikey;
    r.local = snapshot.state;
    setState(snapshot.state);
  }, []);

  const flush = useCallback(async () => {
    const r = ref.current;
    clearTimeout(r.timer);
    if (r.busy) return;
    r.busy = true;
    try {
      while (r.inflight || r.dirty) {
        if (!r.inflight) {
          r.inflight = { state: r.local, base: r.ikey, next: uuid() };
          r.dirty = false;
        }
        setStatus("saving");
        let res: Response;
        let body: unknown;
        try {
          res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(r.inflight),
            cache: "no-store",
            keepalive: true,
          });
          body = await res.json();
        } catch {
          setStatus("offline");
          r.timer = setTimeout(() => void flushRef.current(), RETRY_MS);
          return;
        }
        if (res.status >= 500) {
          setStatus("offline");
          r.timer = setTimeout(() => void flushRef.current(), RETRY_MS);
          return;
        }
        if (res.ok) {
          r.ikey = (body as { ikey: string }).ikey;
          r.inflight = null;
          continue;
        }
        r.inflight = null;
        if (res.status === 409) {
          r.dirty = false;
          adopt(body as Snapshot);
          setStatus("conflict");
          clearTimeout(r.statusTimer);
          r.statusTimer = setTimeout(() => setStatus((s) => (s === "conflict" ? "saved" : s)), CONFLICT_MS);
          return;
        }
        setStatus("error");
        return;
      }
      setStatus("saved");
    } finally {
      r.busy = false;
    }
  }, [url, adopt]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const update = useCallback(
    (fn: (s: EventState) => EventState) => {
      const r = ref.current;
      const next = fn(r.local);
      if (next === r.local) return;
      r.local = next;
      r.dirty = true;
      setState(next);
      clearTimeout(r.timer);
      r.timer = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    const r = ref.current;
    const poll = async () => {
      if (document.hidden || r.busy || r.dirty || r.inflight) return;
      try {
        const res = await fetch(`${url}?ikey=${r.ikey}`, { cache: "no-store" });
        if (res.status !== 200) return;
        const snapshot = (await res.json()) as Snapshot;
        if (r.busy || r.dirty || r.inflight) return;
        adopt(snapshot);
        setStatus("saved");
      } catch {
        return;
      }
    };
    const onVisibility = () => {
      if (document.hidden) void flush();
      else void poll();
    };
    const onOnline = () => void flush();
    const timer = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(timer);
      clearTimeout(r.statusTimer);
      if (r.dirty) void flush();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [url, adopt, flush]);

  return { state, status, update };
}
