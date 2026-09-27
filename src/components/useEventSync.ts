"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadEvent, saveEvent } from "@/lib/api";
import { apply, type Action, type EventState } from "@/lib/state";

export type Status = "loading" | "missing" | "error" | "ready";
export type SaveStatus = "idle" | "saving" | "saved" | "offline";

const SAVE_DELAY = 500;
const RETRY_DELAY = 3000;
const POLL_INTERVAL = 30000;

type Pending = { state: EventState; next: string };

export function useEventSync(id: string) {
  const [status, setStatus] = useState<Status>("loading");
  const [state, setState] = useState<EventState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [conflict, setConflict] = useState(false);

  const stateRef = useRef<EventState | null>(null);
  const ikeyRef = useRef<string | null>(null);
  const savedRef = useRef<EventState | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const inflightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const replace = useCallback((next: EventState, ikey: string) => {
    stateRef.current = next;
    savedRef.current = next;
    ikeyRef.current = ikey;
    setState(next);
  }, []);

  const isDirty = () => stateRef.current !== savedRef.current;

  const flush = useCallback(async (): Promise<void> => {
    if (inflightRef.current || !stateRef.current || !ikeyRef.current) return;
    if (!pendingRef.current) {
      if (!isDirty()) return;
      pendingRef.current = { state: stateRef.current, next: crypto.randomUUID() };
    }
    const pending = pendingRef.current;
    inflightRef.current = true;
    setSaveStatus("saving");
    try {
      const result = await saveEvent(id, pending.state, ikeyRef.current, pending.next);
      pendingRef.current = null;
      if (result.ok) {
        ikeyRef.current = result.ikey;
        savedRef.current = pending.state;
        setSaveStatus("saved");
      } else {
        replace(result.conflict.state, result.conflict.ikey);
        setConflict(true);
        setSaveStatus("idle");
      }
    } catch {
      setSaveStatus("offline");
      inflightRef.current = false;
      timerRef.current = setTimeout(() => void flush(), RETRY_DELAY);
      return;
    }
    inflightRef.current = false;
    if (isDirty()) void flush();
  }, [id, replace]);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), SAVE_DELAY);
  }, [flush]);

  const dispatch = useCallback(
    (action: Action | ((s: EventState) => Action | null)) => {
      const current = stateRef.current;
      if (!current) return;
      const resolved = typeof action === "function" ? action(current) : action;
      if (!resolved) return;
      const next = apply(current, resolved);
      if (next === current) return;
      stateRef.current = next;
      setState(next);
      setConflict(false);
      schedule();
    },
    [schedule],
  );

  const load = useCallback(async () => {
    try {
      const remote = await loadEvent(id);
      if (!remote) {
        setStatus((s) => (s === "ready" ? s : "missing"));
        return;
      }
      if (remote.ikey !== ikeyRef.current && !isDirty() && !inflightRef.current && !pendingRef.current) {
        replace(remote.state, remote.ikey);
      }
      setStatus("ready");
    } catch {
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, [id, replace]);

  useEffect(() => {
    void load();
    const poll = () => {
      if (document.visibilityState === "visible") void load();
    };
    const interval = setInterval(poll, POLL_INTERVAL);
    document.addEventListener("visibilitychange", poll);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty() || pendingRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
      window.removeEventListener("beforeunload", beforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  return { status, state, saveStatus, conflict, dispatch, reload: load, dismissConflict: () => setConflict(false) };
}
