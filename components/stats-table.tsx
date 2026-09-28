"use client";

import { useMemo } from "react";
import { computeStats } from "@/lib/scheduler";
import type { EventState } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { PlayerChip } from "./player-chip";

export function StatsTable({ state }: { state: EventState }) {
  const { t } = useI18n();
  const stats = useMemo(() => computeStats(state), [state]);

  return (
    <section className="card">
      <h2>{t("stats")}</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t("player")}</th>
              <th>{t("wins")}</th>
              <th>{t("losses")}</th>
              <th>{t("winRate")}</th>
              <th>{t("played")}</th>
              <th>{t("benched")}</th>
            </tr>
          </thead>
          <tbody>
            {state.players.map((p) => {
              const s = stats.players.get(p.id);
              const decided = (s?.wins ?? 0) + (s?.losses ?? 0);
              return (
                <tr key={p.id} className={p.active ? "" : "inactive"}>
                  <td>
                    <PlayerChip player={p} />
                  </td>
                  <td>{s?.wins ?? 0}</td>
                  <td>{s?.losses ?? 0}</td>
                  <td>{decided > 0 ? `${Math.round(((s?.wins ?? 0) / decided) * 100)}%` : "—"}</td>
                  <td>{s?.played ?? 0}</td>
                  <td>{s?.benched ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
