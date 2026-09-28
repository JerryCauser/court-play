import { seededRandom, shuffle } from "./rng";
import type { EventState, Game } from "./types";

const EPS = 1e-6;
const COMBO_LIMIT = 4000;
const PARTNER_WEIGHT = 2;
const OPPONENT_WEIGHT = 1;
const SINGLES_OPPONENT_WEIGHT = 4;
const REST_PAIR_WEIGHT = 4;
const MAX_PLAY_STREAK = 4;
const REST_STREAK_WEIGHT = 8;
const BALANCE_WEIGHT = 0.5;
const BREACH = 1e6;
const STREAK_BREACH = BREACH * 100;
const LOOKAHEAD_WIDTH = 16;
const LOOKAHEAD_DEPTH = 4;
const LOOKAHEAD_BUDGET = 20000;

export type PlayerStats = {
  played: number;
  benched: number;
  wins: number;
  losses: number;
  credit: number;
  playStreak: number;
  benchStreak: number;
};

export type Stats = {
  players: Map<string, PlayerStats>;
  partners: Map<string, number>;
  opponents: Map<string, number>;
  benchPairs: Map<string, number>;
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function emptyStats(): PlayerStats {
  return { played: 0, benched: 0, wins: 0, losses: 0, credit: 0, playStreak: 0, benchStreak: 0 };
}

export function computeStats(state: EventState): Stats {
  const players = new Map<string, PlayerStats>();
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const benchPairs = new Map<string, number>();
  const get = (id: string) => {
    let s = players.get(id);
    if (!s) {
      s = emptyStats();
      players.set(id, s);
    }
    return s;
  };
  const bump = (map: Map<string, number>, a: string, b: string) => {
    const key = pairKey(a, b);
    map.set(key, (map.get(key) ?? 0) + 1);
  };

  for (const p of state.players) get(p.id);

  for (const game of state.games) {
    const playing = game.teams.flat();
    const onSite = new Set([...playing, ...game.bench]);
    const away = new Set(game.away ?? []);
    const owed = new Set(onSite);
    for (const p of state.players) if (!away.has(p.id)) owed.add(p.id);
    const share = playing.length / owed.size;
    for (const [id, s] of players) {
      if (!onSite.has(id)) {
        s.playStreak = 0;
        s.benchStreak = 0;
      }
    }
    for (const id of owed) {
      const s = get(id);
      s.credit += share;
    }
    game.teams.forEach((team, side) => {
      for (const id of team) {
        const s = get(id);
        s.played++;
        s.credit -= 1;
        s.playStreak++;
        s.benchStreak = 0;
        if (game.winner === side) s.wins++;
        else if (game.winner !== null) s.losses++;
      }
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) bump(partners, team[i], team[j]);
      }
    });
    for (const id of game.bench) {
      const s = get(id);
      s.benched++;
      s.benchStreak++;
      s.playStreak = 0;
    }
    for (const a of game.teams[0]) {
      for (const b of game.teams[1]) bump(opponents, a, b);
    }
    for (let i = 0; i < game.bench.length; i++) {
      for (let j = i + 1; j < game.bench.length; j++) bump(benchPairs, game.bench[i], game.bench[j]);
    }
  }

  return { players, partners, opponents, benchPairs };
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  const pick: T[] = [];
  const walk = (start: number) => {
    if (pick.length === size) {
      out.push(pick.slice());
      return;
    }
    for (let i = start; i <= items.length - (size - pick.length); i++) {
      pick.push(items[i]);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  return out;
}

function binomial(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

function splits(players: string[], teamSize: number): [string[], string[]][] {
  if (teamSize === 1) return [[[players[0]], [players[1]]]];
  const [first, ...rest] = players;
  return combinations(rest, teamSize - 1).map((mates) => {
    const team = [first, ...mates];
    return [team, players.filter((p) => !team.includes(p))];
  });
}

type PairingBase = { partners: number; opponents: number };

function pairingBase(ids: string[], stats: Stats): PairingBase {
  let partners = Infinity;
  let opponents = Infinity;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = pairKey(ids[i], ids[j]);
      partners = Math.min(partners, stats.partners.get(key) ?? 0);
      opponents = Math.min(opponents, stats.opponents.get(key) ?? 0);
    }
  }
  return {
    partners: Number.isFinite(partners) ? partners : 0,
    opponents: Number.isFinite(opponents) ? opponents : 0,
  };
}

function pairingCost(teams: [string[], string[]], stats: Stats, base: PairingBase): number {
  const opponentWeight = teams[0].length === 1 ? SINGLES_OPPONENT_WEIGHT : OPPONENT_WEIGHT;
  let cost = 0;
  for (const team of teams) {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        cost += PARTNER_WEIGHT * 2 ** ((stats.partners.get(pairKey(team[i], team[j])) ?? 0) - base.partners);
      }
    }
  }
  for (const a of teams[0]) {
    for (const b of teams[1]) {
      cost += opponentWeight * 2 ** ((stats.opponents.get(pairKey(a, b)) ?? 0) - base.opponents);
    }
  }
  return cost;
}

export function playersNeeded(state: EventState): number {
  return state.teamSize * 2;
}

export function canAddGame(state: EventState): boolean {
  return state.players.filter((p) => p.active).length >= playersNeeded(state);
}

type Sim = {
  credit: number[];
  play: number[];
  rest: number[];
  together: number[];
};

