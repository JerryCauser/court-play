"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { percent, ratio } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { getLocalEvents, getServerLocalEvents, subscribeLocalEvents } from "@/lib/local-events";
import type { Profile } from "@/lib/profile";
import { bestBuddy, eventTotals, sumTotals, type EventTotals, type Partner } from "@/lib/profile-stats";
import type { Snapshot } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { Modal } from "./modal";
import { PlayerChip } from "./player-chip";
import { RateChart } from "./rate-chart";

type Loaded = { key: string; entries: EventTotals[] };

type Item = [keyof Dict, string | number];

function StatList({ items }: { items: Item[] }) {
  const { t } = useI18n();
  return (
    <dl className="stat-list">
      {items.map(([label, value]) => (
        <div key={label} className="stat-item">
          <dt className="muted">{t(label)}</dt>
          <dd className="strong">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BuddyStat({ buddy }: { buddy: Partner | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="stat-item buddy" title={t("bestBuddyHint")}>
        <span className="muted">{t("bestBuddy")}</span>
        {buddy ? (
          <button className="buddy-button" type="button" onClick={() => setOpen(true)} title={buddy.name}>
            <PlayerChip player={{ id: buddy.key, name: buddy.name, color: buddy.color, active: true }} />
          </button>
        ) : (
          <span className="strong">—</span>
        )}
      </div>
      {buddy && (
        <Modal open={open} title={t("bestBuddy")} onClose={() => setOpen(false)}>
          <PlayerChip player={{ id: buddy.key, name: buddy.name, color: buddy.color, active: true }} />
          <p className="muted small">{t("bestBuddyHint")}</p>
          <StatList
            items={[
              ["played", buddy.games],
              ["wins", buddy.wins],
              ["losses", buddy.games - buddy.wins],
              ["winRate", percent(buddy.wins / buddy.games)],
              ["scored", buddy.scored],
              ["conceded", buddy.conceded],
              ["scoredShare", percent(ratio(buddy.scored, buddy.conceded))],
            ]}
          />
        </Modal>
      )}
    </>
  );
}

async function loadEntries(events: { id: string; seenAt: number }[], uid: string): Promise<EventTotals[]> {
  const results = await Promise.all(
    events.map(async (e) => {
      try {
        const res = await fetch(`/api/events/${e.id}`, { cache: "no-store" });
        if (!res.ok) return null;
        const snapshot = (await res.json()) as Snapshot;
        const totals = eventTotals(e.id, snapshot.state, uid);
        return totals && { totals, at: snapshot.createdAt ? Date.parse(snapshot.createdAt) : e.seenAt };
      } catch {
        return null;
      }
    }),
  );
  return results
    .filter((r) => r !== null)
    .sort((a, b) => a.at - b.at)
    .map((r) => r.totals);
}

export function ProfileStats({ profile }: { profile: Profile }) {
  const { t } = useI18n();
  const events = useSyncExternalStore(subscribeLocalEvents, getLocalEvents, getServerLocalEvents);
  const key = `${profile.id}:${events.map((e) => e.id).join(",")}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadEntries(events, profile.id).then((entries) => {
      if (!cancelled) setLoaded({ key, entries });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the event ids and profile id
  }, [key]);

  const entries = loaded?.key === key ? loaded.entries : null;
  const total = useMemo(() => (entries ? sumTotals(entries) : null), [entries]);
  const buddy = useMemo(() => (entries ? bestBuddy(entries) : null), [entries]);

  if (!entries || !total) return <p className="muted">{t("loading")}</p>;
  if (entries.length === 0) return <p className="muted">{t("noStats")}</p>;

  const items: Item[] = [
    ["eventsCount", entries.length],
    ["played", total.played],
    ["wins", total.wins],
    ["losses", total.losses],
    ["winRate", percent(ratio(total.wins, total.losses))],
    ["scored", total.scored],
    ["conceded", total.conceded],
    ["scoredShare", percent(ratio(total.scored, total.conceded))],
    ["benched", total.benched],
  ];

  return (
    <>
      <StatList items={items} />
      <BuddyStat buddy={buddy} />
      <RateChart
        title={t("winRateChart")}
        color={profile.color}
        points={entries.map((e) => ({ label: e.name, value: ratio(e.wins, e.losses) }))}
      />
      <RateChart
        title={t("pointsChart")}
        color={profile.color}
        points={entries.map((e) => ({ label: e.name, value: ratio(e.scored, e.conceded) }))}
      />
    </>
  );
}
