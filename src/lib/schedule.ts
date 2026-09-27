import type { EventState, Game } from "./state.ts";
import { computeStats, pairKey, type Stats } from "./stats.ts";
import { seeded } from "./rng.ts";

const EPS = 1e-9;
const HARD_EXCESS = 1000;
const WEIGHTS = {
  1: { soft: 5, pairBase: 6 },
  2: { soft: 20, pairBase: 4 },
} as const;
const MAX_POOL = 10;
const BEAM = 6;
const DEPTH = 2;
const LOOKAHEAD_WEIGHT = 1;
const DEBT_WEIGHT = 20;
const EARLY = -0.34;

type Weights = (typeof WEIGHTS)[keyof typeof WEIGHTS];

function penalty(excess: number, w: Weights): number {
  return w.soft * excess + HARD_EXCESS * (excess - 1) * (excess - 1);
}

function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const pick: T[] = [];
  const walk = (start: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i <= items.length - (k - pick.length); i++) {
      pick.push(items[i]);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  return out;
}

function splits(group: string[], teamSize: number): Array<[string[], string[]]> {
  if (teamSize === 1) return [[[group[0]], [group[1]]]];
  const [first, ...rest] = group;
  return rest.map((mate) => {
    const team = [first, mate];
    return [team, group.filter((id) => !team.includes(id))];
  });
}

function minCount(map: Map<string, number>, ids: string[]): number {
  let min = Infinity;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) min = Math.min(min, map.get(pairKey(ids[i], ids[j])) ?? 0);
  }
  return min === Infinity ? 0 : min;
}

function pairingCost(
  stats: Stats,
  teams: [string[], string[]],
  minPartner: number,
  minOpponent: number,
  w: Weights,
): number {
  let cost = 0;
  for (const team of teams) {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const n = (stats.partners.get(pairKey(team[i], team[j])) ?? 0) - minPartner;
        cost += w.pairBase ** n;
      }
    }
  }
  for (const a of teams[0]) {
    for (const b of teams[1]) {
      const n = (stats.opponents.get(pairKey(a, b)) ?? 0) - minOpponent;
      cost += w.pairBase ** n;
    }
  }
  return cost;
}

function streakCost(
  stats: Stats,
  chosen: string[],
  benched: string[],
  maxPlay: number,
  maxSit: number,
  w: Weights,
): number {
  let cost = 0;
  for (const id of chosen) {
    const s = stats.players.get(id)!.streak;
    const excess = (s > 0 ? s + 1 : 1) - maxPlay;
    if (excess > 0) cost += penalty(excess, w);
  }
  for (const id of benched) {
    const s = stats.players.get(id)!.streak;
    const excess = (s < 0 ? 1 - s : 1) - maxSit;
    if (excess > 0) cost += penalty(excess, w);
  }
  return cost;
}

type Candidate = { teams: [string[], string[]]; sit: string[]; cost: number };

function candidates(state: EventState, active: string[], rand: () => number): Candidate[] {
  const size = state.teamSize * 2;
  const w = WEIGHTS[state.teamSize];
  const stats = computeStats(state);
  const share = size / active.length;
  const benchSize = active.length - size;
  const maxPlay = benchSize ? Math.ceil(size / benchSize) : Infinity;
  const maxSit = Math.ceil(benchSize / size);
  const debt = new Map(
    active.map((id) => {
      const s = stats.players.get(id)!;
      return [id, s.expected + share - s.played];
    }),
  );
  const rest = new Map(active.map((id) => [id, -stats.players.get(id)!.streak + rand()]));

  const ranked = [...active].sort((a, b) => debt.get(b)! - debt.get(a)! || rest.get(b)! - rest.get(a)!);
  const mandatory = ranked.filter((id) => debt.get(id)! >= 1 - EPS).slice(0, size);
  const eligible = ranked.filter((id) => !mandatory.includes(id) && debt.get(id)! > EARLY);
  const fallback = ranked.filter((id) => !mandatory.includes(id) && !eligible.includes(id));
  const need = size - mandatory.length;
  const pool = (eligible.length >= need ? eligible : [...eligible, ...fallback]).slice(0, Math.max(MAX_POOL, need));
  const benchedAlways = ranked.filter((id) => !mandatory.includes(id) && !pool.includes(id));
  const debtCost = (chosen: string[]) =>
    active.reduce((sum, id) => {
      const d = debt.get(id)! - (chosen.includes(id) ? 1 : 0);
      return sum + d * d;
    }, 0) * DEBT_WEIGHT;

  const minPartner = state.teamSize > 1 ? minCount(stats.partners, active) : 0;
  const minOpponent = minCount(stats.opponents, active);

  const out: Candidate[] = [];
  for (const extra of combinations(pool, need)) {
    const chosen = [...mandatory, ...extra];
    const sit = [...pool.filter((id) => !extra.includes(id)), ...benchedAlways];
    const base = streakCost(stats, chosen, sit, maxPlay, maxSit, w) + debtCost(chosen);
    for (const teams of splits(chosen, state.teamSize)) {
      out.push({ teams, sit, cost: base + pairingCost(stats, teams, minPartner, minOpponent, w) + rand() * 1e-3 });
    }
  }
  return out.sort((a, b) => a.cost - b.cost);
}

function toGame(state: EventState, c: Candidate, id: string): Game {
  return { id, teams: c.teams, sit: c.sit, score: [0, 0], winner: null };
}

function search(state: EventState, active: string[], rand: () => number, depth: number): Candidate | null {
  const list = candidates(state, active, rand);
  if (depth <= 1 || !list.length) return list[0] ?? null;
  let best: Candidate | null = null;
  let bestTotal = Infinity;
  for (const c of list.slice(0, BEAM)) {
    const next = { ...state, games: [...state.games, toGame(state, c, "")] };
    const tail = search(next, active, rand, depth - 1);
    const total = c.cost + (tail ? tail.cost * LOOKAHEAD_WEIGHT : 0);
    if (total < bestTotal) {
      bestTotal = total;
      best = c;
    }
  }
  return best;
}

export function nextGame(eventId: string, state: EventState): Game | null {
  const size = state.teamSize * 2;
  const active = state.players.filter((p) => p.active).map((p) => p.id);
  if (active.length < size) return null;

  const rand = seeded(eventId, state.games.length, active.join(","));
  const best = search(state, active, rand, DEPTH);
  if (!best) return null;

  const order = new Map(state.players.map((p, i) => [p.id, i]));
  const byOrder = (a: string, b: string) => order.get(a)! - order.get(b)!;
  const teams: [string[], string[]] = [[...best.teams[0]].sort(byOrder), [...best.teams[1]].sort(byOrder)];
  if (rand() < 0.5) teams.reverse();
  const id = `${state.games.length + 1}-${Math.floor(rand() * 0xffffffff).toString(36)}`;
  return toGame(state, { ...best, teams, sit: [...best.sit].sort(byOrder) }, id);
}
