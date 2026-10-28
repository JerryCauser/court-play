import { computeStats } from "./scheduler";
import type { EventState } from "./types";

export type Totals = {
  wins: number;
  losses: number;
  scored: number;
  conceded: number;
  played: number;
  benched: number;
};

export type EventTotals = Totals & { id: string; name: string };

const KEYS: (keyof Totals)[] = ["wins", "losses", "scored", "conceded", "played", "benched"];

export function eventTotals(id: string, state: EventState, uid: string): EventTotals | null {
  const player = state.players.find((p) => p.uid === uid);
  if (!player) return null;
  const s = computeStats(state).players.get(player.id);
  return {
    id,
    name: state.name,
    wins: s?.wins ?? 0,
    losses: s?.losses ?? 0,
    scored: s?.scored ?? 0,
    conceded: s?.conceded ?? 0,
    played: s?.played ?? 0,
    benched: s?.benched ?? 0,
  };
}

export function sumTotals(list: Totals[]): Totals {
  const sum: Totals = { wins: 0, losses: 0, scored: 0, conceded: 0, played: 0, benched: 0 };
  for (const t of list) for (const k of KEYS) sum[k] += t[k];
  return sum;
}
