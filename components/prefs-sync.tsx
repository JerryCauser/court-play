"use client";

import { useEffect } from "react";
import { RENEW_AFTER, type Prefs } from "@/lib/prefs";
import { savePrefs } from "@/lib/save-prefs";

// Re-issues the prefs cookie once it is older than RENEW_AFTER.
export function PrefsSync({ prefs, issuedAt }: { prefs: Prefs; issuedAt: number }) {
  useEffect(() => {
    if (Object.keys(prefs).length > 0 && Date.now() - issuedAt > RENEW_AFTER) void savePrefs(prefs);
  }, [prefs, issuedAt]);
  return null;
}
