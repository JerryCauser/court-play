"use client";

import { useEffect } from "react";
import { haptic, isHapticKind } from "@/lib/haptics";

const TARGETS =
  'button, a[href], [role="button"], [role="switch"], [role="tab"], select, input[type="checkbox"], input[type="radio"], summary';

// One delegated listener gives every interactive control a light tap.
// A control can opt into another kind with data-haptic="success|warning" or out with data-haptic="none".
// Actions behind a confirm() should keep the default tap and call haptic() themselves once confirmed.
export function HapticFeedback() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!e.isTrusted || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(TARGETS);
      if (!el || el.matches(":disabled, [aria-disabled='true']")) return;
      const kind = el.closest<HTMLElement>("[data-haptic]")?.dataset.haptic ?? "tap";
      if (kind === "none") return;
      if (!isHapticKind(kind) && process.env.NODE_ENV !== "production") {
        console.warn(`Unknown data-haptic="${kind}", falling back to "tap"`, el);
      }
      haptic(isHapticKind(kind) ? kind : "tap", el);
    };
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
