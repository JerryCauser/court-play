"use client";

import { useSyncExternalStore } from "react";
import { hapticsSupported } from "@/lib/haptics";
import { useHaptics } from "./haptics-provider";
import { useI18n } from "./i18n-provider";

const noSubscribe = () => () => {};

export function HapticsSwitch() {
  const { t } = useI18n();
  const { enabled, setEnabled } = useHaptics();
  // Always rendered so the footer doesn't shift. Capability is only known on the client, so the switch starts
  // disabled and off, and comes alive after hydration on devices that can vibrate.
  const supported = useSyncExternalStore(noSubscribe, hapticsSupported, () => false);
  const on = supported && enabled;
  const label = `${t("haptics")}: ${t(on ? "hapticsOn" : "hapticsOff")}`;
  return (
    <button
      className="btn ghost icon small-icon"
      type="button"
      aria-pressed={on}
      disabled={!supported}
      onClick={() => setEnabled(!enabled)}
      aria-label={label}
      title={label}
    >
      <VibrateIcon on={on} />
    </button>
  );
}

// Monochrome (currentColor) to match the other footer glyphs: a phone with vibration marks, or crossed out when off.
function VibrateIcon({ on }: { on: boolean }) {
  return (
    <svg className="vibrate-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="8" y="4" width="8" height="16" rx="1.8" />
      {on ? <path d="M4.8 8.5v7M2 10.5v3M19.2 8.5v7M22 10.5v3" /> : <path d="M3.5 3.5l17 17" />}
    </svg>
  );
}
