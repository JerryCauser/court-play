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
  bench: string[];
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

export type Snapshot = {
  state: EventState;
  ikey: string;
};
