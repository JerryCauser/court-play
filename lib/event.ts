import type { EventState, Game, Player } from "./types";
import { shortId } from "./uuid";

export const PALETTE = [
  "#e5484d",
  "#0090ff",
  "#30a46c",
  "#f76b15",
  "#8e4ec6",
  "#12a594",
  "#d6409f",
  "#ffc53d",
  "#3e63dd",
  "#978365",
  "#7ce2fe",
  "#bdee63",
];

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function newEventState(): EventState {
  return { v: 1, name: today(), teamSize: 2, players: [], games: [] };
}

export function nextColor(players: Player[]): string {
  const used = new Set(players.map((p) => p.color.toLowerCase()));
  return PALETTE.find((c) => !used.has(c)) ?? PALETTE[players.length % PALETTE.length];
}

export function newPlayer(players: Player[], name: string): Player {
  return { id: shortId(), name, color: nextColor(players), active: true };
}

export function isPlayerUsed(state: EventState, id: string): boolean {
  return state.games.some((g) => g.bench.includes(id) || g.teams.some((t) => t.includes(id)));
}

export function updateGame(state: EventState, id: string, fn: (g: Game) => Game): EventState {
  return { ...state, games: state.games.map((g) => (g.id === id ? fn(g) : g)) };
}

export function updatePlayer(state: EventState, id: string, patch: Partial<Player>): EventState {
  return { ...state, players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function swapPlayer(state: EventState, gameId: string, from: string, to: string): EventState {
  const game = state.games.find((g) => g.id === gameId);
  if (!game || from === to) return state;
  const inGame = game.teams.some((t) => t.includes(to)) || game.bench.includes(to);
  const exchange = (ids: string[]) => ids.map((id) => (id === from ? to : id === to ? from : id));
  const order = new Map(state.players.map((p, i) => [p.id, i]));
  const bench = inGame
    ? exchange(game.bench)
    : [...game.bench, from].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  const next: Game = {
    ...game,
    teams: [exchange(game.teams[0]), exchange(game.teams[1])],
    bench,
    away: game.away?.filter((id) => id !== to && id !== from),
  };
  return {
    ...state,
    players: state.players.map((p) => (p.id === to && !p.active ? { ...p, active: true } : p)),
    games: state.games.map((g) => (g.id === gameId ? next : g)),
  };
}

export function deletePlayer(state: EventState, id: string): EventState {
  return {
    ...state,
    players: state.players.filter((p) => p.id !== id),
    games: state.games.map((g) => (g.away?.includes(id) ? { ...g, away: g.away.filter((a) => a !== id) } : g)),
  };
}

export function rematch(state: EventState, gameId: string): EventState {
  const game = state.games.find((g) => g.id === gameId);
  if (!game) return state;
  const copy: Game = {
    id: `${game.id.slice(0, 16)}r${state.games.length}`,
    teams: [game.teams[1].slice(), game.teams[0].slice()],
    bench: game.bench.slice(),
    score: [0, 0],
    winner: null,
    away: state.players.filter((p) => !p.active).map((p) => p.id),
  };
  return { ...state, games: [...state.games, copy] };
}
