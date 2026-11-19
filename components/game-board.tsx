"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";
import { eventSport, updateGame } from "@/lib/event";
import { haptic } from "@/lib/haptics";
import type { Dict } from "@/lib/i18n";
import { courtCount, gameCourt } from "@/lib/scheduler";
import { addRally, gameFormat, isTracked, replay, sportOf, swapSides, undoRally, type Court, type Side } from "@/lib/scoring";
import { shareLink } from "@/lib/share";
import type { Game, Snapshot } from "@/lib/types";
import { useEventSync, type SyncStatus } from "@/lib/use-event-sync";
import { formatLabel } from "./game-card";
import { useI18n } from "./i18n-provider";
import { BackIcon, CheckIcon, EndsIcon, FlagIcon, FullscreenIcon, ShareIcon, SwapIcon, TapIcon, TrophyIcon, UndoIcon } from "./icons";
import { ServeIcon } from "./serve-icon";
import { ThemeSwitch } from "./theme-switch";

// A display screen wants fresh data; GET with the current ikey is a cheap 204 when nothing changed.
const POLL_MS = 2_000;
const DOUBLE_TAP_MS = 320;
const TEAM_LABEL: Record<Side, keyof Dict> = { 0: "teamRed", 1: "teamBlue" };
const HISTORY = 8;
const STATUS_TEXT: Record<SyncStatus, keyof Dict> = {
  saved: "statusSaved",
  saving: "statusSaving",
  offline: "statusOffline",
  conflict: "statusConflict",
  error: "error",
};

// Umpire mode per tab: sessionStorage so a reload keeps it, with an in-memory fallback when storage is blocked.
const judgeMemory = new Map<string, boolean>();
const judgeListeners = new Set<() => void>();

function readJudge(key: string): boolean {
  try {
    const v = sessionStorage.getItem(key);
    if (v !== null) return v === "1";
  } catch {
    // Storage blocked; fall through to memory.
  }
  return judgeMemory.get(key) ?? false;
}

function writeJudge(key: string, on: boolean) {
  judgeMemory.set(key, on);
  try {
    sessionStorage.setItem(key, on ? "1" : "0");
  } catch {
    // Memory still holds it for this page.
  }
  for (const l of judgeListeners) l();
}

function subscribeJudge(cb: () => void) {
  judgeListeners.add(cb);
  return () => {
    judgeListeners.delete(cb);
  };
}

function useJudge(key: string) {
  const on = useSyncExternalStore(subscribeJudge, () => readJudge(key), () => false);
  return [on, (v: boolean) => writeJudge(key, v)] as const;
}

function subscribeFullscreen(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

const noSubscribe = () => () => {};

function useFullscreen() {
  const supported = useSyncExternalStore(noSubscribe, () => document.fullscreenEnabled === true, () => false);
  const active = useSyncExternalStore(subscribeFullscreen, () => document.fullscreenElement !== null, () => false);
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  return { supported, active, toggle };
}

// The board is meant to stay on a wall or a referee's tablet, so it holds the screen on for as long as it's visible
// (the app-wide WakeLock lets the screen sleep after a couple of idle minutes). A refusal is retried on the next tap.
function useKeepAwake() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let disposed = false;
    let requesting = false;
    let sentinel: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (disposed || sentinel || requesting || document.visibilityState !== "visible") return;
      requesting = true;
      try {
        const s = await navigator.wakeLock.request("screen");
        s.addEventListener("release", () => {
          if (sentinel === s) sentinel = null;
        });
        if (disposed) void s.release().catch(() => {});
        else sentinel = s;
      } catch {
        // Not allowed right now; try again on the next gesture or when the tab is shown.
      } finally {
        requesting = false;
      }
    };
    const retry = () => void acquire();
    void acquire();
    document.addEventListener("visibilitychange", retry);
    document.addEventListener("pointerup", retry, true);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", retry);
      document.removeEventListener("pointerup", retry, true);
      void sentinel?.release().catch(() => {});
    };
  }, []);
}

function hasPoint(game: Game, side: Side): boolean {
  return isTracked(game) ? (game.rallies ?? "").includes(String(side)) : game.score[side] > 0;
}

