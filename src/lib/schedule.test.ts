import { test } from "node:test";
import assert from "node:assert/strict";
import { nextGame } from "./schedule.ts";
import { apply, createState, type EventState } from "./state.ts";
import { computeStats, pairKey } from "./stats.ts";

const EVENT = "7b0e2f0a-5d1c-4c4a-9d7e-2f4b8a6c1e33";

function withPlayers(n: number, teamSize: 1 | 2): EventState {
  let s = apply(createState("t"), { type: "setTeamSize", teamSize });
  for (let i = 0; i < n; i++) s = apply(s, { type: "addPlayer", id: `p${i}`, name: `P${i}`, color: "#000000" });
  return s;
}

function play(state: EventState, rounds: number, onRound?: (s: EventState) => void): EventState {
  let s = state;
  for (let r = 0; r < rounds; r++) {
    const game = nextGame(EVENT, s);
    assert.ok(game);
    s = apply(s, { type: "addGame", game });
    onRound?.(s);
  }
  return s;
}

function spread(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function streaks(state: EventState, id: string): number[] {
  const out: number[] = [];
  let cur = 0;
  for (const g of state.games) {
    const on = g.teams[0].includes(id) || g.teams[1].includes(id);
    if (cur !== 0 && on !== cur > 0) {
      out.push(cur);
      cur = 0;
    }
    cur += on ? 1 : -1;
  }
  out.push(cur);
  return out;
}

function runs(state: EventState, id: string): { play: number; sit: number } {
  const all = streaks(state, id);
  return { play: Math.max(0, ...all), sit: Math.max(0, ...all.map((x) => -x)) };
}

for (const teamSize of [1, 2] as const) {
  for (let n = teamSize * 2; n <= 12; n++) {
    test(`fair counts n=${n} teamSize=${teamSize}`, () => {
      const rounds = 60;
      const size = teamSize * 2;
      const s = play(withPlayers(n, teamSize), rounds, (cur) => {
        const st = computeStats(cur);
        assert.ok(spread([...st.players.values()].map((p) => p.played)) <= 1);
      });
      for (const p of s.players) {
        const r = runs(s, p.id);
        if (n > size) assert.ok(r.play <= Math.ceil(size / (n - size)) + 1, `play run ${r.play}`);
        assert.ok(r.sit <= Math.ceil((n - size) / size) + 1, `sit run ${r.sit}`);
      }
    });
  }
}

test("6 players doubles: mostly play 2, sit 1", () => {
  const s = play(withPlayers(6, 2), 60);
  const all = s.players.flatMap((p) => streaks(s, p.id).slice(1, -1));
  const ideal = all.filter((x) => x === 2 || x === -1).length;
  assert.ok(ideal / all.length >= 0.85, `ideal ratio ${ideal / all.length}`);
  assert.ok(all.every((x) => x <= 3 && x >= -2));
});

test("singles: opponents mix even when rotation is periodic", () => {
  for (const n of [5, 6, 7, 8]) {
    const s = play(withPlayers(n, 1), n * 6);
    const st = computeStats(s);
    const counts: number[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) counts.push(st.opponents.get(pairKey(`p${i}`, `p${j}`)) ?? 0);
    }
    assert.ok(Math.min(...counts) >= 1, `n=${n} someone never met`);
    assert.ok(spread(counts) <= 3, `n=${n} spread ${spread(counts)}`);
  }
});

test("partners and opponents are balanced", () => {
  const n = 8;
  const s = play(withPlayers(n, 2), 56);
  const st = computeStats(s);
  const partner: number[] = [];
  const opponent: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      partner.push(st.partners.get(pairKey(`p${i}`, `p${j}`)) ?? 0);
      opponent.push(st.opponents.get(pairKey(`p${i}`, `p${j}`)) ?? 0);
    }
  }
  assert.ok(spread(partner) <= 3, `partner spread ${spread(partner)}`);
  assert.ok(spread(opponent) <= 3, `opponent spread ${spread(opponent)}`);
});

test("singles: everyone meets everyone", () => {
  const n = 5;
  const s = play(withPlayers(n, 1), 20);
  const st = computeStats(s);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) assert.equal(st.opponents.get(pairKey(`p${i}`, `p${j}`)), 2);
  }
});

test("deterministic by event seed", () => {
  const a = play(withPlayers(7, 2), 20);
  const b = play(withPlayers(7, 2), 20);
  assert.deepEqual(a.games, b.games);
});

test("late joiner and paused player", () => {
  let s = play(withPlayers(5, 2), 10);
  s = apply(s, { type: "addPlayer", id: "late", name: "Late", color: "#000000" });
  s = apply(s, { type: "toggleActive", id: "p0" });
  s = play(s, 10);
  const recent = s.games.slice(10);
  assert.ok(recent.every((g) => !g.teams.flat().includes("p0") && !g.sit.includes("p0")));
  const st = computeStats(s);
  assert.ok(st.players.get("late")!.played >= 5);
  assert.equal(runs({ ...s, games: recent }, "late").sit <= 1, true);
});

test("not enough players", () => {
  assert.equal(nextGame(EVENT, withPlayers(3, 2)), null);
  assert.equal(nextGame(EVENT, withPlayers(1, 1)), null);
});
