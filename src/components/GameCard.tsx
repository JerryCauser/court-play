"use client";

import type { Action, Game, Player } from "@/lib/state";
import { PlayerChip } from "./PlayerChip";
import { useI18n } from "./I18n";

type Props = {
  game: Game;
  index: number;
  players: Map<string, Player>;
  isLast: boolean;
  dispatch: (a: Action) => void;
};

export function GameCard({ game, index, players, isLast, dispatch }: Props) {
  const { t } = useI18n();

  function remove() {
    if (window.confirm(t.confirmDelete)) dispatch({ type: "removeLastGame" });
  }

  return (
    <article className={isLast ? "card game current" : "card game"}>
      <header className="game-head">
        <strong>
          {t.game} {index + 1}
        </strong>
        {isLast && (
          <button type="button" className="ghost danger small" onClick={remove}>
            {t.deleteGame}
          </button>
        )}
      </header>
      <div className="teams">
        {([0, 1] as const).map((side) => (
          <div key={side} className={game.winner === side ? "team won" : "team"}>
            <div className="team-players">
              {game.teams[side].map((id) => (
                <PlayerChip key={id} player={players.get(id)} />
              ))}
            </div>
            <div className="score">
              <button
                type="button"
                aria-label="-1"
                onClick={() => dispatch({ type: "score", gameId: game.id, team: side, delta: -1 })}
                disabled={game.score[side] === 0}
              >
                −
              </button>
              <output>{game.score[side]}</output>
              <button
                type="button"
                aria-label="+1"
                onClick={() => dispatch({ type: "score", gameId: game.id, team: side, delta: 1 })}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className={game.winner === side ? "trophy on" : "trophy"}
              aria-pressed={game.winner === side}
              title={t.setWinner}
              onClick={() => dispatch({ type: "setWinner", gameId: game.id, winner: game.winner === side ? null : side })}
            >
              🏆 {t.winner}
            </button>
          </div>
        ))}
      </div>
      {game.sit.length > 0 && (
        <div className="sitting">
          <span className="muted small-text">{t.sitting}:</span>
          {game.sit.map((id) => (
            <PlayerChip key={id} player={players.get(id)} muted />
          ))}
        </div>
      )}
    </article>
  );
}
