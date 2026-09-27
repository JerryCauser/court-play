export type TeamSize = 1 | 2;

export type Player = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

export type Game = {
  id: string;
  teams: [string[], string[]];
  sit: string[];
  score: [number, number];
  winner: 0 | 1 | null;
};

export type EventState = {
  v: 1;
  name: string;
  teamSize: TeamSize;
  players: Player[];
  games: Game[];
};

export const PALETTE = [
  "#e6194b",
  "#3cb44b",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#42d4f4",
  "#f032e6",
  "#bfef45",
  "#fabed4",
  "#469990",
  "#dcbeff",
  "#9a6324",
  "#fffac8",
  "#800000",
  "#aaffc3",
  "#808000",
  "#ffd8b1",
  "#000075",
  "#a9a9a9",
];

export const MAX_PLAYERS = 40;
export const MAX_NAME = 60;

export function todayName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createState(name = todayName()): EventState {
  return { v: 1, name, teamSize: 2, players: [], games: [] };
}

export function nextColor(state: EventState): string {
  const used = new Set(state.players.map((p) => p.color.toLowerCase()));
  return PALETTE.find((c) => !used.has(c)) ?? PALETTE[state.players.length % PALETTE.length];
}

export function playerHasGames(state: EventState, id: string): boolean {
  return state.games.some((g) => g.teams[0].includes(id) || g.teams[1].includes(id));
}

export function canAddGame(state: EventState): boolean {
  return state.players.filter((p) => p.active).length >= state.teamSize * 2;
}

export type Action =
  | { type: "rename"; name: string }
  | { type: "setTeamSize"; teamSize: TeamSize }
  | { type: "addPlayer"; id: string; name: string; color: string }
  | { type: "renamePlayer"; id: string; name: string }
  | { type: "setColor"; id: string; color: string }
  | { type: "toggleActive"; id: string }
  | { type: "removePlayer"; id: string }
  | { type: "addGame"; game: Game }
  | { type: "removeLastGame" }
  | { type: "score"; gameId: string; team: 0 | 1; delta: 1 | -1 }
  | { type: "setWinner"; gameId: string; winner: 0 | 1 | null };

function clip(s: string): string {
  return s.slice(0, MAX_NAME);
}

function mapGame(state: EventState, id: string, fn: (g: Game) => Game): EventState {
  return { ...state, games: state.games.map((g) => (g.id === id ? fn(g) : g)) };
}

function mapPlayer(state: EventState, id: string, fn: (p: Player) => Player): EventState {
  return { ...state, players: state.players.map((p) => (p.id === id ? fn(p) : p)) };
}

export function apply(state: EventState, action: Action): EventState {
  switch (action.type) {
    case "rename":
      return { ...state, name: clip(action.name) };
    case "setTeamSize":
      return state.games.length ? state : { ...state, teamSize: action.teamSize };
    case "addPlayer":
      if (state.players.length >= MAX_PLAYERS || state.players.some((p) => p.id === action.id)) return state;
      return {
        ...state,
        players: [...state.players, { id: action.id, name: clip(action.name), color: action.color, active: true }],
      };
    case "renamePlayer":
      return mapPlayer(state, action.id, (p) => ({ ...p, name: clip(action.name) }));
    case "setColor":
      return mapPlayer(state, action.id, (p) => ({ ...p, color: action.color }));
    case "toggleActive":
      return mapPlayer(state, action.id, (p) => ({ ...p, active: !p.active }));
    case "removePlayer":
      if (playerHasGames(state, action.id)) return state;
      return { ...state, players: state.players.filter((p) => p.id !== action.id) };
    case "addGame":
      return { ...state, games: [...state.games, action.game] };
    case "removeLastGame":
      return { ...state, games: state.games.slice(0, -1) };
    case "score":
      return mapGame(state, action.gameId, (g) => {
        const score: [number, number] = [g.score[0], g.score[1]];
        score[action.team] = Math.max(0, Math.min(999, score[action.team] + action.delta));
        return { ...g, score };
      });
    case "setWinner":
      return mapGame(state, action.gameId, (g) => ({ ...g, winner: action.winner }));
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isStr(v: unknown, max = 64): v is string {
  return typeof v === "string" && v.length <= max;
}

function isIdList(v: unknown, ids: Set<string>): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string" && ids.has(x));
}

function isScore(v: unknown): boolean {
  return Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 999);
}

export function validateState(value: unknown): value is EventState {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  if (s.v !== 1 || !isStr(s.name, MAX_NAME) || (s.teamSize !== 1 && s.teamSize !== 2)) return false;
  if (!Array.isArray(s.players) || s.players.length > MAX_PLAYERS) return false;
  if (!Array.isArray(s.games) || s.games.length > 1000) return false;
  const ids = new Set<string>();
  for (const p of s.players as Record<string, unknown>[]) {
    if (!p || typeof p !== "object") return false;
    if (!isStr(p.id) || !isStr(p.name, MAX_NAME) || typeof p.color !== "string" || !COLOR_RE.test(p.color)) return false;
    if (typeof p.active !== "boolean" || ids.has(p.id)) return false;
    ids.add(p.id);
  }
  const size = s.teamSize as number;
  for (const g of s.games as Record<string, unknown>[]) {
    if (!g || typeof g !== "object" || !isStr(g.id)) return false;
    if (!Array.isArray(g.teams) || g.teams.length !== 2) return false;
    if (!g.teams.every((t) => isIdList(t, ids) && t.length === size)) return false;
    if (!isIdList(g.sit, ids) || !isScore(g.score)) return false;
    if (g.winner !== null && g.winner !== 0 && g.winner !== 1) return false;
  }
  return true;
}
