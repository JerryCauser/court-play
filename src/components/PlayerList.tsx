"use client";

import { useState, type FormEvent } from "react";
import { MAX_NAME, MAX_PLAYERS, nextColor, playerHasGames, type Action, type EventState } from "@/lib/state";
import { useI18n } from "./I18n";

type Props = { state: EventState; dispatch: (a: Action) => void };

export function PlayerList({ state, dispatch }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState("");

  function add(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim() || `${t.playerDefault} ${state.players.length + 1}`;
    dispatch({ type: "addPlayer", id: crypto.randomUUID().slice(0, 8), name: trimmed, color: nextColor(state) });
    setName("");
  }

  return (
    <section className="card">
      <h2>
        {t.players} <span className="muted">{state.players.filter((p) => p.active).length}</span>
      </h2>
      <ul className="list">
        {state.players.map((p) => {
          const locked = playerHasGames(state, p.id);
          return (
            <li key={p.id} className={p.active ? "player" : "player inactive"}>
              <input
                type="color"
                className="swatch"
                value={p.color}
                aria-label={t.color}
                onChange={(e) => dispatch({ type: "setColor", id: p.id, color: e.target.value })}
              />
              <input
                className="grow"
                value={p.name}
                maxLength={MAX_NAME}
                aria-label={t.player}
                onChange={(e) => dispatch({ type: "renamePlayer", id: p.id, name: e.target.value })}
              />
              {!p.active && <span className="badge">{t.paused}</span>}
              <button type="button" className="ghost" onClick={() => dispatch({ type: "toggleActive", id: p.id })}>
                {p.active ? t.pause : t.resume}
              </button>
              <button
                type="button"
                className="ghost danger"
                disabled={locked}
                title={locked ? t.removeBlocked : t.remove}
                aria-label={t.remove}
                onClick={() => dispatch({ type: "removePlayer", id: p.id })}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {state.players.length < MAX_PLAYERS && (
        <form className="row" onSubmit={add}>
          <input
            className="grow"
            value={name}
            maxLength={MAX_NAME}
            placeholder={t.playerPlaceholder}
            aria-label={t.playerPlaceholder}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit">{t.addPlayer}</button>
        </form>
      )}
    </section>
  );
}
