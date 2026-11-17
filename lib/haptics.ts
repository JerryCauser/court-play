const PATTERNS = {
  tap: 8,
  success: [12, 60, 24],
  warning: [24, 40, 24],
} satisfies Record<string, number | number[]>;

export type HapticKind = keyof typeof PATTERNS;

export function isHapticKind(v: unknown): v is HapticKind {
  return typeof v === "string" && Object.hasOwn(PATTERNS, v);
}

const TICK_EVENTS = ["click", "input", "change"] as const;
const FOCUS_EVENTS = ["focus", "blur", "focusin", "focusout"] as const;

// iOS Safari has no Vibration API, but clicking the <label> of an <input switch> plays a system haptic tick (iOS 18+).
// The tick only plays inside a user gesture, so iOS gets one tick for every kind — no timed patterns — and it has
// to run synchronously within the user's click. The switch is rendered (visually hidden, not display:none, which
// WebKit may skip) and removed right after.
// Side effects are contained: the switch's own click/input/change and every focus event fired during the tick are
// stopped at window capture, before any app listener (React's root included) sees them; that doesn't cancel the
// toggle. If label activation moved focus to the switch, focus goes back to where the user tapped.
function iosTick() {
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);

  const swallowOwn = (e: Event) => {
    if (e.target instanceof Node && label.contains(e.target)) e.stopImmediatePropagation();
  };
  // Synchronous window: any focus event now is caused by the tick, wherever it lands.
  const swallowFocus = (e: Event) => e.stopImmediatePropagation();
  for (const type of TICK_EVENTS) window.addEventListener(type, swallowOwn, true);
  for (const type of FOCUS_EVENTS) window.addEventListener(type, swallowFocus, true);

  const focused = document.activeElement;
  document.body.appendChild(label);
  try {
    label.click();
    if (focused instanceof HTMLElement && document.activeElement !== focused) focused.focus({ preventScroll: true });
  } finally {
    label.remove();
    for (const type of TICK_EVENTS) window.removeEventListener(type, swallowOwn, true);
    for (const type of FOCUS_EVENTS) window.removeEventListener(type, swallowFocus, true);
  }
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

/** Whether this device can give haptic feedback at all (touch device with the Vibration API, or iOS). */
export function hapticsSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return (typeof navigator.vibrate === "function" && navigator.maxTouchPoints > 0) || isIOS();
}

// The user's on/off preference, set by HapticsProvider. Kept here so direct haptic() calls respect it too.
let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

// The iOS tick briefly involves another focusable control, which could disturb native form-control UI (e.g. close a
// <select> picker), so on iOS form controls get no haptic.
const IOS_SKIP = "select, input, textarea";

/** `target` is the control the user activated, if any; it decides whether the iOS fallback is safe to run. */
export function haptic(kind: HapticKind = "tap", target?: Element) {
  if (!enabled || typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(PATTERNS[kind]);
    else if (isIOS() && !target?.matches(IOS_SKIP)) iosTick();
  } catch {
    // Haptics are best-effort.
  }
}
