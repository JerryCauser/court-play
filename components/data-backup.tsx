"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { buildBackup, parseBackup } from "@/lib/backup";
import { today } from "@/lib/event";
import { importEvents, replaceEvents } from "@/lib/local-events";
import { useI18n } from "./i18n-provider";
import { useProfile } from "./profile-provider";

type Message = { error: boolean; text: string };

export function DataBackup() {
  const { t } = useI18n();
  const { profile, saveProfile } = useProfile();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [syncing, setSyncing] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(buildBackup(profile), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `court-play-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const backup = parseBackup(await file.text());
    if (!backup) {
      setMessage({ error: true, text: t("importFailed") });
      return;
    }
    if (
      profile &&
      backup.profile &&
      profile.id !== backup.profile.id &&
      !window.confirm(t("importConfirm", { name: profile.name, next: backup.profile.name }))
    ) {
      return;
    }
    if (backup.profile && !(await saveProfile(backup.profile))) {
      setMessage({ error: true, text: t("importFailed") });
      return;
    }
    importEvents(backup.events);
    setMessage({ error: false, text: t("importDone", { n: backup.events.length }) });
  };

  const sync = async () => {
    if (!profile) return;
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBackup(profile)),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { status: "waiting" | "merged"; backup: unknown };
      const backup = parseBackup(JSON.stringify(body.backup));
      if (!backup) throw new Error("bad_backup");
      const next = backup.profile;
      if (next && (next.name !== profile.name || next.color !== profile.color) && !(await saveProfile(next))) {
        throw new Error("profile");
      }
      replaceEvents(backup.events);
      setMessage({
        error: false,
        text: body.status === "waiting" ? t("syncWaiting") : t("syncDone", { n: backup.events.length }),
      });
    } catch {
      setMessage({ error: true, text: t("error") });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="data-backup">
      <p className="muted small">{t("dataHint")}</p>
      <div className="row">
        <button className="btn" type="button" onClick={exportData}>
          {t("exportData")}
        </button>
        <button className="btn" type="button" onClick={() => input.current?.click()}>
          {t("importData")}
        </button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={importData} />
        {profile && (
          <button className="btn" type="button" onClick={sync} disabled={syncing}>
            {t("sync")}
          </button>
        )}
      </div>
      {message && <p className={`small ${message.error ? "error" : "muted"}`}>{message.text}</p>}
    </div>
  );
}
