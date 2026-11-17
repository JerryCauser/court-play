"use client";

import { useEffect } from "react";

const IDLE_MS = 2 * 60 * 1000;

// Keeps the screen on while the user is interacting, and lets it sleep after IDLE_MS of inactivity.
export function WakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let disposed = false;
    let sentinel: WakeLockSentinel | null = null;
    let requesting = false;
    // Set when the browser refuses the lock despite a user gesture (battery saver, permissions policy);
    // cleared when the tab is shown again. Refusals without a gesture (page load) are retried on the next click.
    let denied = false;
    let lastActivity = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const idle = () => Date.now() - lastActivity >= IDLE_MS;

    const release = () => {
      const s = sentinel;
      sentinel = null;
      s?.release().catch(() => {});
    };

    // withGesture: the request is made under user activation, so a refusal is a real policy denial worth latching.
    const acquire = async (withGesture: boolean) => {
      if (disposed || denied || sentinel || requesting || document.visibilityState !== "visible") return;
      requesting = true;
      try {
        const s = await navigator.wakeLock.request("screen");
        s.addEventListener("release", () => {
          if (sentinel === s) sentinel = null;
        });
        sentinel = s;
        if (disposed || idle()) release();
      } catch {
        if (withGesture) denied = true;
      } finally {
        requesting = false;
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(release, IDLE_MS);
    };

    // Only clicks count as activity: one cheap listener, and a trusted click always carries user activation,
    // which Safari needs before it hands out the lock. Scrolling or typing alone doesn't extend the deadline.
    const onClick = (e: MouseEvent) => {
      if (!e.isTrusted) return;
      lastActivity = Date.now();
      schedule();
      void acquire(true);
    };

    // The browser drops the lock when the tab is hidden; take it back on return if the user was recently active.
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      denied = false;
      if (!idle()) void acquire(false);
    };

    // Page load counts as activity; browsers that don't need a gesture grant the lock right away.
    lastActivity = Date.now();
    schedule();
    void acquire(false);
    document.addEventListener("click", onClick, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timer);
      release();
    };
  }, []);
  return null;
}
