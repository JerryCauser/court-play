"use client";

import { useState, type FormEvent } from "react";
import type { Profile } from "@/lib/profile";
import { isUuid } from "@/lib/uuid";
import { useI18n } from "./i18n-provider";
import { useProfile } from "./profile-provider";

export function ProfileId({ profile }: { profile: Profile }) {
  const { t } = useI18n();
  const { saveProfile } = useProfile();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile.id);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const next = value.trim().toLowerCase();
  const valid = isUuid(next);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  const cancel = () => {
    setFailed(false);
    setValue(profile.id);
    setEditing(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    if (next !== profile.id) {
      setSaving(true);
      setFailed(false);
      const ok = await saveProfile({ ...profile, id: next });
      setSaving(false);
      if (!ok) {
        setFailed(true);
        return;
      }
    }
    setEditing(false);
  };

  return (
    <form className="profile-id" onSubmit={submit}>
      <label className="muted small" htmlFor="profile-id">
        {t("profileId")}
      </label>
      <div className="row nowrap">
        <input
          id="profile-id"
          className="input grow mono small"
          value={editing ? value : profile.id}
          readOnly={!editing}
          aria-invalid={editing && !valid}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
        />
        {editing ? (
          <>
            <button className="btn ghost" type="button" onClick={cancel}>
              {t("cancel")}
            </button>
            <button className="btn primary" type="submit" disabled={!valid || saving}>
              {t("save")}
            </button>
          </>
        ) : (
          <>
            <button className="btn" type="button" onClick={copy}>
              {copied ? t("idCopied") : t("copy")}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setValue(profile.id);
                setEditing(true);
              }}
            >
              {t("edit")}
            </button>
          </>
        )}
      </div>
      {editing && !valid ? (
        <p className="error small">{t("invalidUuid")}</p>
      ) : failed ? (
        <p className="error small">{t("error")}</p>
      ) : (
        <p className="muted small">{t("profileIdHint")}</p>
      )}
    </form>
  );
}
