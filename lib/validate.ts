import type { EventState, Game, Player } from "./types";

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const MAX_PLAYERS = 64;
const MAX_GAMES = 500;
const MAX_TEXT = 80;

function isText(v: unknown): v is string {
  return typeof v === "string" && v.length <= MAX_TEXT;
}

function isId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= 40;
}

function isPlayer(v: unknown): v is Player {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return isId(p.id) && isText(p.name) && typeof p.color === "string" && COLOR_RE.test(p.color) && typeof p.active === "boolean";
}

function isIdList(v: unknown): v is string[] {
  return Array.isArray(v) && v.length <= MAX_PLAYERS && v.every(isId);
}

function isScore(v: unknown): boolean {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 999;
}

function isGame(v: unknown): v is Game {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  return (
    isId(g.id) &&
    Array.isArray(g.teams) &&
    g.teams.length === 2 &&
    g.teams.every(isIdList) &&
    isIdList(g.bench) &&
    Array.isArray(g.score) &&
    g.score.length === 2 &&
    g.score.every(isScore) &&
    (g.winner === null || g.winner === 0 || g.winner === 1)
  );
}

export function isEventState(v: unknown): v is EventState {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    s.v === 1 &&
    isText(s.name) &&
    (s.teamSize === 1 || s.teamSize === 2) &&
    Array.isArray(s.players) &&
    s.players.length <= MAX_PLAYERS &&
    s.players.every(isPlayer) &&
    Array.isArray(s.games) &&
    s.games.length <= MAX_GAMES &&
    s.games.every(isGame)
  );
}
