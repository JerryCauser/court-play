"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createEvent } from "@/lib/api";
import { listEvents, forgetEvent, rememberEvent, type SavedEvent } from "@/lib/storage";
import { createState, todayName } from "@/lib/state";
import { useI18n } from "./I18n";

const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function Home() {
  const { t } = useI18n();
  const router = useRouter();
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => setEvents(listEvents()), []);

  async function create() {
    setBusy(true);
    setError(null);
    const id = crypto.randomUUID();
    const state = createState(todayName());
    try {
      await createEvent(id, state, crypto.randomUUID());
      rememberEvent(id, state.name);
      router.push(`/e/${id}`);
    } catch {
      setError(t.loadError);
      setBusy(false);
    }
  }

  function open(e: FormEvent) {
    e.preventDefault();
    const match = link.match(UUID_IN_TEXT);
    if (!match) {
      setError(t.invalidLink);
      return;
    }
    router.push(`/e/${match[0].toLowerCase()}`);
  }

  function forget(id: string) {
    forgetEvent(id);
    setEvents(listEvents());
  }

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t.appName}</h1>
        <p className="muted">{t.tagline}</p>
        <button type="button" className="primary big" onClick={create} disabled={busy}>
          {busy ? t.creating : t.createEvent}
        </button>
      </section>

      <form className="row" onSubmit={open}>
        <input
          className="grow"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={t.openPlaceholder}
          aria-label={t.openPlaceholder}
        />
        <button type="submit">{t.openEvent}</button>
      </form>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>{t.myEvents}</h2>
        {events.length === 0 ? (
          <p className="muted">{t.noEvents}</p>
        ) : (
          <ul className="list">
            {events.map((e) => (
              <li key={e.id} className="list-item">
                <Link href={`/e/${e.id}`} className="grow">
                  <strong>{e.name}</strong>
                  <span className="muted small-text">{new Date(e.openedAt).toLocaleString()}</span>
                </Link>
                <button type="button" className="ghost" onClick={() => forget(e.id)} aria-label={t.forget} title={t.forget}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