export function GameBoard({ id, gameId, initial }: { id: string; gameId: string; initial: Snapshot }) {
  const { t } = useI18n();
  const { state, status, update } = useEventSync(id, initial, { pollMs: POLL_MS });
  const [judge, setJudge] = useJudge(`judge:${id}:${gameId}`);
  const fullscreen = useFullscreen();
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState<{ side: Side; n: number } | null>(null);
  const lastTap = useRef<{ side: Side; at: number } | null>(null);
  useKeepAwake();

  const players = useMemo(
    () => new Map(state.players.map((p, i) => [p.id, { ...p, name: p.name.trim() || t("playerName", { n: i + 1 }) }])),
    [state.players, t],
  );

  const index = state.games.findIndex((g) => g.id === gameId);
  const game = index === -1 ? undefined : state.games[index];

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    const title = index === -1 ? state.name : `${t("game", { n: index + 1 })} · ${state.name}`;
    if ((await shareLink(url, title)) !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const back = (
    <Link href={`/e/${id}`} className="btn ghost icon" title={t("backToEvent")} aria-label={t("backToEvent")}>
      <BackIcon />
    </Link>
  );

  if (!game) {
    return (
      <main className="board board-empty">
        <header className="board-bar">{back}</header>
        <div className="board-message">
          <p>{t("gameDeleted")}</p>
          <Link href={`/e/${id}`} className="btn primary">
            {t("backToEvent")}
          </Link>
        </div>
      </main>
    );
  }

  const tracked = isTracked(game);
  const result = replay(game);
  const format = gameFormat(game);
  const sport = eventSport(state);
  const gameSport = tracked ? sportOf(format, sport) : sport;
  const locked = game.winner !== null;
  const server = locked ? null : result.server;
  const positions = locked ? null : result.positions;
  const canAdd = !locked && !(tracked && result.winner !== null);
  // A game the format itself finished can be reopened by taking back the deciding point.
  const canUndo = (side: Side) => (!locked || (tracked && result.winner === game.winner)) && hasPoint(game, side);
  const showCourt = courtCount(state) > 1 || gameCourt(game) > 1;
  const meta = [
    t("game", { n: index + 1 }),
    ...(showCourt ? [t("court", { n: gameCourt(game) })] : []),
    ...(tracked ? [t(formatLabel(format))] : []),
  ].join(" · ");

  const rallies = tracked ? (game.rallies ?? "") : "";
  const lastSide = rallies ? (Number(rallies[rallies.length - 1]) as Side) : null;
  // Newest first; each entry shows the score right after that rally.
  const history = judge
    ? Array.from({ length: Math.min(HISTORY, rallies.length) }, (_, i) => {
        const end = rallies.length - i;
        const r = replay({ ...game, rallies: rallies.slice(0, end) });
        return {
          key: end,
          side: Number(rallies[end - 1]) as Side,
          label: r.sub ? `${r.main.join(":")} · ${r.sub.join(":")}` : r.main.join(" : "),
        };
      })
    : [];

  const change = (fn: (g: Game) => Game) => update((s) => updateGame(s, game.id, fn));

  const point = (side: Side) => {
    if (!canAdd) return;
    change((g) => addRally(g, side));
    haptic("success");
    setFlash((f) => ({ side, n: (f?.n ?? 0) + 1 }));
  };

  const onTap = (side: Side) => (e: PointerEvent<HTMLDivElement>) => {
    if (!judge || !e.isPrimary || (e.target as Element).closest("button, a")) return;
    const prev = lastTap.current;
    if (prev && prev.side === side && e.timeStamp - prev.at <= DOUBLE_TAP_MS) {
      lastTap.current = null;
      point(side);
    } else {
      lastTap.current = { side, at: e.timeStamp };
    }
  };

  // Red starts on the left (bottom on a phone); after a change of ends blue does.
  const startSide: Side = game.ends ? 1 : 0;
  const endSide: Side = startSide === 0 ? 1 : 0;

  // The two places on screen for a team, in screen order. As they face the net, the team on the left/bottom has its
  // L court first and the one on the right/top its R court, in both orientations; CSS lays them out top/bottom
  // (landscape) or left/right (portrait).
  const slotsOf = (side: Side): [string[], string[]] => {
    const team = game.teams[side];
    if (!positions) return [team.slice(0, 1), team.slice(1)];
    const [first, second]: [Court, Court] = side === startSide ? ["L", "R"] : ["R", "L"];
    return [team.filter((pid) => positions[pid] === first), team.filter((pid) => positions[pid] === second)];
  };

  const renderPlayer = (pid: string) => {
    const player = players.get(pid);
    const serving = server?.id === pid;
    const name = player?.name ?? "?";
    return (
      <span key={pid} className={`board-chip ${serving ? "serving" : ""}`} style={{ "--c": player?.color ?? "#888888" } as CSSProperties}>
        {serving && server ? (
          <ServeIcon sport={gameSport} title={t(server.court === "R" ? "servesRight" : "servesLeft", { name })} />
        ) : (
          <span className="board-chip-dot" aria-hidden="true" />
        )}
        <span className="board-chip-name">{name}</span>
      </span>
    );
  };

  const renderHalf = (side: Side) => {
    const team = t(TEAM_LABEL[side]);
    const [a, b] = slotsOf(side);
    return (
      <div
        key={side}
        className={`board-half side-${side} ${side === startSide ? "at-start" : "at-end"} ${game.winner === side ? "won" : ""} ${locked && game.winner !== side ? "lost" : ""}`}
        role="group"
        aria-label={team}
        onPointerUp={onTap(side)}
      >
        <div className="board-slot slot-a">{a.map(renderPlayer)}</div>
        <div className={`board-score ${result.sub ? "has-sub" : ""}`} aria-live="polite">
          {game.winner === side && (
            <span className="board-trophy" role="img" aria-label={t("winnerOf", { team })}>
              <TrophyIcon />
            </span>
          )}
          <span className="board-score-main">{result.main[side]}</span>
          {result.sub && <span className="board-score-sub">{result.sub[side]}</span>}
        </div>
        <div className="board-slot slot-b">{b.map(renderPlayer)}</div>
        {judge && (
          <>
            {canAdd && (
              <span className="board-tap-hint">
                <TapIcon />
                {t("doubleTapPoint")}
              </span>
            )}
            <div className="board-tools">
              <button
                className="btn board-tool"
                type="button"
                disabled={!canUndo(side)}
                aria-label={t("undoPoint", { team })}
                title={t("undoPoint", { team })}
                onClick={() => change((g) => undoRally(g, side))}
              >
                −1
              </button>
              {tracked && game.teams[side].length > 1 && (
                <button
                  className="btn board-tool board-tool-icon"
                  type="button"
                  disabled={locked}
                  aria-label={t("swapSides", { team })}
                  title={t("swapSides", { team })}
                  onClick={() => change((g) => swapSides(g, side))}
                >
                  <SwapIcon />
                </button>
              )}
              <button
                className={`btn board-tool ${game.winner === side ? "primary" : ""}`}
                type="button"
                aria-pressed={game.winner === side}
                aria-label={t("winnerOf", { team })}
                title={t("winnerOf", { team })}
                data-haptic={game.winner === side ? undefined : "success"}
                onClick={() => change((g) => ({ ...g, winner: g.winner === side ? null : side }))}
              >
                <TrophyIcon />
                {t("setWinner")}
              </button>
            </div>
          </>
        )}
        {flash?.side === side && <span key={flash.n} className="board-flash" aria-hidden="true" />}
      </div>
    );
  };

  return (
    <main className={`board ${judge ? "judging" : "viewing"} ${locked ? "over" : ""}`}>
      <header className="board-bar">
        {back}
        <span className={`board-team side-${startSide}`}>{t(TEAM_LABEL[startSide])}</span>
        <span className="board-meta">{meta}</span>
        <span className={`board-team at-end side-${endSide}`}>{t(TEAM_LABEL[endSide])}</span>
        <div className="board-actions">
          {judge && (
            <span className={`status ${status}`} title={t(STATUS_TEXT[status])}>
              {t(STATUS_TEXT[status])}
            </span>
          )}
          <ThemeSwitch className="btn ghost icon" />
          <button
            className="btn ghost icon"
            type="button"
            aria-label={copied ? t("copied") : t("shareGame")}
            title={copied ? t("copied") : t("shareGame")}
            onClick={share}
          >
            {copied ? <CheckIcon /> : <ShareIcon />}
          </button>
          {fullscreen.supported && (
            <button
              className="btn ghost icon board-fullscreen"
              type="button"
              aria-label={fullscreen.active ? t("exitFullscreen") : t("fullscreen")}
              title={fullscreen.active ? t("exitFullscreen") : t("fullscreen")}
              onClick={fullscreen.toggle}
            >
              <FullscreenIcon exit={fullscreen.active} />
            </button>
          )}
          <button
            className={`btn board-flag ${judge ? "primary" : "ghost icon"}`}
            type="button"
            aria-pressed={judge}
            aria-label={t("judge")}
            title={judge ? t("judgeOn") : t("judgeOff")}
            onClick={() => setJudge(!judge)}
          >
            <FlagIcon />
            {judge && <span>{t("judge")}</span>}
          </button>
        </div>
      </header>

      <div className="board-body">
        {renderHalf(startSide)}
        {judge && (
          <div className="board-history">
            {tracked && (
              <>
                <span className="board-history-title">{t("rallies")}</span>
                <ol className="board-rallies">
                  {history.map((h, i) => (
                    <li key={h.key} className={`side-${h.side}`} style={{ opacity: 1 - i * 0.09 }}>
                      <span className="rally-dot" aria-hidden="true" />
                      <span className="rally-score">{h.label}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <button
              className="btn board-ends"
              type="button"
              aria-pressed={game.ends === true}
              aria-label={t("changeEnds")}
              title={t("changeEndsHint")}
              onClick={() => change((g) => ({ ...g, ends: g.ends ? undefined : true }))}
            >
              <EndsIcon />
              <span>{t("changeEnds")}</span>
            </button>
            {tracked && (
              <button
                className="btn board-undo"
                type="button"
                disabled={lastSide === null || !canUndo(lastSide)}
                title={t("undoLastHint")}
                onClick={() => {
                  if (lastSide !== null) change((g) => undoRally(g, lastSide));
                }}
              >
                <UndoIcon />
                {t("undoLast")}
              </button>
            )}
          </div>
        )}
        {renderHalf(endSide)}
      </div>
    </main>
  );
}
