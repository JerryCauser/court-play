"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { percent, ratio } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import { getLocalEvents, getServerLocalEvents, subscribeLocalEvents } from "@/lib/local-events";
import type { Profile } from "@/lib/profile";
import { eventTotals, sumTotals, type EventTotals } from "@/lib/profile-stats";
import type { Snapshot } from "@/lib/types";
import { useI18n } from "./i18n-provider";
import { RateChart } from "./rate-chart";

type Loaded = { key: string; entries: EventTotals[] };

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

  if (!entries || !total) return <p className="muted">{t("loading")}</p>;
  if (entries.length === 0) return <p className="muted">{t("noStats")}</p>;

  const items: [keyof Dict, string | number][] = [
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
      <dl className="stat-list">
        {items.map(([label, value]) => (
          <div key={label} className="stat-item">
            <dt className="muted">{t(label)}</dt>
            <dd className="strong">{value}</dd>
          </div>
        ))}
      </dl>
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
