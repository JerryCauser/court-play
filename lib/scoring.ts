// Scoring engine. Self-contained (no "@/" imports) so plain `node` can load it.
// A tracked game stores who won each rally in `rallies` ("0"/"1"); score, server
// and winner are always derived by replaying that history under the game's format.

export type Sport = "badminton" | "tennis" | "padel";
export const SPORTS: readonly Sport[] = ["badminton", "tennis", "padel"];

export type FormatId = "bad21" | "bad15" | "bad11" | "bad15old" | "set6" | "set6gold" | "set4" | "set4gold" | "pro8" | "tb10";

type Rule =
  | { kind: "rally"; to: number; cap: number }
  | { kind: "sideout"; to: number }
  | { kind: "set"; games: number; golden: boolean }
  | { kind: "tiebreak"; to: number };

export type Format = Rule & { sports: readonly Sport[] };

export const FORMATS: Record<FormatId, Format> = {
  bad21: { kind: "rally", to: 21, cap: 30, sports: ["badminton"] },
  bad15: { kind: "rally", to: 15, cap: 21, sports: ["badminton"] },
  bad11: { kind: "rally", to: 11, cap: 15, sports: ["badminton"] },
  bad15old: { kind: "sideout", to: 15, sports: ["badminton"] },
  set6: { kind: "set", games: 6, golden: false, sports: ["tennis", "padel"] },
  set6gold: { kind: "set", games: 6, golden: true, sports: ["padel"] },
  set4: { kind: "set", games: 4, golden: false, sports: ["tennis"] },
  set4gold: { kind: "set", games: 4, golden: true, sports: ["padel"] },
  pro8: { kind: "set", games: 8, golden: false, sports: ["tennis"] },
  tb10: { kind: "tiebreak", to: 10, sports: ["tennis", "padel"] },
};

const SPORT_FORMATS: Record<Sport, FormatId[]> = {
  badminton: ["bad15", "bad11", "bad21", "bad15old"],
  tennis: ["set6", "set4", "pro8", "tb10"],
  padel: ["set6gold", "set6", "set4gold", "tb10"],
};

const SET_TIEBREAK_TO = 7;
const MAX_RALLIES = 800;

export function isSport(v: unknown): v is Sport {
  return typeof v === "string" && (SPORTS as readonly string[]).includes(v);
}

export function isFormatId(v: unknown): v is FormatId {
  return typeof v === "string" && Object.hasOwn(FORMATS, v);
}

export function formatsFor(sport: Sport): FormatId[] {
  return SPORT_FORMATS[sport];
}

export function defaultFormat(sport: Sport): FormatId {
  return SPORT_FORMATS[sport][0];
}

export function sportOf(format: FormatId, preferred: Sport): Sport {
  const { sports } = FORMATS[format];
  return sports.includes(preferred) ? preferred : sports[0];
}

export type Side = 0 | 1;

export type ScoredGame = {
  teams: [string[], string[]];
  score: [number, number];
  winner: Side | null;
  format?: FormatId;
  rallies?: string;
  serve?: string;
};

export type Court = "R" | "L";

export type Replay = {
  /** Points each side won; what stats count. Tennis/padel: rallies won. */
  score: [number, number];
  /** Big numbers: points (badminton, match tiebreak) or games (sets). */
  main: [string, string];
  /** Current game points for sets (0/15/30/40/AD or tiebreak points). */
  sub: [string, string] | null;
  server: { id: string; court: Court } | null;
  /** Side that won by the format's rules, or null while in play. */
  winner: Side | null;
};

export function isTracked(game: ScoredGame): boolean {
  return typeof game.rallies === "string";
}

export function gameFormat(game: ScoredGame): FormatId {
  return game.format ?? "bad21";
}

/** Manual score input only makes sense where one rally is one point. */
export function allowsManualScore(game: ScoredGame): boolean {
  return !isTracked(game) || FORMATS[gameFormat(game)].kind === "rally";
}

function firstServer(game: ScoredGame): { side: Side; id: string } {
  for (const side of [0, 1] as const) {
    if (game.serve && game.teams[side].includes(game.serve)) return { side, id: game.serve };
  }
  return { side: 0, id: game.teams[0][0] ?? "" };
}

