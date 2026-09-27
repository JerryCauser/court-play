"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "@/lib/i18n";
import { nextGame } from "@/lib/schedule";
import { canAddGame, MAX_NAME, type TeamSize } from "@/lib/state";
import { rememberEvent, renameSaved } from "@/lib/storage";
import { GameCard } from "./GameCard";
import { PlayerList } from "./PlayerList";
import { Stats } from "./Stats";
import { useEventSync } from "./useEventSync";
import { useI18n } from "./I18n";

export function EventView({ id }: { id: string }) {
  const { t } = useI18n();
  const { status, state, saveStatus, conflict, dispatch, reload, dismissConflict } = useEventSync(id);
  const [copied, setCopied] = useState(false);
  const players = useMemo(() => new Map(state?.players.map((p) => [p.id, p]) ?? []), [state?.players]);

  useEffect(() => {
    if (status === "ready" && state) rememberEvent(id, state.name);
  }, [status]);

  useEffect(() => {
    if (state) renameSaved(id, state.name);
  }, [id, state?.name]);

  if (status === "loading") return <p className="muted center">{t.loading}</p>;
  if (status === "missing" || status === "error" || !state) {
    return (
      <div className="stack center">
        <p>{status === "missing" ? t.notFound : t.loadError}</p>
        <div className="row center">
          {status === "error" && (
            <button type="button" onClick={() => void reload()}>
              {t.retry}
            </button>
          )}
          <Link href="/">{t.back}</Link>
        </div>
      </div>
    );
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: state!.name, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const ready = canAddGame(state);
  const saveLabel = { idle: "", saving: t.saving, saved: t.saved, offline: t.offline }[saveStatus];

  return (
    <div className="stack">
      <div className="row between">
        <Link href="/" className="muted">
          ← {t.back}
        </Link>
        <span className={saveStatus === "offline" ? "status error" : "status muted"} aria-live="polite">
          {saveLabel}
        </span>
      </div>

      {conflict && (
        <div className="notice" role="status">
          <span>{t.conflict}</span>
          <button type="button" className="ghost" onClick={dismissConflict} aria-label="OK">
            ✕
          </button>
        </div>
      )}

      <section className="card stack-sm">
        <input
          className="title-input"
          value={state.name}
          maxLength={MAX_NAME}
          aria-label={t.eventName}
          onChange={(e) => dispatch({ type: "rename", name: e.target.value })}
        />
        <div className="row between wrap">
          <div className="segmented" role="group" aria-label={t.format} title={state.games.length ? t.formatLocked : undefined}>
            {([1, 2] as TeamSize[]).map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={state.teamSize === size}
                disabled={state.games.length > 0}
                onClick={() => dispatch({ type: "setTeamSize", teamSize: size })}
              >
                {size === 1 ? t.singles : t.doubles}
              </button>
            ))}
          </div>
          <button type="button" onClick={share}>
            {copied ? t.copied : t.share}
          </button>
        </div>
      </section>

      <PlayerList state={state} dispatch={dispatch} />

      <section className="stack">
        <div className="row between">
          <h2>
            {t.games} <span className="muted">{state.games.length}</span>
          </h2>
          <button
            type="button"
            className="primary"
            disabled={!ready}
            onClick={() =>
              dispatch((s) => {
                const game = nextGame(id, s);
                return game ? { type: "addGame", game } : null;
              })
            }
          >
            + {t.addGame}
          </button>
        </div>
        {!ready && <p className="muted small-text">{format(t.needPlayers, { n: state.teamSize * 2 })}</p>}
        {state.games.length === 0 && ready && <p className="muted">{t.noGames}</p>}
        {state.games
          .map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
              players={players}
              isLast={index === state.games.length - 1}
              dispatch={dispatch}
            />
          ))
          .reverse()}
      </section>

      {state.games.length > 0 && <Stats state={state} />}
    </div>
  );
}
