"use client";

import { updateGame } from "@/lib/event";
import type { EventState, Game, Player } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { PlayerChip } from "./player-chip";

type Props = {
  game: Game;
  index: number;
  isLast: boolean;
  players: Map<string, Player>;
  update: (fn: (s: EventState) => EventState) => void;
};

export function GameCard({ game, index, isLast, players, update }: Props) {
  const { t } = useI18n();
  const change = (fn: (g: Game) => Game) => update((s) => updateGame(s, game.id, fn));

  const bump = (side: 0 | 1, delta: number) =>
    change((g) => {
      const score: [number, number] = [g.score[0], g.score[1]];
      score[side] = Math.min(999, Math.max(0, score[side] + delta));
      return { ...g, score };
    });

  const toggleWinner = (side: 0 | 1) => change((g) => ({ ...g, winner: g.winner === side ? null : side }));

  const remove = () => update((s) => ({ ...s, games: s.games.filter((g) => g.id !== game.id) }));

  return (
    <li className={`card game ${game.winner === null ? "" : "done"}`}>
      <div className="card-head">
        <h3>{t("game", { n: index + 1 })}</h3>
        {isLast && (
          <button className="btn ghost small" type="button" onClick={remove}>
            {t("deleteGame")}
          </button>
        )}
      </div>
      {([0, 1] as const).map((side) => (
        <div key={side} className={`team ${game.winner === side ? "won" : ""}`}>
          <div className="team-players">
            {game.teams[side].map((id) => (
              <PlayerChip key={id} player={players.get(id)} />
            ))}
          </div>
          <div className="score">
            <button className="btn icon" type="button" onClick={() => bump(side, -1)} aria-label="-1">
              −
            </button>
            <span className="score-value">{game.score[side]}</span>
            <button className="btn icon" type="button" onClick={() => bump(side, 1)} aria-label="+1">
              +
            </button>
          </div>
          <button
            className={`btn small win ${game.winner === side ? "primary" : "ghost"}`}
            type="button"
            aria-pressed={game.winner === side}
            onClick={() => toggleWinner(side)}
          >
            {game.winner === side ? `🏆 ${t("winner")}` : t("setWinner")}
          </button>
        </div>
      ))}
      {game.bench.length > 0 && (
        <div className="bench">
          <span className="muted small">{t("bench")}:</span>
          {game.bench.map((id) => (
            <PlayerChip key={id} player={players.get(id)} />
          ))}
        </div>
      )}
    </li>
  );
}