// Positions [right court, left court]; the first server starts on the right.
function startPositions(game: ScoredGame, first: { side: Side; id: string }): [string[], string[]] {
  const pos: [string[], string[]] = [game.teams[0].slice(), game.teams[1].slice()];
  const own = pos[first.side];
  if (own.length > 1 && own[1] === first.id) own.reverse();
  return pos;
}

function parityCourt(points: number): Court {
  return points % 2 === 0 ? "R" : "L";
}

function courtOf(pos: string[], id: string, points: number): Court {
  if (pos.length < 2) return parityCourt(points);
  return pos[0] === id ? "R" : "L";
}

function rallyList(game: ScoredGame): Side[] {
  return [...(game.rallies ?? "")].map((c) => (c === "1" ? 1 : 0));
}

function str(pair: [number, number]): [string, string] {
  return [String(pair[0]), String(pair[1])];
}

function replayRally(game: ScoredGame, rule: { to: number; cap: number }): Replay {
  const first = firstServer(game);
  const pos = startPositions(game, first);
  const score: [number, number] = [0, 0];
  let serving: Side = first.side;
  let server = first.id;
  let winner: Side | null = null;
  for (const r of rallyList(game)) {
    score[r]++;
    if (r === serving) {
      if (pos[r].length > 1) pos[r].reverse();
    } else {
      serving = r;
      server = pos[r].length > 1 ? pos[r][score[r] % 2] : pos[r][0];
    }
  }
  // Judged on the final score only, so typed scores (rallies appended in bulk) work too.
  for (const side of [0, 1] as const) {
    const o = side === 0 ? 1 : 0;
    if ((score[side] >= rule.to && score[side] - score[o] >= 2) || score[side] >= rule.cap) winner = side;
  }
  return {
    score,
    main: str(score),
    sub: null,
    server: server ? { id: server, court: courtOf(pos[serving], server, score[serving]) } : null,
    winner,
  };
}

// Old side-out scoring: only the serving side scores. In doubles each side has two
// hands, except the side that serves first, which starts on its second hand.
// Setting: at 13-all the game goes to 18, at 14-all (if not set before) to 17.
function replaySideOut(game: ScoredGame, to: number): Replay {
  const first = firstServer(game);
  const pos = startPositions(game, first);
  const score: [number, number] = [0, 0];
  let serving: Side = first.side;
  let server = first.id;
  let secondHand = true;
  let target = to;
  let winner: Side | null = null;
  for (const r of rallyList(game)) {
    if (r === serving) {
      score[r]++;
      if (pos[r].length > 1) pos[r].reverse();
      if (target === to && score[0] === score[1] && score[0] === to - 2) target = to + 3;
      if (target === to && score[0] === score[1] && score[0] === to - 1) target = to + 2;
      if (score[r] >= target) winner = r;
    } else if (pos[serving].length > 1 && !secondHand) {
      secondHand = true;
      server = pos[serving].find((id) => id !== server) ?? server;
    } else {
      serving = r;
      secondHand = pos[r].length < 2;
      server = pos[r][0];
    }
  }
  return {
    score,
    main: str(score),
    sub: null,
    server: server ? { id: server, court: courtOf(pos[serving], server, score[serving]) } : null,
    winner,
  };
}

const POINT_LABELS = ["0", "15", "30", "40"];

function gamePoints(p: [number, number], golden: boolean): [string, string] {
  if (p[0] >= 3 && p[1] >= 3 && !golden) {
    if (p[0] === p[1]) return ["40", "40"];
    return p[0] > p[1] ? ["AD", "40"] : ["40", "AD"];
  }
  return [POINT_LABELS[Math.min(3, p[0])], POINT_LABELS[Math.min(3, p[1])]];
}

