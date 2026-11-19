import type { ReactNode } from "react";

// Line icons in currentColor, sized by .icon-svg so the same glyph looks identical in any button.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function CloseIcon() {
  return (
    <Icon>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function RematchIcon() {
  return (
    <Icon>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4.5h-4.5" />
    </Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon>
      <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7M10 11v5M14 11v5" />
    </Icon>
  );
}

export function ShareIcon() {
  return (
    <Icon>
      <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" />
      <path d="M8 11H6v9.5h12V11h-2" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon>
      <path d="M5 12.5 10 17.5 19 7" />
    </Icon>
  );
}

export function FlagIcon() {
  return (
    <Icon>
      <path d="M6 21V4" />
      <path d="M6 4.5h11l-2.5 4 2.5 4H6" />
    </Icon>
  );
}

export function FullscreenIcon({ exit = false }: { exit?: boolean }) {
  return (
    <Icon>
      {exit ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      )}
    </Icon>
  );
}

export function BackIcon() {
  return (
    <Icon>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

export function TrophyIcon() {
  return (
    <Icon>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </Icon>
  );
}

export function UndoIcon() {
  return (
    <Icon>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Icon>
  );
}

export function TapIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7.5" opacity="0.6" />
    </Icon>
  );
}

export function SwapIcon() {
  return (
    <Icon>
      <path d="M7 4v15M7 4 4 7M7 4l3 3M17 20V5M17 20l-3-3M17 20l3-3" />
    </Icon>
  );
}

export function EndsIcon() {
  return (
    <Icon>
      <path d="M12 3v3M12 10v4M12 18v3" />
      <path d="M3 9h6M3 9l2.5-2.5M3 9l2.5 2.5M21 15h-6M21 15l-2.5-2.5M21 15l-2.5 2.5" />
    </Icon>
  );
}

export function OpenIcon() {
  return (
    <Icon>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Icon>
  );
}
