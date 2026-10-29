"use client";

import {useState, type CSSProperties} from "react";
import {claimPlayer, deletePlayer, isPlayerUsed, joinEvent, newPlayer, unclaimPlayer, updatePlayer} from "@/lib/event";
import type {Profile} from "@/lib/profile";
import {canAddGame} from "@/lib/scheduler";
import type {EventState, Player} from "@/lib/types";
import {useI18n} from "./i18n-provider";

type Props = {
  state: EventState;
  update: (fn: (s: EventState) => EventState) => void;
  profile: Profile | null;
};

export function PlayerList({state, update, profile}: Props) {
  const {t} = useI18n();

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

  const claim = (player: Player, profile: Profile) => {
    if (player.uid && !window.confirm(t("claimTaken"))) return;
    update((s) => claimPlayer(s, player.id, profile));
  };
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
              <label className="swatch" style={{"--c": p.color} as CSSProperties} title={t("color")}>
                <input
                  type="color"
                  value={p.color}
                  aria-label={t("color")}
                  onChange={(e) => update((s) => updatePlayer(s, p.id, {color: e.target.value}))}
                />
              </label>
              <input
                className="input grow"
                value={p.name}
                placeholder={t("playerName", {n: i + 1})}
                maxLength={40}
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
                <button className="btn small" type="button" title={t("claimHint")} onClick={() => claim(p, profile)}>
                  {t("claim")}
                </button>
              )}
              {p.active ? (
                <button className="btn ghost small" type="button" onClick={() => remove(p.id)}>
                  {t("remove")}
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
          <button className="btn primary" type="button" onClick={() => update((s) => joinEvent(s, profile))}>
            {t("join")}
          </button>
        )}
        <button className="btn" type="button" onClick={add}>
          + {t("addPlayer")}
        </button>
      </div>
    </details>
  );
}
