"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { newEventState } from "@/lib/event";
import { forgetEvent, getLocalEvents, getServerLocalEvents, rememberEvent, subscribeLocalEvents } from "@/lib/local-events";
import { uuid } from "@/lib/uuid";
import { useI18n } from "./i18n-provider";
import { Prefs } from "./prefs";

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const events = useSyncExternalStore(subscribeLocalEvents, getLocalEvents, getServerLocalEvents);
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [link, setLink] = useState("");

  const create = async () => {
    setCreating(true);
    setFailed(false);
    const id = uuid();
    const state = newEventState();
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, base: null, next: uuid() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      rememberEvent(id, state.name);
      router.push(`/e/${id}`);
    } catch {
      setFailed(true);
      setCreating(false);
    }
  };

  const open = (e: FormEvent) => {
    e.preventDefault();
    const id = link.match(UUID_IN_TEXT)?.[0];
    if (id) router.push(`/e/${id.toLowerCase()}`);
  };

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>
            ●
          </span>
          {t("appName")}
        </div>
        <Prefs />
      </header>

      <section className="hero">
        <button className="btn primary big" type="button" onClick={create} disabled={creating}>
          {creating ? t("creating") : t("newEvent")}
        </button>
        {failed && <p className="error">{t("error")}</p>}
        <form className="row" onSubmit={open}>
          <input
            className="input grow"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={t("openPlaceholder")}
            aria-label={t("openPlaceholder")}
          />
          <button className="btn" type="submit" disabled={!UUID_IN_TEXT.test(link)}>
            {t("openEvent")}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>{t("myEvents")}</h2>
        {events.length === 0 ? (
          <p className="muted">{t("noEvents")}</p>
        ) : (
          <ul className="list">
            {events.map((e) => (
              <li key={e.id} className="list-item">
                <Link href={`/e/${e.id}`} className="grow link">
                  <span className="strong">{e.name}</span>
                  <span className="muted small mono">{e.id.slice(0, 8)}</span>
                </Link>
                <button
                  className="btn ghost icon"
                  type="button"
                  onClick={() => forgetEvent(e.id)}
                  aria-label={t("forget")}
                  title={t("forget")}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
