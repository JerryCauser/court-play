"use client";

import type { CSSProperties } from "react";
import { isPlayerUsed, newPlayer, updatePlayer } from "@/lib/event";
import type { EventState } from "@/lib/types";
import { useI18n } from "./i18n-provider";

type Props = {
  state: EventState;
  update: (fn: (s: EventState) => EventState) => void;
};

export function PlayerList({ state, update }: Props) {
  const { t } = useI18n();

  const add = () =>
    update((s) => ({
      ...s,
      players: [...s.players, newPlayer(s.players, t("playerName", { n: s.players.length + 1 }))],
    }));

  const remove = (id: string) =>
    update((s) =>
      isPlayerUsed(s, id)
        ? updatePlayer(s, id, { active: false })
        : { ...s, players: s.players.filter((p) => p.id !== id) },
    );

  return (
    <section className="card">
      <div className="card-head">
        <h2>
          {t("players")} <span className="muted">{state.players.filter((p) => p.active).length}</span>
        </h2>
      </div>
      <ul className="list">
        {state.players.map((p) => (
          <li key={p.id} className={`list-item player ${p.active ? "" : "inactive"}`}>
            <label className="swatch" style={{ "--c": p.color } as CSSProperties} title={t("color")}>
              <input
                type="color"
                value={p.color}
                aria-label={t("color")}
                onChange={(e) => update((s) => updatePlayer(s, p.id, { color: e.target.value }))}
              />
            </label>
            <input
              className="input grow"
              value={p.name}
              maxLength={40}
              onChange={(e) => update((s) => updatePlayer(s, p.id, { name: e.target.value }))}
            />
            {p.active ? (
              <button className="btn ghost small" type="button" onClick={() => remove(p.id)}>
                {t("remove")}
              </button>
            ) : (
              <button
                className="btn small"
                type="button"
                title={t("resting")}
                onClick={() => update((s) => updatePlayer(s, p.id, { active: true }))}
              >
                {t("restore")}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button className="btn" type="button" onClick={add}>
        + {t("addPlayer")}
      </button>
    </section>
  );
}
