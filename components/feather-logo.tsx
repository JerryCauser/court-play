"use client";

import { useId } from "react";

// The brand mark: the same feather as the app icon (public/icons/icon.svg), themed via CSS variables so it
// works on light and dark backgrounds.
export function FeatherLogo() {
  const mask = useId();
  return (
    <svg className="feather-logo" viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
          <rect width="512" height="512" fill="#fff" />
          <path d="M356 190L300 222L352 214Z M346 268L292 300L336 292Z M198 248L250 270L204 262Z M214 318L258 336L226 334Z" fill="#000" />
        </mask>
      </defs>
      <g transform="translate(256 256) scale(1.42) translate(-270 -274) rotate(32 256 256)">
        <path
          className="feather-vane"
          d="M300 78C350 128 356 236 306 330C292 356 274 370 258 376C232 352 200 300 206 226C212 156 252 106 300 78Z"
          mask={`url(#${mask})`}
        />
        <path className="feather-shaft" d="M254 452C254 360 262 240 298 92" />
      </g>
    </svg>
  );
}
