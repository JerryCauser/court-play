"use client";

import { useState } from "react";
import { rematch, swapPlayer, updateGame } from "@/lib/event";
import { haptic } from "@/lib/haptics";
import { setGameTeamSize } from "@/lib/scheduler";
import type { Dict } from "@/lib/i18n";
import {
  addRally,
  allowsManualScore,
  formatsFor,
  gameFormat,
  isTracked,
  replay,
  setGameFormat,
  setManualScore,
  sportOf,
  swapSides,
  undoRally,
  type FormatId,
  type Side,
  type Sport,
} from "@/lib/scoring";
import type { EventState, Game, Player } from "@/lib/types";
import { useCourtMarks } from "./court-marks-provider";
import { useI18n } from "./i18n-provider";
import { OpenIcon, RematchIcon, TrashIcon } from "./icons";
import { Modal } from "./modal";
import { PlayerChip } from "./player-chip";
import { ScoreValue } from "./score-value";
import { ServeIcon } from "./serve-icon";
import { SwapChip } from "./swap-chip";

type Props = {
  eventId: string;
  game: Game;
  index: number;
  isLast: boolean;
  sport: Sport;
  canDoubles: boolean;
  showCourt: boolean;
  players: Map<string, Player>;
  update: (fn: (s: EventState) => EventState) => void;
};

const TEAM_LABEL: Record<Side, keyof Dict> = { 0: "teamRed", 1: "teamBlue" };

export function formatLabel(id: FormatId): keyof Dict {
  return `fmt_${id}`;
}

