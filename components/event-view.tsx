"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { eventFormat, eventSport, syncProfile } from "@/lib/event";
import { clearFresh, isFresh } from "@/lib/event-defaults";
import { rememberEvent } from "@/lib/local-events";
import { canAddGame, canPlayDoubles, courtCount, gameCourt, nextGame, playersNeeded } from "@/lib/scheduler";
import type { Snapshot } from "@/lib/types";
import { useEventSync, type SyncStatus } from "@/lib/use-event-sync";
import { EventSettings } from "./event-settings";
import { formatLabel, GameCard } from "./game-card";
import { useI18n } from "./i18n-provider";
import { PlayerList } from "./player-list";
import { ProfileButton } from "./profile-button";
import { useProfile } from "./profile-provider";
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
  const { profile } = useProfile();
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => isFresh(id));
  const closeSettings = () => {
    clearFresh(id);
    setSettingsOpen(false);
  };
  const players = useMemo(
    () => new Map(state.players.map((p, i) => [p.id, { ...p, name: p.name.trim() || t("playerName", { n: i + 1 }) }])),
    [state.players, t],
  );

  const createdAt = initial.createdAt ? Date.parse(initial.createdAt) : undefined;

  useEffect(() => {
    rememberEvent(id, state.name, createdAt);
  }, [id, state.name, createdAt]);

  useEffect(() => {
    if (profile) update((s) => syncProfile(s, profile));
  }, [profile, state.players, update]);

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

  const sport = eventSport(state);
  const ready = canAddGame(state);

  return (
    <main className="page">
      <header className="topbar">
        <Link href="/" className="btn ghost small">
          ../{t("back")}
        </Link>
        <div className="row nowrap">
          <span className={`status ${status}`}>{t(STATUS_TEXT[status])}</span>
          <ProfileButton />
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
          <button
            className="btn icon"
            type="button"
            aria-label={t("eventSettings")}
            title={t("eventSettings")}
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
        </div>
        <button className="event-summary" type="button" onClick={() => setSettingsOpen(true)}>
          {[
            t(`sport_${sport}`),
            state.teamSize === 1 ? t("singles") : t("doubles"),
            t(formatLabel(eventFormat(state))),
            ...(courtCount(state) > 1 ? [t("courtsShort", { n: courtCount(state) })] : []),
            ...(state.balance ? [t("balanceShort")] : []),
          ].join(" · ")}
        </button>
      </section>

      <EventSettings open={settingsOpen} onClose={closeSettings} state={state} update={update} />

      <PlayerList eventId={id} state={state} update={update} profile={profile} />

      {state.games.length > 0 && <StatsTable state={state} players={players} />}

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
                sport={sport}
                canDoubles={canPlayDoubles(state, game)}
                showCourt={courtCount(state) > 1 || gameCourt(game) > 1}
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
