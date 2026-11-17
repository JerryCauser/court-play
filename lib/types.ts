import type { FormatId, Sport } from "./scoring";

export type TeamSize = 1 | 2;

export type Player = {
  id: string;
  name: string;
  color: string;
  active: boolean;
  uid?: string;
  /** Strength for auto-balance: 0..2, 1 is an average player. */
  weight?: number;
  original?: { name: string; color: string };
};

export type Game = {
  id: string;
  teams: [string[], string[]];
  bench: string[];
  score: [number, number];
  winner: 0 | 1 | null;
  away?: string[];
  format?: FormatId;
  /** Rally winners in order ("0"/"1"); present on games scored by the engine. */
  rallies?: string;
  /** Id of the player who served first. */
  serve?: string;
  /** Players who start in (badminton) or receive from (tennis/padel) the left court. */
  left?: string[];
  /** Court number, from 1. */
  court?: number;
  /** Active players outside this game's rotation: on another court or holding one. */
  elsewhere?: string[];
};

export type EventState = {
  v: 1;
  name: string;
  teamSize: TeamSize;
  sport?: Sport;
  /** Scoring format for new games. */
  format?: FormatId;
  /** Balance teams by player weight. */
  balance?: boolean;
  /** Courts available at once; 1 when missing. */
  courts?: number;
  players: Player[];
  games: Game[];
};

export type Snapshot = {
  state: EventState;
  ikey: string;
  createdAt?: string;
};
