"use client";

import { useMemo } from "react";
import type { EventState } from "@/lib/state";
import { computeStats, pairKey } from "@/lib/stats";
import { PlayerChip } from "./PlayerChip";
import { useI18n } from "./I18n";

export function Stats({ state }: { state: EventState }) {
  const { t } = useI18n();
  const stats = useMemo(() => computeStats(state), [state]);
  const doubles = state.teamSize === 2;

  return (
    <section className="card">
      <h2>{t.stats}</h2>
      <div className="scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>{t.player}</th>
              <th>{t.played}</th>
              <th>{t.sat}</th>
              <th>{t.wins}</th>
              <th>{t.losses}</th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p) => {
              const s = stats.players.get(p.id);
              return (
                <tr key={p.id}>
                  <td>
                    <PlayerChip player={p} muted={!p.active} />
                  </td>
                  <td>{s?.played ?? 0}</td>
                  <td>{s?.sat ?? 0}</td>
                  <td>{s?.wins ?? 0}</td>
                  <td>{s?.losses ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {state.players.length > 1 && (
        <details>
          <summary>{t.matrix}</summary>
          <p className="muted small-text">{t.matrixHint}</p>
          <div className="scroll-x">
            <table className="table matrix">
              <thead>
                <tr>
                  <th />
                  {state.players.map((p) => (
                    <th key={p.id}>
                      <span className="dot" style={{ background: p.color }} title={p.name} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.players.map((a) => (
                  <tr key={a.id}>
                    <th>
                      <PlayerChip player={a} />
                    </th>
                    {state.players.map((b) => {
                      if (a.id === b.id) return <td key={b.id} className="diag" />;
                      const key = pairKey(a.id, b.id);
                      const with_ = stats.partners.get(key) ?? 0;
                      const against = stats.opponents.get(key) ?? 0;
                      return <td key={b.id}>{doubles ? `${with_}/${against}` : against}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
