"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { rememberEvent } from "@/lib/local-events";
import { canAddGame, nextGame, playersNeeded } from "@/lib/scheduler";
import type { Snapshot, TeamSize } from "@/lib/types";
import { useEventSync, type SyncStatus } from "@/lib/use-event-sync";
import { GameCard } from "./game-card";
import { useI18n } from "./i18n-provider";
import { PlayerList } from "./player-list";
import { Prefs } from "./prefs";
import { StatsTable } from "./stats-table";

const GAME_COUNTS = Array.from({ length: 32 }, (_, i) => i + 1);

const STATUS_TEXT: Record<SyncStatus, keyof Dict> = {
  saved: "statusSaved",
  saving: "statusSaving",
  offline: "statusOffline",
  conflict: "statusConflict",
  error: "error",
};

export function EventView({ id, initial }: { id: string; initial: Snapshot }) {
  const { t } = useI18n();
  const { state, status, update } = useEventSync(id, initial);
  const [copied, setCopied] = useState(false);
  const players = useMemo(() => new Map(state.players.map((p) => [p.id, p])), [state.players]);

  useEffect(() => {
    rememberEvent(id, state.name);
  }, [id, state.name]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: state.name, url });
      } catch {
        return;
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  const addGames = (count: number) => {
    update((s) => {
      let next = s;
      for (let i = 0; i < count; i++) {
        const game = nextGame(next, id);
        if (!game) break;
        next = { ...next, games: [...next.games, game] };
      }
      return next;
    });
  };

  const setTeamSize = (teamSize: TeamSize) => update((s) => (s.teamSize === teamSize ? s : { ...s, teamSize }));
  const ready = canAddGame(state);

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="btn ghost small">
          ../{t("back")}
        </Link>
        <div className="row">
          <span className={`status ${status}`}>{t(STATUS_TEXT[status])}</span>
          <Prefs />
        </div>
      </header>

      <section className="card">
        <div className="row nowrap">
          <input
            className="input title grow"
            value={state.name}
            maxLength={80}
            aria-label={t("eventName")}
            onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
          />
          <button className="btn" type="button" onClick={share}>
            {copied ? t("copied") : t("share")}
          </button>
        </div>
        <div className="row">
          <span className="muted">{t("format")}</span>
          <div className="segmented" role="group" aria-label={t("format")}>
            {([1, 2] as const).map((size) => (
              <button key={size} type="button" aria-pressed={state.teamSize === size} onClick={() => setTeamSize(size)}>
                {size === 1 ? t("singles") : t("doubles")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <PlayerList state={state} update={update} />

      {state.games.length > 0 && <StatsTable state={state} />}

      <section className="games">
        <h2>{t("games")}</h2>
        <div>
          <div className="add-games">
            <label className={`btn big select-btn ${ready ? "" : "disabled"}`}>
              {t("addGames")}
              <select
                value=""
                disabled={!ready}
                aria-label={t("addGames")}
                onChange={(e) => addGames(Number(e.target.value))}
              >
                <option value="" disabled>
                  {t("addGames")}
                </option>
                {GAME_COUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary big" type="button" onClick={() => addGames(1)} disabled={!ready}>
              + {t("addGame")}
            </button>
          </div>
          {!ready && <p className="muted small hint">{t("needPlayers", { n: playersNeeded(state) })}</p>}
        </div>
        {state.games.length === 0 && <p className="muted">{t("noGames")}</p>}
        <ol className="game-list" reversed>
          {state.games
            .map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                index={i}
                isLast={i === state.games.length - 1}
                players={players}
                update={update}
              />
            ))
            .reverse()}
        </ol>
      </section>
    </main>
  );
}