// Tennis/padel. Server changes every game; in doubles the order is A1 (first
// server), B1, A2, B2. In a tiebreak the next server serves one point, then two each.
function replaySets(game: ScoredGame, rule: { kind: "set"; games: number; golden: boolean } | { kind: "tiebreak"; to: number }): Replay {
  const first = firstServer(game);
  const own = game.teams[first.side];
  const other = game.teams[first.side === 0 ? 1 : 0];
  const mate = own.find((id) => id !== first.id);
  const rotation = [first.id, other[0], mate, other[1]].filter((id): id is string => Boolean(id));
  const score: [number, number] = [0, 0];
  const games: [number, number] = [0, 0];
  const points: [number, number] = [0, 0];
  let gameNo = 0;
  let tiebreak = rule.kind === "tiebreak";
  const tiebreakTo = rule.kind === "tiebreak" ? rule.to : SET_TIEBREAK_TO;
  let winner: Side | null = null;

  for (const r of rallyList(game)) {
    score[r]++;
    if (winner !== null) continue;
    const o = r === 0 ? 1 : 0;
    points[r]++;
    if (tiebreak) {
      if (points[r] >= tiebreakTo && points[r] - points[o] >= 2) {
        if (rule.kind === "set") games[r]++;
        winner = r;
      }
      continue;
    }
    if (rule.kind !== "set") continue;
    if (points[r] >= 4 && (rule.golden || points[r] - points[o] >= 2)) {
      games[r]++;
      points[0] = 0;
      points[1] = 0;
      gameNo++;
      if (games[r] >= rule.games && games[r] - games[o] >= 2) winner = r;
      else if (games[0] === rule.games && games[1] === rule.games) tiebreak = true;
    }
  }

  const total = points[0] + points[1];
  const slot = tiebreak ? gameNo + Math.floor((total + 1) / 2) : gameNo;
  const server = rotation.length > 0 && winner === null ? rotation[slot % rotation.length] : null;
  const isMatchTiebreak = rule.kind === "tiebreak";
  return {
    score,
    main: isMatchTiebreak ? str(points) : str(games),
    sub: isMatchTiebreak || winner !== null ? null : tiebreak ? str(points) : gamePoints(points, rule.kind === "set" && rule.golden),
    server: server ? { id: server, court: parityCourt(total) } : null,
    winner,
  };
}

export function replay(game: ScoredGame): Replay {
  if (!isTracked(game)) {
    return { score: game.score, main: str(game.score), sub: null, server: null, winner: null };
  }
  const rule = FORMATS[gameFormat(game)];
  switch (rule.kind) {
    case "rally":
      return replayRally(game, rule);
    case "sideout":
      return replaySideOut(game, rule.to);
    case "set":
    case "tiebreak":
      return replaySets(game, rule);
  }
}

function withRallies<G extends ScoredGame>(game: G, rallies: string): G {
  const next = { ...game, rallies };
  const r = replay(next);
  return { ...next, score: r.score, winner: r.winner };
}

/** "+": one more rally won by `side`. Sets the winner when the format says it's over. */
export function addRally<G extends ScoredGame>(game: G, side: Side): G {
  if (!isTracked(game)) {
    const score: [number, number] = [game.score[0], game.score[1]];
    score[side] = Math.min(999, score[side] + 1);
    return { ...game, score };
  }
  const rallies = game.rallies ?? "";
  if (rallies.length >= MAX_RALLIES || replay(game).winner !== null) return game;
  return withRallies(game, rallies + side);
}

/** "−": drop the last rally won by `side`. */
export function undoRally<G extends ScoredGame>(game: G, side: Side): G {
  if (!isTracked(game)) {
    const score: [number, number] = [game.score[0], game.score[1]];
    score[side] = Math.max(0, score[side] - 1);
    return { ...game, score };
  }
  const rallies = game.rallies ?? "";
  const at = rallies.lastIndexOf(String(side));
  if (at === -1) return game;
  return withRallies(game, rallies.slice(0, at) + rallies.slice(at + 1));
}

/** Typed score; for tracked rally formats appends or drops that side's rallies. */
export function setManualScore<G extends ScoredGame>(game: G, side: Side, value: number): G {
  const target = Math.min(999, Math.max(0, Math.floor(value)));
  if (!isTracked(game)) {
    const score: [number, number] = [game.score[0], game.score[1]];
    score[side] = target;
    return { ...game, score };
  }
  if (!allowsManualScore(game)) return game;
  let rallies = game.rallies ?? "";
  const mark = String(side);
  let have = [...rallies].filter((c) => c === mark).length;
  while (have > target) {
    const at = rallies.lastIndexOf(mark);
    rallies = rallies.slice(0, at) + rallies.slice(at + 1);
    have--;
  }
  const add = Math.min(target - have, MAX_RALLIES - rallies.length);
  if (add > 0) rallies += mark.repeat(add);
  return withRallies(game, rallies);
}

/** Re-score the same rallies under another format. */
export function setGameFormat<G extends ScoredGame>(game: G, format: FormatId): G {
  if (!isTracked(game)) return { ...game, format };
  return withRallies({ ...game, format }, game.rallies ?? "");
}
