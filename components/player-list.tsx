"use client";

import {useState, type CSSProperties} from "react";
import {
  claimPlayer,
  deletePlayer,
  eventSport,
  isPlayerUsed,
  joinEvent,
  newPlayer,
  unclaimPlayer,
  updatePlayer,
} from "@/lib/event";
import {loadSnapshots} from "@/lib/history";
import {withPlayPrefs} from "@/lib/play-prefs";
import {getLocalEvents} from "@/lib/local-events";
import type {Profile} from "@/lib/profile";
import {recentWeight} from "@/lib/profile-stats";
import {canAddGame} from "@/lib/scheduler";
import type {Sport} from "@/lib/scoring";
import type {EventState, Player} from "@/lib/types";
import {clampWeight, formatWeight, MAX_WEIGHT, MIN_WEIGHT, playerWeight, WEIGHT_STEP} from "@/lib/weight";
import {useI18n} from "./i18n-provider";
import {Modal} from "./modal";
import {PlayPrefsFields} from "./play-prefs-fields";

async function weightFromHistory(eventId: string, uid: string, sport: Sport): Promise<number | null> {
  try {
    const events = getLocalEvents().filter((e) => e.id !== eventId);
    return recentWeight(await loadSnapshots(events), uid, sport);
  } catch {
    return null;
  }
}

type Props = {
  eventId: string;
  state: EventState;
  update: (fn: (s: EventState) => EventState) => void;
  profile: Profile | null;
};

export function PlayerList({eventId, state, update, profile}: Props) {
  const {t} = useI18n();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const editedPlayer = state.players.find((p) => p.id === editing) ?? null;
  const sport = eventSport(state);

  const add = () =>
    update((s) => ({
      ...s,
      players: [...s.players, newPlayer(s.players, "")],
    }));

  const remove = (id: string) =>
    update((s) =>
      isPlayerUsed(s, id)
        ? updatePlayer(s, id, {active: false})
        : deletePlayer(s, id),
    );

  const joined = profile !== null && state.players.some((p) => p.uid === profile.id);

  const withWeight = async (profile: Profile, apply: (weight: number | null) => void) => {
    setPending(true);
    try {
      apply(await weightFromHistory(eventId, profile.id, sport));
    } finally {
      setPending(false);
    }
  };

  const claim = (player: Player, profile: Profile) => {
    if (player.uid && !window.confirm(t("claimTaken"))) return;
    void withWeight(profile, (weight) => update((s) => claimPlayer(s, player.id, profile, weight)));
  };

  const join = (profile: Profile) => void withWeight(profile, (weight) => update((s) => joinEvent(s, profile, weight)));
  const ready = canAddGame(state);
  const [open, setOpen] = useState(!ready);
  const [wasReady, setWasReady] = useState(ready);
  if (wasReady !== ready) {
    setWasReady(ready);
    if (!ready) setOpen(true);
  }

  return (
    <details className="card collapsible" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <h2>
          {t("players")} <span className="muted">{state.players.filter((p) => p.active).length}</span>
        </h2>
      </summary>
      <div className="card-content">
        <ul className="list">
          {state.players.map((p, i) => (
            <li key={p.id} className={`list-item player ${p.active ? "" : "inactive"}`}>
              <label
                className={`swatch ${p.uid ? "locked" : ""}`}
                style={{"--c": p.color} as CSSProperties}
                title={p.uid ? t("lockedByProfile") : t("color")}
              >
                <input
                  type="color"
                  value={p.color}
                  aria-label={p.uid ? t("lockedByProfile") : t("color")}
                  disabled={Boolean(p.uid)}
                  onChange={(e) => update((s) => updatePlayer(s, p.id, {color: e.target.value}))}
                />
              </label>
              <input
                className="input grow"
                value={p.name}
                placeholder={t("playerName", {n: i + 1})}
                maxLength={40}
                readOnly={Boolean(p.uid)}
                title={p.uid ? t("lockedByProfile") : undefined}
                onChange={(e) => update((s) => updatePlayer(s, p.id, {name: e.target.value}))}
              />
              {profile && p.uid === profile.id && (
                <button
                  className="btn small"
                  type="button"
                  title={t("unclaimHint")}
                  onClick={() => update((s) => unclaimPlayer(s, p.id, profile))}
                >
                  {t("unclaim")}
                </button>
              )}
              {profile && !joined && (
                <button
                  className="btn small"
                  type="button"
                  title={t("claimHint")}
                  disabled={pending}
                  onClick={() => claim(p, profile)}
                >
                  {t("claim")}
                </button>
              )}
              <button
                className="btn ghost icon small-icon"
                type="button"
                aria-label={t("playerSettings")}
                title={t("playerSettings")}
                onClick={() => setEditing(p.id)}
              >
                ⚙
              </button>
              {p.active ? (
                <button
                  className="btn ghost icon small-icon"
                  type="button"
                  aria-label={`${t("remove")}: ${p.name || t("playerName", {n: i + 1})}`}
                  title={t("remove")}
                  data-haptic="warning"
                  onClick={() => remove(p.id)}
                >
                  ✕
                </button>
              ) : (
                <button
                  className="btn small"
                  type="button"
                  title={t("resting")}
                  onClick={() => update((s) => updatePlayer(s, p.id, {active: true}))}
                >
                  {t("restore")}
                </button>
              )}
            </li>
          ))}
        </ul>
        {profile && !joined && (
          <button className="btn primary" type="button" disabled={pending} onClick={() => join(profile)}>
            {pending ? t("loading") : t("join")}
          </button>
        )}
        <button className="btn" type="button" onClick={add}>
          + {t("addPlayer")}
        </button>
      </div>
      <Modal open={editedPlayer !== null} title={t("playerSettings")} onClose={() => setEditing(null)}>
        {editedPlayer && (
          <div className="weight-field">
            <div className="row">
              <label htmlFor="player-weight">{t("strength")}</label>
              <span className="weight-value">{formatWeight(playerWeight(editedPlayer))}</span>
            </div>
            <input
              id="player-weight"
              type="range"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={WEIGHT_STEP}
              value={playerWeight(editedPlayer)}
              data-autofocus
              onChange={(e) =>
                update((s) => updatePlayer(s, editedPlayer.id, {weight: clampWeight(Number(e.target.value))}))
              }
            />
            <p className="muted small">{t("strengthHint")}</p>
            <PlayPrefsFields
              value={editedPlayer}
              onChange={(prefs) =>
                update((s) => ({
                  ...s,
                  players: s.players.map((p) => (p.id === editedPlayer.id ? withPlayPrefs(p, prefs) : p)),
                }))
              }
            />
          </div>
        )}
      </Modal>
    </details>
  );
}
