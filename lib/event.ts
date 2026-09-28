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
