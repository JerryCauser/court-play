"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { PALETTE } from "@/lib/event";
import { useI18n } from "./i18n-provider";
import { useProfile } from "./profile-provider";

export function ProfileForm({ onSaved, onCancel }: { onSaved?: () => void; onCancel?: () => void }) {
  const { t } = useI18n();
  const { profile, saveProfile } = useProfile();
  const [name, setName] = useState(profile?.name ?? "");
  const [color, setColor] = useState(profile?.color ?? PALETTE[1]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const trimmed = name.trim();
  const changed = trimmed !== profile?.name || color !== profile?.color;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || !changed || saving) return;
    setSaving(true);
    setFailed(false);
    const ok = await saveProfile({ name: trimmed, color });
    setSaving(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    setName(trimmed);
    onSaved?.();
  };

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="row nowrap">
        <label className="swatch" style={{ "--c": color } as CSSProperties} title={t("color")}>
          <input type="color" value={color} aria-label={t("color")} onChange={(e) => setColor(e.target.value)} />
        </label>
        <input
          className="input grow"
          value={name}
          placeholder={t("yourName")}
          aria-label={t("yourName")}
          maxLength={40}
          required
          autoFocus={!profile}
          data-autofocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="palette" role="group" aria-label={t("color")}>
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            className="palette-swatch"
            style={{ "--c": c } as CSSProperties}
            aria-label={c}
            aria-pressed={c === color.toLowerCase()}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      {failed && <p className="error small">{t("error")}</p>}
      <div className="row end">
        {onCancel && (
          <button className="btn ghost" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
        )}
        <button className="btn primary" type="submit" disabled={!trimmed || !changed || saving}>
          {t("save")}
        </button>
      </div>
    </form>
  );
}
