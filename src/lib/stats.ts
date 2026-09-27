import type { EventState } from "./state.ts";

export type PlayerStats = {
  played: number;
  sat: number;
  wins: number;
  losses: number;
  expected: number;
  streak: number;
};

export type Stats = {
  players: Map<string, PlayerStats>;
  partners: Map<string, number>;
  opponents: Map<string, number>;
};

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function emptyStats(): PlayerStats {
  return { played: 0, sat: 0, wins: 0, losses: 0, expected: 0, streak: 0 };
}

export function computeStats(state: EventState): Stats {
  const players = new Map<string, PlayerStats>();
  for (const p of state.players) players.set(p.id, emptyStats());
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const get = (id: string) => {
    let s = players.get(id);
    if (!s) {
      s = emptyStats();
      players.set(id, s);
    }
    return s;
  };

  for (const game of state.games) {
    const onCourt = [...game.teams[0], ...game.teams[1]];
    const present = onCourt.length + game.sit.length;
    const share = present ? onCourt.length / present : 0;
    game.teams.forEach((team, side) => {
      for (const id of team) {
        const s = get(id);
        s.played++;
        s.expected += share;
        s.streak = s.streak > 0 ? s.streak + 1 : 1;
        if (game.winner === side) s.wins++;
        else if (game.winner !== null) s.losses++;
      }
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) bump(partners, pairKey(team[i], team[j]));
      }
    });
    for (const a of game.teams[0]) {
      for (const b of game.teams[1]) bump(opponents, pairKey(a, b));
    }
    for (const id of game.sit) {
      const s = get(id);
      s.sat++;
      s.expected += share;
      s.streak = s.streak < 0 ? s.streak - 1 : -1;
    }
  }

  return { players, partners, opponents };
}
