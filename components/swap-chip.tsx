"use client";

import type { Game, Player } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { PlayerChip } from "./player-chip";

type Props = {
  id: string;
  side: 0 | 1;
  game: Game;
  players: Map<string, Player>;
  onSwap: (to: string) => void;
};

export function SwapChip({ id, side, game, players, onSwap }: Props) {
  const { t } = useI18n();
  const player = players.get(id);
  const inGame = new Set([...game.teams.flat(), ...game.bench]);
  const opponents = game.teams[side === 0 ? 1 : 0];
  const outside = [...players.values()].filter((p) => !inGame.has(p.id));
  const name = (pid: string) => players.get(pid)?.name || "?";

  return (
    <label className="swappable">
      <PlayerChip player={player} />
      <select
        value={id}
        aria-label={t("replace", { name: name(id) })}
        onChange={(e) => onSwap(e.target.value)}
      >
        <option value={id}>{name(id)}</option>
        <optgroup label={t("opponents")}>
          {opponents.map((pid) => (
            <option key={pid} value={pid}>
              {name(pid)}
            </option>
          ))}
        </optgroup>
        {game.bench.length > 0 && (
          <optgroup label={t("bench")}>
            {game.bench.map((pid) => (
              <option key={pid} value={pid}>
                {name(pid)}
              </option>
            ))}
          </optgroup>
        )}
        {outside.length > 0 && (
          <optgroup label={t("notInGame")}>
            {outside.map((p) => (
              <option key={p.id} value={p.id}>
                {p.active ? p.name || "?" : `${p.name || "?"} (${t("resting").toLowerCase()})`}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
