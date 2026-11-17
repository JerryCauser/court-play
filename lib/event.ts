import type { EventDefaults } from "./event-defaults";
import type { Profile } from "./profile";
import { seededRandom } from "./rng";
import { defaultFormat, setGameFormat, type FormatId, type Sport } from "./scoring";
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

export function newEventState(defaults: EventDefaults = {}): EventState {
  const sport = defaults.sport ?? "badminton";
  return {
    v: 1,
    name: today(),
    teamSize: defaults.teamSize ?? 2,
    sport,
    format: defaults.format ?? defaultFormat(sport),
    balance: defaults.balance ?? false,
    courts: defaults.courts ?? 1,
    players: [],
    games: [],
  };
}

export function eventSport(state: EventState): Sport {
  return state.sport ?? "badminton";
}

export function eventFormat(state: EventState): FormatId {
  return state.format ?? defaultFormat(eventSport(state));
}

export function pickServer(teams: [string[], string[]], seed: string): string | undefined {
  const playing = teams.flat();
  if (playing.length === 0) return undefined;
  return playing[Math.floor(seededRandom(seed)() * playing.length)];
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
    elsewhere: game.elsewhere?.filter((id) => id !== to && id !== from),
    // Whoever comes in takes the court of the player they replace.
    left: game.left && exchange(game.left),
    serve: game.serve === from ? to : game.serve === to ? from : game.serve,
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
  const id = `${game.id.slice(0, 16)}r${state.games.length}`;
  const teams: [string[], string[]] = [game.teams[1].slice(), game.teams[0].slice()];
  const copy: Game = {
    id,
    teams,
    bench: game.bench.slice(),
    score: [0, 0],
    winner: null,
    away: state.players.filter((p) => !p.active).map((p) => p.id),
    ...(game.court ? { court: game.court } : {}),
    ...(game.elsewhere ? { elsewhere: game.elsewhere.slice() } : {}),
  };
  const format = game.format ?? eventFormat(state);
  return { ...state, games: [...state.games, setGameFormat({ ...copy, rallies: "", serve: pickServer(teams, id) }, format)] };
}

export function joinEvent(state: EventState, profile: Profile, weight?: number | null): EventState {
  if (state.players.some((p) => p.uid === profile.id)) return state;
  const player: Player = { ...newPlayer(state.players, profile.name), color: profile.color, uid: profile.id };
  if (weight != null) player.weight = weight;
  return { ...state, players: [...state.players, player] };
}

function release(player: Player): Player {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping uid
  const { uid, original, ...rest } = player;
  return original ? { ...rest, ...original } : rest;
}

export function claimPlayer(state: EventState, id: string, profile: Profile, weight?: number | null): EventState {
  const player = state.players.find((p) => p.id === id);
  if (!player || player.uid === profile.id) return state;
  return {
    ...state,
    players: state.players.map((p) => {
      if (p.id === id) {
        const original = p.original ?? { name: p.name, color: p.color };
        const claimed = { ...p, name: profile.name, color: profile.color, uid: profile.id, original };
        return weight != null ? { ...claimed, weight } : claimed;
      }
      return p.uid === profile.id ? release(p) : p;
    }),
  };
}

export function syncProfile(state: EventState, profile: Profile): EventState {
  const player = state.players.find((p) => p.uid === profile.id);
  if (!player || (player.name === profile.name && player.color === profile.color)) return state;
  return updatePlayer(state, player.id, { name: profile.name, color: profile.color });
}

export function unclaimPlayer(state: EventState, id: string, profile: Profile): EventState {
  const player = state.players.find((p) => p.id === id);
  if (!player || player.uid !== profile.id) return state;
  return { ...state, players: state.players.map((p) => (p.id === id ? release(p) : p)) };
}
