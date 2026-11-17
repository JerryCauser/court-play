import type { Sport } from "@/lib/scoring";

export function ServeIcon({ sport, title }: { sport: Sport; title: string }) {
  if (sport === "badminton") {
    return (
      <svg className="serve-icon shuttle" viewBox="0 0 24 24" role="img" aria-label={title}>
        <title>{title}</title>
        <g transform="rotate(-30 12 12)">
          <path d="M9.2 16.5 4 3.8Q12 1 20 3.8l-5.2 12.7Z" fill="var(--shuttle)" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M12 16.5V2.6M10.6 16.5 7.6 3.2M13.4 16.5l3-13.3" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
          <path d="M8.6 17h6.8v1.2a3.4 3.4 0 0 1-6.8 0Z" fill="var(--cork)" stroke="currentColor" strokeWidth="1.2" />
        </g>
      </svg>
    );
  }
  return (
    <svg className="serve-icon ball" viewBox="0 0 24 24" role="img" aria-label={title}>
      <title>{title}</title>
      <circle cx="12" cy="12" r="9" fill={sport === "padel" ? "var(--ball-padel)" : "var(--ball-tennis)"} stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.6 5.6Q10.5 12 5.6 18.4M18.4 5.6Q13.5 12 18.4 18.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