function applyGame(sim: Sim, playing: boolean[], share: number): Sim {
  const n = sim.credit.length;
  const together = sim.together.slice();
  for (let i = 0; i < n; i++) {
    if (playing[i]) continue;
    for (let j = i + 1; j < n; j++) if (!playing[j]) together[i * n + j]++;
  }
  return {
    credit: sim.credit.map((c, i) => c + share - (playing[i] ? 1 : 0)),
    play: sim.play.map((v, i) => (playing[i] ? v + 1 : 0)),
    rest: sim.rest.map((v, i) => (playing[i] ? 0 : v + 1)),
    together,
  };
}

export function nextGame(state: EventState, seed: string): Game | null {
  if (!canAddGame(state)) return null;
  const need = playersNeeded(state);
  const random = seededRandom(`${seed}:${state.games.length}`);
  const stats = computeStats(state);
  const stat = (id: string) => stats.players.get(id) ?? emptyStats();

  const ranked = shuffle(
    state.players.filter((p) => p.active).map((p) => p.id),
    random,
  ).sort((a, b) => {
    const sa = stat(a);
    const sb = stat(b);
    if (Math.abs(sa.credit - sb.credit) > EPS) return sb.credit - sa.credit;
    if (sa.benchStreak !== sb.benchStreak) return sb.benchStreak - sa.benchStreak;
    return sa.playStreak - sb.playStreak;
  });
  const n = ranked.length;

  let poolSize = n;
  while (poolSize > need && binomial(poolSize, need) > COMBO_LIMIT) poolSize--;
  const candidates = combinations(
    Array.from({ length: poolSize }, (_, i) => i),
    need,
  ).map((picked) => {
    const mask = Array<boolean>(n).fill(false);
    for (const i of picked) mask[i] = true;
    return { picked, mask };
  });

  const share = need / n;
  const resting = n - need;
  const maxRest = Math.ceil(resting / need);

  const start: Sim = {
    credit: ranked.map((id) => stat(id).credit),
    play: ranked.map((id) => stat(id).playStreak),
    rest: ranked.map((id) => stat(id).benchStreak),
    together: Array<number>(n * n).fill(0),
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) start.together[i * n + j] = stats.benchPairs.get(pairKey(ranked[i], ranked[j])) ?? 0;
  }

  const restCost = (sim: Sim, playing: boolean[]): number => {
    let high = -Infinity;
    let low = Infinity;
    let balance = 0;
    let rotation = 0;
    for (let i = 0; i < n; i++) {
      const after = sim.credit[i] + share - (playing[i] ? 1 : 0);
      balance += after * after;
      high = Math.max(high, after);
      low = Math.min(low, after);
      if (playing[i]) {
        if (resting > 0 && sim.play[i] + 1 > MAX_PLAY_STREAK) rotation += STREAK_BREACH;
      } else if (sim.rest[i] + 1 > maxRest) {
        rotation += REST_STREAK_WEIGHT * (sim.rest[i] + 1 - maxRest) ** 2;
      }
    }
    let floor = Infinity;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) floor = Math.min(floor, sim.together[i * n + j]);
    let together = 0;
    for (let i = 0; i < n; i++) {
      if (playing[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!playing[j]) together += REST_PAIR_WEIGHT * 2 ** (sim.together[i * n + j] - floor);
      }
    }
    return Math.max(0, high - low - 1 - EPS) * BREACH + BALANCE_WEIGHT * balance + rotation + together;
  };

  const pairs = pairingBase(ranked, stats);
  const firstMoves = candidates
    .map((c) => {
      const playing = c.picked.map((i) => ranked[i]);
      let split: [string[], string[]] = [[], []];
      let pairing = Infinity;
      for (const teams of splits(playing, state.teamSize)) {
        const cost = pairingCost(teams, stats, pairs);
        if (cost < pairing - EPS) {
          pairing = cost;
          split = teams;
        }
      }
      return { ...c, split, cost: restCost(start, c.mask) + pairing };
    })
    .sort((a, b) => a.cost - b.cost)
    .slice(0, LOOKAHEAD_WIDTH);

  const depth = candidates.length * LOOKAHEAD_WIDTH > LOOKAHEAD_BUDGET ? 1 : LOOKAHEAD_DEPTH;
  let best = firstMoves[0];
  let bestTotal = Infinity;
  for (const move of firstMoves) {
    let total = move.cost;
    let sim = applyGame(start, move.mask, share);
    for (let step = 1; step < depth && resting > 0; step++) {
      let stepBest = Infinity;
      let stepMask = candidates[0].mask;
      for (const c of candidates) {
        const cost = restCost(sim, c.mask);
        if (cost < stepBest) {
          stepBest = cost;
          stepMask = c.mask;
        }
      }
      total += stepBest;
      sim = applyGame(sim, stepMask, share);
    }
    if (total < bestTotal - EPS) {
      bestTotal = total;
      best = move;
    }
  }

  const order = new Map(state.players.map((p, i) => [p.id, i]));
  const byOrder = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0);
  const id = Math.floor(random() * 2 ** 32).toString(36) + Math.floor(random() * 2 ** 32).toString(36);

  return {
    id,
    teams: [best.split[0].slice().sort(byOrder), best.split[1].slice().sort(byOrder)],
    bench: ranked.filter((_, i) => !best.mask[i]).sort(byOrder),
    score: [0, 0],
    winner: null,
    away: state.players.filter((p) => !p.active).map((p) => p.id),
  };
}
