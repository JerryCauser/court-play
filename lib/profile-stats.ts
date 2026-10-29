import { computeStats } from "./scheduler";
import type { EventState, Player } from "./types";

export type Totals = {
  wins: number;
  losses: number;
  scored: number;
  conceded: number;
  played: number;
  benched: number;
};

export type Partner = {
  key: string;
  name: string;
  color: string;
  games: number;
  wins: number;
  scored: number;
  conceded: number;
};

export type EventTotals = Totals & { id: string; name: string; partners: Partner[] };

// Fewer shared games than this is noise, not a partnership.
const MIN_BUDDY_GAMES = 4;

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
    partners: eventPartners(state, player.id),
  };
}

// Partners from different events match by profile uid, otherwise by name.
function partnerKey(player: Player): string | null {
  if (player.uid) return `u:${player.uid}`;
  const name = player.name.trim().toLowerCase();
  return name ? `n:${name}` : null;
}

function eventPartners(state: EventState, playerId: string): Partner[] {
  const byId = new Map(state.players.map((p) => [p.id, p]));
  const partners = new Map<string, Partner>();
  for (const game of state.games) {
    if (game.winner === null) continue;
    const side = game.teams.findIndex((team) => team.includes(playerId));
    if (side === -1) continue;
    for (const id of game.teams[side]) {
      const player = byId.get(id);
      const key = id === playerId || !player ? null : partnerKey(player);
      if (!player || !key) continue;
      const cur = partners.get(key) ?? {
        key,
        name: player.name.trim(),
        color: player.color,
        games: 0,
        wins: 0,
        scored: 0,
        conceded: 0,
      };
      cur.games += 1;
      if (game.winner === side) cur.wins += 1;
      cur.scored += game.score[side];
      cur.conceded += game.score[1 - side];
      partners.set(key, cur);
    }
  }
  return [...partners.values()];
}

// Entries go oldest first, so the latest event's name and color win.
export function bestBuddy(entries: EventTotals[]): Partner | null {
  const all = new Map<string, Partner>();
  for (const e of entries) {
    for (const p of e.partners) {
      const cur = all.get(p.key);
      all.set(
        p.key,
        cur
          ? {
              ...p,
              games: cur.games + p.games,
              wins: cur.wins + p.wins,
              scored: cur.scored + p.scored,
              conceded: cur.conceded + p.conceded,
            }
          : { ...p },
      );
    }
  }
  let best: Partner | null = null;
  for (const p of all.values()) {
    if (p.games < MIN_BUDDY_GAMES) continue;
    const diff = best ? p.wins / p.games - best.wins / best.games : 1;
    if (!best || diff > 0 || (diff === 0 && p.games > best.games)) best = p;
  }
  return best;
}

export function sumTotals(list: Totals[]): Totals {
  const sum: Totals = { wins: 0, losses: 0, scored: 0, conceded: 0, played: 0, benched: 0 };
  for (const t of list) for (const k of KEYS) sum[k] += t[k];
  return sum;
}
