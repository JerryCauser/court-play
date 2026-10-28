"use client";

import { useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { computeStats } from "@/lib/scheduler";
import type { EventState, Player } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { PlayerChip } from "./player-chip";

type Row = {
  player: Player;
  order: number;
  wins: number;
  losses: number;
  winRate: number | null;
  scored: number;
  conceded: number;
  scoredShare: number | null;
  played: number;
  benched: number;
};

type Key = Exclude<keyof Row, "order">;
type Sort = { key: Key; dir: 1 | -1 } | null;

const COLUMNS: Key[] = ["player", "wins", "losses", "winRate", "scored", "conceded", "scoredShare", "played", "benched"];

const percent = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const ratio = (a: number, b: number) => (a + b > 0 ? a / (a + b) : null);

export function StatsTable({ state, players }: { state: EventState; players: Map<string, Player> }) {
  const { t } = useI18n();
  const stats = useMemo(() => computeStats(state), [state]);
  const [sort, setSort] = useState<Sort>(null);

  const rows = useMemo(
    () =>
      [...players.values()].map((player, order): Row => {
        const s = stats.players.get(player.id);
        const wins = s?.wins ?? 0;
        const losses = s?.losses ?? 0;
        const scored = s?.scored ?? 0;
        const conceded = s?.conceded ?? 0;
        return {
          player,
          order,
          wins,
          losses,
          winRate: ratio(wins, losses),
          scored,
          conceded,
          scoredShare: ratio(scored, conceded),
          played: s?.played ?? 0,
          benched: s?.benched ?? 0,
        };
      }),
    [players, stats],
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    return rows.slice().sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va === null || vb === null) return va === vb ? a.order - b.order : va === null ? 1 : -1;
      const diff =
        typeof va === "object" && typeof vb === "object" ? va.name.localeCompare(vb.name) : (va as number) - (vb as number);
      return diff * dir || a.order - b.order;
    });
  }, [rows, sort]);

  const toggle = (key: Key) =>
    setSort((cur) => {
      const first = key === "player" ? 1 : -1;
      if (cur?.key !== key) return { key, dir: first };
      return cur.dir === first ? { key, dir: -first as 1 | -1 } : null;
    });

  const cell = (row: Row, key: Key) => {
    switch (key) {
      case "player":
        return <PlayerChip player={row.player} />;
      case "winRate":
      case "scoredShare":
        return percent(row[key]);
      default:
        return row[key];
    }
  };

  return (
    <details className="card collapsible">
      <summary>
        <h2>{t("stats")}</h2>
      </summary>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {COLUMNS.map((key) => {
                const active = sort?.key === key ? sort.dir : 0;
                return (
                  <th key={key} aria-sort={active === 1 ? "ascending" : active === -1 ? "descending" : "none"}>
                    <button className={`th-sort ${active ? "active" : ""}`} type="button" onClick={() => toggle(key)}>
                      {t(key as keyof Dict)}
                      {active === 1 ? " ▲" : active === -1 ? " ▼" : ""}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.player.id} className={row.player.active ? "" : "inactive"}>
                {COLUMNS.map((key) => (
                  <td key={key}>{cell(row, key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