export function GameCard({ eventId, game, index, isLast, sport, canDoubles, showCourt, players, update }: Props) {
  const { t } = useI18n();
  const { marks } = useCourtMarks();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Last swap from settings; its counter re-mounts that pair so the swap animates.
  const [swapped, setSwapped] = useState<{ side: Side; n: number } | null>(null);
  const change = (fn: (g: Game) => Game) => update((s) => updateGame(s, game.id, fn));
  const locked = game.winner !== null;
  const tracked = isTracked(game);
  const result = replay(game);
  const format = gameFormat(game);
  const gameSport = tracked ? sportOf(format, sport) : sport;
  const options = formatsFor(gameSport).includes(format) ? formatsFor(gameSport) : [format, ...formatsFor(gameSport)];
  const server = locked ? null : result.server;
  const positions = locked ? null : result.positions;
  const manual = allowsManualScore(game);
  const name = (id: string) => players.get(id)?.name || "?";

  // A pair as it stands: left court first.
  const pairOf = (side: Side) => {
    const at = result.positions;
    const team = game.teams[side];
    return at ? [...team].sort((a, b) => Number(at[a] === "R") - Number(at[b] === "R")) : team;
  };

  const renderSlot = (side: Side, id: string) => {
    const serving = server?.id === id;
    const hint = serving ? t(server.court === "R" ? "servesRight" : "servesLeft", { name: name(id) }) : undefined;
    const court = positions?.[id];
    const where = court ? t(court === "R" ? "standsRight" : "standsLeft", { name: name(id) }) : undefined;
    // In "halves" the column shows the court; otherwise R/L sits at the front of the chip.
    const tagged = Boolean(court) && marks === "tag";
    return (
      <span key={id} className={`slot ${serving ? "serving" : ""} ${tagged ? "tagged" : ""}`} title={hint ?? where}>
        {tagged && court && (
          <span className="court-pos" aria-label={where}>
            {t(court === "R" ? "courtR" : "courtL")}
          </span>
        )}
        {locked ? (
          <PlayerChip player={players.get(id)} />
        ) : (
          <SwapChip
            id={id}
            side={side}
            game={game}
            players={players}
            onSwap={(to) => update((s) => swapPlayer(s, game.id, id, to))}
          />
        )}
        {serving && hint && <ServeIcon sport={gameSport} title={hint} />}
      </span>
    );
  };

  const toggleWinner = (side: Side) => change((g) => ({ ...g, winner: g.winner === side ? null : side }));

  const remove = () => {
    if (!window.confirm(t("deleteGameConfirm", { n: index + 1 }))) return;
    haptic("warning");
    update((s) => ({ ...s, games: s.games.filter((g) => g.id !== game.id) }));
  };

  return (
    <li className={`card game ${locked ? "done" : ""}`}>
      <div className="card-head">
        <h3 className="game-title">
          <span>{t("game", { n: index + 1 })}</span>
          {showCourt && <span className="court-badge">{t("court", { n: game.court ?? 1 })}</span>}
        </h3>
        <div className="row nowrap game-actions">
          <a
            className="btn ghost icon small-icon"
            href={`/e/${eventId}/g/${game.id}`}
            target="_blank"
            rel="noopener"
            aria-label={t("openBoard")}
            title={t("openBoard")}
          >
            <OpenIcon />
          </a>
          <button
            className="btn ghost icon small-icon"
            type="button"
            aria-label={t("rematch")}
            title={t("rematch")}
            onClick={() => update((s) => rematch(s, game.id))}
          >
            <RematchIcon />
          </button>
          {isLast && (
            <button
              className="btn ghost icon small-icon"
              type="button"
              aria-label={t("deleteGame")}
              title={t("deleteGame")}
              onClick={remove}
            >
              <TrashIcon />
            </button>
          )}
          <button
            className="btn ghost icon small-icon"
            type="button"
            aria-label={t("gameSettings")}
            title={t("gameSettings")}
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        </div>
      </div>
      <Modal open={settingsOpen} title={t("gameSettings")} onClose={() => setSettingsOpen(false)}>
        {locked && <p className="muted small">{t("gameLocked")}</p>}
        <div className="settings">
          <span className="muted">{t("matchType")}</span>
          <div className="segmented" role="group" aria-label={t("matchType")}>
            {([2, 1] as const).map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={game.teams[0].length === size}
                disabled={locked || (size === 2 && !canDoubles && game.teams[0].length !== 2)}
                onClick={() => update((s) => setGameTeamSize(s, game.id, size))}
              >
                {size === 1 ? t("singlesMatch") : t("doublesMatch")}
              </button>
            ))}
          </div>
          {tracked && (
            <>
              <label className="muted" htmlFor={`scoring-${game.id}`}>
                {t("scoring")}
              </label>
              <select
                id={`scoring-${game.id}`}
                className="select"
                value={format}
                disabled={locked}
                onChange={(e) => change((g) => setGameFormat(g, e.target.value as FormatId))}
              >
                {options.map((id) => (
                  <option key={id} value={id}>
                    {t(formatLabel(id))}
                  </option>
                ))}
              </select>
            </>
          )}
          {tracked && game.teams.some((team) => team.length > 1) && (
            <>
              <span className="muted">{t("sides")}</span>
              <div className="sides">
                {([0, 1] as const)
                  .filter((side) => game.teams[side].length > 1)
                  .map((side) => {
                    const [l, r] = pairOf(side);
                    const n = swapped?.side === side ? swapped.n : 0;
                    return (
                      <button
                        key={side}
                        className={`side-swap side-${side} ${n > 0 ? "moved" : ""}`}
                        type="button"
                        disabled={locked}
                        aria-label={t("swapSides", { team: t(TEAM_LABEL[side]) })}
                        title={t("swapSides", { team: t(TEAM_LABEL[side]) })}
                        onClick={() => {
                          change((g) => swapSides(g, side));
                          setSwapped({ side, n: n + 1 });
                        }}
                      >
                        <span className="court-pos">{t("courtL")}</span>
                        <span key={`${n}-${l}`} className="side-slot from-right">
                          <PlayerChip player={players.get(l)} />
                        </span>
                        <span key={`${n}-arrow`} className="side-arrow" aria-hidden="true">
                          ⇄
                        </span>
                        <span key={`${n}-${r}`} className="side-slot from-left">
                          <PlayerChip player={players.get(r)} />
                        </span>
                        <span className="court-pos">{t("courtR")}</span>
                      </button>
                    );
                  })}
              </div>
            </>
          )}
        </div>
        {tracked && game.teams.some((team) => team.length > 1) && <p className="muted small">{t("swapSidesHint")}</p>}
        {!canDoubles && game.teams[0].length === 1 && <p className="muted small">{t("doublesNeedsFour")}</p>}
        <button className="btn primary wide" type="button" data-autofocus onClick={() => setSettingsOpen(false)}>
          {t("done")}
        </button>
      </Modal>
      {([0, 1] as const).map((side) => (
        <div
          key={side}
          className={`team side-${side} ${game.winner === side ? "won" : ""}`}
          role="group"
          aria-label={t(TEAM_LABEL[side])}
        >
          {positions && marks === "halves" ? (
            <div className="team-players halves">
              {(["L", "R"] as const).map((half) => (
                <div key={half} className="half">
                  {game.teams[side].filter((id) => positions[id] === half).map((id) => renderSlot(side, id))}
                  <span className="half-label">{t(half === "L" ? "halfL" : "halfR")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="team-players">{game.teams[side].map((id) => renderSlot(side, id))}</div>
          )}
          <div className="score" title={locked ? t("gameLocked") : undefined}>
            <button
              className="btn icon"
              type="button"
              disabled={locked}
              onClick={() => change((g) => undoRally(g, side))}
              aria-label="−"
            >
              −
            </button>
            {manual ? (
              <ScoreValue value={game.score[side]} disabled={locked} onChange={(v) => change((g) => setManualScore(g, side, v))} />
            ) : (
              <span className="score-value">{result.main[side]}</span>
            )}
            {result.sub && <span className="score-sub">{result.sub[side]}</span>}
            <button
              className="btn icon"
              type="button"
              disabled={locked || (tracked && result.winner !== null)}
              onClick={() => change((g) => addRally(g, side))}
              aria-label="+"
            >
              +
            </button>
          </div>
          <button
            className={`btn small win ${game.winner === side ? "primary" : "ghost"}`}
            type="button"
            aria-pressed={game.winner === side}
            data-haptic={game.winner === side ? undefined : "success"}
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
