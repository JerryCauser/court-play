import { textOn } from "@/lib/color";
import type { Player } from "@/lib/state";

export function PlayerChip({ player, muted }: { player: Player | undefined; muted?: boolean }) {
  if (!player) return <span className="chip">?</span>;
  return (
    <span
      className={muted ? "chip muted-chip" : "chip"}
      style={muted ? { borderColor: player.color } : { background: player.color, color: textOn(player.color) }}
    >
      {player.name}
    </span>
  );
}
