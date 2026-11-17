"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { haptic, setHapticsEnabled } from "@/lib/haptics";
import { savePrefs } from "@/lib/save-prefs";

type Ctx = { enabled: boolean; setEnabled: (on: boolean) => void };

const HapticsContext = createContext<Ctx | null>(null);

export function HapticsProvider({ initial, children }: { initial: boolean; children: ReactNode }) {
  const [enabled, setEnabledState] = useState(initial);

  // Before paint, so the first tap already respects a stored "off".
  useLayoutEffect(() => setHapticsEnabled(enabled), [enabled]);

  const setEnabled = useCallback((on: boolean) => {
    setHapticsEnabled(on);
    setEnabledState(on);
    void savePrefs({ haptics: on });
    // Confirms the switch with a tap; the click itself went unbuzzed while haptics were off.
    if (on) haptic("tap");
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);
  return <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>;
}

export function useHaptics(): Ctx {
  const ctx = useContext(HapticsContext);
  if (!ctx) throw new Error("HapticsProvider is missing");
  return ctx;
}
