"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { buildBackup, parseBackup } from "@/lib/backup";
import { today } from "@/lib/event";
import { importEvents } from "@/lib/local-events";
import { useI18n } from "./i18n-provider";
import { useProfile } from "./profile-provider";

type Result = { ok: true; events: number } | { ok: false };

export function DataBackup() {
  const { t } = useI18n();
  const { profile, saveProfile } = useProfile();
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<Result | null>(null);

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
      setResult({ ok: false });
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
      setResult({ ok: false });
      return;
    }
    importEvents(backup.events);
    setResult({ ok: true, events: backup.events.length });
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
      </div>
      {result &&
        (result.ok ? (
          <p className="muted small">{t("importDone", { n: result.events })}</p>
        ) : (
          <p className="error small">{t("importFailed")}</p>
        ))}
    </div>
  );
}
