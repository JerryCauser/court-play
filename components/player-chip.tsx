import type { CSSProperties } from "react";
import type { Player } from "@/lib/types";

export function PlayerChip({ player }: { player: Player | undefined }) {
  return (
    <span className="chip" style={{ "--c": player?.color ?? "#888888" } as CSSProperties}>
      <span className="dot" />
      <span className="chip-name">{player?.name || "?"}</span>
    </span>
  );
}
