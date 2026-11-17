import type { MetadataRoute } from "next";
import type { NextRequest } from "next/server";
import { THEME_COLORS } from "@/lib/theme";

// A route handler rather than app/manifest.ts so the splash colour can follow ?scheme=, which ThemeChrome
// (components/theme-provider.tsx) keeps in sync with the active theme. Client hints aren't reliable here: Brave
// strips them and browser-initiated manifest fetches may omit them. GET handlers are dynamic by default (Next 15+).
export function GET(request: NextRequest) {
  const color = THEME_COLORS[request.nextUrl.searchParams.get("scheme") === "dark" ? "dark" : "light"];
  const manifest: MetadataRoute.Manifest = {
    id: "/",
    name: "Court Play",
    short_name: "Court Play",
    description: "Fair match rotation for badminton, tennis and other court games",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: color,
    theme_color: color,
    categories: ["sports", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
